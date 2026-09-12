"""Exercise the judge demo without starting Messages or the web UI."""

from __future__ import annotations

import ast
from pathlib import Path

from game import ALL_ABOARD, DEPARTED, Game, SAILS, T40, _phase
from text_gate import can_text, send_text

ROOT = Path(__file__).resolve().parents[1]
MAIN = ast.parse((ROOT / "server" / "main.py").read_text(encoding="utf-8"))


def _imported_modules() -> set[str]:
    names: set[str] = set()
    for node in ast.walk(MAIN):
        if isinstance(node, ast.Import):
            names.update(alias.name.split(".")[0] for alias in node.names)
        elif isinstance(node, ast.ImportFrom):
            names.add((node.module or "").split(".")[0])
    return names


def test_no_send_surface() -> None:
    imported = _imported_modules()
    for banned in ("text_gate", "imessage", "subprocess", "sqlite3"):
        assert banned not in imported
    assert send_text("+15551234567", "hello") == "send disabled"
    assert can_text("+15551234567") is False


def test_judge_script() -> None:
    g = Game()
    assert g.snapshot()["phase"] == "empty"
    assert g.snapshot()["show_recovery"] is False

    g.handle_text("sample")
    armed = g.snapshot()
    assert armed["phase"] == "armed"
    assert armed["place"] == "town"
    assert armed["now_sec"] == T40
    assert armed["walk_min"] == 12
    assert armed["cruise"]["all_aboard_local"] == "16:30"
    assert armed["cruise"]["departure_local"] == "17:00"
    assert armed["cruise"]["port_agent"]["phone"] == "+529878724410"
    assert armed["show_recovery"] is False
    assert armed["departed"] is False

    g.handle_text("I'm still at the ruins")
    late = g.snapshot()
    assert late["phase"] == "late"
    assert late["place"] == "ruins"
    assert late["walk_min"] == 45
    assert late["show_recovery"] is False

    g.set_time(DEPARTED)
    missed = g.snapshot()
    assert missed["now_sec"] == DEPARTED
    assert missed["phase"] == "missed"
    assert missed["departed"] is True
    assert missed["show_recovery"] is True
    assert missed["recovery_ready"] is True

    g.tick()
    after_tick = g.snapshot()
    assert after_tick["show_recovery"] is True
    assert after_tick["phase"] == "missed"

    g.mark_calling()
    calling = g.snapshot()
    assert calling["phase"] == "calling"
    assert calling["show_recovery"] is True
    assert calling["cruise"]["port_agent"]["phone"] == "+529878724410"

    g.handle_text("reset")
    assert g.snapshot()["phase"] == "empty"
    assert g.snapshot()["cruise"] is None


def test_extracted_times_drive_phase() -> None:
    g = Game()
    g.arm_sample()
    g.cruise["all_aboard_local"] = "16:00"
    g.cruise["departure_local"] = "16:20"
    g.now_sec = T40
    g.place = "town"
    assert _phase(g.cruise, g.now_sec, "town", False) == "late"
    g.set_time(16 * 3600 + 20 * 60)
    snap = g.snapshot()
    assert snap["phase"] == "missed"
    assert snap["show_recovery"] is True


def test_tick_past_sails_shows_recovery() -> None:
    g = Game()
    g.arm_sample()
    g.now_sec = SAILS - 1
    g.tick()
    snap = g.snapshot()
    assert snap["now_sec"] == SAILS
    assert snap["phase"] == "missed"
    assert snap["show_recovery"] is True


def test_early_call_does_not_sail() -> None:
    g = Game()
    g.arm_sample()
    assert g.mark_calling() == []
    snap = g.snapshot()
    assert snap["phase"] == "armed"
    assert snap["departed"] is False
    assert snap["show_recovery"] is False
    assert snap["calling"] is False


def test_skip_follows_extracted_departure() -> None:
    g = Game()
    g.arm_sample()
    g.cruise["departure_local"] = "18:00"
    g.handle_text("skip")
    snap = g.snapshot()
    assert snap["now_sec"] == 18 * 3600 + 60
    assert snap["phase"] == "missed"
    assert snap["show_recovery"] is True


def test_after_all_aboard_before_sail_is_late() -> None:
    g = Game()
    g.arm_sample()
    g.set_place("ruins")
    g.set_time(16 * 3600 + 45 * 60)
    snap = g.snapshot()
    assert snap["phase"] == "late"
    assert snap["departed"] is False
    assert snap["show_recovery"] is False


def test_skip_before_sample_is_inert() -> None:
    g = Game()
    g.set_time(DEPARTED)
    snap = g.snapshot()
    assert snap["phase"] == "empty"
    assert snap["show_recovery"] is False


def test_constants_match_fixture_clock() -> None:
    assert T40 == 15 * 3600 + 50 * 60
    assert ALL_ABOARD == 16 * 3600 + 30 * 60
    assert SAILS == 17 * 3600
    assert DEPARTED == 17 * 3600 + 60


def test_http_judge_script() -> None:
    from fastapi.testclient import TestClient

    import main

    client = TestClient(main.app)
    assert client.get("/api/health").json() == {"ok": True}
    assert client.get("/api/state").json()["phase"] == "empty"

    armed = client.post("/api/action", json={"text": "sample"}).json()
    assert armed["phase"] == "armed"
    assert armed["cruise"]["port_agent"]["phone"] == "+529878724410"

    late = client.post("/api/action", json={"text": "I'm still at the ruins"}).json()
    assert late["phase"] == "late"

    skipped = client.post("/api/demo", json={"now_sec": DEPARTED}).json()
    assert skipped["show_recovery"] is True
    assert skipped["phase"] == "missed"

    called = client.post("/api/call").json()
    assert called["state"]["phase"] == "calling"
    assert client.post("/api/action", json={"text": "reset"}).json()["phase"] == "empty"


if __name__ == "__main__":
    test_no_send_surface()
    test_judge_script()
    test_extracted_times_drive_phase()
    test_tick_past_sails_shows_recovery()
    test_early_call_does_not_sail()
    test_skip_follows_extracted_departure()
    test_after_all_aboard_before_sail_is_late()
    test_skip_before_sample_is_inert()
    test_constants_match_fixture_clock()
    test_http_judge_script()
    print("demo checks passed")
