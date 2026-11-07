# Inhalte pflegen

Für den Inhaber: Beitrag schreiben, Seite anlegen, Bild ablegen, `lastmod` pflegen, Blog öffentlich schalten.
Vor jeder Veröffentlichung gilt: **`npm run verify` muss grün sein** (siehe unten).

| Was | Wo |
|---|---|
| Blogbeiträge | `src/content/blog/<name>.md` (Markdown) |
| Seiten (Start, Über mich, Mein Weg, Kontakt, Impressum, Blog-Übersicht) | `src/content/pages/<name>.md` (HTML) |
| Bilder | `public/assets/images/…` |
| Angaben zur Person (Suchmaschinen) | `src/data/person.yaml` |
| Schalter „Blog öffentlich“ | `src/lib/site.ts`, `blogPublic` |

## Neuen Blogbeitrag anlegen

1. Datei `src/content/blog/mein-beitrag.md` anlegen. Der Dateiname ohne `.md` wird zur Adresse
   (`/blog/mein-beitrag/`), außer das Feld `slug` setzt etwas anderes. Nur Kleinbuchstaben, Ziffern und
   Bindestriche, keine Umlaute.
2. Diese Vorlage kopieren und ausfüllen. Kommentare (`#`) dürfen stehen bleiben.

```markdown
---
# --- Pflicht ---------------------------------------------------------------
title: "Titel des Beitrags"            # wird die Seitenüberschrift (h1) und Teil des <title>
date: "2026-03-01T10:00:00+01:00"      # Veröffentlichungsdatum, IMMER in Anführungszeichen, mit Versatz
lastmod: "2026-03-01T09:00:00Z"        # Datum der letzten inhaltlichen Änderung, UTC (Z), in Anführungszeichen, nicht in der Zukunft
summary: "Ein bis zwei Sätze für die Blog-Übersicht und den RSS-Feed."
author: "Christoph B. Reimann"         # steht über dem Text: „Von …“
category: "Zugehörigkeit"              # eine Kategorie, steht in Übersicht und Beitrag

# --- Praktisch Pflicht (die Seite zeigt es an, ohne sieht es unvollständig aus) --------
image: "/assets/images/blog/mein-beitrag.webp"   # Titelbild, mind. 1200 px breit, 5:3 (z. B. 1500 × 900), Pfad mit führendem /

# --- Optional --------------------------------------------------------------
draft: false                           # true = Entwurf: keine Seite, nicht in Sitemap und Feed
slug: "mein-beitrag"                   # Adresse /blog/<slug>/, sonst der Dateiname
description: "Beschreibung für Google (max. ca. 155 Zeichen)."   # sonst gilt der allgemeine Text der Seite
seo_title: "Eigener Titel für Google (max. ca. 60 Zeichen)"      # sonst „Titel – Christoph B. Reimann“
reading_time: 7                        # Minuten, Zahl; ohne Angabe entfällt die Anzeige
tags:                                  # erscheinen in der Seitenleiste (ohne Link)
  - "Mut"
  - "Werte"
author_role: "Betriebswirt und Generalist"   # Zeile unter dem Namen in der Seitenleiste
author_bio: "Kurztext über den Autor."       # sonst steht ein Standardtext da
featured_image: "/assets/images/blog/anderes-bild.webp"   # nur Beitragsseite; überstimmt `image` dort (in der Übersicht gilt `image`)
jsonld:                                # nur, was vom Standard abweicht (siehe unten)
  keywords:
    - "Integrität"
    - "Vertrauen"
---

## Einleitung

Text des Beitrags in Markdown …
```

**Was die Felder bewirken**

