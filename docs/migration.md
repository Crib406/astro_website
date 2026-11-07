# Migrationsprotokoll Hugo → Astro

Stand: November 2026. Die Seite wurde von Hugo (extended, Dart Sass) auf Astro 7 umgestellt. Vorgabe: gleiches
Aussehen, gleiche Funktion, gleiche URLs, keine Textänderungen. Danach folgten eine Härtungsphase und eine
SEO-Phase (siehe „Bewusste Abweichungen“). Dieses Dokument hält fest, was übernommen wurde, wo und warum der
Astro-Bau abweicht, womit die Gleichheit belegt ist und was noch zu tun ist.

## Was 1:1 übernommen wurde

| Hugo | Astro |
|---|---|
| `static/` (Bilder, Schriften, `favicon.ico`, `CNAME`; ohne die verwaiste Quellkarte `assets/maps/style.css.map`) | `public/` |
| `assets/scss/`, `assets/css/`, `assets/js/` (Template) | `src/legacy/scss/`, `css/`, `js/` (unverändert) |
| `hugo.toml` (Titel, `params.siteseo`) | `src/lib/site.ts` |
| `data/person.yaml` | `src/data/person.yaml` |
| `content/*/_index.md` | `src/content/pages/*.md` (Rohtext als HTML) |
| `content/blog/*.md` | `src/content/blog/*.md` |
| `layouts/baseof.html`, `head.html`, Header, Footer | `src/layouts/BaseLayout.astro`, `src/components/` |
| `layouts/partials/jsonld.html`, `breadcrumb.html` | `src/lib/jsonld.ts`, `JsonLd.astro`, `Breadcrumb.astro` |
| `layouts/partials/scripts.html`, SCSS-Pipeline in `head.html` | `src/lib/bundles.ts` |
| `layouts/*/list.html`, `single.html`, `index.html`, `404.html` | `src/pages/**` |
| `layouts/alias.html` | `src/pages/visitenkarte/index.astro` |
| `layouts/sitemap.xml`, `robots.txt`, RSS-Vorlage | `sitemap.xml.ts`, `robots.txt.ts`, `blog/index.xml.ts` |
| `layouts/partials/preview-banner.html`, Vorschau-Logik | `PreviewBanner.astro`, `site.ts` (`isPreview`) |
| `tools/` (Icon-Teilmenge, Favicons, Original-Schriften) | `tools/` (Pfade auf `public/`, `src/legacy/scss/vendor/` und `src/` angepasst; nicht gebaut) |

Übernommen sind Markup (Klassen, Reihenfolge, Attribute), alle Texte, URLs, Titel, Descriptions, Canonical,
Robots, Open Graph, Twitter-Karten, der JSON-LD-Graph (WebSite, Person, Seitenknoten, BreadcrumbList),
Favicons, die CSS-/JS-Bündel mit Fingerabdruck unter `assets/css/` und `assets/js/`, die Weiterleitungsseite
`/visitenkarte/`, die 404-Seite, die Vorschau-Logik (`noindex`, Canonical auf die Hauptseite, Hinweisleiste),
das Verhalten von Zukunftsdatum und Entwurf, die Zusammenfassung in der Blog-Übersicht (Kürzung auf 150
Zeichen wie `truncate`) und die Datumsformate.

Der Entwurf `loyalitaet.md` wurde als Entwurf (`draft: true`) übernommen.

## Bewusste Abweichungen

### Aus der Migration

