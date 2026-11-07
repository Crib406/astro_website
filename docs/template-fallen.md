# Fallstricke des Templates

Das Template ist ein gekauftes Agentur-Paket, direkt ins Projekt kopiert. Es
bringt Eigenheiten mit, die beim Anpassen wiederholt Zeit gekostet haben. Jeder
Eintrag: **Symptom → Ursache → Lösung.**

---

## 1. Die Split-Text-Animation

Elemente mit der Klasse `inv-title-animation-wrap` werden von GSAP `SplitText`
in Zeilen, Wörter und **einzelne Buchstaben** zerlegt. Jeder Buchstabe bekommt
`opacity: 0` und wird beim Scrollen gestaffelt eingeblendet
(`static/assets/js/main.js`, ab Zeile 757).

Das erklärt drei verschiedene Fehlerbilder.

### 1a. Leere Buttons

**Symptom:** Ein Button erscheint als farbige Fläche ohne Text.

**Ursache:** Der Button steckt in einem Element mit
`inv-title-animation-wrap`. Sein Text wird mitzerlegt und bleibt auf
`opacity: 0`.

**Lösung:** Den Button aus dem Element herausziehen. Zusätzlich gibt es in
`_modern-refresh.scss` ein Sicherheitsnetz:

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

Eigene Regeln stehen in `_modern-refresh.scss`, das als letztes geladen wird.
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

Beide sind in `_modern-refresh.scss` überschrieben. **Wenn irgendwo eine Farbe
auftaucht, die nicht zur Palette gehört: nach fest verdrahteten Werten suchen.**

```bash
grep -rn "#FF014F\|#060606" assets/scss
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

## 6. `{{ "/" | relURL }}` liefert nur `/`

**Symptom:** In einer Branch-Vorschau führen „Start", Logo und Breadcrumb auf
die Hauptseite statt in die Vorschau.

**Ursache:** Hugo behandelt einen nackten Schrägstrich als bereits absolut und
hängt den Basispfad nicht an:

| Ausdruck | Ergebnis in der Vorschau |
|---|---|
| `{{ "/" \| relURL }}` | `/` ❌ |
| `{{ "" \| relURL }}` | `/preview/<branch>/` ✓ |
| `{{ "about/" \| relURL }}` | `/preview/<branch>/about/` ✓ |
| `{{ site.Home.RelPermalink }}` | `/preview/<branch>/` ✓ |

Deshalb funktionierten alle anderen Links und ausgerechnet die zur Startseite
nicht.

**Lösung:** Für den Startseiten-Link immer `{{ site.Home.RelPermalink }}`.

---

## 7. Content-Dateien sind keine Templates

In `content/**/*.md` wertet Hugo **keine** `{{ }}`-Ausdrücke aus — sie
erscheinen als Text. Interne Links dort deshalb relativ setzen:

```html
<a href="../kontakt/">…</a>   <!-- richtig -->
<a href="/kontakt/">…</a>     <!-- führt aus der Vorschau heraus -->
```

Wer dort Hugo-Logik braucht, muss einen Shortcode benutzen
(`layouts/shortcodes/`).

---

## 8. HTML und CSS in den Content-Dateien

`content/about/_index.md` und `content/mein-weg/_index.md` enthalten
vollständige HTML-Blöcke samt eigener `<style>`-Bereiche. Deshalb steht in
`hugo.toml` `unsafe = true`.

Das ist die größte Abweichung vom üblichen Hugo-Aufbau: Inhalt und Gestaltung
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

**Lösung:** In `assets/js/main.js` wird erst gespalten, wenn die Schriften
wirklich da sind:

```js
document.fonts.ready.then(function () {
  splitAnimatedTitles(animatedTextElements);
});
```

**Merke:** Jede Messung von Textmaßen — Umbruch, Höhe, Zeilenzahl — gehört
hinter `document.fonts.ready`. Vorher misst man die Ersatzschrift.

Zum Nachprüfen taugt der Bildvergleich: alte und neue Fassung nebeneinander
bauen und die Seitenhöhen vergleichen. Weicht eine Seite ab, ist etwas
verrutscht. Dabei ist zu beachten, dass die Buchstaben-Animation selbst nicht
pixelgenau reproduzierbar ist — derselbe Build weicht von sich selbst ab.
Aussagekräftig ist die **Seitenhöhe**, nicht die Zahl abweichender Pixel.
