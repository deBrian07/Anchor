from __future__ import annotations

import time
from copy import deepcopy
from pathlib import Path
from typing import Any, Callable

ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "data" / "cruise.json"

T40 = 15 * 3600 + 50 * 60
T5 = 16 * 3600 + 25 * 60
DEPARTED = 17 * 3600 + 60
ALL_ABOARD = 16 * 3600 + 30 * 60
SAILS = 17 * 3600

SAMPLE = {"sample", "use sample planner", "planner", "start"}
RESET = {"reset", "restart", "help"}
RUINS = {"ruins", "i'm still at the ruins", "im still at the ruins", "still at the ruins", "inland"}
PIER = {"pier", "at pier", "at the pier"}
TOWN = {"town", "in town"}
SKIP = {"skip", "17:01", "departed", "ship left", "skip to 17:01"}
CALL = {"call", "call port agent", "call the port agent"}


def _fixture() -> dict[str, Any]:
    import json

    with open(DATA_PATH, encoding="utf-8") as f:
        data = json.load(f)
    data["source_tag"] = "cruise_line"
    return data


def _walk(place: str) -> int:
    return {"pier": 3, "town": 12, "ruins": 45}.get(place, 12)


def _phase(cruise: dict | None, now_sec: int, place: str, calling: bool) -> str:
    if not cruise:
        return "empty"
    if calling:
        return "calling"
    if now_sec >= SAILS:
        return "missed"
    remain = (ALL_ABOARD - now_sec) / 60
    if _walk(place) > remain:
        return "late"
    return "armed"


