# Architektur

Wie eine Änderung von der Quelldatei auf die Live-Seite kommt. Astro 7, rein statisch (`output: 'static'`),
`trailingSlash: 'always'`, `build.format: 'directory'`. Keine UI-Frameworks, kein Client-Routing.

## Was gehört wohin

| Ordner | Inhalt |
|---|---|
| `src/content/pages/` | Seiten: Frontmatter und Rohtext (HTML). `home`, `about`, `mein-weg`, `kontakt`, `impressum`, `blog` |
| `src/content/blog/` | Blogbeiträge (Markdown) |
| `src/data/` | Strukturierte Daten, `person.yaml` (Person für das JSON-LD) |
| `src/pages/` | Routen (eine Datei je URL, siehe unten) |
| `src/layouts/` | `BaseLayout.astro`: `<head>`, Banner, Header, `<main>`, Footer, JS-Bündel |
| `src/components/` | `Head`, `JsonLd`, `Breadcrumb`, `Header`, `Footer`, `Favicons`, `PreviewBanner`, `ScrollToTop` |
| `src/lib/` | `site.ts`, `routes.ts`, `pages.ts`, `blog.ts`, `jsonld.ts`, `dates.ts`, `bundles.ts`, `xml.ts` (XML-Escaping für Sitemap und Feed), `origin.mjs` (Standard-Ursprung, gemeinsam für `astro.config.mjs`, `site.ts` und Tests) |
| `src/legacy/` | Das Template aus Hugo: `scss/`, `css/vendor/bootstrap.min.css`, `js/`. Möglichst unverändert. |
| `src/content.config.ts` | Collections `pages` und `blog` mit ihren Schemas |
| `public/` | Bilder, Schriften, `favicon.ico`, `CNAME`. **Wird 1:1 kopiert.** |
| `scripts/` | `compare-hugo.mjs` und `compare-hugo.allow.json` |
| `tools/` | Python-Werkzeuge für Icon-Teilmenge und Favicons samt Original-Schriften (siehe unten). Wird **nicht** gebaut. |
| `tests/` | Prüfungen gegen das gebaute `dist/` |
| `docs/` | Diese Doku. Wird **nicht** gebaut. |
| `dist/` | Bauergebnis. Nicht eingecheckt. |

Der Unterschied zwischen `src/legacy/` und `public/` ist der wichtigste: Alles unter `public/` landet unverändert
auf dem Server. SCSS, CSS und JS unter `src/legacy/` laufen durch die Bündel-Pipeline (`src/lib/bundles.ts`) und
sind danach zwei Dateien. Ein Skript oder Stylesheet in `public/` würde ungebündelt und ohne Fingerabdruck
ausgeliefert.

`docs/` ist sicher, weil Astro nur `src/pages/` baut und `public/` kopiert. Nachprüfen:
`npm run build && find dist -ipath "*docs*"` bleibt leer.

## Routen

Explizite Dateien, kein generisches `[...slug]`. Die URL steckt im Dateipfad. Alle Pfade, die Menü, Footer,
Breadcrumb, Sitemap, Feed und Seiten-Props kennen, stehen **nur** in `src/lib/routes.ts`; die Dateien unter
`src/pages/` müssen dazu passen.

