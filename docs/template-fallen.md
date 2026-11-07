# Fallstricke des Templates

Das Template ist ein gekauftes Agentur-Paket, direkt ins Projekt kopiert (heute unter `src/legacy/`). Es
bringt Eigenheiten mit, die beim Anpassen wiederholt Zeit gekostet haben. Jeder
Eintrag: **Symptom → Ursache → Lösung.**

Die Einträge stammen aus der Hugo-Zeit. Das Template selbst ist unverändert übernommen, die Fallen 1 bis 5
und 9 bis 12 gelten also weiter. Die Punkte 6 bis 8 beschrieben Hugo-Eigenheiten; sie sind je mit der
Astro-Entsprechung ergänzt. Pfade: `static/assets/js/` ist jetzt `src/legacy/js/`, `assets/scss/` ist
`src/legacy/scss/`, `layouts/` ist `src/`, `content/` ist `src/content/`.

---

## 1. Die Split-Text-Animation

Elemente mit der Klasse `inv-title-animation-wrap` werden von GSAP `SplitText`
in Zeilen, Wörter und **einzelne Buchstaben** zerlegt. Jeder Buchstabe bekommt
`opacity: 0` und wird beim Scrollen gestaffelt eingeblendet
(`src/legacy/js/main.js`, Funktion `splitAnimatedTitles`, ab Zeile 777).

Das erklärt drei verschiedene Fehlerbilder.

### 1a. Leere Buttons

**Symptom:** Ein Button erscheint als farbige Fläche ohne Text.

**Ursache:** Der Button steckt in einem Element mit
`inv-title-animation-wrap`. Sein Text wird mitzerlegt und bleibt auf
`opacity: 0`.

**Lösung:** Den Button aus dem Element herausziehen. Zusätzlich gibt es in
`src/legacy/scss/elements/_modern-refresh.scss` ein Sicherheitsnetz:

```scss
.tmp-btn .btn-text div { opacity: 1 !important; transform: none !important; }
```

**Das ist in diesem Projekt dreimal passiert** — Startseite, Über mich und
404-Seite. Beim Einfügen eines Buttons also immer prüfen, worin er liegt.

### 1b. Verschluckte Leerzeichen

**Symptom:** Im gerenderten Text steht `aufLinkedIn.Ich` statt
`auf LinkedIn. Ich`.

**Ursache:** Die Animation macht aus jedem verschachtelten Element ein eigenes
Wort. Leerzeichen an Element-Grenzen gehen dabei verloren.

### 1c. Satzzeichen auf eigener Zeile

**Symptom:** Der Punkt hinter einem Link rutscht allein in die nächste Zeile.

**Ursache:** Steht das Satzzeichen außerhalb des Links, wird es zu einem
eigenständigen „Wort" und kann umbrechen.

**Lösung für 1b und 1c:** Das Satzzeichen **in** den Link ziehen:

```html
<a href="..."><span>LinkedIn.</span></a> Ich spreche ...
```

Geschützte Leerzeichen (`&nbsp;`) lösen nur 1b und verursachen dabei 1c. Nicht
der richtige Weg.

---

## 2. Spezifitätsfallen

Eigene Regeln stehen in `src/legacy/scss/elements/_modern-refresh.scss`, das als letztes geladen wird.
Bei gleicher Spezifität gewinnt es dadurch. Bei **höherer** Spezifität im
Template gewinnt das Template — auch wenn die eigene Regel später kommt.

Konkret aufgetreten:

| Template-Regel | Klassen | schlägt |
|---|---|---|
| `.text-para-doc-wrap .text-para-documents span` | 2 | `.text-para-documents span` |
| `.tmp-btn.btn-border` | 2 | `.tmp-btn` |
| `.banner-two-main-wrapper .inner .sub-title` | 3 | `.sub-title` |

**Symptom war jeweils:** Die eigene Farbe wurde ignoriert, ohne Fehlermeldung.

**Lösung:** Selektor auf dieselbe Länge bringen. Nicht `!important` benutzen —
außer beim Sicherheitsnetz oben, wo es gegen Inline-Styles aus JavaScript geht.

Sonderfall: `.radius-round` nutzt selbst `!important` (500px Pille). Deshalb
wurde die Klasse aus den Buttons entfernt, statt dagegen anzuschreiben.

---

## 3. Fest verdrahtete Altfarben

Das Template kam mit Neon-Pink. An mehreren Stellen stehen Farben direkt im
Code statt als Variable — die überleben einen Palettenwechsel.

| Stelle | Was | Symptom |
|---|---|---|
| `.rpp-banner-two-area::before/::after` | zwei `#FF014F`-Blurflächen | roter Schimmer hinter dem Hero |
| `.main-img::after` | Verlauf nach `#060606` | Überlagerung über dem Portrait |

Beide sind in `src/legacy/scss/elements/_modern-refresh.scss` überschrieben. **Wenn irgendwo eine Farbe
auftaucht, die nicht zur Palette gehört: nach fest verdrahteten Werten suchen.**

