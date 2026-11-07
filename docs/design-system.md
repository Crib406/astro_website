# Design-System

Farben, Schriften und Größen. Alles in
`src/legacy/scss/default/_variables.scss` unter `:root`.

## Farben

Die eigene Palette steht ganz oben in der Datei:

| Variable | Wert | Wofür |
|---|---|---|
| `--color-paper` | `#161A12` | Seitenhintergrund |
| `--color-surface` | `#1E2418` | Karten, abgesetzte Flächen |
| `--color-surface-2` | `#262D1E` | eine Stufe heller |
| `--color-ink` | `#ECEAE0` | Überschriften, heller Text |
| `--color-ink-soft` | `#A8AD9A` | Fließtext |
| `--color-line` | `#2E3526` | Linien, Ränder |
| `--color-accent` | `#8FB89A` | Buttons, Icon-Kacheln |
| `--color-accent-strong` | `#E6A94A` | Messing: hervorgehobene Wörter, Links, Fokus, aktueller Menüpunkt |
| `--color-accent-tint` | `#26332A` | Moos-Fläche hinter den Icon-Kacheln (Icon bleibt Moos) |
| `--color-brass` | = `--color-accent-strong` | Eyebrow, Ortschip, Vorschau-Leiste (ein Messing, kein zweiter Ton) |
| `--color-brass-tint` | `#39321C` | Fläche dazu |

## Zuordnung auf die Template-Variablen

Das Template arbeitet mit eigenen Namen. Diese zeigen jetzt auf die Palette —
**deshalb wirkt eine Änderung an einer einzigen Stelle überall**:

```scss
--color-primary:     var(--color-accent);
--color-primary-alt: var(--color-accent-strong);
--color-secondary:   var(--color-paper);      // body-Hintergrund
--color-heading:     var(--color-ink);
--color-body:        var(--color-ink-soft);
--color-gray:        var(--color-ink-soft);
--color-gray-2:      var(--color-surface);
--color-card:        var(--color-surface);
--color-border:      var(--color-line);
--color-subtitle:    var(--color-brass);
```

Wer eine Farbe ändern will, ändert die Palette oben — nicht diese Zuordnungen.

> `--color-primary-2nd`, `-3rd` und `-4th` stammen noch aus dem Template und
> gehören zu Farbvarianten, die diese Seite nicht nutzt.

## Die Kontrastregel

**Hervorhebungen werden gegen den Fließtext gemessen, nicht gegen den
Hintergrund.** Das klingt selbstverständlich, ist aber der Fehler, der hier
zweimal gemacht wurde.

Der Fließtext ist cremefarben (`#ECEAE0`), der Grund fast schwarz. Eine
Hervorhebung kann also bequem gut lesbar auf dem Grund sein und trotzdem im Satz
untergehen, weil sie dem Creme zu ähnlich ist.

Gemessen wurde der Farbabstand (ΔE) zum Fließtext und der Kontrast zum Grund:

| Farbe | Abstand zum Fließtext | Kontrast zum Grund | Ergebnis |
|---|---|---|---|
| `#6BE6A0` | 53 | 11,3:1 | zu **dunkel**, fällt zurück |
| `#8CFFC0` | 48 | 14,4:1 | Helligkeit passt, aber zu **blass** |
| `#2BFF8A` (früher) | 81 | 13,2:1 | stark, aber Neon |
| `#E6A94A` (Messing, jetzt) | **56** (zu Creme `#ECEAE0`), **51** (zu Fließtext `#A8AD9A`) | 8,5:1 | richtig; Hervorhebungen sind zusätzlich fett (700) |

Die Lehre (gilt für jede Hervorhebungsfarbe): Nicht an der Helligkeit drehen, sondern an der **Sättigung**. Zu viel
Weißanteil nähert die Farbe dem Creme an, egal wie hell sie ist.

Wer die Farbe ändert, sollte nachrechnen. Ein kurzes Python-Skript mit ΔE in
CIE-Lab genügt; die Werte oben stammen daraus.

### Lichtkegel im Grund

Sehr flache Radialverläufe (Creme 3,5–7 %, Messing 6–9 % Deckung) liegen als
`background-image` hinter dem Hero (`.rpp-banner-two-area`), der Kernaussage
(`.about-content-area`), „Wie ich arbeite“ und dem Schlusssatz
(`.home-section--traits`, `.about-content-area--stand`) sowie im Seitenkopf der
Unterseiten (`.breadcrumb-area.breadcrumb-bg`, das Template-Bild bleibt darunter).
Reine Hintergrundebenen: keine Höhe, kein Markup. Stehen am Ende von
`_modern-refresh.scss`.