| URL | Datei | Inhalt aus |
|---|---|---|
| `/` | `src/pages/index.astro` | Seitendaten `content/pages/home.md`, Markup im Template |
| `/about/` | `src/pages/about/index.astro` | `content/pages/about.md` (Rohtext) |
| `/mein-weg/` | `src/pages/mein-weg/index.astro` | `content/pages/mein-weg.md` (Rohtext) |
| `/kontakt/` | `src/pages/kontakt/index.astro` | `content/pages/kontakt.md` (Rohtext) |
| `/impressum/` | `src/pages/impressum/index.astro` | Rahmen im Template, Text in `content/pages/impressum.md` |
| `/blog/` | `src/pages/blog/index.astro` | `content/pages/blog.md` + veröffentlichte Beiträge |
| `/blog/<slug>/` | `src/pages/blog/[slug]/index.astro` | `content/blog/*.md` |
| `/blog/index.xml` | `src/pages/blog/index.xml.ts` | RSS-Feed der veröffentlichten Beiträge |
| `/404.html` | `src/pages/404.astro` | nur Template |
| `/visitenkarte/` | `src/pages/visitenkarte/index.astro` | Weiterleitung auf die Startseite |
| `/sitemap.xml` | `src/pages/sitemap.xml.ts` | alle Seiten und Beiträge |
| `/robots.txt` | `src/pages/robots.txt.ts` | drei Zeilen |
| `/assets/css/bundle.min.<hash>.css` | `src/pages/assets/css/bundle.min.[hash].css.ts` | CSS-Bündel |
| `/assets/js/bundle.min.<hash>.js` | `src/pages/assets/js/bundle.min.[hash].js.ts` | JS-Bündel |

Zur Weiterleitung `/visitenkarte/`: bewusst kein Astro-`redirects`. Das erzeugte eine englische Seite ohne
Favicons und ohne `location.replace`. Stattdessen eine eigene Seite (`<meta http-equiv="refresh">` **und**
`location.replace`, Favicons, `noindex`, Ziel `homeUrl()`). Die Adresse steht auf der gedruckten Visitenkarte,
deshalb gibt es einen eigenen Test (`visitenkarte/: leitet auf die Startseite weiter`).

Der Schrägstrich am Ende ist Pflicht (`trailingSlash: 'always'`). Im Entwicklungsserver liefert `/about` 404;
auf GitHub Pages leitet GitHub `/about` selbst auf `/about/` um. Darum endet jeder interne Link auf `/`, auf
`#…` oder einer Dateiendung (Test in `links.test.mjs`).

Folgende Dinge gibt es **nicht**, mit Absicht: `redirects`, Prefetch, `<ClientRouter />`, View Transitions,
Markdown-Plugins, MDX, `@astrojs/sitemap`, `@astrojs/rss`. jQuery, GSAP und ScrollTrigger starten beim Laden des
Dokuments; Client-Routing würde sie kaputtmachen.

## Asset-Pipeline

CSS und JS gehen je als **eine** Datei raus, minimiert und mit einem Fingerabdruck aus dem Inhalt im Namen
(`bundle.min.<sha256>.css`). Gebaut wird in `src/lib/bundles.ts` (`getCssBundle()`, `getJsBundle()`); die beiden
Endpunkte unter `src/pages/assets/` liefern den Inhalt per `getStaticPaths` aus, und `Head.astro` bzw.
`BaseLayout.astro` binden dieselbe Adresse ein. Die Adresse ändert sich nur, wenn sich der Inhalt ändert. GitHub
Pages schickt alles mit `Cache-Control: max-age=600`, der Fingerabdruck verhindert also veraltete Dateien, bringt
aber kein Langzeit-Caching.

### CSS

`src/legacy/css/vendor/bootstrap.min.css` + `src/legacy/scss/style.scss` (Dart Sass, `style: 'compressed'`), danach
`esbuild` mit `loader: 'css', minify: true`. Reihenfolge: Bootstrap zuerst, dann das kompilierte SCSS.

**Das Bündel muss unter `assets/css/` liegen.** Das SCSS adressiert die Schriften relativ als `../fonts/…`
(`public/assets/fonts/`); läge das Bündel woanders, zeigte der Pfad ins Leere. Das gilt auch in Vorschauen: dort
liegt es unter `/preview/<branch>/assets/css/`, die relativen Pfade stimmen weiter.

**Die Reihenfolge der Imports in `style.scss` ist bedeutsam.** `elements/modern-refresh` steht als letztes, damit
eigene Anpassungen die Template-Regeln überschreiben können.

