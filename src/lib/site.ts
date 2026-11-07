/**
 * Site-Konstanten und URL-Helfer.
 *
 * Alles, was in Hugo `site.Title`, `site.Params.siteseo`, `relURL`, `absURL`
 * und `site.Home.Permalink` war, steht hier. Die Helfer kennen `base`
 * (z. B. `/preview/<branch>/`), damit Links in Branch-Vorschauen nicht aus der
 * Vorschau herausführen.
 */

/** Seitentitel (Hugo: site.Title). */
export const siteTitle = 'Christoph B. Reimann';

/** Globaler SEO-Titel der Startseite (Hugo: params.siteseo.title). */
export const seoTitle = 'Christoph B. Reimann – Betriebswirt & Generalist, Bad Harzburg';

/**
 * Ersatz-Beschreibung für Seiten ohne eigene
 * (Hugo: params.siteseo.metaundogDescription).
 */
export const seoDescription =
  'Christoph B. Reimann verbindet Menschen, Abläufe und Technik für Zusammenarbeit auf Augenhöhe – Betriebswirt und Generalist aus Bad Harzburg.';

/** Sprache der Seite (<html lang>). */
export const lang = 'de';
/** Sprache/Region für schema.org (inLanguage). */
export const langRegion = 'de-DE';
/** Open-Graph-Locale. */
export const ogLocale = 'de_DE';

/** Social-Preview-Bild (1200x630), Pfad relativ zur Basis. */
export const ogImagePath = 'assets/images/about/og-card.jpg';

/** Ursprung der Seite ohne Pfad und ohne abschließenden Schrägstrich, z. B. `https://creimann.cc`. */
const origin = new URL(import.meta.env.SITE ?? 'https://creimann.cc').origin;

/** Basispfad mit führendem und abschließendem Schrägstrich, z. B. `/` oder `/preview/x/`. */
const baseTrimmed = (import.meta.env.BASE_URL ?? '/').replace(/^\/+|\/+$/g, '');
export const base = baseTrimmed ? `/${baseTrimmed}/` : '/';

/** Pfad der vollen Start-URL (Ursprung + base), z. B. `/preview/x/`. */
const homePath = new URL(origin + base).pathname;

/** true, wenn die Seite unter /preview/<branch>/ ausgeliefert wird. */
export const isPreview = homePath.startsWith('/preview/');

/** Branch-Name aus der Start-URL (nur in Vorschauen), sonst leer. */
export const previewBranch = isPreview
  ? homePath.slice('/preview/'.length).replace(/\/+$/, '')
  : '';

const stripLead = (path: string) => path.replace(/^\/+/, '');

/**
 * Base-fähiger Pfad (Hugo: relURL, aber auch für die Startseite).
 * `relUrl('about/')` -> `/about/`, in Vorschau `/preview/x/about/`.
 * `relUrl('')` -> die Startseite (`base`).
 *
 * Ein führender `/` wird bewusst als base-relativ behandelt (anders als bei
 * Hugos relURL): `relUrl('/about/')` ergibt ebenfalls `<base>about/`, nie die
 * Wurzel der Domain. So kann ein Pfad mit oder ohne `/` übergeben werden,
 * ohne dass er in einer Vorschau aus dem Vorschauordner herausführt.
 */
export function relUrl(path = ''): string {
  return base + stripLead(path);
}

/**
 * Absolute URL mit Ursprung und base (Hugo: absURL). Dasselbe base-relative
 * Verhalten wie `relUrl`, auch bei führendem `/`. Damit ist sie zugleich der
 * Permalink einer Seite (`absUrl('about/')`).
 */
export function absUrl(path = ''): string {
  return origin + relUrl(path);
}

/** Absolute URL der Startseite mit base (Hugo: site.Home.Permalink). */
export function homeUrl(): string {
  return absUrl('');
}

/**
 * Canonical-URL zu einem Permalink (absolute Seiten-URL inkl. base).
 * In Vorschauen zeigt sie auf die Hauptseite: gleicher Pfad, aber ohne
 * `/preview/<branch>/`. Auf der Hauptseite ist sie der Permalink selbst.
 * Ein Permalink außerhalb der Site (anderer Ursprung oder anderes base) ist
 * ein Programmfehler und bricht den Bau ab.
 */
export function canonicalUrl(permalink: string): string {
  const home = homeUrl();
  if (!permalink.startsWith(home)) {
    throw new Error(`Permalink "${permalink}" liegt außerhalb der Site ${home}`);
  }
  return isPreview ? `${origin}/${permalink.slice(home.length)}` : permalink;
}

/**
 * Zeitpunkt im Format von Hugos `2006-01-02T15:04:05Z07:00`, immer in UTC
 * (`...Z`, so schreibt Hugo die Zeiten aus der Versionsverwaltung).
 * Frontmatter-Daten mit eigenem Versatz (Veröffentlichungsdatum der Beiträge)
 * laufen nicht hierüber, sie bleiben wörtlich (siehe dates.ts).
 */
export function isoDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString().replace(/\.\d{3}Z$/, 'Z');
}

/** Absolute Seiten-URL aus der Request-URL (`Astro.url`); enthält base bereits. */
export function permalinkFromUrl(url: URL): string {
  return origin + url.pathname;
}
