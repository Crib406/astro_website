# creimann.cc

Persönliche Website von Christoph B. Reimann, gebaut mit Astro (rein statisch).

```bash
npm install
npm run dev       # Entwicklungsserver
npm run build     # Produktionsbau nach dist/
npm run preview   # dist/ lokal ausliefern
```

Für Branch-Vorschauen setzt die CI `SITE` und `BASE_PATH` (z. B. `/preview/<branch>/`).
Ausführliche Dokumentation folgt.

## Prüfen

```bash
npm run verify     # build + check + test, alles muss grün sein
npm run check      # astro check (Typen, .astro-Dateien), muss 0 Fehler liefern
npm run build
npm test           # tests/*.test.mjs gegen dist/
HUGO_REF_DIR=/pfad/zum/hugo-public-raw npm run compare:hugo
```

Die Tests brauchen keine zusätzlichen Pakete (`node:test`, `cheerio`, `yaml`) und gehen nie ins Netz.
Sie prüfen das gebaute Ergebnis, vorher also bauen. Welche Seiten und Beiträge es geben muss, leiten sie aus
`src/content` und `src/lib/routes.ts` ab (nichts ist fest eingetragen); gebaut gefundene Seiten werden alle geprüft.

- `npm test` prüft: erwartete Dateien (alle Seiten und veröffentlichten Beiträge, `404.html`, `visitenkarte/`,
  `sitemap.xml`, `robots.txt`, `blog/index.xml`, CSS-/JS-Bündel, `CNAME`, `favicon.ico`), keine Entwürfe und keine
  unerwarteten Seiten, je Seite genau eine `<h1>`, `<html lang="de">`, Titel, Description, Robots (404 und
  Vorschauen `noindex`, sonst `index,follow`), absolutes Canonical, `og:*`/`twitter:*`, JSON-LD (`@graph` mit WebSite,
  Person und Seitenknoten, BreadcrumbList), `alt`/`width`/`height` an jedem `<img>`, keine übrig gebliebenen
  Hugo-Shortcodes, interne Links und Quellen (Datei muss in `dist/` existieren, Hugo-Altlasten werden gemeldet),
  Sitemap (genau die Seiten laut Frontmatter und `blogPublic`, `lastmod` = JSON-LD `dateModified` = Frontmatter),
  `robots.txt`, RSS-Feed (Einträge = veröffentlichte Beiträge, absolute Links, RFC-822-Datum) und die
  Weiterleitung von `/visitenkarte/`. Ohne `dist/` bricht der Lauf mit einem Hinweis ab.
- `tests/preview.test.mjs` baut selbst eine Vorschau (`BASE_PATH=/preview/x/`, in ein temporäres Verzeichnis) und
  lässt die ganze Suite dagegen laufen. Von Hand gegen einen vorhandenen Vorschau-Bau:
  `DIST_DIR=/pfad BASE_PATH=/preview/x/ npm test` (optional `SITE`). Geprüft werden dort zusätzlich: überall
  `noindex`, Canonical auf die Hauptseite, Hinweisleiste, alle wurzelabsoluten Verweise mit base, JSON-LD, Sitemap
  und `robots.txt` unter der Vorschau-Adresse.
- `npm run compare:hugo` vergleicht jede HTML-Seite (und Sitemap, robots.txt, Feed, statische Dateien) mit
  dem Hugo-Referenzbau (`HUGO_REF_DIR`, am besten der unminifizierte Bau). Normalisiert werden Leerraum,
  Attributreihenfolge, Hashes der Bündel-URLs, Kommentare, die Hugo-`generator`-Meta und JSON-LD
  (geparst, Schlüssel sortiert). Ausgabe je Datei `OK` oder eine Liste mit DOM-Pfad, erwartet und ist;
  Exit-Code 1 bei Abweichungen. Mit `-- --all` alle Abweichungen, mit Dateinamen als Argument nur
  einzelne Seiten (`npm run compare:hugo -- about/index.html`). Bewusst akzeptierte Abweichungen stehen in
  `scripts/compare-hugo.allow.json` (`page`, `path`-Präfix, optional `exp`/`act` als genauer Wert, `reason`):
  die entfallenen Bereichs-Feeds und die neuen `lastmod`/`dateModified`-Werte je Seite.
