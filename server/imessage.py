from __future__ import annotations

from typing import Optional

import os
import sqlite3
import subprocess
from pathlib import Path

CHAT_DB = Path.home() / "Library/Messages/chat.db"


def peer() -> str:
    return (os.environ.get("REJOIN_PEER") or "").strip()


def db_readable() -> bool:
    return os.access(CHAT_DB, os.R_OK)


def status() -> dict:
    return {
        "peer": peer() or None,
        "db_readable": db_readable(),
        "can_send": True,
        "hint": (
            "Set REJOIN_PEER to the iPhone's iMessage (phone or email). "
            "Grant Full Disk Access to Terminal so the Mac can read incoming texts. "
            "Or just open the LAN URL on your phone."
        ),
    }


def _escape(text: str) -> str:
    return text.replace("\\", "\\\\").replace('"', '\\"')


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
    allow_self = os.environ.get("REJOIN_ALLOW_SELF") == "1"
    try:
        db = sqlite3.connect(f"file:{CHAT_DB}?mode=ro", uri=True)
        rows = db.execute(
            """
            select m.ROWID, ifnull(m.text, ''), m.is_from_me, ifnull(h.id, '')
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
    for row_id, text, is_from_me, handle in rows:
        max_id = max(max_id, int(row_id))
        text = (text or "").strip()
        if not text:
            continue
        if is_from_me and not allow_self:
            continue
        if want and handle and handle not in {want, want.replace(" ", "")}:
            # also accept the peer without punctuation
            norm = "".join(ch for ch in handle if ch.isalnum() or ch in "@.+")
            want_n = "".join(ch for ch in want if ch.isalnum() or ch in "@.+")
            if norm != want_n:
                continue
        out.append({"id": int(row_id), "text": text, "handle": handle})
    return max_id, out