| Feld | Wirkung und Fallen |
|---|---|
| `title` | Überschrift der Seite; der `<title>` ist „Titel – Christoph B. Reimann“. Steht der Name schon im Titel, wird er nicht doppelt angehängt. |
| `date` | **In Anführungszeichen**, sonst bricht der Bau ab (ein Zeitstempel ohne Anführungszeichen verliert den Versatz). Formen: `"2026-03-01"` (gilt als UTC, 00:00) oder `"2026-03-01T10:00:00+01:00"`. Der Versatz (`+01:00` Winter, `+02:00` Sommer) bleibt so stehen, wie er eingetragen ist. |
| **Zukunftsdatum** | Liegt `date` in der Zukunft, ist der Beitrag **unveröffentlicht**: keine Seite, nicht in Übersicht, Sitemap und Feed. Er erscheint erst, wenn die Seite **nach** diesem Zeitpunkt neu gebaut und ausgeliefert wird. Die Seite ist statisch: ohne neuen Bau bleibt er weg. |
| `draft` | `true` = Entwurf, wird nirgends gebaut (auch nicht im Entwicklungsserver). Einen Entwurf zum Anschauen: `draft: false` auf einem Vorschau-Branch (Vorschauen sind `noindex`). |
| `author`, `category` | **Pflicht** (nicht leer). `author` steht als „Von …“ im Beitragskopf und als Name in der Seitenleiste, `category` als Überschrift im Beitragskopf und in der Übersicht. Ein leeres Feld würde „Von “ bzw. eine leere Überschrift ergeben, darum bricht der Bau ab. |
| `summary` | **Pflicht.** Ein Ersatz aus dem Text entfällt. In der Übersicht wird er nach 150 Zeichen gekürzt (` …`). Einfaches Markdown (`**fett**`, `*kursiv*`) geht, Links werden zu Text. |
| `description` | Meta-Beschreibung für Suchmaschinen und Link-Vorschauen. Ohne Angabe gilt die allgemeine Beschreibung der Seite. |
| `slug` | Adresse des Beitrags. Nachträglich ändern heißt: die alte Adresse ist weg, eine Weiterleitung gibt es nicht (siehe „Beitrag oder Seite entfernen“). |
| `image` | Titelbild: erscheint in der Übersicht, oben im Beitrag und im JSON-LD. Die Vorschau in WhatsApp/LinkedIn nutzt immer das allgemeine Bild der Seite (`og-card.jpg`). |
| `jsonld` | Ergänzt die strukturierten Daten für Google. Das `BlogPosting` mit Titel, Datum, Autor und Beschreibung entsteht automatisch. Hier nur Abweichendes, z. B. `keywords`. Ein abweichendes `headline` sollte dem sichtbaren Titel (h1) entsprechen. |
| `lastmod` | Pflicht, siehe „`lastmod` pflegen“. |

Unbekannte Felder (z. B. ein Tippfehler wie `descripton`) bricht der Bau ab; das ist gewollt.

### Schreiben in Markdown

Normales Markdown (Überschriften `##`, `###`, Listen, `**fett**`, Links). Anführungszeichen werden
automatisch typografisch gesetzt. Die Überschrift `#` (h1) nicht im Text verwenden, die macht die Seite aus
`title`.

**HTML im Beitrag:** Ein HTML-Block beginnt am Zeilenanfang, steht zwischen zwei Leerzeilen und enthält selbst
**keine Leerzeile**. Markdown **innerhalb** eines HTML-Blocks wird nicht verarbeitet: `<strong>fett</strong>`
statt `**fett**`, Anführungszeichen direkt als „ “.

### Checkliste im Beitrag

Zwei Varianten, beide als fertiges HTML (die frühere Hugo-Kurzschreibweise `{{< checklist_… >}}` gibt es nicht
mehr; ein Test schlägt an, falls sie irgendwo stehen bleibt). Einen Absatz davor und danach mit Leerzeile.

**Variante „Grenzen“** (Pfeil, normaler Text):

```html
<ul class="check-box">
  <li>
    <div class="check-box-item">
      <span class="box-icon">
        <i class="fa-solid fa-chevron-right"></i>
      </span>
      <span class="box-para">
        Text des ersten Punkts.
      </span>
    </div>
  </li>
  <li>
    <div class="check-box-item">
      <span class="box-icon">
        <i class="fa-solid fa-chevron-right"></i>
      </span>
      <span class="box-para">
        Text des zweiten Punkts.
      </span>
    </div>
  </li>
</ul>
```

