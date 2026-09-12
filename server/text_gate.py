"""The only send policy. No Messages/chat.db access lives here."""

from __future__ import annotations

import json
from pathlib import Path

ALLOWLIST_PATH = Path(__file__).resolve().parents[1] / "data" / "allowlist.json"

_inbound_this_session: set[str] = set()


def _norm(number: str) -> str:
    return "".join(ch for ch in number if ch.isdigit() or ch == "+")


def allowlist() -> set[str]:
    if not ALLOWLIST_PATH.exists():
        return set()
    with open(ALLOWLIST_PATH, encoding="utf-8") as f:
        data = json.load(f)
    return {_norm(n) for n in data.get("numbers", []) if n}


def mark_inbound(number: str) -> None:
    n = _norm(number)
    if n and n in allowlist():
        _inbound_this_session.add(n)


def can_text(number: str) -> bool:
    n = _norm(number)
    if not n:
        return False
    allowed = allowlist()
    if not allowed:
        return False
    if n not in allowed:
        return False
    return n in _inbound_this_session


def send_text(number: str, _body: str) -> str:
    """Hard refuse. Empty allowlist or no inbound this session means no send."""
    if not can_text(number):
        return "send disabled"
    return "send disabled"


def clear_inbound() -> None:
    _inbound_this_session.clear()
