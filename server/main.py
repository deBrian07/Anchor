import base64
import json
import os
import re
from copy import deepcopy
from pathlib import Path
from typing import Any, Optional

import httpx
from fastapi import FastAPI, File, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware

ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "data" / "cruise.json"
COMPANY_PATH = ROOT / "data" / "company-feed.json"
XAI_URL = "https://api.x.ai/v1/chat/completions"
VISION_MODELS = ("grok-2-vision-1212", "grok-2-vision", "grok-4-fast-reasoning")
TEXT_MODELS = ("grok-4-fast-reasoning", "grok-2-vision-1212", "grok-2-vision")
EXTRACT_KEYS = ("ship", "port", "all_aboard_local", "departure_local", "next_port", "timezone")
TIMEOUT = 12.0

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def load_fixture() -> dict[str, Any]:
    with open(DATA_PATH, encoding="utf-8") as f:
        return json.load(f)


def fixture_response(extra: Optional[dict] = None) -> dict[str, Any]:
    out = deepcopy(load_fixture())
    out["source"] = "fixture"
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
    out["source"] = "grok"
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
    'ship, port, all_aboard_local, departure_local, next_port, timezone. '
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
        try:
            body = await request.json()
        except json.JSONDecodeError:
            body = {}
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
            return fixture_response()
        parsed = parse_json_blob(content)
        if not parsed:
            return fixture_response()
        return merge_extract(load_fixture(), parsed)
    except Exception:
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
    except Exception:
        pass
    return payload