**Variante „Zusammenfassung“** (Haken, fetter Text):

```html
<ul class="check-box">
  <li>
    <div class="check-box-item">
      <span class="box-icon">
        <i class="fa-solid fa-check"></i>
      </span>
      <span class="box-para">
        <strong>Text des ersten Punkts</strong>
      </span>
    </div>
  </li>
  <li>
    <div class="check-box-item">
      <span class="box-icon">
        <i class="fa-solid fa-check"></i>
      </span>
      <span class="box-para">
        <strong>Text des zweiten Punkts</strong>
      </span>
    </div>
  </li>
</ul>
```

Je Punkt ein `<li>…</li>`-Block kopieren. Beispiele im echten Beitrag: `src/content/blog/integritaet.md`. Es dürfen nur
Icons verwendet werden, die in der Font-Awesome-Teilmenge stecken (`fa-chevron-right` und `fa-check` tun es);
ein anderes Icon erscheint als leeres Kästchen, siehe `CLAUDE.md`.

## Bilder ablegen

- Ablage: Blogbilder in `public/assets/images/blog/`, sonstige Bilder in einem passenden Unterordner von
  `public/assets/images/`. Alles unter `public/` wird 1:1 ausgeliefert, nichts wird verkleinert oder umgewandelt:
  Bild vorher auf Größe bringen.
- Format WebP (kleine Dateien), Dateiname Kleinbuchstaben ohne Leerzeichen.
- **Titelbild eines Beitrags: mindestens 1200 px breit, Verhältnis 5:3, z. B. 1500 × 900 px** (die Seite setzt
  `width="1000" height="600"` und zeigt das Bild in dieser Größe; ein anderes Seitenverhältnis passt nicht in den
  vorgesehenen Rahmen, und Google verlangt für große Vorschaubilder mindestens 1200 px Breite, siehe O6 in
  `docs/migration.md`). Im Frontmatter: `image: "/assets/images/blog/name.webp"`
  (Pfad **mit** führendem `/`, die Seite setzt den Vorschau-Pfad selbst davor).
- **Bild im Text:** als HTML mit `width` und `height` (Pflicht: ohne springt das Layout, und ein Test schlägt an) und
  `alt`. Der Pfad ist **relativ** zum Beitrag (er liegt unter `/blog/<slug>/`):

  ```html
  <img src="../../assets/images/blog/name.webp" alt="Beschreibung des Bildes" width="800" height="500" loading="lazy" decoding="async">
  ```

  Markdown-Schreibweise (`![…](…)`) liefert kein `width`/`height` und fällt im Test durch.
- Jedes `<img>` braucht einen `alt`-Text.

## `lastmod` pflegen

`lastmod` steht in jeder Seite und jedem Beitrag im Frontmatter und ist ein Pflichtfeld. Es erscheint als
`<lastmod>` in der Sitemap und als `dateModified` in den strukturierten Daten. Google nutzt den Wert nur, wenn er
nachweislich stimmt, also **nur bei inhaltlicher Änderung anheben**.

Format: UTC mit `Z`, **in Anführungszeichen**: `lastmod: "2026-03-01T09:00:00Z"`. Ohne Anführungszeichen wandelt YAML
den Wert selbst in ein Datum und rechnet ungültige Angaben (z. B. `2026-13-45`) still um; nur als Text lässt sich
prüfen, ob es das Datum gibt. Der Wert darf nicht in der Zukunft liegen. Die aktuelle Zeit liefert
`date -u +%Y-%m-%dT%H:%M:%SZ`.

| Anheben | Nicht anheben |
|---|---|
| Text oder Bild einer Seite oder eines Beitrags ändert sich | Tippfehler, die den Sinn nicht ändern |
| Startseite: Text in `src/pages/index.astro` ändert sich (der Inhalt steht dort, nicht in `home.md`; trotzdem `lastmod` in `home.md` anheben) | Änderungen nur am Frontmatter (z. B. `description`, `jsonld`) |
| Impressum: Text in `impressum.md` oder Rahmenmarkup in `impressum/index.astro` | Layout, CSS, Menü, Footer |
| Blog-Übersicht (`blog.md`): neuer oder geänderter Beitrag, Text der Übersicht | |