**Sass-Importer-Workaround für `_error.scss`.** Im SCSS existieren sowohl `elements/_error.scss` als auch
`elements/error.scss` (beide leer). Hugos Sass löst `@import 'elements/error'` stillschweigend auf, Dart Sass
bricht mit „It's not clear which file to import“ ab. Die Quellen bleiben unverändert; stattdessen gibt es in
`bundles.ts` einen eigenen Importer (`scssImporter`), der bei Mehrdeutigkeit die Partial-Datei (`_name.scss`)
nimmt. Wer eine neue SCSS-Datei anlegt: nicht zwei Dateien mit gleichem Namen mit und ohne Unterstrich.

Warnungen von Sass (das Template nutzt noch `@import` und alte Farbfunktionen) sind abgeschaltet
(`logger: sass.Logger.silent`). Ein echter Fehler bricht den Bau trotzdem ab.

### JS

Die Skripte aus `src/legacy/js/` in der Liste `jsFiles` (`bundles.ts`), verbunden mit `\n;\n` (wie Hugos
`resources.Concat`; das Semikolon schützt vor offenen Anweisungen, wenn eine Datei ohne Semikolon endet), dann
`esbuild transform` mit `minify`, **ohne** `format` (kein IIFE-Wrapper, globale Variablen bleiben global),
**ohne** Bündelung oder Modulumbau. Es sind klassische Skripte mit globaler jQuery.

**Die Reihenfolge in `jsFiles` ist bedeutsam:** jQuery zuerst, `main.js` zuletzt. Eingebunden wird das Bündel in
`BaseLayout.astro` als `<script is:inline defer src=…>` am Ende von `<body>`; `defer` führt in
Dokumentreihenfolge aus. Fehlt eine Datei der Liste, bricht der Bau mit einer klaren Meldung ab. Die Quellen
kommen über `import.meta.glob('../legacy/js/**/*.js', { query: '?raw' })`; so kennt Vite sie und lädt im
Entwicklungsserver bei Änderungen neu.

### Dev-Cache

Das Bündel wird einmal pro Prozess gebaut und im Speicher gehalten (Head und Endpunkt müssen denselben Hash
sehen). Im Entwicklungsserver gilt der Zwischenspeicher nur, solange sich unter `src/legacy/` nichts ändert
(`legacyStamp()` nimmt die neueste Änderungszeit); danach wird neu gebaut, Hash und URL wechseln. Ein
fehlgeschlagener Bau bleibt nicht im Speicher hängen. Pfade werden nie über `import.meta.url` aufgelöst, weil die
Module beim Bau in Chunks unter `dist/.prerender` landen; stattdessen `process.cwd()` (Astro läuft im
Projektstamm).

### Regeln für `.astro`-Dateien

- `is:inline` an jedem `<script>` und `<style>`, sonst scoped oder verarbeitet Astro sie.
- JSON-LD: `<script type="application/ld+json" is:inline set:html={…}>`.
- `compressHTML: false` (siehe `CLAUDE.md`): Leerraum bleibt wie im Hugo-Markup.
- Nicht über Vite/Astro importieren: Reihenfolge und URLs wären andere.

### Font Awesome

Als Teilmenge: `src/legacy/scss/vendor/_fontawesome-subset.scss` (2,6 KB) und vier
`public/assets/fonts/fa-subset-*.woff2` (zusammen 7,3 KB). Die Erzeugungs-Werkzeuge aus Hugo
(`tools/build-fontawesome-subset.py`, `check-icons.py`) sind nicht migriert, Vorgehen bei einem neuen Icon steht
in `CLAUDE.md`.

## Content Layer

`src/content.config.ts` definiert zwei Collections mit dem `glob`-Loader (`*.md`).

| Collection | Ordner | Ausgabe |
|---|---|---|
| `pages` | `src/content/pages/` | `entry.body` (Rohtext) unverändert per `<Fragment set:html={entry.body} />`, **nicht** als Markdown gerendert |
| `blog` | `src/content/blog/` | `render(entry)`: Markdown, von Astro gerendert |

**Schemas sind strikt** (`z.strictObject`): ein unbekanntes Feld (Tippfehler wie `descripton`) bricht den Bau ab,
statt dass Meta-Tags still fehlen. Die Hugo-Altfelder (`layout`, `type`, `url`, `cascade`, `categories`,
`seo_description`, `canonicalURL`) gibt es nicht mehr; die URL steckt im Dateipfad.

