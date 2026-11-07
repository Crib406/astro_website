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

## Tests

Die Tests brauchen keine zusätzlichen Pakete (`node:test` und `cheerio`) und gehen nie ins Netz.
Sie prüfen das gebaute Ergebnis, vorher also bauen:

```bash
npm run build
npm test                                   # tests/*.test.mjs gegen dist/
HUGO_REF_DIR=/pfad/zum/hugo-public-raw npm run compare:hugo
```

- `npm test` prüft: erwartete Dateien (alle Seiten, `404.html`, `visitenkarte/`, `sitemap.xml`,
  `robots.txt`, `blog/index.xml`, CSS-/JS-Bündel, `CNAME`, `favicon.ico`), je Seite genau eine `<h1>`,
  `<html lang="de">`, Titel, Description, absolutes Canonical, `og:*`/`twitter:*`, JSON-LD (`@graph` mit
  WebSite, Person und Seitenknoten, BreadcrumbList), `alt`/`width`/`height` an jedem `<img>`,
  interne Links und Quellen (Datei muss in `dist/` existieren, Hugo-Altlasten werden gemeldet), Sitemap nur
  mit indexierbaren Seiten, `robots.txt` mit Sitemap-Verweis, Weiterleitung von `/visitenkarte/`.
  Ohne `dist/` bricht der Lauf mit einem Hinweis ab. Optional: `DIST_DIR`, `SITE`, `BASE_PATH`
  (für Vorschau-Bauten, z. B. `BASE_PATH=/preview/x/`).
- `npm run compare:hugo` vergleicht jede HTML-Seite (und Sitemap, robots.txt, Feed, statische Dateien) mit
  dem Hugo-Referenzbau (`HUGO_REF_DIR`, am besten der unminifizierte Bau). Normalisiert werden Leerraum,
  Attributreihenfolge, Hashes der Bündel-URLs, Kommentare, die Hugo-`generator`-Meta und JSON-LD
  (geparst, Schlüssel sortiert). Ausgabe je Datei `OK` oder eine Liste mit DOM-Pfad, erwartet und ist;
  Exit-Code 1 bei Abweichungen. Mit `-- --all` alle Abweichungen, mit Dateinamen als Argument nur
  einzelne Seiten (`npm run compare:hugo -- about/index.html`). Bewusst akzeptierte Abweichungen stehen in
  `scripts/compare-hugo.allow.json` (`page`, `path`-Präfix, `reason`; derzeit nur die entfallenen
  Bereichs-Feeds).