## Schriften

```scss
--font-primary:   'Fraunces', ui-serif, Georgia, serif;        // Überschriften
--font-secondary: 'Source Sans 3', ui-sans-serif, system-ui;   // Fließtext
```

Beide liegen selbst gehostet unter `public/assets/fonts/` als variable
`.woff2`. Kein Google-Fonts-Aufruf — passend zum privacy-first-Anspruch in
`src/components/Head.astro`. Beide Dateien werden dort per `<link rel="preload">` vorab geladen, damit der
Schriftwechsel früh passiert.

**Achtung:** Das Template setzt global `body { font-family: var(--font-primary) }`
und `h1–h6 { font-family: var(--font-secondary) }` — also Display-Schrift für
Fließtext und umgekehrt. Das ist in
`src/legacy/scss/elements/_modern-refresh.scss` geradegezogen. Nicht wieder
umdrehen.

## Größen

Gemessen im Browser, nicht aus dem Quelltext abgeleitet. Handy heißt hier
unter 768px (`$sm-layout`).

| Rolle | Desktop | Handy |
|---|---|---|
| Name im Hero (`h1.title`) | 54px | 32px |
| Seitentitel (`.breadcrumb-inner .title`) | 44px | 32px |
| Aussage (`.text-para-documents`) | 40px | 27px |
| Abschnitt Unterseiten (`.title`) | 38px | 28px |
| Abschnitt Startseite (`.home-section-title`) | 32px | 24px |
| Kartentitel (`.focus-card h3`, `.service-title`) | 24px | 22px |
| **Lesetext** (`p`, `.disc`, `.hero-lead`, `.focus-card p`, Impressum) | **20px** | **18px** |
| **Nebentext** (`.service-para`) | **17px** | **16px** |
| Navigation (Breadcrumb) | 16px | 16px |

**Es gibt genau zwei Fließtext-Rollen.** Lesetext ist alles, was jemand
tatsächlich liest — auch die Untertitel der Schwerpunktkarten auf der
Startseite und die Listen der Datenschutzerklärung, denn beides sind ganze
Sätze. Nebentext sind Zusätze zu einem einzelnen Wort, etwa „und lernbereit"
unter „neugierig".

Diese Unterscheidung ist der Kern der Skala. Vorher gab es unbemerkt **vier**
Fließtextgrößen (15, 16, 17 und 18px) — dieselbe Rolle je nach Seite anders
groß. Wer eine neue Stelle anlegt, ordnet sie einer der beiden Rollen zu und
erfindet keine dritte Größe.

Zwei Hierarchien waren zusätzlich verkehrt und sind bewusst so geradegezogen:
Auf dem Handy war der Name (28px) kleiner als der Seitentitel „Impressum"
(32px). Und die Eigenschaftskarten waren `h4` unter einer `h2` — eine Ebene zu
tief, weshalb ein `h4` größer war als ein `h3`.

Die Zwischenüberschriften im Impressum stehen bei 28 / 24 / 21px (Desktop) und
24 / 21 / 19px (Handy). Vorher fiel die `h5` auf dem Handy auf 16px und war
damit **kleiner als der Fließtext** — eine Überschrift, die sich nicht mehr
abhebt.

## Maß

Gut lesbar sind **45 bis 75 Zeichen pro Zeile**, ideal rund 66. Über die volle
Spaltenbreite kamen die Absätze auf 74 bis 137 Zeichen. Zu lange Zeilen sind
der Grund, warum ein Text anstrengend wirkt, ohne dass man sagen kann warum:
das Auge verliert beim Rücksprung die nächste Zeile.

| | Breite |
|---|---|
| Lesespalte Unterseiten | 740px |
| Lesespalte Impressum | 600px |
| Bild in den Text-Bild-Karten (ab 1200px) | 230px fest |

Das Impressum ist schmaler, weil dort keine Bildkarte eine Mindestbreite
erzwingt. Unter 1200px stapeln die Karten, das Bild steht dann über dem Text.

**Begrenzt wird die Spalte, nicht das einzelne Element.** Nur so teilen sich
Überschriften, Absätze, Bildkarten und Zitatkästen eine linke Kante. Der erste
Anlauf deckelte jedes Element für sich und erzeugte damit vier verschiedene
Kanten auf einer Seite.