| Feld | `pages` | `blog` |
|---|---|---|
| `title` | Pflicht | Pflicht |
| `lastmod` | Pflicht | Pflicht |
| `date` | – | Pflicht, Text in Anführungszeichen mit Offset |
| `summary`, `author`, `category` | – | Pflicht (nicht leer) |
| `description`, `seo_title`, `jsonld` | optional | optional |
| `sitemap_exclude` | optional | – |
| `draft`, `slug`, `author_role`, `author_bio`, `image`, `featured_image`, `tags`, `reading_time` | – | optional |

Dazu die Einzelheiten:

- **`lastmod` wird von Hand gepflegt.** Die Historie des Repos beginnt mit der Migration, ein Datum aus Git wäre
  für alle Dateien „heute“. Es speist die Sitemap (`<lastmod>`) und das JSON-LD (`dateModified`), beides
  denselben Wert; ein Test prüft das. Wann man es anhebt: `docs/inhalte-pflegen.md`.
- **`date` ist Text in Anführungszeichen** (`"2025-12-06T10:00:00+01:00"`). Ein unquotierter Zeitstempel macht
  YAML zu einem `Date` und verliert den Offset. Der Offset bleibt wörtlich erhalten (`src/lib/dates.ts`,
  `parseLiteralDate`): Anzeige und `datePublished` zeigen den 6.12.2025, ganz gleich, in welcher Zeitzone der Bau
  läuft. Ein reines Datum oder eine Zeit ohne Offset gilt als UTC (`…T00:00:00Z`, wie in Hugo).
- **Veröffentlicht** ist ein Beitrag, wenn `draft` nicht `true` ist **und** das Datum nicht in der Zukunft liegt
  (`getPublishedPosts()` in `blog.ts`, wie Hugos `buildFuture = false`). Ein Zukunftsdatum wird erst beim
  nächsten Bau wirksam, der nach dem Datum läuft: die Seite ist statisch.
- Reihenfolge der Beiträge: Datum absteigend, bei gleichem Datum Titel aufsteigend (wie Hugo).
- `slug` im Frontmatter bestimmt das URL-Segment, sonst der Dateiname (`postSlug()` in `routes.ts`).
- `jsonld` ist ein freies Objekt (`z.record`), siehe „Suchmaschinen“.
- `sitemap_exclude: true` nimmt eine Seite aus der Sitemap (derzeit nur das Impressum).

Die Rohtext-Seiten enthalten vollständiges HTML samt `<style>`. Deshalb gibt es kein Markdown-Plugin und kein
`@astrojs/markdown-remark`: Astro 7 rendert Markdown mit Sätteri (Standard-Markdown mit GFM, Typografie und
Überschriften-IDs), und für die Blogbeiträge reicht das.

## Helfer in `src/lib/`

| Datei | Zweck |
|---|---|
| `site.ts` | Konstanten (Titel, SEO-Titel und -Beschreibung, Sprache, OG-Bild), URL-Helfer, `isPreview`, `previewBranch`, Schalter `blogPublic` |
| `routes.ts` | **Alle** Pfade der Seite: `pageRoutes`, `specialPaths`, `pagePath()`, `pageKind()`, `postSlug()`, `postPath()` |
| `pages.ts` | `getPage(id)`, `pageProps(entry)`, `postProps(entry)`: Frontmatter → Props von `BaseLayout` |
| `blog.ts` | `getPublishedPosts()`, `postDate()`, Zusammenfassung wie in Hugo (`summaryHtml`, `listSummary`, `truncate`) |
| `jsonld.ts` | `buildGraph()` (WebSite, Person, Seitenknoten), `toScriptJson()` |
| `dates.ts` | Datumsangaben wörtlich mit Offset, Formate für Liste, Beitrag und RSS |
| `bundles.ts` | CSS-/JS-Bündel (siehe Asset-Pipeline) |

**`site.ts`: URL-Helfer.**

