from __future__ import annotations

import asyncio
import base64
import json
import os
import re
from copy import deepcopy
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any, Optional

import httpx
from fastapi import FastAPI, File, Request, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from game import game

ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "data" / "cruise.json"
COMPANY_PATH = ROOT / "data" / "company-feed.json"
XAI_URL = "https://api.x.ai/v1/chat/completions"
VISION_MODELS = ("grok-2-vision-1212", "grok-2-vision", "grok-4-fast-reasoning")
TEXT_MODELS = ("grok-4-fast-reasoning", "grok-2-vision-1212", "grok-2-vision")
EXTRACT_KEYS = ("ship", "port", "all_aboard_local", "departure_local", "next_port", "timezone")
TIMEOUT = 12.0

clients: set[WebSocket] = set()


async def fanout() -> None:
    snap = game.snapshot()
    dead: list[WebSocket] = []
    for ws in list(clients):
        try:
            await ws.send_json(snap)
        except Exception:
            dead.append(ws)
    for ws in dead:
        clients.discard(ws)


async def bot_loop() -> None:
    while True:
        await asyncio.sleep(1)
        game.tick()
        await fanout()


@asynccontextmanager
async def lifespan(_app: FastAPI):
    print(
        "Rejoin API on 127.0.0.1:8000 — clock/map only. "
        "Does not read or send phone messages.",
        flush=True,
    )
    task = asyncio.create_task(bot_loop())
    yield
    task.cancel()


