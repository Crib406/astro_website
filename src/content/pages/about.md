---
title: "Über mich"
lastmod: 2026-08-12T16:51:04Z
description: "Über Christoph B. Reimann aus Bad Harzburg: Hintergrund, Haltung und Schwerpunkte eines Betriebswirts und Generalisten. Klar, verbindlich, menschlich."
# Profilseite: macht die Person zum Hauptgegenstand dieser Seite.
# Alles Weitere (Name, URL, Bezug zur Person) leitet src/lib/jsonld.ts ab.
jsonld:
  "@type": "ProfilePage"
  description: "Über mich Christoph Reimann aus Bad Harzburg. Hintergrund, Haltung, Schwerpunkte und Ziel von Christoph B. Reimann aus Bad Harzburg (Harz)."
---

<style>
  /* Bereich bleibt zentriert */
  .blog-details-left-area {
    text-align: center;
  }

  /* Flattersatz statt Blocksatz: in der schmalen Spalte riss der Blocksatz
     sichtbare Lücken zwischen die Wörter. Normale Schriftstärke statt 700:
     wenn alles fett ist, lässt sich nichts mehr betonen. */
  .blog-details-left-area .disc {
    text-align: left;
    hyphens: auto;
    font-weight: 400;
    line-height: 1.7;
  }

  .blog-details-left-area .disc p {
    text-align: left;
    hyphens: auto;
    margin-bottom: 1.2em;
    font-weight: 400;
  }

  .blog-details-left-area .disc li {
    text-align: left;
    hyphens: auto;
    margin-bottom: 0.6em;
  }

  /* Falls Zitatbereiche existieren, optional zentrieren */
  .quote-area-blog-details .disc {
    text-align: center;
    text-justify: auto;
    hyphens: none;
  }
</style>


<div class="blog-classic-area-wrapper tmp-section-gap">
  <div class="container">
    <div class="row justify-content-center">
      <div class="col-12 col-lg-10 col-xl-8 mx-auto">
        <div class="blog-details-left-area text-center">

          <br>
          <h2 class="title">Ich verstehe komplexe Abläufe schnell und gestalte sie.</h2>

          <div class="our-portfolio-swiper">

             <div class="blog-details-swiper">
              <div class="our-portfoli-swiper-card">
                <div class="card-right-content">
                  <img src="../assets/images/blog/cr_autor.webp" alt="Christoph B. Reimann mit Brille 2024" width="771" height="1028" loading="lazy" decoding="async">
                </div>
                <div class="card-left-content">
                  <!-- Neben dem Bild steht bewusst nur EIN Absatz. Die Spalte
                       daneben ist rund 45 Zeichen breit; standen dort drei
                       Absaetze, lief der halbe Seitentext durch eine enge
                       Spalte voller Trennstriche, und unter dem Bild blieb
                       eine grosse Luecke. Alles Weitere laeuft in voller
                       Breite, wie auf "Mein Weg".
                       Reihenfolge der Seite: Aussage, dann Werdegang, dann
                       Haltung. Der Werdegang stand vorher auseinandergerissen
                       in zwei Absaetzen mit einem Absatz ueber Haltung
                       dazwischen. -->
                  <p class="disc">
                    Technisches Verständnis aus der praktischen Anwendung, ausgeprägte digitale Kompetenz und kaufmännisches Denken kommen bei mir zusammen. Ich bin gelernter Groß- und Außenhandelskaufmann und habe anschließend dual Betriebswirtschaftslehre an der DHBW Mosbach studiert.
                  </p>
                </div>
              </div>
            </div>
            <br>

            <p class="disc">
              Durch unser Familienunternehmen bin ich früh mit Maschinen und gewerblicher Arbeit in Berührung gekommen und kenne die Praxis. Ergänzend dazu habe ich eine mehrjährige Ausbildung in der Individualpsychologie mit Schwerpunkt ermutigende Führung abgeschlossen. Sie prägt seitdem, wie ich auf Menschen und Zusammenarbeit schaue.
            </p>

            <p class="disc">
              Auf eine klare, ehrliche Kommunikation auf Augenhöhe lege ich großen Wert. Dabei interessiert mich immer der Mensch hinter der Rolle und ich sehe ihn nicht nur als Produktionsfaktor.
            </p>

            <!-- Die frühere Liste zählte Fähigkeiten auf und wiederholte damit die
                 Karten der Startseite. Zusätzlich sagte sie teilweise dasselbe wie
                 der Absatz, der direkt darunter stand. Beides ist jetzt zu einer
                 Liste zusammengefasst, die die Haltung beschreibt statt der
                 Fähigkeiten. Formulierungen stammen aus dem bisherigen Absatz. -->
            <h2 class="title mt--40">Wie ich arbeite</h2>

            <div class="check-box-wrap">
              <ul>
                <li>
                  <p class="check-box-item">
                    <span><i class="fa-solid fa-circle-check"></i></span>
                    Klar und ehrlich kommunizieren, auf Augenhöhe
                  </p>
                </li>
                <li>
                  <p class="check-box-item">
                    <span><i class="fa-solid fa-circle-check"></i></span>
                    Den Menschen hinter der Rolle sehen, nicht den Produktionsfaktor
                  </p>
                </li>
                <li>
                  <p class="check-box-item">
                    <span><i class="fa-solid fa-circle-check"></i></span>
                    Unterschiedliche Perspektiven zusammenbringen
                  </p>
                </li>
                <li>
                  <p class="check-box-item">
                    <span><i class="fa-solid fa-circle-check"></i></span>
                    Ausprobieren, statt es endlos zu besprechen
                  </p>
                </li>
              </ul>

              <br>

              <p class="disc">
                Ich arbeite am liebsten dort, wo ich meine Vielseitigkeit leben darf, statt in endlosen Meetings und Hierarchie-Theater. Verbindungen zu schaffen und Prozesse nachhaltig zu gestalten, ist das, was mich antreibt.
              </p>

            </div>
          </div> <!-- .our-portfolio-swiper -->

        </div> <!-- .blog-details-left-area -->
      </div> <!-- .col -->
    </div> <!-- .row -->
  </div> <!-- .container -->


  <div class="about-content-area">
    <div class="text-para-doc-wrap">

      <!-- Bewusst nur ein Weg: Ein Kontakt-Button hier las sich wie eine
           Bewerbung und erweckte den Eindruck einer Jobsuche. Der Kontakt ist
           über Menü und Footer erreichbar.
           Button NICHT in ein .inv-title-animation-wrap-Element schachteln:
           die Split-Text-Animation zerlegt sonst den Buttontext in einzelne
           Buchstaben mit opacity:0 und der Button bleibt leer. -->
      <div class="about-btn mt--40 text-center tmp-scroll-trigger tmp-fade-in animation-order-1">
        <a class="tmp-btn hover-icon-reverse" href="../mein-weg/">
          <span class="icon-reverse-wrapper">
            <span class="btn-text">Mehr über meinen Weg</span>
            <span class="btn-icon"><i class="fa-sharp fa-regular fa-arrow-right"></i></span>
            <span class="btn-icon"><i class="fa-sharp fa-regular fa-arrow-right"></i></span>
          </span>
        </a>
      </div>

    </div>
  </div>

</div> <!-- .blog-classic-area-wrapper -->