| Thema | Hugo | Astro | Grund |
|---|---|---|---|
| `lastmod` / `dateModified` | überall `2026-10-23T13:33:40Z` (Datum eines Commits, der nur Frontmatter änderte) | Pflichtfeld im Frontmatter, von Hand gepflegt, Werte der letzten inhaltlichen Änderung (Tabelle unten) | der Wert war wertlos; Google nutzt `lastmod` nur, wenn es stimmt. Die Git-Historie beginnt mit der Migration, daher kein Datum aus Git |
| Bereichs-Feeds `about/`, `kontakt/`, `mein-weg/`, `impressum/` `index.xml` | leere Feeds mit englischem Kasten | entfallen | nicht verlinkt, nutzlos. `blog/index.xml` bleibt |
| Entwurf `test-post.md` | Demo aller Frontmatter-Felder | nicht übernommen | reine Entwicklungsvorlage; stattdessen die Vorlage in `docs/inhalte-pflegen.md` |
| Shortcodes `checklist_normal_green`, `checklist_normal_green_check` | Hugo-Shortcodes | einmalig durch das fertige HTML im Beitrag `integritaet.md` ersetzt | Ausgabe entspricht der Referenz; Vorlagen für neue Listen in `docs/inhalte-pflegen.md` |
| Frontmatter | `layout`, `type`, `url`, `cascade`, `categories`, `seo_description`, `canonicalURL` | entfernt, Schemas strikt (`z.strictObject`) | die URL steckt im Dateipfad; Tippfehler im Frontmatter brechen den Bau statt still Meta-Tags zu verlieren |
| `author`, `category` im Blog | optional (leer ergab „Von “ und eine leere Überschrift) | Pflicht, nicht leer | ein fehlendes Feld bricht den Bau mit deutscher Meldung statt eine halbleere Seite zu erzeugen |
| Blog-Sichtbarkeit | `sitemap_exclude` und `cascade` im Blog | ein Schalter `blogPublic` in `site.ts` (steuert Sitemap, Menü, Footer, RSS-Verweis) | eine dokumentierte Entscheidung statt zwei verstreuter Stellen. Verhalten bei `false` wie in Hugo |
| `<meta name="generator">` | Hugo-Version | entfällt | |
| `layout_lastmod` (CI-Schritt) | schrieb `data/layout_lastmod.json` | entfällt | `lastmod` kommt aus dem Frontmatter; `fetch-depth: 0` ist nicht mehr nötig |
| Sass-Auflösung `elements/error` | Hugo löst `_error.scss` / `error.scss` stillschweigend auf | eigener Importer in `bundles.ts` | Dart Sass bricht sonst ab; die Quellen bleiben unverändert |
| Minifizierung | `hugo --minify` | esbuild (CSS/JS), `compressHTML: false` | Byte-Vergleich daher nicht möglich; Leerraum im HTML bleibt wie in Hugo |
| Rohtext-Seiten | `unsafe = true`, `.RawContent \| safeHTML` | `<Fragment set:html={entry.body} />` | gleiche Ausgabe |
| Quellkarte `assets/maps/style.css.map` | lag in `static/assets/maps/` | entfällt | verwaist: Quellkarte eines früheren CSS-Baus, das ausgelieferte Bündel verweist nicht darauf (kein `sourceMappingURL`); 650 KB ohne Nutzen |
| Reihenfolge in der Sitemap | nach Gewicht/Datum | Seiten, dann Beiträge | für Suchmaschinen ohne Bedeutung |

Die neuen `lastmod`-Werte (alle bisher `2026-10-23T13:33:40Z`):

| Datei | `lastmod` | Letzte inhaltliche Änderung |
|---|---|---|
| `home.md` | `2026-08-12T18:00:38Z` | `layouts/index.html` (`99c91fe`): der Text der Startseite steht im Template |
| `about.md` | `2026-08-12T16:51:04Z` | `content/about` (`5ede626`) |
| `mein-weg.md` | `2026-08-12T13:17:06Z` | `content/mein-weg` (`544110a`) |
| `kontakt.md` | `2025-11-16T19:38:17Z` | `content/kontakt` (`e80ac61`) |
| `impressum.md` | `2026-02-25T19:02:54Z` | `impressum.html` (`2b611ab`) |
| `blog.md` | `2025-12-09T19:03:30Z` | jüngster veröffentlichter Beitrag |
| `integritaet.md` | `2025-12-09T19:03:30Z` | `content/blog/integritaet` (`0a70168`) |

Diese Werte stehen einzeln, mit Hugo-Wert und neuem Wert, in `scripts/compare-hugo.allow.json`; dort ist jede
Abweichung begründet.

### SEO-Phase (S1 bis S10)

Nach dem Gleichheitsnachweis (siehe „Nachweise“) bewusst eingebaut, ohne sichtbare Änderung der Optik:

