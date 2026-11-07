#!/usr/bin/env python3
"""
Prueft, ob jedes Icon in dem Schnitt, in dem die Seiten es benutzen, auch
wirklich als Zeichen vorhanden ist. Ein fehlendes Zeichen faellt sonst erst im
Browser auf — als leeres Kaestchen.

    python3 tools/check-icons.py          # braucht: pip install fonttools brotli
"""
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
FONT_DIR = ROOT / "public/assets/fonts"

# Zuordnung Style-Klasse -> Subset-Datei, samt der Kurzformen fas/far/fal/fab,
# die Font Awesome gleichbedeutend zulaesst. fa-sharp ist wirkungslos (siehe
# Skript build-fontawesome-subset.py) und zaehlt deshalb nicht als Schnitt.
STYLE_FILE = {
    "fa-solid": "fa-subset-solid.woff2",
    "fas": "fa-subset-solid.woff2",
    "fa-regular": "fa-subset-regular.woff2",
    "far": "fa-subset-regular.woff2",
    "fa-light": "fa-subset-light.woff2",
    "fal": "fa-subset-light.woff2",
    "fa-brands": "fa-subset-brands.woff2",
    "fab": "fa-subset-brands.woff2",
}
STYLES = set(STYLE_FILE) | {"fa-sharp", "fa"}

# Codepunkte aus der erzeugten SCSS lesen
scss = (ROOT / "src/legacy/scss/vendor/_fontawesome-subset.scss").read_text(encoding="utf-8")
# Schluessel mit fa--Vorsatz, damit sie direkt zu den Klassen im Markup passen.
CODE = {
    f"fa-{name}": code
    for name, code in re.findall(
        r'\.fa-([a-z0-9-]+)::before \{ content: "\\([0-9a-f]+)"', scss
    )
}


def cmap_of(filename):
    from fontTools.ttLib import TTFont
    with TTFont(FONT_DIR / filename) as f:
        return {c for t in f["cmap"].tables for c in t.cmap}


def main():
    cmaps = {s: cmap_of(fn) for s, fn in STYLE_FILE.items()}

    # Alle class="..."-Attribute einsammeln, die ein fa- enthalten: Seiten,
    # Komponenten und Layouts (*.astro) sowie die Inhalte (*.md). Das
    # Vorlagen-Material unter src/legacy/ gehoert nicht zum Markup.
    pairs = set()
    sources = list((ROOT / "src").rglob("*.astro")) + list((ROOT / "src/content").rglob("*.md"))
    for path in sorted(p for p in sources if "legacy" not in p.relative_to(ROOT).parts):
        for attr in re.findall(r'class="([^"]*fa-[^"]*)"', path.read_text(encoding="utf-8", errors="ignore")):
            classes = attr.split()
            styles = [c for c in classes if c in STYLES]
            icons = [c for c in classes if c.startswith("fa-") and c not in STYLES and c != "fa"]
            # fa-sharp allein bestimmt keinen Schnitt; ohne echten Schnitt gilt
            # die Vorgabe der .fa-Regel, also solid.
            effective = next((s for s in styles if s in STYLE_FILE), "fa-solid")
            for ic in icons:
                pairs.add((effective, ic, path.relative_to(ROOT)))

    bad = []
    for style, icon, where in sorted(pairs):
        code = CODE.get(icon)
        if code is None:
            bad.append((style, icon, where, "nicht in der Subset-CSS"))
        elif int(code, 16) not in cmaps[style]:
            bad.append((style, icon, where, f"fehlt im Schnitt {style}"))

    print(f"{len(pairs)} Icon-Verwendungen geprueft.")
    if bad:
        print("\nPROBLEME:")
        for style, icon, where, why in bad:
            print(f"  {icon:20} als {style:12} — {why}   ({where})")
        sys.exit(1)
    print("Alle Icons sind in ihrem Schnitt vorhanden.")


if __name__ == "__main__":
    main()