class Game:
    def __init__(self) -> None:
        self.now_sec = T40
        self.place = "town"
        self.calling = False
        self.said_ruins = False
        self.recovery_ready = False
        self.missed_at: float | None = None
        self.cruise: dict[str, Any] | None = None
        self.photo: str | None = None
        self.logs: list[dict] = []
        self.bubbles: list[dict] = [
            {
                "id": 1,
                "from": "them",
                "text": "Text me today's planner photo, or say sample. I'll pull your sailing from the cruise line.",
            }
        ]
        self._seq = 1
        self._log_seq = 0
        self.listeners: list[Callable[[dict], None]] = []

    def snapshot(self) -> dict[str, Any]:
        cruise = self.cruise
        you = None
        if cruise:
            loc = cruise["map"][self.place if self.place in cruise["map"] else "town"]
            you = {"lat": loc["lat"], "lng": loc["lng"]}
        phase = _phase(cruise, self.now_sec, self.place, self.calling)
        departed = phase in {"missed", "calling"}
        if departed and self.missed_at and time.time() - self.missed_at >= 2.2:
            self.recovery_ready = True
        show_recovery = phase == "calling" or (departed and self.recovery_ready)
        return {
            "phase": phase,
            "now_sec": self.now_sec,
            "place": self.place,
            "you": you,
            "calling": self.calling,
            "said_ruins": self.said_ruins,
            "recovery_ready": self.recovery_ready,
            "show_recovery": show_recovery,
            "departed": departed,
            "walk_min": _walk(self.place),
            "cruise": cruise,
            "photo": self.photo,
            "logs": self.logs[-6:],
            "bubbles": self.bubbles,
        }

    def _emit(self) -> dict[str, Any]:
        snap = self.snapshot()
        for fn in list(self.listeners):
            try:
                fn(snap)
            except Exception:
                pass
        return snap

    def _bubble(self, frm: str, text: str, photo: str | None = None) -> None:
        self._seq += 1
        row = {"id": self._seq, "from": frm, "text": text}
        if photo:
            row["photo"] = photo
        self.bubbles.append(row)

    def _log(self, level: str, text: str) -> None:
        self._log_seq += 1
        self.logs.append({"id": self._log_seq, "level": level, "text": text})
        self.logs = self.logs[-8:]

    def tick(self) -> dict[str, Any]:
        if self.cruise:
            self.now_sec += 1
            phase = _phase(self.cruise, self.now_sec, self.place, self.calling)
            if phase == "missed" and self.missed_at is None:
                self.missed_at = time.time()
                self._log("alert", "ship departed")
                self._bubble("them", "The ship is leaving the pier.")
        return self._emit()

    def set_time(self, now_sec: int) -> list[str]:
        self.now_sec = int(now_sec)
        replies: list[str] = []
        if self.cruise and self.now_sec >= SAILS and self.missed_at is None:
            self.missed_at = time.time()
            self._log("alert", "ship departed")
            self._bubble("them", "The ship is leaving the pier.")
            replies.append("The ship is leaving the pier.")
        if self.now_sec < SAILS:
            self.missed_at = None
            self.recovery_ready = False
            self.calling = False
        self._emit()
        return replies

    def set_place(self, place: str) -> list[str]:
        if place not in {"pier", "town", "ruins"}:
            return []
        self.place = place
        if place == "ruins":
            self.said_ruins = True
            self._bubble("me", "I'm still at the ruins")
            return self._after_move()
        self._emit()
        return []

    def _after_move(self) -> list[str]:
        replies: list[str] = []
        if self.cruise and _phase(self.cruise, self.now_sec, self.place, False) == "late":
            remain = max(0, round((ALL_ABOARD - self.now_sec) / 60))
            self._log("warn", f"you are too far: {_walk(self.place)} min walk, {remain} min left")
            msg = "You cannot make all-aboard from here. LEAVE NOW."
            self._bubble("them", msg)
            replies.append(msg)
        self._emit()
        return replies

    def arm_sample(self) -> list[str]:
        self.cruise = _fixture()
        self.photo = "/sample-planner.png"
        self.place = "town"
        self.now_sec = T40
        self.calling = False
        self.said_ruins = False
        self.recovery_ready = False
        self.missed_at = None
        self._bubble("me", "Use sample planner", photo="/sample-planner.png")
        c = self.cruise
        line = (
            f"{c['ship']} · {c['port']}. All aboard {c['all_aboard_local']}, "
            f"sails {c['departure_local']}."
        )
        self._bubble("them", line)
        self._log(
            "info",
            f"{c['cruise_line']} feed {c.get('source', {}).get('sailing_id', 'port-ops')}: "
            f"all aboard {c['all_aboard_local']} · sails {c['departure_local']}",
        )
        self._log("info", "extracted times from sample planner")
        self._emit()
        return [line, "You are in town. 12 min walk. All aboard in 40 min."]

    def merge_cruise(self, cruise: dict[str, Any], photo: str | None = None) -> list[str]:
        self.cruise = deepcopy(cruise)
        if photo:
            self.photo = photo
            self._bubble("me", "Planner photo", photo=photo)
        return self.arm_sample() if not cruise else self._announce()

    def _announce(self) -> list[str]:
        c = self.cruise
        if not c:
            return []
        self.place = "town"
        self.now_sec = T40
        self.calling = False
        self.said_ruins = False
        self.recovery_ready = False
        self.missed_at = None
        line = (
            f"{c['ship']} · {c['port']}. All aboard {c['all_aboard_local']}, "
            f"sails {c['departure_local']}."
        )
        self._bubble("them", line)
        self._log("info", f"extracted times: all aboard {c['all_aboard_local']} · sails {c['departure_local']}")
        self._emit()
        return [line, "You are in town. 12 min walk. All aboard in 40 min."]

    def mark_calling(self) -> list[str]:
        self.calling = True
        self.recovery_ready = True
        replies = self.recovery_texts()
        for line in replies:
            self._bubble("them", line)
        self._emit()
        return replies

    def recovery_texts(self) -> list[str]:
        c = self.cruise
        if not c:
            return []
        a = c["port_agent"]
        p = c["passenger"]
        return [
            f"Missed {c['ship']} at {c['port']}. {p['passport']}.",
            f"Next port: {c['next_port']} {c['next_port_arrival_note']}.",
            f"Call {a['name']} — {a['phone_display']} ({a['role']}).",
            f"Say: {c['ship']}, {p['booking_name']}, cabin {p['cabin']}. "
            f"I missed all-aboard at Cozumel. Passport is in the cabin. "
            f"I need next-port join instructions. Where do I meet you.",
            f"Fallback: {c['fallback_transport']}",
        ]

    def reset(self) -> list[str]:
        self.__init__()
        self._emit()
        return [self.bubbles[0]["text"]]

    def handle_text(self, text: str) -> list[str]:
        raw = (text or "").strip()
        if not raw:
            return []
        key = raw.lower()
        if key in RESET:
            return self.reset()
        if key in SAMPLE:
            return self.arm_sample()
        if key in RUINS:
            return self.set_place("ruins")
        if key in PIER:
            return self.set_place("pier")
        if key in TOWN:
            return self.set_place("town")
        if key in SKIP:
            self._bubble("me", raw)
            replies = self.set_time(DEPARTED)
            later = self.recovery_texts()
            # ship-leave first; recovery follows on the laptop after the animation
            return replies
        if key in CALL:
            self._bubble("me", raw)
            return self.mark_calling()
        if key in {"t-40", "t40", "40"}:
            self.set_time(T40)
            return ["Demo time T-40."]
        if key in {"t-5", "t5"}:
            self.set_time(T5)
            return ["Demo time T-5."]
        self._bubble("me", raw)
        if not self.cruise:
            return self.arm_sample()
        help_line = "Say sample, ruins, or skip."
        self._bubble("them", help_line)
        self._emit()
        return [help_line]


game = Game()