| | Änderung | Grund |
|---|---|---|
| S1 | `<link rel="preload">` für `fraunces-variable.woff2` und `source-sans-3-variable.woff2` | Schriften werden sonst erst nach dem CSS entdeckt (späterer Wechsel, LCP/CLS) |
| S2 | Preload von `breadcum-bg.png` (`fetchpriority="high"`), nur auf Seiten mit Breadcrumb | als CSS-Hintergrund spät entdeckt, wahrscheinlich das LCP-Element der Unterseiten |
| S3 | `aria-label` an reinen Icon-Bedienelementen (LinkedIn im Mobilmenü und in der Autorenbox der Beiträge, Hamburger, Schließen; der LinkedIn-Link im Footer hatte es schon). Der „Nach oben“-Knopf bekommt `aria-hidden="true"` | Barrierefreiheit, Linktext für Crawler. „Nach oben“ ist nur mit der Maus bedienbar (kein Fokus, keine Tastatur) und gehört darum nicht in den Zugänglichkeitsbaum |
| S4 | 404: kein Canonical, kein Seitenknoten im JSON-LD, Titel „Seite nicht gefunden – Christoph B. Reimann“, `noindex` bleibt | eine Fehlerseite hat keine kanonische URL; der Titel war englisch |
| S5 | `person.yaml`: `areaServed` entfernt, `credentialCategory` einheitlich klein, `Person.image` = quadratisches Porträt `uebermichich.webp` | schema.org kennt `areaServed` an `Person` nicht (Validator-Warnung); ein Porträt passt besser als die Querformat-Karte |
| S6 | `WebSite.alternateName` ["Christoph Reimann", "creimann.cc"]; `BlogPosting.author` zusätzlich mit `name` und `url` | Google site names; manche Tools lösen `@id` nicht auf |
| S7 | Beiträge: `article:published_time`, `article:modified_time` | Social-Vorschauen |
| S8 | Tests für Preloads, 404 ohne Canonical, Icon-Links mit Beschriftung | sichert S1 bis S4 ab |
| S9 | RSS-Feed deutsch: Kanaltitel = Titel der Blog-Seite, Beschreibung = `description` aus `blog.md`, kein `generator` | Hugo-Standardtext „Recent content in … on …“ war englisch |
| S10 | Robots-Meta der indexierbaren Seiten `index,follow,max-image-preview:large` | erlaubt große Bildvorschauen |

Weil S1 bis S10 die Ausgabe gegenüber Hugo verändern, zeigt `npm run compare:hugo` sie als Abweichungen, sofern
sie nicht in `scripts/compare-hugo.allow.json` stehen. Das ist beabsichtigt: eine Abweichung muss dort mit Wert
benannt sein. Die Begründungen in dieser Datei verweisen mit „S1“ bis „S10“ auf die Tabelle oben. Ein Eintrag gilt
für eine Seite oder, mit `"page": "*"`, für jede Seite; der Pfad muss genau passen (oder als Präfix an einer
Leerzeichen-Grenze). Einträge ohne Treffer meldet das Skript am Ende und beendet sich mit Fehlercode 1, damit die
Liste nicht verwildert.

## Nachweise

1. **`npm run compare:hugo`** (mit `HUGO_REF_DIR` = unminifizierter Hugo-Referenzbau, erzeugt aus dem alten
   Hugo-Repo mit `hugo --destination …`): vergleicht jede HTML-Seite auf DOM-Ebene sowie Sitemap, `robots.txt`,
   Feed und statische Dateien. Normalisiert werden Leerraum, Attributreihenfolge, Hashes der Bündel-URLs,
   Kommentare, die Hugo-`generator`-Meta und JSON-LD (geparst, Schlüssel sortiert). Stand nach der Härtungsphase,
   vor der SEO-Phase: 40 Dateien geprüft, 40 OK, 19 Abweichungen laut Ausnahmenliste akzeptiert (nur die
   `lastmod`-/`dateModified`-Werte und die entfallenen Bereichs-Feeds). Stand nach der letzten Fixrunde: 40 Dateien
   geprüft, 40 OK, 123 Abweichungen akzeptiert (S1 bis S10, `lastmod`, Bereichs-Feeds, entfernte Quellkarte), keine
   Einträge der Ausnahmenliste ohne Treffer (das Skript prüft das und meldet sonst Fehlercode 1).
