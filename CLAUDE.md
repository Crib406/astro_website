# creimann.cc

Persönliche Website von Christoph B. Reimann. Astro 7, rein statisch, dunkle Waldgrün-Palette,
Deployment über GitHub Pages. Die Seite wurde von Hugo nach Astro migriert und sieht gleich aus wie vorher.

Diese Datei ist der Einstieg. Ausführliches steht in `docs/` — das wird **nicht gebaut** und ist nur für
Menschen und Werkzeuge gedacht.

| Thema | Datei |
|---|---|
| Ordner, Routen, Asset-Pipeline, SEO/JSON-LD, Vorschauen, Tests | `docs/architektur.md` |
| Blogbeitrag, Seite, Bild, `lastmod`, Blog öffentlich schalten | `docs/inhalte-pflegen.md` |
| Fallstricke des Templates | `docs/template-fallen.md` |
| Farben, Schriften, Größen, Lesebreite | `docs/design-system.md` |
| Migration von Hugo, offene Punkte, Deployment | `docs/migration.md` |

## Lokal arbeiten

Node 22.23.4 oder neuer, sonst nichts (Dart Sass und esbuild sind npm-Pakete).

```bash
npm ci
npm run dev        # http://localhost:4321/ (Adressen nur mit Schrägstrich am Ende)
npm run verify     # build + check + test
```

**Vor jedem Commit `npm run verify`.** Es baut die Seite, prüft Typen und `.astro`-Dateien (`astro check`,
0 Fehler) und lässt die Tests laufen, darunter einen eigenen Vorschau-Bau.

## Die wichtigsten Regeln

**Links nur über `relUrl` / `absUrl` aus `src/lib/site.ts`, Pfade nur aus `src/lib/routes.ts`.**
`relUrl(pagePath('about'))` für Links, `relUrl(pagePath('home'))` bzw. `relUrl('')` für die Startseite,
`absUrl(…)` für absolute URLs (Canonical, JSON-LD, Sitemap). Nie `href="/…"` von Hand: In einer
Branch-Vorschau (`/preview/<branch>/`) führt das aus der Vorschau heraus. Ein führender `/` im Argument gilt
als base-relativ (`relUrl('/about/')` ergibt `<base>about/`, nicht die Domain-Wurzel). Einzige bewusste
Ausnahme: der Link „Alle Vorschauen“ in `PreviewBanner.astro` zeigt hart auf `/preview/`.
Die 404-Seite darf nur wurzelabsolute, base-fähige Links haben, nie relative (sie erscheint unter beliebigen
Pfaden).

**Buttons niemals in ein Element mit `inv-title-animation-wrap` schachteln.** Die Split-Text-Animation
(`src/legacy/js/main.js`) zerlegt jeden Text darin in Buchstaben mit `opacity: 0` — der Button erscheint
dann leer. Das ist in diesem Projekt schon dreimal passiert, siehe `docs/template-fallen.md`, Punkt 1a.

**Rohtext-Seiten sind HTML, nicht Markdown.** `about`, `mein-weg`, `kontakt` und `impressum` stehen in
`src/content/pages/*.md` als fertiges HTML samt `<style>`-Blöcken und werden unverändert ausgegeben
(`<Fragment set:html={entry.body} />`). Markdown wird dort nicht gerendert. Interne Links darin bleiben
relativ (`../kontakt/`), nie absolut (`/kontakt/`). Nur die Blogbeiträge (`src/content/blog/*.md`) sind echtes
Markdown, und auch dort wird Markdown innerhalb von HTML-Blöcken nicht gerendert (`<strong>` statt `**`).

**CSS und JS gehen als je ein gebündeltes, fingerabdruckbenanntes Paket raus**
(`/assets/css/bundle.min.<hash>.css`, `/assets/js/bundle.min.<hash>.js`). Gebaut wird in `src/lib/bundles.ts`.
Neue Skripte gehören in die Liste `jsFiles` dort, nicht als eigenes `<script>` ins Template — und nach
`src/legacy/js/`, nicht nach `public/`. **Die Reihenfolge in `jsFiles` ist bedeutsam:** jQuery zuerst,
`main.js` zuletzt. Kein `?v=` von Hand, der Fingerabdruck erledigt das. CSS und JS nicht über Astro/Vite
importieren (`import './x.css'`, `<script>` ohne `is:inline`): sonst ändern sich Reihenfolge und URLs.

**`is:inline` ist Pflicht** an jedem `<script>` und `<style>` in `.astro`-Dateien. Ohne das scoped Astro ein `<style>`
und verarbeitet ein `<script>` als Modul. JSON-LD als
`<script type="application/ld+json" is:inline set:html={…}>`.

**`compressHTML: false` ist Absicht** (`astro.config.mjs`). Astro 7 entfernt sonst Leerraum zwischen Elementen
nach JSX-Regeln: Wortabstände und die Lücken zwischen `inline-block`-Elementen (Menü, Buttons, Icons) gehen
verloren. Nicht ändern.

**Eigene Anpassungen gehören nach `src/legacy/scss/elements/_modern-refresh.scss`.** Die Datei wird als letzte
geladen. Beim Überschreiben von Template-Regeln auf die Spezifität achten, siehe `docs/template-fallen.md`,
Punkt 2. Der übrige Inhalt von `src/legacy/` ist das Template, 1:1 aus Hugo übernommen: möglichst nicht
anfassen.

