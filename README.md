# creimann.cc

Persönliche Website von Christoph B. Reimann. Gebaut mit [Astro](https://astro.build) 7, rein
statisch (`output: 'static'`), ohne UI-Framework. Entstanden aus einer Hugo-Seite; Aussehen, Texte und
URLs sind gleich geblieben (siehe `docs/migration.md`). Ausgeliefert wird über GitHub Pages.

## Voraussetzungen

- Node.js 22.23.4 oder neuer (Vorgabe von Astro 7; entwickelt mit Node 26) und npm
- sonst nichts für Bau und Tests: Dart Sass (`sass`) und esbuild kommen als npm-Pakete mit
- nur für die Werkzeuge in `tools/` (Icon-Teilmenge, Favicons): Python 3 mit `pip install fonttools brotli pillow`

## Befehle

```bash
npm ci               # Abhängigkeiten installieren (exakt nach package-lock.json)
npm run dev          # Entwicklungsserver, http://localhost:4321/
npm run build        # Produktionsbau nach dist/
npm run preview      # dist/ lokal ausliefern
npm run verify       # build + check + test; vor jedem Commit, alles muss grün sein
```

Im Entwicklungsserver (`npm run dev`) gibt es nur Adressen mit Schrägstrich am Ende:
`/about/` geht, `/about` liefert 404. Läuft der Server im Hintergrund, beendet ihn `npx astro dev stop`.

Einzeln:

```bash
npm run check        # astro check (Typen, .astro-Dateien), muss 0 Fehler liefern
npm test             # tests/*.test.mjs gegen dist/ (vorher bauen)
HUGO_REF_DIR=/pfad/zum/hugo-public-raw npm run compare:hugo   # Vergleich mit dem Hugo-Referenzbau
python3 tools/check-icons.py     # jedes benutzte Font-Awesome-Icon ist im Schnitt vorhanden (braucht fonttools)
```

Das Skript `tools/build-fontawesome-subset.py` erzeugt die Icon-Teilmenge neu, `tools/build-favicons.py` die
Favicons (Einzelheiten in `CLAUDE.md`). `tools/` wird nicht mitgebaut.

Branch-Vorschau lokal bauen (die CI setzt dieselben Variablen):

```bash
SITE=https://creimann.cc BASE_PATH=/preview/mein-branch/ npm run build
```

`SITE` ist nur der Ursprung (kein Pfad, sonst bricht der Bau ab), der Pfad der Vorschau steht in `BASE_PATH`.
Ohne beide Variablen gelten `https://creimann.cc` und `/`.

## Tests

Die Tests brauchen keine zusätzlichen Pakete (`node:test`, `cheerio`, `yaml`) und gehen nie ins Netz. Sie
prüfen das gebaute `dist/`, vorher also bauen (`npm run verify` tut das). Welche Seiten und Beiträge es geben
muss, leiten sie aus `src/content` und `src/lib/routes.ts` ab; eine neue Seite oder ein neuer Beitrag wird
automatisch miterwartet.

- `npm test` prüft erwartete Dateien, keine Entwürfe und keine unerwarteten Seiten, je Seite genau eine `<h1>`,
  `<html lang="de">`, Titel, Description, Robots, absolutes Canonical, `og:*`/`twitter:*`, JSON-LD (`@graph`,
  BreadcrumbList), `alt`/`width`/`height` an jedem `<img>`, interne Links und Quellen, Sitemap, `robots.txt`,
  RSS-Feed und die Weiterleitung von `/visitenkarte/`. Ohne `dist/` bricht der Lauf mit einem Hinweis ab.
- `tests/preview.test.mjs` baut selbst eine Vorschau (`BASE_PATH=/preview/x/`, in ein temporäres Verzeichnis) und
  lässt die ganze Suite dagegen laufen. Von Hand gegen einen vorhandenen Vorschau-Bau:
  `DIST_DIR=/pfad BASE_PATH=/preview/x/ npm test` (optional `SITE`).
- `npm run compare:hugo` vergleicht jede Seite mit dem Hugo-Referenzbau (`HUGO_REF_DIR`, am besten der
  unminifizierte Bau). Ausgabe je Datei `OK` oder eine Liste der Abweichungen, Exit-Code 1 bei Abweichungen oder
  bei Einträgen der Ausnahmenliste ohne Treffer.
  Mit `-- --all` alle Abweichungen, mit Dateinamen nur einzelne Seiten
  (`npm run compare:hugo -- about/index.html`). Bewusst akzeptierte Abweichungen stehen in
  `scripts/compare-hugo.allow.json`.

Einzelheiten zu jedem Test: `docs/architektur.md`, Abschnitt „Tests und Qualitätssicherung“.

## Dokumentation

| Thema | Datei |
|---|---|
| Einstieg, wichtigste Regeln (auch für KI-Werkzeuge) | `CLAUDE.md` |
| Ordner, Routen, Asset-Pipeline, SEO, Vorschauen, Tests | `docs/architektur.md` |
| Blogbeitrag, Seite, Bild, `lastmod`, Blog öffentlich schalten | `docs/inhalte-pflegen.md` |
| Fallstricke des Templates | `docs/template-fallen.md` |
| Farben, Schriften, Größen, Lesebreite | `docs/design-system.md` |
| Migrationsprotokoll Hugo → Astro, offene Punkte, Deployment | `docs/migration.md` |