| Aufruf | Ergebnis auf der Hauptseite | Ergebnis in `/preview/x/` |
|---|---|---|
| `relUrl('about/')` | `/about/` | `/preview/x/about/` |
| `relUrl('')` | `/` | `/preview/x/` |
| `relUrl('/about/')` | `/about/` | `/preview/x/about/` (führender `/` gilt als base-relativ) |
| `absUrl('about/')` | `https://creimann.cc/about/` | `https://creimann.cc/preview/x/about/` |
| `homeUrl()` | `https://creimann.cc/` | `https://creimann.cc/preview/x/` |
| `canonicalUrl(permalink)` | der Permalink selbst | gleicher Pfad ohne `/preview/x/` |

`canonicalUrl` bricht den Bau ab, wenn der Permalink außerhalb der Site liegt (anderer Ursprung oder anderes
base). Anders als Hugos `relURL` behandelt `relUrl` einen führenden `/` bewusst base-relativ; dadurch kann ein
Link in einer Vorschau nicht versehentlich auf die Domain-Wurzel zeigen. Die Hugo-Falle `{{ "/" | relURL }}`
gibt es hier nicht mehr (siehe `docs/template-fallen.md`, Punkt 6).

**`pages.ts`: eine Quelle für die Props.** Jede Route holt ihre Props mit `pageProps(entry)` bzw.
`postProps(entry)`, statt Felder selbst zu übersetzen. Kommt ein Feld dazu, ändert man es an einer Stelle.

## Suchmaschinen: Kopfbereich und strukturierte Daten

Alles, was Suchmaschinen und Link-Vorschauen lesen, entsteht in `src/components/Head.astro` (Titel,
Beschreibung, Robots, Canonical, Open Graph, Twitter, Preloads) und `JsonLd.astro`.

**Titel:** `seo_title` aus dem Frontmatter, sonst auf der Startseite der globale SEO-Titel (`seoTitle` in
`site.ts`), sonst „Seitentitel – Christoph B. Reimann“ (ohne den Namen zu doppeln, wenn er schon im Titel steht).
**Beschreibung:** `description` der Seite, sonst `seoDescription` aus `site.ts`.

**Robots:**

| Seite | `<meta name="robots">` |
|---|---|
| indexierbare Seiten | `index,follow,max-image-preview:large` |
| 404-Seite | `noindex, nofollow` |
| alle Seiten in einer Vorschau | `noindex, nofollow` |

Canonical ist immer absolut mit Schrägstrich am Ende, in Vorschauen die URL der Hauptseite. Die 404-Seite hat
**kein** Canonical und keinen Seitenknoten im JSON-LD, ihr Titel ist „Seite nicht gefunden – Christoph B.
Reimann“. Open Graph und Twitter: Karte `summary_large_image`, Bild `assets/images/about/og-card.jpg`
(1200×630); Blogbeiträge haben `og:type article` sowie `article:published_time` und `article:modified_time`.

**Preloads:** `fraunces-variable.woff2` und `source-sans-3-variable.woff2` (`as="font" type="font/woff2"
crossorigin`) auf jeder Seite, `breadcum-bg.png` (`fetchpriority="high"`) nur auf Seiten mit Breadcrumb. Die
Schriften werden sonst erst nach dem CSS entdeckt, das Breadcrumb-Bild als CSS-Hintergrund noch später.

**Strukturierte Daten (JSON-LD)** baut `src/lib/jsonld.ts` (`buildGraph`) als einen Graphen mit drei Knoten, die per
`@id` aufeinander verweisen:

| Knoten | `@id` | Quelle |
|---|---|---|
| `WebSite` | `<Startseite>#website` | `site.ts` (Name, `alternateName` aus `siteAlternateNames`) |
| `Person` | `<Startseite>#person` | `src/data/person.yaml` (`image` = quadratisches Porträt `uebermichich.webp`) |
| die Seite | ihre URL | Titel, Beschreibung, `lastmod`, bei Beiträgen Datum, Titelbild und Autor |