Die Tests prüfen, dass Sitemap, `dateModified` und Frontmatter denselben Wert haben; ein fehlendes, ungültiges oder in der Zukunft liegendes `lastmod` bricht den Bau.

## Blog öffentlich schalten

Solange `blogPublic` auf `false` steht, sind Blog-Übersicht und Beiträge zwar gebaut und über ihre Adresse
erreichbar (Robots: `index,follow`), aber **nirgends verlinkt und nicht in der Sitemap**. Umschalten in
`src/lib/site.ts`:

```ts
export const blogPublic = true;
```

Die Schreibweise nicht ändern: die Tests lesen den Schalter mit einem regulären Ausdruck. Dann passiert gemeinsam:

- „Blog“ erscheint im Menü (Desktop und Handy) und im Footer.
- Blog-Übersicht und alle veröffentlichten Beiträge kommen in die Sitemap (`/sitemap.xml`).
- Der RSS-Verweis (`<link rel="alternate" type="application/rss+xml">`) steht im `<head>` jeder Seite.

Vorher klären: offene inhaltliche Punkte (Tippfehler in `jsonld` von `mein-weg.md` und `integritaet.md`, Titel des
Beitrags gegen `headline`; siehe `docs/migration.md`, O2). Nach dem Livegang in der Search Console die Sitemap neu
einreichen.

## Neue Seite anlegen

Beispiel: Seite „Angebot“ unter `/angebot/`.

1. **Inhalt:** `src/content/pages/angebot.md` anlegen. Vorlage: `kontakt.md` kopieren. Frontmatter:

   ```yaml
   ---
   title: "Angebot"                 # Überschrift und Teil des <title>
   lastmod: "2026-03-01T09:00:00Z"  # Pflicht, in Anführungszeichen
   description: "Beschreibung für Google."
   # seo_title: "Eigener Titel für Google"
   # sitemap_exclude: true          # nicht in die Sitemap aufnehmen (wie das Impressum)
   # jsonld:
   #   "@type": "ContactPage"       # z. B. ProfilePage, ContactPage; Standard ist WebPage
   ---
   ```

   Darunter der Rohtext als **HTML** (kein Markdown). Interne Links relativ (`../kontakt/`), nie `/kontakt/`.
   Buttons nie in ein Element mit `inv-title-animation-wrap` setzen (`CLAUDE.md`).
2. **Route:** `src/pages/angebot/index.astro` anlegen, Vorlage: `src/pages/kontakt/index.astro` kopieren und
   `getPage('kontakt')` in `getPage('angebot')` ändern.
3. **Pfad eintragen:** in `src/lib/routes.ts` unter `pageRoutes` die Zeile
   `angebot: { path: 'angebot/', kind: 'page' },` ergänzen. Der Schlüssel ist der Dateiname ohne `.md`. Fehlt
   die Zeile, bricht der Bau mit „Keine Route für Seite …“ ab.
4. **Verlinken:** Menü und Footer nennen ihre Seiten einzeln. Eintrag in `src/components/Header.astro`
   (Desktop-Menü **und** Handy-Menü) und/oder `src/components/Footer.astro` ergänzen, mit
   `relUrl(pagePath('angebot'))`.
5. **Prüfen:** `npm run verify`. Sitemap und Tests erfassen die Seite automatisch (aus dem Content-Ordner und
   `routes.ts`); sie steht in der Sitemap, solange `sitemap_exclude` nicht gesetzt ist.

## Beitrag oder Seite entfernen oder umbenennen