**Die Werte stehen in Pixeln, nicht in `ch`.** Das ist bewusst und war teuer
erkauft — warum, steht in `template-fallen.md` unter Punkt 9.

Auf dem Handy greift die Begrenzung nicht: dort ist die Spalte ohnehin
schmaler als jeder dieser Werte.

## Formen

`--radius: 10px` als Grundwert. Karten und Buttons nutzen 12px.

Buttons gibt es in zwei Ausprägungen:

- **primär** — gefüllt in `--color-accent`, Text in `--color-paper`
- **sekundär** — `.btn-border`, nur Umriss

Beide sind in `_modern-refresh.scss` angepasst. Warum das nötig war, steht in
`template-fallen.md`.

## Fokus, aktuelle Seite, Links, Hero mobil

Alle Regeln stehen am Ende von `src/legacy/scss/elements/_modern-refresh.scss`.

- **Tastaturfokus:** `:root :focus-visible { outline: 2px solid var(--color-accent-strong); outline-offset: 3px; }`
  (ohne Einblend-Verzögerung: `transition-property: none`). Das Template setzt überall `outline: none` (`a:focus`
  hat Spezifität 0-1-1); `:root :focus-visible` (0-2-0) schlägt das. Mit der Maus erscheint keine Linie. Ausnahmen:
  `main` (Ziel des Skip-Links, `:root main:focus-visible`, 0-2-1) bleibt ohne Rahmen; bei Links um Block-Inhalt
  (Logo `<a><p>`, `.service-card-link`) sitzt der Rahmen am Kind (`.logo a:focus-visible > p`,
  `.service-card-link:focus-visible > .service-card-v1`), weil Chrome die Outline eines inline-`<a>` mit
  Block-Kindern nicht zeichnet (`template-fallen.md`, Punkt 13). Der Skip-Link „Zum Inhalt springen“ (`.skip-link`, erstes
  Element im `body`) ist außerhalb des Bildschirms und erscheint nur bei Tastaturfokus; er hat bewusst
  `transition: none`, weil das Template Links animiert.
- **Aktuelle Seite im Menü:** `a[aria-current="page"]` bekommt Akzentfarbe und die dezente Fläche des Hover-Zustands
  (`--color-primary`, keine neue Farbe). Das Attribut setzt `Header.astro` serverseitig; die Menüeinträge stehen
  dort einmal zentral in `items` und speisen Desktop- und Mobilmenü.
- **Kontaktkarten** (`.service-card-link` in einer Bootstrap-Spalte) füllen die Spalte (`height: 100%`) und sind
  dadurch gleich hoch, auch wenn nur eine Karte eine Mailadresse zeigt.
- **Links im Fließtext:** dauerhaft unterstrichen (`text-decoration-thickness: 1px`, `text-underline-offset: 0.2em`,
  Linie in `--color-accent-strong`). Gilt für Links in `.blog-details-left-area .disc` (Mein Weg, Impressum,
  Blogbeitrag) und `.text-para-documents` (Startseite). Der Schlusssatz der Startseite trägt bewusst kein
  `inv-title-animation-wrap`: zerlegt, verlöre der Link die Unterstreichung (`text-decoration` erbt nicht in
  `inline-block`-Buchstaben-divs), und Screenreader läsen ihn bruchstückhaft. Die Einblendung
  (`tmp-scroll-trigger`) bleibt; Schrift, Größe, Farbe und Abstände sind identisch zur zerlegten Fassung. Nicht für Buttons (`.tmp-btn`), Menü, Footer, Karten-Links,
  Logo, Breadcrumb und Icons.
- **Hero mobil (unter 768 px, nur Hochformat):** das Foto (`.hero-portrait img`) ist auf `44svh` (Fallback `44vh`) begrenzt, mit
  `object-fit: cover` und `object-position: center top`, dazu `margin-bottom: -24px` am Rahmen. Bei 375x812 liegen
  Name und Zwischenzeile damit zwischen 515 und 647 px. Ab 768 px ist nichts verändert. Im Querformat
  (`orientation: landscape`, z. B. 667x375) gilt die Begrenzung nicht: 44svh wären dort nur ~165 px und zeigten nur
  Haare und Stirn; das Foto steht wie im Template.
- **Zitate auf Mein Weg** haben keine eigene Größe mehr (vorher 18 px inline) und stehen auf Lesetextgröße.
