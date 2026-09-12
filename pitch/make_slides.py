#!/usr/bin/env python3
"""Render 1920x1080 Rejoin pitch title cards (Pillow)."""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "slides"
W, H = 1920, 1080
BG = (12, 17, 24)
GOLD = (232, 195, 106)
CREAM = (242, 242, 247)
MUTED = (139, 134, 120)
LINE = (29, 38, 48)

FONT_DIR = Path("/usr/share/fonts/truetype/macos")
REG = FONT_DIR / "Inter-Regular.ttf"
MED = FONT_DIR / "Inter-Medium.ttf"
SEMI = FONT_DIR / "Inter-SemiBold.ttf"
BOLD = FONT_DIR / "Inter-Bold.ttf"

SLIDES = [
    {
        "file": "01_hook.png",
        "kicker": "STILL ASHORE. SHIP'S LEAVING.",
        "title": "REJOIN",
        "body": "A text bot for the passenger\nwho is about to miss the ship.",
    },
    {
        "file": "02_problem.png",
        "kicker": "THE PROBLEM",
        "title": "All aboard\ndoes not wait.",
        "body": "Late ashore. Loud port. Far pier.\nA panicked call that nobody answers.",
    },
    {
        "file": "03_product.png",
        "kicker": "THE PRODUCT",
        "title": "Text that you\nare still ashore.",
        "body": "Clock. Map. One tap to call\nthe port agent.",
    },
    {
        "file": "04_flow.png",
        "kicker": "THE THREAD IS THE PRODUCT",
        "title": "sample → ruins\nskip → call",
        "body": "Load a mock sailing. Stay at the ruins.\nJump the clock. Call.",
    },
    {
        "file": "05_demo.png",
        "kicker": "LIVE SIM",
        "title": "iMessage on\nlocalhost.",
        "body": "No real texts. Drop demo.mp4 here\nto replace this card.",
    },
    {
        "file": "06_how.png",
        "kicker": "HOW IT WORKS",
        "title": "Clock and map.\nNot an iMessage server.",
        "body": "A local API. Fixtures without a model key.\nSend stays off until you wire it.",
    },
    {
        "file": "07_safety.png",
        "kicker": "SAFETY",
        "title": "Allowlist.\nThey text first.",
        "body": "Empty list = nobody. Blocked numbers stay blocked.\nTry real send always returns send disabled.",
    },
    {
        "file": "08_close.png",
        "kicker": "ONE TEXT TO GET BACK",
        "title": "REJOIN",
        "body": "Still ashore. Ship's leaving.",
    },
]


def font(path: Path, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(path), size)


def wrap_draw(draw: ImageDraw.ImageDraw, text: str, fnt: ImageFont.FreeTypeFont, fill, x: int, y: int, spacing: int = 8) -> int:
    for line in text.split("\n"):
        draw.text((x, y), line, font=fnt, fill=fill)
        bbox = draw.textbbox((x, y), line, font=fnt)
        y = bbox[3] + spacing
    return y


def card(spec: dict) -> Image.Image:
    im = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(im)
    d.rectangle([0, 0, 18, H], fill=GOLD)
    d.line([(72, 86), (1848, 86)], fill=LINE, width=2)
    d.text((72, 48), "REJOIN", font=font(SEMI, 22), fill=GOLD)
    d.text((1680, 48), "3:00 PITCH", font=font(MED, 18), fill=MUTED)
    y = 180
    y = wrap_draw(d, spec["kicker"], font(SEMI, 28), GOLD, 72, y, 10)
    y += 28
    y = wrap_draw(d, spec["title"], font(BOLD, 84), CREAM, 72, y, 6)
    y += 36
    wrap_draw(d, spec["body"], font(REG, 36), MUTED, 72, y, 12)
    d.rectangle([72, 1008, 420, 1012], fill=GOLD)
    return im


def logo() -> Image.Image:
    im = Image.new("RGBA", (640, 160), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.text((8, 36), "REJOIN", font=font(BOLD, 72), fill=GOLD + (255,))
    return im


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    logo().save(OUT / "logo.png")
    for spec in SLIDES:
        card(spec).save(OUT / spec["file"], optimize=True)
        print(OUT / spec["file"])


if __name__ == "__main__":
    main()