Im Frontmatter steht unter `jsonld:` nur, was vom Standard abweicht, meist der Typ (`ProfilePage` für Über mich,
`ContactPage` für Kontakt, `CollectionPage` für den Blog). Der Inhalt wird rekursiv in den Seitenknoten gemischt
(`deepMerge`); `@id`, `url` und `isPartOf` werden danach erzwungen. Blogbeiträge werden automatisch
`BlogPosting` mit der Person als Autor (`@id`-Verweis, zusätzlich `name` und `url`). `ProfilePage` bekommt die
Person als `mainEntity`. `dateModified` kommt aus `lastmod`, `datePublished` wörtlich aus `date`. `toScriptJson`
ersetzt jedes `<` im JSON-Text durch die Schreibweise `\u003c` (ein JSON-Escape, kein HTML-Entity wie `&lt;`; JSON-Leser lesen es wieder als `<`), damit nichts im Text den `<script>`-Block beendet.

Die **BreadcrumbList** erzeugt `Breadcrumb.astro` als eigener JSON-LD-Block, aus derselben Liste, die auch die
sichtbare Navigation ausgibt (Start → [Blog →] aktuelle Seite). Die Startseite und die 404 haben keine.

`person.yaml` ohne `areaServed` (schema.org kennt es an `Person` nicht), `credentialCategory` einheitlich klein.

Prüfen: <https://search.google.com/test/rich-results> und <https://validator.schema.org/>.

### Sitemap, robots.txt, RSS

- **`sitemap.xml`** (eigener Endpunkt, `@astrojs/sitemap` liefe auf andere Dateinamen): Startseite zuerst
  (`weekly`, `1.0`), danach alle weiteren Seiten und Beiträge (`monthly`, `0.7`). `lastmod` ist das Frontmatter-Feld.
  Ausgenommen: Seiten mit `sitemap_exclude` (Impressum) und, solange `blogPublic` aus ist, Blog-Übersicht und
  Beiträge. Die Sitemap entsteht auch in Vorschauen: daran erkennt die Vorschau-Verwaltung eine Vorschau.
- **`robots.txt`:** `User-agent: *`, `Allow: /`, `Sitemap:` als absolute URL. Bewusst **kein** `Disallow:
  /preview/`: Ein gesperrter Pfad wird nicht gelesen, Google sähe das `noindex` der Vorschauseiten nie.
- **RSS** (`/blog/index.xml`): Eintrag je veröffentlichtem Beitrag, absolute Links, Datum nach RFC 822, Beschreibung
  = `summary`. Kanaltitel und -beschreibung deutsch (Titel und `description` der Blog-Seite), kein
  `generator`-Element. Bereichs-Feeds für about/kontakt/mein-weg/impressum, die Hugo leer erzeugte, gibt es nicht
  mehr. Der Verweis `<link rel="alternate" type="application/rss+xml">` im `<head>` steht nur bei `blogPublic`.
- **404:** `src/pages/404.astro` wird zu `dist/404.html`, GitHub Pages liefert sie mit Status 404 unter *beliebigen*
  Pfaden aus, auch unter `/preview/x/…`. Darum nur wurzelabsolute, base-fähige Links (`relUrl(…)`), nie relative.
- **Barrierefreiheit:** reine Icon-Bedienelemente (LinkedIn im Mobilmenü, im Footer und in der Autorenbox der
  Beiträge, Hamburger, Schließen) tragen ein `aria-label`. Der „Nach oben“-Knopf ist nur mit der Maus bedienbar und
  daher `aria-hidden="true"`. Im Desktop-Header gibt es keinen LinkedIn-Link.

### Blog öffentlich?

Der Schalter `blogPublic` in `src/lib/site.ts` (Standard `false`) steuert gemeinsam: Aufnahme von Blog-Übersicht und
Beiträgen in die Sitemap, den Blog-Link in Menü und Footer und den RSS-Verweis im `<head>`. Bei `false` sind die
Seiten gebaut und erreichbar (`index,follow`), aber weder verlinkt noch in der Sitemap, wie in Hugo. Die Tests lesen
den Schalter mit einem regulären Ausdruck aus `site.ts` und erwarten die Schreibweise
`export const blogPublic = false;`.