2. **`npm test` und `npm run check`** (`npm run verify`): Struktur, Meta-Tags, JSON-LD, Links, Sitemap, Feed,
   Weiterleitung, außerdem ein kompletter Vorschau-Bau (`BASE_PATH=/preview/x/`) gegen dieselbe Suite.
3. **Layout-Messung in einem echten Browser**, Desktop- und Handybreite, Referenz und Astro nebeneinander: nach
   `document.fonts.ready` und einmaligem Durchscrollen der Seite (damit alle Einblend-Animationen laufen) werden
   Seitenhöhe, Seitenbreite und die Oberkanten aller `h1`/`h2`/`h3`/`img`/`p` im `<main>` ausgelesen und
   verglichen. Aussagekräftig ist die Seitenhöhe, nicht ein Pixelvergleich: die Buchstaben-Animation ist selbst
   nicht pixelgenau reproduzierbar (`docs/template-fallen.md`, Punkt 12). Das Messskript ist ein Wegwerfskript und
   nicht im Repo. **Ergebnis: Layout-Messung im Browser, Stand nach SEO-Phase: alle 8 Seiten bei 1440 px und 375 px
   identisch zu Hugo (Position und Größe jedes Elements, Seitenhöhe), 404 bei 1440 px identisch; keine horizontale
   Scrollleiste mobil.**
4. Ein Byte-Vergleich der Bündel mit Hugo ist nicht möglich (anderer Minifier); die Bündel wurden stattdessen per
   Aufbau (gleiche Quellen, gleiche Reihenfolge) und per Layout-Messung geprüft.

## Offene Punkte für den Inhaber

Diese Punkte sind **nicht** umgesetzt, weil sie Texte oder rechtliche Aussagen betreffen.

**O1. Simple Analytics in der Datenschutzerklärung erwähnen.** Die Seite lädt `latest.js` von
`scripts.simpleanalyticscdn.com` (`src/components/Head.astro`). In `src/content/pages/impressum.md` steht aber nur
GitHub als Hoster. Ohne Cookies ist vermutlich keine Einwilligung nötig (§ 25 TDDDG), die Informationspflicht
nach Art. 13 DSGVO bleibt. Rechtlich prüfen lassen (keine Rechtsberatung durch dieses Projekt). Nach der
Änderung `lastmod` im Impressum anheben.

**O2. Tippfehler und Abweichungen im JSON-LD.** In `src/content/pages/mein-weg.md` (`jsonld.description`) steht
„Bunro Reimann GmbH & Co. KG“, vermutlich „Bruno“. In `src/content/blog/integritaet.md` (`jsonld.description`)
steht „Individualspychologie“, gemeint ist „Individualpsychologie“. Zudem weicht `jsonld.headline` im Beitrag
vom sichtbaren Titel (h1) ab („… der Grundstein für echtes Vertrauen“ statt „… das Fundament echter
Zugehörigkeit“); Google empfiehlt, dass das Markup dem sichtbaren Inhalt entspricht. Auch die übrigen
`jsonld.description`-Texte weichen von den Meta-Descriptions ab (about, mein-weg, Beitrag); Löschen würde die
Meta-Description gelten lassen. Entscheidung und Korrektur beim Inhaber.

**O3. Blog öffentlich machen?** Solange `blogPublic` in `src/lib/site.ts` auf `false` steht, ist der Blog gebaut,
aber weder verlinkt noch in der Sitemap. Vor dem Umschalten O2 erledigen und entscheiden, ob `loyalitaet.md`
noch Entwurf bleibt. Was dann passiert: `docs/inhalte-pflegen.md`, „Blog öffentlich schalten“.