```bash
grep -rn "#FF014F\|#060606" src/legacy/scss
```

---

## 4. Regeln ohne feste Maße

**`.service-card-icon`** hat nur `min-width` und `min-height`, ist aber ein
Block-Element. Gibt man ihm einen Hintergrund, läuft der über die **ganze
Kartenbreite** statt eine Kachel zu bilden. Lösung: feste `width`/`height` und
`margin: auto`.

**`.tmp-btn.btn-border`** setzt `line-height: 57px`. Zusammen mit Padding wird
der Button fast doppelt so hoch. In einem Flex-Container zieht er dann den
Nachbar-Button mit auf seine Höhe.

---

## 5. `tmp-white-version` war nie aktiv

**Symptom:** Anpassungen an der hellen Variante hatten keine Wirkung.

**Ursache:** Im `<body>` stand die Klasse nur als HTML-Kommentar:

```html
<body> <!-- class="tmp-white-version" -->
```

Die Seite lief also immer im dunklen Standard des Templates. Heute ist das die
bewusste Entscheidung — die dunkle Palette ist gesetzt, die Klasse entfernt.

---

## 6. Startseiten-Link: `{{ "/" | relURL }}` (Hugo) und `relUrl` (Astro)

**Symptom:** In einer Branch-Vorschau führen „Start", Logo und Breadcrumb auf
die Hauptseite statt in die Vorschau.

**Ursache (Hugo, historisch):** Hugo behandelte einen nackten Schrägstrich als bereits absolut und
hängte den Basispfad nicht an:

| Ausdruck | Ergebnis in der Vorschau |
|---|---|
| `{{ "/" \| relURL }}` | `/` ❌ |
| `{{ "" \| relURL }}` | `/preview/<branch>/` ✓ |
| `{{ "about/" \| relURL }}` | `/preview/<branch>/about/` ✓ |
| `{{ site.Home.RelPermalink }}` | `/preview/<branch>/` ✓ |

Deshalb funktionierten alle anderen Links und ausgerechnet die zur Startseite
nicht.

**Heute (Astro):** Alle Links laufen über `relUrl` und `absUrl` aus `src/lib/site.ts`; die Pfade stehen in
`src/lib/routes.ts`. Beide kennen den Basispfad (`BASE_PATH`) und behandeln einen führenden `/` bewusst
base-relativ, die Falle gibt es dort nicht mehr:

| Ausdruck | Hauptseite | Vorschau `/preview/<branch>/` |
|---|---|---|
| `relUrl(pagePath('home'))` bzw. `relUrl('')` | `/` | `/preview/<branch>/` ✓ |
| `relUrl('about/')` | `/about/` | `/preview/<branch>/about/` ✓ |
| `relUrl('/about/')` | `/about/` | `/preview/<branch>/about/` ✓ |
| `absUrl('about/')` | `https://creimann.cc/about/` | `https://creimann.cc/preview/<branch>/about/` ✓ |
| `homeUrl()` | `https://creimann.cc/` | `https://creimann.cc/preview/<branch>/` ✓ |

**Lösung:** Nie `href="/…"` von Hand in `.astro`-Dateien schreiben, immer `relUrl(pagePath('…'))`. Die Tests
(`tests/preview.test.mjs`) bauen eine Vorschau und prüfen, dass jeder wurzelabsolute Verweis mit dem Basispfad
beginnt. Einzige Ausnahme: der Link „Alle Vorschauen" in `PreviewBanner.astro` zeigt bewusst hart auf `/preview/`.

---

## 7. Content-Dateien sind keine Templates

In `src/content/pages/*.md` steht der Rohtext als fertiges HTML; Astro gibt ihn unverändert aus
(`<Fragment set:html={entry.body} />`). Es werden **keine** Ausdrücke ausgewertet, `{{ }}` und `{ }`
erscheinen als Text. Interne Links dort deshalb relativ setzen:

```html
<a href="../kontakt/">…</a>   <!-- richtig -->
<a href="/kontakt/">…</a>     <!-- führt aus der Vorschau heraus -->
```

Wer dort Logik braucht, setzt sie in der Route (`src/pages/<seite>/index.astro`) oder in einer Komponente um,
nicht im Content. (In Hugo war der Weg ein Shortcode unter `layouts/shortcodes/`; die beiden früheren
Checklisten-Shortcodes sind im Beitrag `integritaet.md` durch fertiges HTML ersetzt, siehe
`docs/inhalte-pflegen.md`.)

---

## 8. HTML und CSS in den Content-Dateien

`src/content/pages/about.md` und `mein-weg.md` enthalten
vollständige HTML-Blöcke samt eigener `<style>`-Bereiche. (In Hugo war dafür `unsafe = true` in `hugo.toml`
nötig; in Astro entfällt das, der Rohtext geht per `set:html` durch.)