app = FastAPI(lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:5173", "http://localhost:5173"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


def load_fixture() -> dict[str, Any]:
    with open(DATA_PATH, encoding="utf-8") as f:
        return json.load(f)


def fixture_response(extra: Optional[dict] = None) -> dict[str, Any]:
    out = deepcopy(load_fixture())
    out["source_tag"] = "fixture"
    if extra:
        out.update(extra)
    return out


def parse_json_blob(text: str) -> Optional[dict]:
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        m = re.search(r"\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}", text, re.DOTALL)
        if m:
            try:
                return json.loads(m.group(0))
            except json.JSONDecodeError:
                pass
    return None


def merge_extract(base: dict, extracted: dict) -> dict:
    out = deepcopy(base)
    for k in EXTRACT_KEYS:
        if k in extracted and extracted[k]:
            out[k] = extracted[k]
    out["source_tag"] = "grok"
    return out


async def xai_chat(
    messages: list,
    models: tuple[str, ...],
    *,
    extra_body: Optional[dict] = None,
) -> Optional[str]:
    key = os.environ.get("XAI_API_KEY")
    if not key:
        return None
    headers = {"Authorization": f"Bearer {key}", "Content-Type": "application/json"}
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        for model in models:
            body: dict[str, Any] = {"model": model, "messages": messages}
            if extra_body:
                body.update(extra_body)
            r = await client.post(XAI_URL, headers=headers, json=body)
            if r.status_code == 404:
                continue
            if r.status_code >= 400:
                return None
            data = r.json()
            choices = data.get("choices") or []
            if choices:
                return (choices[0].get("message") or {}).get("content")
    return None


def image_data_url(raw: bytes, content_type: str = "image/jpeg") -> str:
    b64 = base64.standard_b64encode(raw).decode("ascii")
    return f"data:{content_type};base64,{b64}"


EXTRACT_PROMPT = (
    "Extract ONLY these fields from the cruise schedule image as JSON with no other keys: "
    "ship, port, all_aboard_local, departure_local, next_port, timezone. "
    "Times must be HH:MM 24-hour. Reply with raw JSON only."
)


@app.get("/api/health")
def health():
    return {"ok": True}


@app.get("/api/cruise")
def cruise():
    return load_fixture()


@app.get("/api/company")
def company():
    if COMPANY_PATH.exists():
        with open(COMPANY_PATH, encoding="utf-8") as f:
            return json.load(f)
    return load_fixture()


@app.get("/api/state")
def state():
    return game.snapshot()


async def _json_body(request: Request) -> dict:
    try:
        body = await request.json()
    except Exception:
        return {}
    return body if isinstance(body, dict) else {}


@app.post("/api/action")
async def action(request: Request):
    body = await _json_body(request)
    game.handle_text(str(body.get("text") or ""))
    await fanout()
    return game.snapshot()


@app.post("/api/demo")
async def demo(request: Request):
    body = await _json_body(request)
    if "now_sec" in body:
        try:
            game.set_time(int(body["now_sec"]))
        except (TypeError, ValueError):
            pass
    if body.get("place"):
        game.set_place(str(body["place"]))
    await fanout()
    return game.snapshot()


@app.post("/api/call")
async def call():
    replies = game.mark_calling()
    await fanout()
    return {"replies": replies, "state": game.snapshot()}


@app.websocket("/api/ws")
async def ws(sock: WebSocket):
    await sock.accept()
    try:
        await sock.send_json(game.snapshot())
        clients.add(sock)
        while True:
            await sock.receive_text()
    except (WebSocketDisconnect, Exception):
        clients.discard(sock)


@app.post("/api/extract")
async def extract(
    request: Request,
    image: Optional[UploadFile] = File(None),
):
    used_sample = False
    filename = ""
    image_b64: Optional[str] = None
    content_type = "image/jpeg"

    if image is not None:
        filename = image.filename or ""
        raw = await image.read()
        if raw:
            image_b64 = image_data_url(raw, image.content_type or content_type)
    else:
        body = await _json_body(request)
        used_sample = bool(body.get("used_sample"))
        if body.get("image_base64"):
            image_b64 = body["image_base64"]
            if not image_b64.startswith("data:"):
                image_b64 = f"data:image/jpeg;base64,{image_b64}"

    if (
        used_sample
        or "sample-planner" in filename.lower()
        or not os.environ.get("XAI_API_KEY")
        or not image_b64
    ):
        if not game.cruise:
            game.arm_sample()
            await fanout()
        return fixture_response()

    messages = [
        {
            "role": "user",
            "content": [
                {"type": "text", "text": EXTRACT_PROMPT},
                {"type": "image_url", "image_url": {"url": image_b64}},
            ],
        }
    ]
    try:
        content = await xai_chat(messages, VISION_MODELS)
        if not content:
            if not game.cruise:
                game.arm_sample()
                await fanout()
            return fixture_response()
        parsed = parse_json_blob(content)
        if not parsed:
            if not game.cruise:
                game.arm_sample()
                await fanout()
            return fixture_response()
        merged = merge_extract(load_fixture(), parsed)
        game.cruise = merged
        game.photo = "/sample-planner.png"
        game._announce()
        await fanout()
        return merged
    except Exception:
        if not game.cruise:
            game.arm_sample()
            await fanout()
        return fixture_response()


RECOVER_PROMPT = (
    "Find the current Royal Caribbean port agent contact for Cozumel, Mexico pier desk. "
    "Return ONLY JSON with keys: name, phone (E.164), phone_display, role. "
    "No paragraphs, no travel advice."
)


@app.post("/api/recover")
async def recover():
    base = load_fixture()
    passport_note = base.get("passenger", {}).get("passport", "")
    payload = {
        "port_agent": deepcopy(base["port_agent"]),
        "next_port": base["next_port"],
        "next_port_arrival_note": base.get("next_port_arrival_note", ""),
        "fallback_transport": base["fallback_transport"],
        "passport_note": passport_note,
        "source": "fixture",
    }
    if not os.environ.get("XAI_API_KEY"):
        return payload

    messages = [{"role": "user", "content": RECOVER_PROMPT}]
    extra = {"search_parameters": {"mode": "on"}}
    try:
        content = await xai_chat(messages, TEXT_MODELS, extra_body=extra)
        if not content:
            return payload
        parsed = parse_json_blob(content)
        if parsed:
            agent = payload["port_agent"]
            for k in ("name", "phone", "phone_display", "role"):
                if parsed.get(k):
                    agent[k] = parsed[k]
            payload["source"] = "grok"
            if game.cruise:
                game.cruise["port_agent"] = agent
                await fanout()
    except Exception:
        pass
    return payload