**O4. `seo_title` mit Ortsbezug für Unterseiten (optional).** Bisher haben about, mein-weg und kontakt nur
„Seitentitel – Christoph B. Reimann“. Ein Ortsbezug (z. B. „Über mich – Christoph B. Reimann, Bad Harzburg“) hilft
bei Namens- und Ortssuche. Eintrag: Feld `seo_title` im Frontmatter der jeweiligen Seite.

**O5. Deploy: `keep_files`-Falle.** Siehe nächster Abschnitt: `keep_files: true` löscht im Root von `gh-pages`
nie etwas, bei **jedem** Deploy von `main`. Alte Hugo-Dateien, alte Bündel und entfernte Seiten blieben online.
Der Workflow muss den Root (außer `preview/`) vor dem Kopieren leeren.

**O6. Beitragsbild in mindestens 1200 px Breite.** Das `BlogPosting` im JSON-LD nennt das Titelbild des Beitrags
(`image`, derzeit 1000 × 600 px). Google empfiehlt bei `max-image-preview:large` (S10) Bilder von mindestens
1200 px Breite. Für jeden Beitrag ein Titelbild in dieser Größe ablegen und unter `image` eintragen. Das
Seitenverhältnis 5:3 sollte bleiben (die Seite setzt `width="1000" height="600"`), also z. B. 1500 × 900 px. Danach
`lastmod` des Beitrags anheben.

Weitere Beobachtungen, ohne Dringlichkeit:

- Die Footer-Überschrift „Quick Link“ ist englisch (sichtbar, also nur auf Wunsch ändern).
- `/visitenkarte/` hat `noindex` und zugleich ein Canonical: widersprüchliches Signal, ohne praktische Folge, für
  die Migration unverändert gelassen.
- Größter Hebel für die Ladezeit: das render-blockierende CSS (rund 700 KB roh). Ungenutztes CSS zu entfernen
  braucht einen Screenshot-Regressionstest, weil das JS Klassen setzt.

## Nächste Schritte: CI/CD und Deployment auf GitHub Pages

Noch nichts davon ist umgesetzt. Das Astro-Repo enthält bisher keine `.github/`-Dateien; im alten Hugo-Repo liegen
`build_and_deploy.yml`, `preview_cleanup.yml` und `.github/scripts/preview-tools.sh`.

### Workflow-Skizze

Auslöser wie bisher: Push auf `main`, `feature/**` und `claude/**`. Gegenüber dem Hugo-Workflow entfallen die
Schritte „Setup Hugo“, „Install Dart Sass“, „Compute last layout change“ und „Load baseURL from hugo.toml“ sowie
`fetch-depth: 0`.

