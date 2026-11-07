#!/usr/bin/env python3
"""
Baut aus dem vollstaendigen Font-Awesome-Pro-Paket eine Teilmenge, die nur die
Icons enthaelt, die diese Website wirklich benutzt.

Warum: Das Original liefert 545 KB CSS und rund 1,2 MB Icon-Fonts aus, um
22 Icons zu zeichnen. Die Teilmenge kommt auf wenige Kilobyte.

Aufruf aus dem Projektwurzelverzeichnis:

    python3 tools/build-fontawesome-subset.py

Schreibt:
    src/legacy/scss/vendor/_fontawesome-subset.scss
    public/assets/fonts/fa-subset-*.woff2

Das Skript liest die benutzten Icons NICHT automatisch aus den Templates,
sondern aus der Liste ICONS weiter unten. Wer ein neues Icon einbaut, traegt es
dort ein und laesst das Skript neu laufen. Zur Kontrolle, welche Icons die
Seiten gerade verwenden (tools/check-icons.py prueft zusaetzlich, ob jedes
Icon im richtigen Schnitt vorhanden ist):

    grep -rhoE 'class="[^"]*fa-[^"]*"' src --include='*.astro' --include='*.md' \
      --exclude-dir=legacy | grep -oE '\\bfa-[a-z0-9-]+' | sort -u

Voraussetzung: pip install fonttools brotli
"""

import pathlib
import re
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
# Vollstaendiges Original. Liegt bewusst NICHT unter public/ oder src/, damit
# Astro es nicht mit ausliefert — gebraucht wird es nur hier beim Erzeugen.
SRC_DIR = ROOT / "tools/fontawesome-src"
FA_CSS = SRC_DIR / "fontawesome.css"
FONT_DIR = ROOT / "public/assets/fonts"
OUT_SCSS = ROOT / "src/legacy/scss/vendor/_fontawesome-subset.scss"

# Icons, die die Templates benutzen. Style-Klassen (fa-solid, fa-regular,
# fa-light, fa-brands, fa-sharp) gehoeren nicht hierher.
ICONS = [
    "angle-right", "arrow-right", "arrow-up", "bars-staggered",
    "calendar-day", "calendar-days", "check", "chevron-down", "chevron-right",
    "circle-check", "clock", "envelope", "handshake", "lightbulb",
    "linkedin", "linkedin-in", "location-dot", "scale-balanced", "tag",
    "times", "water", "xmark",
]

# Icons aus dem Brands-Set. Alle uebrigen kommen aus "Font Awesome 6 Pro".
BRAND_ICONS = {"linkedin", "linkedin-in"}

# Quelldatei je Schnitt. fa-sharp gibt es in Font Awesome 6.0.0 noch nicht,
# die Klasse ist im Original wirkungslos und bleibt es hier auch.
#
# In tools/fontawesome-src/ liegen die vollstaendigen Schnitte als .ttf, je rund
# 3900 Zeichen. Sie stammen aus den originalen .woff2, ausgepackt mit dem
# Referenzdekoder (npm-Paket wawoff2). Der Umweg ist noetig, weil fontTools
# diese .woff2 nicht oeffnen kann — brotli bricht beim Auspacken ab. Die frueher
# hier mitgelieferten .ttf waren unbrauchbar: fa-regular-400.ttf enthielt nur
# 6 der 21 benoetigten Zeichen, der Rest waere als leeres Kaestchen erschienen.
FACES = [
    # (Quelle,              Ziel,                      family,                  weight)
    ("fa-solid-900.ttf",   "fa-subset-solid.woff2",   "Font Awesome 6 Pro",    "900"),
    ("fa-regular-400.ttf", "fa-subset-regular.woff2", "Font Awesome 6 Pro",    "400"),
    ("fa-light-300.ttf",   "fa-subset-light.woff2",   "Font Awesome 6 Pro",    "300"),
    ("fa-brands-400.ttf",  "fa-subset-brands.woff2",  "Font Awesome 6 Brands", "400"),
]


def parse_codepoints(css_text):
    """Liest aus der Original-CSS ab, welcher Unicode-Punkt zu welchem Icon gehoert."""
    # Ein Block kann mehrere Aliasse tragen:
    #   .fa-close:before,.fa-times:before,.fa-xmark:before {\n content: "\f00d"\n}
    # Deshalb erst den ganzen Selektorblock greifen, dann alle Namen daraus lesen.
    found = {}
    pattern = re.compile(r'([^{}]+)\{([^{}]*)\}', re.S)
    for selectors, body in pattern.findall(css_text):
        m = re.search(r'content:\s*"\\([0-9a-fA-F]+)"', body)
        if not m:
            continue
        for sel in re.findall(r'\.fa-([a-z0-9-]+):{1,2}before', selectors):
            found.setdefault(sel, m.group(1).lower())
    return found


