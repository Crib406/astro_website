# Design-System

Farben, Schriften und Größen. Alles in
`assets/scss/default/_variables.scss` unter `:root`.

## Farben

Die eigene Palette steht ganz oben in der Datei:

| Variable | Wert | Wofür |
|---|---|---|
| `--color-paper` | `#161A12` | Seitenhintergrund |
| `--color-surface` | `#1E2418` | Karten, abgesetzte Flächen |
| `--color-surface-2` | `#262D1E` | eine Stufe heller |
| `--color-ink` | `#ECEAE0` | Überschriften, heller Text |
| `--color-ink-soft` | `#A8AD9A` | Fließtext |
| `--color-line` | `#333A29` | Linien, Ränder |
| `--color-accent` | `#8FB89A` | Buttons, Icon-Kacheln |
| `--color-accent-strong` | `#2BFF8A` | hervorgehobene Wörter |
| `--color-accent-tint` | `#26332A` | Fläche hinter Icons |
| `--color-brass` | `#D6AA62` | Eyebrow, Ortschip, Vorschau-Leiste |
| `--color-brass-tint` | `#3A331E` | Fläche dazu |

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
| `#2BFF8A` | **81** | 13,2:1 | richtig |

Die Lehre: Nicht an der Helligkeit drehen, sondern an der **Sättigung**. Zu viel
Weißanteil nähert die Farbe dem Creme an, egal wie hell sie ist.

Wer die Farbe ändert, sollte nachrechnen. Ein kurzes Python-Skript mit ΔE in
CIE-Lab genügt; die Werte oben stammen daraus.

## Schriften

```scss
--font-primary:   'Fraunces', ui-serif, Georgia, serif;        // Überschriften
--font-secondary: 'Source Sans 3', ui-sans-serif, system-ui;   // Fließtext
```

Beide liegen selbst gehostet unter `static/assets/fonts/` als variable
`.woff2`. Kein Google-Fonts-Aufruf — passend zum privacy-first-Anspruch im
`head.html`.

**Achtung:** Das Template setzt global `body { font-family: var(--font-primary) }`
und `h1–h6 { font-family: var(--font-secondary) }` — also Display-Schrift für
Fließtext und umgekehrt. Das ist in
`assets/scss/elements/_modern-refresh.scss` geradegezogen. Nicht wieder
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