Datei löschen, `draft: true` setzen, Dateinamen oder `slug` ändern: Die Seite unter der alten Adresse soll danach
verschwinden (404). Das tut sie nur, wenn der Deploy den Root von `gh-pages` vor dem Kopieren leert. Mit
`keep_files: true` (Einstellung des alten Hugo-Workflows) löscht der Deploy **nie** etwas, bei jedem Lauf von `main`:
die alte Seite bliebe unter ihrer Adresse online, ebenso gelöschte Bilder und alte CSS-/JS-Bündel. Der geplante
Workflow in `docs/migration.md` (Abschnitt „CI/CD und Deployment“) leert den Root deshalb mit
`rsync --delete --exclude '/preview/'`; solange er nicht eingerichtet ist, muss man Reste von Hand von `gh-pages`
entfernen. Nach dem Deploy die alte Adresse im Browser aufrufen und prüfen. Eine Weiterleitung auf die neue Adresse
gibt es nicht (kein Astro-`redirects`); bekannte Adressen deshalb nur mit Bedacht ändern.

## Vor der Veröffentlichung prüfen

```bash
npm run verify     # baut, prüft Typen, lässt alle Tests laufen
```

Grün heißt: Frontmatter vollständig, genau eine `<h1>`, jedes Bild mit `alt`/`width`/`height`, alle internen Links
und Bilder zeigen auf vorhandene Dateien, Sitemap, Feed und strukturierte Daten stimmig. Wer den Beitrag auch
ansehen will: `npm run dev` und `http://localhost:4321/blog/<slug>/` (mit Schrägstrich am Ende) öffnen.

Häufige Meldungen:

| Meldung | Ursache und Lösung |
|---|---|
| `date muss als Text in Anführungszeichen stehen, z. B. "2025-12-06T10:00:00+01:00" …` | `date` ohne Anführungszeichen. Anführungszeichen setzen. |
| `date fehlt. Pflichtfeld, als Text in Anführungszeichen …` | `date` fehlt im Frontmatter. |
| `date ist kein gültiges Datum (erwartet: "2025-12-06" oder "2025-12-06T10:00:00+01:00")` | Tippfehler oder ein Datum, das es nicht gibt (31. Februar). |
| `lastmod fehlt. Pflichtfeld, z. B. lastmod: "2026-08-12T18:00:38Z" …` | `lastmod` fehlt (bei Seiten wie bei Beiträgen). |
| `lastmod muss als Text in Anführungszeichen stehen, z. B. lastmod: "2026-08-12T18:00:38Z" …` | `lastmod` ohne Anführungszeichen. Anführungszeichen setzen. |
| `lastmod "…" ist kein gültiges Datum. Erwartet z. B. "2026-08-12T18:00:38Z"` | Tippfehler oder ein Datum, das es nicht gibt (Monat 13, 31. Februar, Stunde 25); der Wert wird in der Meldung genannt. |
| `lastmod "…" liegt in der Zukunft. …` | Datum oder Uhrzeit liegt nach dem Zeitpunkt des Baus; meist falsche Zeitzone (der Wert ist UTC, in Deutschland 1 bis 2 Stunden früher als die Ortszeit) oder Zahlendreher im Jahr. |
| `summary fehlt. Pflichtfeld: Kurztext für Blogübersicht und RSS` | `summary` fehlt. |
| `summary ist leer. Pflichtfeld: …` | `summary` ist leer oder besteht nur aus Leerzeichen. |
| `author fehlt …` / `author ist leer …` | `author` fehlt oder ist leer. |
| `category fehlt …` / `category ist leer …` | `category` fehlt oder ist leer. |
| `Unrecognized key: "…"` | Unbekanntes Feld, meist ein Tippfehler im Feldnamen (die Meldung ist englisch). |
| `Keine Route für Seite "…"` | Neue Seite fehlt in `pageRoutes` in `src/lib/routes.ts`. |
| Test: `jedes <img> hat alt, width und height` | Ein Bild im Text ohne eines dieser Attribute. |
| Test: `interne Verweise zeigen auf vorhandene Dateien` | Tippfehler im Link oder Bild-Dateiname, oder die Datei fehlt in `public/`. |
| Beitrag erscheint nicht | `draft: true` oder `date` in der Zukunft; nach Ablauf des Datums neu bauen. |