def main():
    if not FA_CSS.exists():
        sys.exit(f"Original-CSS fehlt: {FA_CSS}")

    codepoints = parse_codepoints(FA_CSS.read_text(encoding="utf-8", errors="ignore"))

    missing = [i for i in ICONS if i not in codepoints]
    if missing:
        sys.exit("Diese Icons stehen nicht in der Original-CSS: " + ", ".join(missing))

    unicodes = sorted({codepoints[i] for i in ICONS})
    print(f"{len(ICONS)} Icons, {len(unicodes)} verschiedene Unicode-Punkte")

    # Fonts verkleinern
    FONT_DIR.mkdir(parents=True, exist_ok=True)
    for src_name, dst_name, _family, _weight in FACES:
        src, dst = SRC_DIR / src_name, FONT_DIR / dst_name
        if not src.exists():
            sys.exit(f"Quell-Font fehlt: {src}")
        subprocess.run(
            [
                sys.executable, "-m", "fontTools.subset", str(src),
                f"--unicodes={','.join(unicodes)}",
                "--flavor=woff2",
                "--layout-features=",
                "--no-hinting",
                "--desubroutinize",
                f"--output-file={dst}",
            ],
            check=True,
        )
        # Nachsehen, welche der gewuenschten Zeichen wirklich drin gelandet sind.
        from fontTools.ttLib import TTFont
        with TTFont(dst) as f:
            have = {c for t in f["cmap"].tables for c in t.cmap}
        covered = [u for u in unicodes if int(u, 16) in have]
        print(f"  {src_name:20} {src.stat().st_size/1024:8.1f}K  ->  "
              f"{dst_name:24} {dst.stat().st_size/1024:6.1f}K   "
              f"{len(covered)}/{len(unicodes)} Zeichen")

    # CSS erzeugen
    lines = [
        "// Erzeugt von tools/build-fontawesome-subset.py — nicht von Hand aendern.",
        "// Enthaelt nur die Icons, die die Templates benutzen (Liste im Skript).",
        "",
    ]
    for _src, dst_name, family, weight in FACES:
        lines += [
            "@font-face {",
            f'  font-family: "{family}";',
            "  font-style: normal;",
            f"  font-weight: {weight};",
            "  font-display: block;",
            f'  src: url("../fonts/{dst_name}") format("woff2");',
            "}",
            "",
        ]

    lines += [
        ".fa, .fa-brands, .fa-light, .fa-regular, .fa-sharp, .fa-solid,",
        ".fab, .fal, .far, .fas {",
        "  -moz-osx-font-smoothing: grayscale;",
        "  -webkit-font-smoothing: antialiased;",
        "  display: var(--fa-display, inline-block);",
        "  font-style: normal;",
        "  font-variant: normal;",
        "  line-height: 1;",
        "  text-rendering: auto;",
        "}",
        "",
        ".fa, .fa-light, .fa-regular, .fa-sharp, .fa-solid,",
        ".fal, .far, .fas {",
        '  font-family: "Font Awesome 6 Pro";',
        "}",
        "",
        ".fa-brands, .fab {",
        '  font-family: "Font Awesome 6 Brands";',
        "  font-weight: 400;",
        "}",
        "",
        ".fa, .fa-solid, .fas { font-weight: 900; }",
        ".fa-regular, .far { font-weight: 400; }",
        ".fa-light, .fal { font-weight: 300; }",
        "",
        "// fa-sharp existiert in Font Awesome 6.0.0 noch nicht und war schon im",
        "// Original wirkungslos: die Klasse setzt bewusst nichts.",
        "",
    ]

    for icon in ICONS:
        fam = "Brands" if icon in BRAND_ICONS else "Pro"
        lines.append(
            f'.fa-{icon}::before {{ content: "\\{codepoints[icon]}"; }}'
            + (f"  // {fam}" if fam == "Brands" else "")
        )
    lines.append("")

    OUT_SCSS.parent.mkdir(parents=True, exist_ok=True)
    OUT_SCSS.write_text("\n".join(lines), encoding="utf-8")
    print(f"\nGeschrieben: {OUT_SCSS.relative_to(ROOT)} "
          f"({OUT_SCSS.stat().st_size/1024:.1f}K statt {FA_CSS.stat().st_size/1024:.0f}K)")


if __name__ == "__main__":
    main()
