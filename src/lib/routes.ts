/**
 * Zuordnung Seiten-ID (Eintrag der `pages`-Collection) -> Pfad relativ zur Startseite.
 * Hugo-Entsprechung: der Permalink der Seite. Für base-fähige URLs
 * `relUrl(pagePath(id))` bzw. `absUrl(pagePath(id))` aus site.ts verwenden.
 */
export const pagePaths: Record<string, string> = {
  home: '',
  about: 'about/',
  'mein-weg': 'mein-weg/',
  kontakt: 'kontakt/',
  impressum: 'impressum/',
  blog: 'blog/',
};

/** Pfad einer Seite der `pages`-Collection; wirft bei unbekannter ID. */
export function pagePath(id: string): string {
  const path = pagePaths[id];
  if (path === undefined) throw new Error(`Keine Route für Seite "${id}" in src/lib/routes.ts`);
  return path;
}

/** Pfad eines Blogbeitrags aus seiner ID (Dateiname ohne Endung): `blog/<id>/`. */
export function blogPostPath(id: string): string {
  return `blog/${id}/`;
}