## Vorschauen

Eine Vorschau wird mit `SITE` und `BASE_PATH` gebaut, zum Beispiel
`SITE=https://creimann.cc BASE_PATH=/preview/mein-branch/ npm run build`.
`astro.config.mjs` liest beide aus der Umgebung (`site` Standard `https://creimann.cc`, `base` Standard `/`).
**`SITE` darf keinen Pfad enthalten**, sonst bricht der Bau ab: der Pfad gehört in `BASE_PATH`.

`src/lib/site.ts` leitet aus Ursprung + `base` den Pfad der Start-URL ab; beginnt er mit `/preview/`, ist
`isPreview` wahr und `previewBranch` der Rest. Daran hängt alles:

- `<meta name="robots" content="noindex, nofollow">` auf **allen** Seiten, Canonical auf die Hauptseite
  (gleicher Pfad ohne `/preview/<branch>/`).
- Hinweisleiste (`PreviewBanner.astro`) mit Branchnamen und Link „Alle Vorschauen“ auf `/preview/` (hart, bewusst).
- Alle Links, `og:url`, JSON-LD, Sitemap und `robots.txt` zeigen auf die Vorschau-Adresse. Auf der Hauptseite
  bleibt die Leiste automatisch aus.

Deshalb sperrt `robots.txt` den Pfad `/preview/` **nicht** (siehe oben).

**Eine Vorschau wird an ihrer `sitemap.xml` erkannt, nicht an der `index.html`.** Sonst würde jede Unterseite
(`preview/<branch>/about/`) als eigene Vorschau zählen. Die Sitemap muss daher auch im Vorschau-Bau
entstehen und im Wurzelverzeichnis der Vorschau liegen. Die Werkzeuge der Vorschau-Verwaltung
(`list`, `index`, `remove`, `prune`; im Hugo-Repo `.github/scripts/preview-tools.sh`) und die Workflows liegen
nicht in diesem Repo, siehe `docs/migration.md`.

## Deployment

Noch nicht eingerichtet; der Plan steht in `docs/migration.md`, Abschnitt „CI/CD und Deployment“. Kurz: GitHub
Pages über den Branch `gh-pages`, `main` in die Wurzel, alle anderen Branches nach `preview/<branch>/`;
`public/CNAME` enthält die Domain `creimann.cc`.

## Tests und Qualitätssicherung

`npm run verify` = `npm run build && npm run check && npm run test`. Die Tests lesen nur das gebaute `dist/`
(kein Netzwerk, kein Browser) und leiten die erwartete Seitenliste aus `src/content` und `src/lib/routes.ts` ab:
eine neue Seite oder ein neuer Beitrag wird automatisch erwartet, zusätzlich gebaute Seiten werden gemeldet.