```yaml
name: Build and Deploy

on:
  push:
    branches: [main, 'feature/**', 'claude/**']

permissions:
  contents: write

# Alle Läufe, die auf gh-pages schreiben, laufen nacheinander (auch main und Vorschauen
# untereinander und preview_cleanup.yml mit derselben Gruppe). Ohne das scheitern gleichzeitige
# Pushes mit "non-fast-forward". cancel-in-progress: false, damit ein Deploy nie mittendrin
# abgebrochen wird. Achtung: Pro Gruppe wartet höchstens ein Lauf, ein neuerer ersetzt den
# wartenden. Ein wartender Deploy von main kann so von einem späteren Vorschau-Push verdrängt
# werden; dann main erneut anstoßen.
concurrency:
  group: gh-pages
  cancel-in-progress: false

jobs:
  build-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 26          # mindestens 22.23.4 (Astro 7)
          cache: npm

      - name: Pfade bestimmen
        run: |
          BRANCH="${GITHUB_REF_NAME}"
          echo "SITE=https://creimann.cc" >> $GITHUB_ENV
          if [[ "$BRANCH" == "main" ]]; then
            echo "BASE_PATH=/" >> $GITHUB_ENV
            echo "DEST_DIR=" >> $GITHUB_ENV
          else
            echo "BASE_PATH=/preview/${BRANCH}/" >> $GITHUB_ENV
            echo "DEST_DIR=preview/${BRANCH}" >> $GITHUB_ENV
          fi

      - run: npm ci
      - run: npm run verify         # build + check + test (mit SITE und BASE_PATH, auch für Vorschauen)

      # Vorschauen sind keine eigene Domain: CNAME gehört nur in den Root von main.
      # Nach den Tests entfernen, denn tests/files.test.mjs erwartet dist/CNAME (siehe Hinweise).
      - name: CNAME aus Vorschau-Bau entfernen
        if: github.ref_name != 'main'
        run: rm dist/CNAME

      # Vorschau: nur den eigenen Unterordner ersetzen. Mit keep_files: false räumt die Action
      # laut ihrer Dokumentation nur destination_dir; beim ersten Deploy kontrollieren.
      - uses: peaceiris/actions-gh-pages@v4
        if: github.ref_name != 'main'
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_branch: gh-pages
          publish_dir: ./dist
          destination_dir: ${{ env.DEST_DIR }}
          keep_files: false

      # main: den Root von gh-pages ersetzen, preview/ bleibt. keep_files: true würde nie etwas löschen
      # (siehe „Einmalige Handgriffe und Fallen“), darum wird der Root vor dem Kopieren geleert.
      - name: Root von gh-pages aktualisieren (preview/ bleibt)
        if: github.ref_name == 'main'
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          git clone --depth 1 --branch gh-pages \
            "https://x-access-token:${GH_TOKEN}@github.com/${GITHUB_REPOSITORY}.git" site
          rsync -a --delete --exclude '/preview/' --exclude '/.git/' ./dist/ ./site/
          touch site/.nojekyll
          cd site
          git add -A
          git diff --cached --quiet && { echo "Keine Änderung"; exit 0; }
          git -c user.name=github-actions -c user.email=github-actions@users.noreply.github.com \
            commit -m "Deploy ${GITHUB_SHA}"
          git push origin gh-pages
```

Der Branch `gh-pages` muss dafür schon existieren (er tut es, solange die Hugo-Seite dort liegt).

Hinweise:

- `npm run verify` mit gesetztem `SITE`/`BASE_PATH` baut die Vorschau und prüft sie gegen die Vorschau-Tests
  (lokal mit `SITE=https://creimann.cc BASE_PATH=/preview/x/ npm run verify` ausprobiert). `SITE` ist nur der
  Ursprung, **ohne Pfad**: der Pfad steht in `BASE_PATH` (sonst bricht der Bau ab).
- Branch-Namen mit `/` (`feature/x`) ergeben `BASE_PATH=/preview/feature/x/`; die Vorschau-Erkennung kommt damit
  zurecht, `previewBranch` zeigt `feature/x`.
- Der Job `preview-index` (Übersicht unter `/preview/`) und `preview_cleanup.yml` können mit
  `preview-tools.sh` unverändert aus dem Hugo-Repo übernommen werden: sie erkennen eine Vorschau an der
  `sitemap.xml` im Vorschau-Wurzelverzeichnis, und die entsteht auch im Astro-Vorschau-Bau. Im Hugo-Repo gibt es
  zwei ähnliche Dateien (`preview-cleanup.yml` und `preview_cleanup.yml`); übernommen werden sollte nur die
  neuere, `preview_cleanup.yml`.
- `fetch-depth: 0` ist nicht nötig, weil `lastmod` aus dem Frontmatter kommt.
- `concurrency` steht auf Workflow-Ebene, nicht am Job. `preview_cleanup.yml` muss dieselbe Gruppe
  (`group: gh-pages`, `cancel-in-progress: false`) nennen, sonst können Aufräumen und Deploy gleichzeitig auf
  `gh-pages` pushen.
- `rm dist/CNAME` läuft bewusst **nach** `npm run verify`: `tests/files.test.mjs` erwartet `CNAME` in `dist/` (Datei
  vorhanden, Inhalt eine Domain) und ist auch im Vorschau-Lauf aktiv, weil `verify` dort dieselbe Suite ausführt. Ein
  Code-Eingriff ist nicht nötig: Getestet wird der Bau mit `CNAME`, ausgeliefert wird die Vorschau ohne. Der
  verschachtelte Vorschau-Bau in `tests/preview.test.mjs` schreibt in ein eigenes Temp-Verzeichnis und ist davon
  nicht berührt.

