from __future__ import annotations

from typing import Optional

import os
import sqlite3
import subprocess
from pathlib import Path

CHAT_DB = Path.home() / "Library/Messages/chat.db"

COMMANDS = {
    "sample",
    "use sample planner",
    "planner",
    "start",
    "reset",
    "restart",
    "help",
    "ruins",
    "i'm still at the ruins",
    "im still at the ruins",
    "still at the ruins",
    "inland",
    "pier",
    "at pier",
    "at the pier",
    "town",
    "in town",
    "skip",
    "17:01",
    "departed",
    "ship left",
    "skip to 17:01",
    "call",
    "call port agent",
    "call the port agent",
    "t-40",
    "t40",
    "40",
    "t-5",
    "t5",
}


def peer() -> str:
    return (os.environ.get("REJOIN_PEER") or "").strip()


def db_readable() -> bool:
    return os.access(CHAT_DB, os.R_OK)


def local_handle() -> Optional[str]:
    script = """
    tell application "Messages"
      set a to first account whose service type is iMessage
      return description of a
    end tell
    """
    try:
        r = subprocess.run(["osascript", "-e", script], capture_output=True, text=True, timeout=8)
    except Exception:
        return None
    if r.returncode != 0:
        return None
    raw = (r.stdout or "").strip()
    if raw.startswith("E:"):
        digits = raw[2:]
        if digits.isdigit() and len(digits) == 11:
            return f"+{digits}"
        if digits.isdigit() and len(digits) == 10:
            return f"+1{digits}"
        return digits
    return raw or None


def status() -> dict:
    return {
        "peer": peer() or None,
        "local_handle": local_handle(),
        "db_readable": db_readable(),
        "can_send": True,
        "hint": (
            "Grant Full Disk Access to Terminal (or the app running npm run api), "
            "then text this Mac from iPhone. Say sample, ruins, or skip."
        ),
    }


def _escape(text: str) -> str:
    return text.replace("\\", "\\\\").replace('"', '\\"')


def _norm(handle: str) -> str:
    return "".join(ch for ch in handle if ch.isalnum() or ch in "@.+")


def send_text(to: str, text: str) -> Optional[str]:
    if not to or not text:
        return "missing peer or text"
    body = _escape(text[:900])
    handle = _escape(to)
    script = f'''
tell application "Messages"
  set svc to first account whose service type is iMessage
  set pal to participant "{handle}" of svc
  send "{body}" to pal
end tell
'''
    try:
        r = subprocess.run(["osascript", "-e", script], capture_output=True, text=True, timeout=20)
    except Exception as exc:
        return str(exc)
    if r.returncode != 0:
        return (r.stderr or r.stdout or "send failed").strip()
    return None


def latest_row_id() -> int:
    if not db_readable():
        return 0
    try:
        db = sqlite3.connect(f"file:{CHAT_DB}?mode=ro", uri=True)
        row = db.execute("select ifnull(max(ROWID), 0) from message").fetchone()
        db.close()
        return int(row[0] if row else 0)
    except Exception:
        return 0


def new_inbound(since_id: int) -> tuple[int, list[dict]]:
    if not db_readable():
        return since_id, []
    want = peer()
    try:
        db = sqlite3.connect(f"file:{CHAT_DB}?mode=ro", uri=True)
        rows = db.execute(
            """
            select m.ROWID, ifnull(m.text, ''), m.is_from_me, ifnull(h.id, ''),
              (select count(*) from message_attachment_join maj
               where maj.message_id = m.ROWID)
            from message m
            left join handle h on m.handle_id = h.ROWID
            where m.ROWID > ?
            order by m.ROWID
            """,
            (since_id,),
        ).fetchall()
        db.close()
    except Exception:
        return since_id, []

    out: list[dict] = []
    max_id = since_id
    for row_id, text, is_from_me, handle, atts in rows:
        max_id = max(max_id, int(row_id))
        text = (text or "").strip()
        if not text and int(atts or 0) > 0:
            text = "sample"
        if not text:
            continue
        key = text.lower()
        if is_from_me and key not in COMMANDS:
            continue
        if want and handle:
            if _norm(handle) != _norm(want):
                continue
        out.append({"id": int(row_id), "text": text, "handle": handle})
    return max_id, out