| Datei | Prüft |
|---|---|
| `tests/files.test.mjs` | erwartete Dateien (Seiten, Beiträge, `404.html`, `visitenkarte/`, Sitemap, `robots.txt`, Feed, genau ein CSS- und JS-Bündel, `CNAME`, `favicon.ico`), keine Bereichs-Feeds, keine Entwürfe und Zukunftsbeiträge, keine unerwarteten Seiten |
| `tests/seo.test.mjs` | je Seite `lang`, genau ein `<title>`, Description, Robots, absolutes Canonical, `og:*`/`twitter:*`, JSON-LD-Graph, BreadcrumbList |
| `tests/markup.test.mjs` | genau eine `<h1>`, `alt`/`width`/`height` an jedem `<img>`, keine übrig gebliebenen Hugo-Shortcodes, keine doppelten `id` |
| `tests/links.test.mjs` | interne Links und Quellen zeigen auf vorhandene Dateien (Hugo-Altlasten werden gemeldet), Schrägstrich am Ende, Schriften im CSS, 404 nur mit wurzelabsoluten Links |
| `tests/sitemap.test.mjs` | Sitemap = genau die Seiten laut Frontmatter und `blogPublic`; `lastmod` = JSON-LD `dateModified` = Frontmatter; `robots.txt`; Weiterleitung von `/visitenkarte/` |
| `tests/feed.test.mjs` | RSS wohlgeformt, Einträge = veröffentlichte Beiträge, absolute Links, RFC-822-Datum |
| `tests/head.test.mjs` | `<head>` und Beschriftung (SEO-Phase): Preloads der Schriften und des Breadcrumb-Hintergrunds, zugängliche Namen von Links und Buttons, `aria-label` auf Deutsch, Nach-oben-Knopf `aria-hidden`, 404 ohne Canonical/`og:url`/JSON-LD, `article:*`-Metadaten nur bei Beiträgen |
| `tests/jsonld.test.mjs` | JSON-LD-Graph: `@id`-Verweise lösen sich auf, Person ohne `areaServed` und mit Porträt, `WebSite.alternateName`, `BlogPosting.author` mit `@id`, Name und URL, kein `BlogPosting` auf anderen Seiten, `Person.image` unter der Adresse des Baus |
| `tests/preview.test.mjs` | baut selbst eine Vorschau (`BASE_PATH=/preview/x/`) und lässt die ganze Suite dagegen laufen; prüft `noindex`, Canonical, Hinweisleiste, base an allen wurzelabsoluten Verweisen, JSON-LD, Sitemap und `robots.txt` unter der Vorschau-Adresse |

**`npm run check`** ist `astro check` (Typen, `.astro`-Dateien) und muss **0 Fehler** liefern; `src/legacy` ist
ausgenommen (`tsconfig.json`).

**`npm run compare:hugo`** vergleicht jede HTML-Seite, Sitemap, `robots.txt`, Feed und statische Dateien mit dem
Hugo-Referenzbau auf DOM-Ebene (`HUGO_REF_DIR`, am besten der unminifizierte Bau, erzeugt mit dem alten Hugo-Repo).
Normalisiert werden Leerraum, Attributreihenfolge, Hashes der Bündel-URLs, Kommentare, die Hugo-`generator`-Meta
und JSON-LD (geparst, Schlüssel sortiert, weil Hugo Map-Schlüssel alphabetisch ausgibt). Bewusste Abweichungen
stehen in `scripts/compare-hugo.allow.json` (`page`, oder `*` für jede Seite; `path` genau oder als Präfix an einer
Leerzeichen-Grenze; optional `exp`/`act` als genauer Wert; `reason`); eine Ausnahme gilt nur für genau diesen Wert.
Einträge ohne Treffer meldet das Skript am Ende und beendet sich mit Exit-Code 1. Gedacht war der Vergleich für
die Migration. Wo der Astro-Bau später bewusst abweicht (SEO-Verbesserungen, siehe `docs/migration.md`), muss jede
Abweichung mit Wert in der Ausnahmenliste stehen, sonst meldet der Vergleich sie als Fehler.

## Werkzeuge (`tools/`)

Python-Skripte für Dinge, die selten und von Hand anfallen. Sie liegen außerhalb von `src/` und `public/`, also
nicht im Bau. Voraussetzung: `pip install fonttools brotli pillow`. Aufruf immer aus dem Projektwurzelverzeichnis.

| Datei | Zweck |
|---|---|
| `build-fontawesome-subset.py` | erzeugt aus den vollständigen Font-Awesome-Schriften (`tools/fontawesome-src/`) die Teilmenge: `src/legacy/scss/vendor/_fontawesome-subset.scss` und `public/assets/fonts/fa-subset-*.woff2`. Benutzte Icons stehen in der Liste `ICONS` im Skript |
| `check-icons.py` | sucht alle `fa-…`-Klassen in `src/**/*.astro` und `src/content/**/*.md` und prüft, ob jedes Icon in seinem Schnitt vorhanden ist (sonst leeres Kästchen); Exit-Code 1 bei Fehlern |
| `build-favicons.py` | setzt das Monogramm „CBR“ in Fraunces und schreibt `public/favicon.ico` und `public/assets/images/favicon/` |

Vorgehen bei einem neuen Icon: `CLAUDE.md`, „Font Awesome“.