### Einmalige Handgriffe und Fallen

- **`keep_files: true` löscht im Root nie etwas, und das gilt bei jedem Deploy von `main`, nicht nur beim
  ersten.** Die Action kopiert `dist/` über den vorhandenen Stand. Was in `dist/` nicht mehr entsteht, bleibt auf
  `gh-pages` liegen und wird weiter ausgeliefert. Folgen:
  - Beim ersten Astro-Deploy: die alten Hugo-Dateien `about/index.xml`, `kontakt/index.xml`, `mein-weg/index.xml`,
    `impressum/index.xml` und die alten Bündel.
  - Danach bei jeder Änderung an CSS oder JS: der neue Fingerabdruck im Dateinamen lässt die alten
    `assets/css/bundle.min.<alter-hash>.css` und `assets/js/bundle.min.<alter-hash>.js` zurück.
  - Entfernte oder umbenannte Seiten und Beiträge (auch ein geänderter `slug`) bleiben unter der alten Adresse
    erreichbar, bis jemand sie von Hand löscht.

  Abhilfe steht im Workflow oben: für `main` den Root von `gh-pages` vor dem Kopieren leeren, `preview/` ausnehmen
  (`rsync -a --delete --exclude '/preview/' dist/ site/`), `.nojekyll` danach neu anlegen. Vorschauen laufen über die
  Action mit `keep_files: false` und `destination_dir`; das räumt nur den eigenen Ordner. Vorsicht: `keep_files:
  false` **ohne** `destination_dir` leert auch `preview/`. Ohne diese Änderung muss der Root nach jedem Deploy
  von Hand aufgeräumt werden (auf `gh-pages` auschecken, Reste mit `git rm` entfernen, pushen).
- **`.nojekyll`:** `peaceiris/actions-gh-pages` legt die Datei bei den Vorschauen standardmäßig an
  (`enable_jekyll: false`); beim Deploy von `main` legt sie der `touch`-Schritt an (`rsync --delete` würde sie
  sonst entfernen). Ohne sie würde Jekyll Ordner mit führendem Unterstrich ignorieren. (Astro legt hier zwar keinen `_astro/`-Ordner an, weil
  alle Assets unter `assets/` liegen, die Datei bleibt trotzdem sinnvoll.)
- **`CNAME`** liegt in `public/` und wird mitgebaut (`dist/CNAME`: `creimann.cc`). Er muss in `dist/` stehen, weil
  der Deploy den Root ersetzt (sonst würde `rsync --delete` ihn entfernen); ein Test prüft das. In Vorschauen wird
  die Datei nach den Tests wieder gelöscht (Workflow-Schritt „CNAME aus Vorschau-Bau entfernen“), damit unter
  `preview/<branch>/` kein `CNAME` liegt.
- **Kein `actions/deploy-pages`:** Es ersetzt immer die ganze Seite; mit den Vorschauen unter `preview/` bleibt der Branch `gh-pages` das passendere Ziel.
- **Cache:** GitHub Pages sendet `Cache-Control: max-age=600`. Der Fingerabdruck der Bündel verhindert veraltete
  Dateien; HTML ist bis zu zehn Minuten alt.
- **Trailing Slash:** `/about` leitet GitHub Pages selbst auf `/about/` um (301). Das lässt sich nicht in Astro
  abbilden; darum enden alle internen Links auf `/` (Test).

### Nach dem ersten Livegang

1. In der **Search Console** die Property prüfen und die Sitemap `https://creimann.cc/sitemap.xml` **neu einreichen**
   (die Datei hat neue `lastmod`-Werte).
2. **URL-Prüfung** der Startseite und von `/about/` anstoßen.
3. Den **Rich-Results-Test** (<https://search.google.com/test/rich-results>) und den Schema-Validator
   (<https://validator.schema.org/>) auf Startseite, `/about/` (ProfilePage) und, sobald öffentlich, einem Beitrag
   laufen lassen.
4. Prüfen, dass `https://creimann.cc/about/index.xml` 404 liefert (Root wurde geleert) und `/preview/` weiter
   funktioniert.
5. O1 bis O4 und O6 abarbeiten.
