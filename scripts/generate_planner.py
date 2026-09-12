"""Render a readable fake daily-planner card for the demo."""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

OUT = Path(__file__).resolve().parents[1] / "public" / "sample-planner.png"
W, H = 1600, 1200


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    candidates = [
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf" if bold else "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/Library/Fonts/Arial Bold.ttf" if bold else "/Library/Fonts/Arial.ttf",
        "/System/Library/Fonts/Supplemental/Georgia Bold.ttf" if bold else "/System/Library/Fonts/Supplemental/Georgia.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
    ]
    for path in candidates:
        if Path(path).exists():
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()


def main() -> None:
    table = Image.new("RGB", (W, H), (42, 28, 18))
    draw_table = ImageDraw.Draw(table)
    for y in range(0, H, 7):
        draw_table.line((0, y, W, y), fill=(48, 32, 20), width=1)

    card = Image.new("RGB", (1280, 860), (252, 248, 240))
    d = ImageDraw.Draw(card)
    d.rectangle((0, 0, 1279, 859), outline=(18, 32, 64), width=6)
    d.rectangle((0, 0, 1279, 118), fill=(18, 36, 72))
    d.text((56, 28), "ROYAL CARIBBEAN", font=font(28, True), fill=(212, 184, 106))
    d.text((56, 64), "Harmony of the Seas", font=font(44, True), fill=(252, 248, 240))
    d.text((56, 160), "Daily planner  ·  Cozumel, Mexico  ·  Saturday", font=font(32), fill=(18, 36, 72))

    d.rectangle((56, 230, 610, 520), fill=(18, 36, 72))
    d.rectangle((670, 230, 1224, 520), fill=(18, 36, 72))
    d.text((88, 258), "ALL ABOARD", font=font(28, True), fill=(212, 184, 106))
    d.text((88, 320), "16:30", font=font(140, True), fill=(252, 248, 240))
    d.text((702, 258), "SHIP SAILS", font=font(28, True), fill=(212, 184, 106))
    d.text((702, 320), "17:00", font=font(140, True), fill=(252, 248, 240))

    d.text((56, 560), "Next port", font=font(26, True), fill=(120, 90, 40))
    d.text((56, 600), "Roatan, Honduras  —  arrival tomorrow 08:00", font=font(36, True), fill=(18, 36, 72))
    d.text((56, 680), "Guest: Chen, cabin 10204", font=font(32), fill=(18, 36, 72))
    d.text((56, 732), "Timezone: America/Cancun", font=font(32), fill=(18, 36, 72))
    d.text((56, 790), "Present this card at the gangway. All times local.", font=font(24), fill=(90, 90, 90))

    shadow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    sd.rounded_rectangle((178, 188, 1478, 1068), radius=8, fill=(0, 0, 0, 90))
    table = table.convert("RGBA")
    table = Image.alpha_composite(table, shadow.filter(ImageFilter.GaussianBlur(18)))
    table.paste(card, (160, 170))
    OUT.parent.mkdir(parents=True, exist_ok=True)
    table.convert("RGB").save(OUT, "PNG")
    print(f"wrote {OUT}")


if __name__ == "__main__":
    main()