Das ist die größte Abweichung vom üblichen Aufbau: Inhalt und Gestaltung
sind vermischt, und Seiten-CSS steht außerhalb der SCSS-Pipeline. **Bewusst so
belassen.** Wer dort Typografie ändert, muss in die Content-Datei — nicht ins
SCSS.

---

## 9. `ch` an einem Container misst die falsche Schrift

**Symptom:** Auf „Mein Weg" hatte die Seite vier verschiedene linke Kanten,
obwohl für alle Elemente dieselbe Regel galt.

```
Spalte / Bildkarte / Überschrift   links 300   breit 840
Absatz                             links 372   breit 696
Zitatkasten                        links 442   breit 557
Zitattext darin                    links 472   breit 497
```

**Ursache:** `max-width: 70ch` bezieht sich auf die **eigene** Schriftgröße des
Elements, nicht auf die seiner Kinder. Der Zitatkasten erbt 16px vom Grundtext,
seine Absätze stehen auf 20px — dieselbe Regel ergab dort 557px statt der
696px, die sie an einem 20px-Absatz ergibt. Dazu kommt `box-sizing: border-box`
mit 30px Innenabstand, was die letzte Kante erklärt.

**Lösung:** Maße an Containern in Pixeln setzen. `ch` ist nur dort brauchbar,
wo das Element selbst die Schriftgröße trägt, für die das Maß gedacht ist —
etwa `.hero-lead { max-width: 46ch }`.

Und grundsätzlich: die **Spalte** begrenzen, nicht jedes Element einzeln. Nur
so teilen sich alle Elemente zwangsläufig eine Kante.

---

## 10. `min-width` schlägt immer `max-width`

**Symptom:** Eine `max-width` tut sichtbar nichts, ohne Fehlermeldung.

**Ursache:** In CSS gewinnt die Mindestbreite grundsätzlich gegen die
Höchstbreite. Das Template gibt `.card-right-content` ein
`min-width: 300px` — jede Deckelung darunter bleibt wirkungslos.

**Lösung:** `min-width: 0` mitsetzen. Aber Vorsicht, siehe Punkt 11.

---

## 11. `max-width` an einem Flex-Kind verändert die ganze Verteilung

**Symptom:** Eine Breitenänderung an einem Element verschiebt das
Geschwister-Element mit, oft in die falsche Richtung.

**Ursache:** In den Text-Bild-Karten haben beide Kinder `width: 100%` und
teilen sich den verfügbaren Platz. Eine `max-width` ändert damit nicht nur das
eigene Element, sondern die Größenverteilung des Containers.

Zwei Fehlschläge in Folge:

| Versuch | Ergebnis |
|---|---|
| `max-width` am Text | Text fiel von 55 auf 35 Zeichen pro Zeile |
| `min-width: 0` am Bild | Bild schrumpfte auf 113px zusammen |

**Lösung:** Feste Breite über `flex: 0 0 230px` statt über `min-width` oder
`max-width`. Damit ist die Verteilung eindeutig.

---

## 12. SplitText friert den Zeilenumbruch ein

**Symptom:** Auf der Startseite hingen einzelne Wörter allein auf einer Zeile
(„Ich", „verbinde"), obwohl der Absatz vorher sauber umbrach. Nur die
Startseite war betroffen, alle anderen Seiten sahen unverändert aus.

**Ursache:** `SplitText` mit `type: "lines,words,chars"` misst, wo der Text
**im Moment des Aufrufs** umbricht, und gießt das Ergebnis in feste
`<div class="split-line">`. Läuft das, solange noch die Ersatzschrift steht,
werden deren Umbrüche eingefroren — sie bleiben stehen, auch nachdem Fraunces
geladen ist. `font-display: swap` sorgt genau dafür, dass zuerst die
Ersatzschrift zu sehen ist.

Vorher lief das Skript blockierend mitten im Seitenaufbau und kam dadurch
meist erst nach den Schriften dran. Das war Glück, keine Absicht. Seit die
Skripte mit `defer` laufen, kommen sie früher — und das Rennen ging
regelmäßig verloren.

**Lösung:** In `src/legacy/js/main.js` wird erst gespalten, wenn die Schriften
wirklich da sind:

```js
document.fonts.ready.then(function () {
  splitAnimatedTitles(animatedTextElements);
});
```

**Merke:** Jede Messung von Textmaßen — Umbruch, Höhe, Zeilenzahl — gehört
hinter `document.fonts.ready`. Vorher misst man die Ersatzschrift.

Zum Nachprüfen taugt der Vergleich der Seitenhöhen: alte und neue Fassung nebeneinander
bauen (nach `document.fonts.ready`, bei Desktop- und Handybreite) und die Höhen vergleichen. Weicht eine Seite ab, ist etwas
verrutscht. Dabei ist zu beachten, dass die Buchstaben-Animation selbst nicht
pixelgenau reproduzierbar ist — derselbe Build weicht von sich selbst ab.
Aussagekräftig ist die **Seitenhöhe**, nicht die Zahl abweichender Pixel.
