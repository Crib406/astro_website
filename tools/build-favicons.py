#!/usr/bin/env python3
"""
Setzt das Monogramm "CBR" in der Seitenschrift Fraunces und schreibt daraus
alle Favicon-Groessen.

Warum: Frueher gab es nur eine 32x32-PNG. Google zeigt das Favicon in den
mobilen Suchergebnissen und verlangt dafuer mindestens 48x48 (bzw. ein
Vielfaches davon), iOS nimmt fuer den Startbildschirm 180x180.

Aufruf aus dem Projektwurzelverzeichnis:

    python3 tools/build-favicons.py      # braucht: pip install fonttools brotli pillow

Schreibt:
    public/assets/images/favicon/favicon.svg
    public/assets/images/favicon/favicon-{96,192}.png
    public/assets/images/favicon/apple-touch-icon.png      (180x180)
    public/favicon.ico                                     (16, 32, 48)

Das SVG enthaelt die Buchstaben als Pfade, nicht als Text — sonst haengt die
Darstellung davon ab, ob Fraunces auf dem Rechner des Besuchers installiert ist.
"""

import io
import pathlib

from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
from PIL import Image, ImageDraw, ImageFont

ROOT = pathlib.Path(__file__).resolve().parent.parent
FONT = ROOT / "public/assets/fonts/fraunces/fraunces-variable.woff2"
OUT_DIR = ROOT / "public/assets/images/favicon"
ICO = ROOT / "public/favicon.ico"

TEXT = "CBR"
# Farben aus docs/design-system.md: --color-paper als Schrift auf hellem
# Grund, wie beim bisherigen Favicon. Dunkel auf dunkel ginge in den
# Suchergebnissen im Dunkelmodus unter.
INK = "#161A12"
BACKGROUND = "#FAF8F7"
# Schnitt der variablen Schrift. Kleine optische Groesse = kraeftigere
# Haarstriche, die bei 16 px nicht wegbrechen.
AXES = {"wght": 600, "opsz": 24}
# Anteil der Kantenlaenge, den das Monogramm in der Breite einnimmt.
FILL = 0.84

# 16, 32 und 48 stecken in favicon.ico, eigene PNGs braucht es dafuer nicht.
PNG_SIZES = {
    "favicon-96.png": 96,
    "favicon-192.png": 192,
    "apple-touch-icon.png": 180,
}
ICO_SIZES = [16, 32, 48]
# Gerendert wird gross und dann verkleinert: so sehen alle Groessen gleich
# aus, statt dass die Hinting-Regeln jede Groesse anders verformen.
SUPERSAMPLE = 8


def static_font():
    """Variable Schrift auf einen festen Schnitt einfrieren."""
    font = instancer.instantiateVariableFont(TTFont(FONT), AXES)
    buf = io.BytesIO()
    font.flavor = None
    font.save(buf)
    buf.seek(0)
    return font, buf


def write_svg(font):
    glyph_set = font.getGlyphSet()
    cmap = font.getBestCmap()
    pen = SVGPathPen(glyph_set, ntos=lambda v: f"{v:.0f}")
    x = 0
    for char in TEXT:
        name = cmap[ord(char)]
        # y-Achse spiegeln: Schrift zaehlt nach oben, SVG nach unten.
        glyph_set[name].draw(TransformPen(pen, (1, 0, 0, -1, x, 0)))
        x += glyph_set[name].width

    # Begrenzung der tatsaechlich gezeichneten Konturen, nicht der Laufweiten.
    bounds = BoundsPen(glyph_set)
    x = 0
    for char in TEXT:
        name = cmap[ord(char)]
        glyph_set[name].draw(TransformPen(bounds, (1, 0, 0, -1, x, 0)))
        x += glyph_set[name].width
    x_min, y_min, x_max, y_max = bounds.bounds

    width = x_max - x_min
    side = width / FILL
    cx = (x_min + x_max) / 2
    cy = (y_min + y_max) / 2
    view = f"{cx - side / 2:.0f} {cy - side / 2:.0f} {side:.0f} {side:.0f}"
    svg = (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{view}">'
        f'<rect x="{cx - side / 2:.0f}" y="{cy - side / 2:.0f}" '
        f'width="{side:.0f}" height="{side:.0f}" fill="{BACKGROUND}"/>'
        f'<path fill="{INK}" d="{pen.getCommands()}"/>'
        "</svg>\n"
    )
    (OUT_DIR / "favicon.svg").write_text(svg)


def render(font_file, size):
    big = size * SUPERSAMPLE
    img = Image.new("RGB", (big, big), BACKGROUND)
    draw = ImageDraw.Draw(img)

    # Schriftgroesse so waehlen, dass die Breite FILL der Kante ergibt.
    probe = ImageFont.truetype(font_file, 1000)
    left, top, right, bottom = probe.getbbox(TEXT)
    pt = round(1000 * big * FILL / (right - left))
    font_file.seek(0)
    face = ImageFont.truetype(font_file, pt)
    font_file.seek(0)

    left, top, right, bottom = face.getbbox(TEXT)
    x = (big - (right - left)) / 2 - left
    y = (big - (bottom - top)) / 2 - top
    draw.text((x, y), TEXT, font=face, fill=INK)
    return img.resize((size, size), Image.LANCZOS)


def main():
    font, font_file = static_font()
    write_svg(font)

    for name, size in PNG_SIZES.items():
        render(font_file, size).save(OUT_DIR / name, optimize=True)
        font_file.seek(0)

    # Jede ICO-Groesse eigens gerendert, nicht aus der groessten verkleinert.
    icons = []
    for size in ICO_SIZES:
        icons.append(render(font_file, size))
        font_file.seek(0)
    icons[-1].save(ICO, sizes=[(s, s) for s in ICO_SIZES], append_images=icons[:-1])

    for path in sorted([*OUT_DIR.iterdir(), ICO]):
        print(f"{path.relative_to(ROOT)}  {path.stat().st_size} B")


if __name__ == "__main__":
    main()