**Textmaße erst nach `document.fonts.ready` messen.** Umbruch, Höhe und Zeilenzahl vorher zu messen liefert
die Werte der Ersatzschrift. `SplitText` friert den Umbruch dauerhaft ein, siehe `docs/template-fallen.md`,
Punkt 12.

**Font Awesome liegt nur als Teilmenge vor.** Ein neues Icon erscheint sonst als leeres Kästchen.
Die Teilmenge besteht aus `src/legacy/scss/vendor/_fontawesome-subset.scss` und vier
`public/assets/fonts/fa-subset-*.woff2`. Erzeugt wird sie mit `tools/build-fontawesome-subset.py`
(Original-Schriften in `tools/fontawesome-src/`), geprüft mit `tools/check-icons.py`. `tools/` liegt außerhalb
von `src/` und `public/` und wird nicht gebaut. Beide Skripte brauchen `pip install fonttools brotli`.
Vorgehen bei einem neuen Icon:

1. Icon in die Liste `ICONS` in `tools/build-fontawesome-subset.py` eintragen.
2. `python3 tools/build-fontawesome-subset.py` ausführen. Das schreibt die SCSS-Datei und die vier Schriften neu.
3. `python3 tools/check-icons.py` ausführen: es sucht alle `fa-…`-Klassen in `src/**/*.astro` und
   `src/content/**/*.md` und meldet Icons, die im benutzten Schnitt fehlen (sonst leeres Kästchen).
4. `npm run verify` und das Icon im Browser ansehen.

Die Favicons (`public/favicon.ico`, `public/assets/images/favicon/`) erzeugt `python3 tools/build-favicons.py`
(braucht zusätzlich `pillow`); das Monogramm „CBR“ steht im Skript.

**Hervorhebungen werden gegen den Fließtext gemessen, nicht gegen den Hintergrund.** Eine Farbe kann auf
dunklem Grund gut lesbar sein und trotzdem neben dem cremefarbenen Text zurückfallen.

**Die Lesebreite wird an der Spalte begrenzt, nicht am einzelnen Element, und in Pixeln statt in `ch`.**
Siehe `docs/template-fallen.md`, Punkt 9.

**Es gibt zwei Fließtextgrößen, nicht mehr.** Lesetext und Nebentext, Werte in `docs/design-system.md`.

**Content-Schemas sind strikt** (`src/content.config.ts`): unbekannte Felder, ein fehlendes `lastmod`/`summary`/`author`/`category`
oder ein Datum ohne Anführungszeichen brechen den Bau ab. Das ist gewollt.

**`lastmod` von Hand pflegen.** Pflichtfeld in jeder Seite und jedem Beitrag; speist Sitemap und JSON-LD
`dateModified`. Bei jeder inhaltlichen Änderung anheben, bei reinen Frontmatter- oder Layoutänderungen nicht.
Siehe `docs/inhalte-pflegen.md`.

**Keine neuen Abhängigkeiten ohne Absprache.** Erlaubt sind `astro`, `sass`, `esbuild`, `yaml` (und
`cheerio`, `@astrojs/check`, `typescript` für Tests und Prüfung). Kein React/Vue/Tailwind, kein MDX, keine
Markdown-Plugins, kein `@astrojs/sitemap`/`@astrojs/rss`, kein Prefetch, kein `<ClientRouter />`, keine View
Transitions (jQuery, GSAP und ScrollTrigger starten beim Laden des Dokuments).

## Struktur

```
public/      Bilder, Schriften, favicon.ico, CNAME — wird 1:1 kopiert
src/
  content/   pages/ (Seiten, Rohtext) und blog/ (Beiträge, Markdown)
  data/      person.yaml (Angaben zur Person für das JSON-LD)
  lib/       site.ts routes.ts pages.ts blog.ts bundles.ts jsonld.ts dates.ts
  components/ layouts/ pages/   Astro-Komponenten, Layout, Routen
  legacy/    scss/, css/, js/ — das Template aus Hugo, möglichst unverändert
scripts/     compare-hugo.mjs und seine Ausnahmenliste
tests/       Prüfungen gegen das gebaute dist/
docs/        diese Doku (nicht gebaut)
```

Das Template ist direkt ins Projekt kopiert, nicht als Paket eingebunden. Es gibt also kein Update, das eigene
Änderungen überschreiben könnte.

**Bekannte Altlast:** In `src/content/pages/about.md` und `mein-weg.md` stehen vollständige HTML-Blöcke samt
`<style>`-Bereichen. Inhalt und Gestaltung sind dort vermischt. Bewusst so belassen.

## Vorschauen

Jeder Push auf `feature/**` oder `claude/**` soll eine Vorschau unter `creimann.cc/preview/<branch>/` erzeugen
(CI-Umstellung noch offen, siehe `docs/migration.md`). Gebaut wird mit `SITE` und `BASE_PATH`; die Seite
erkennt daran selbst, dass sie eine Vorschau ist (`noindex`, Canonical auf die Hauptseite, Hinweisleiste).
Details in `docs/architektur.md`, Abschnitt „Vorschauen“.
