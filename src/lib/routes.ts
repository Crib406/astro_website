/**
 * Die einzige Stelle für Pfade der Seite. Alle Pfade sind relativ zur
 * Startseite und enden auf `/` (Seiten) bzw. auf dem Dateinamen (Dateien).
 * Für base-fähige URLs `relUrl(...)` bzw. `absUrl(...)` aus site.ts darum legen.
 *
 * Die Dateien unter src/pages/ müssen zu diesen Pfaden passen; hier steht,
 * was Menü, Footer, Breadcrumb, Sitemap, Feed und Seiten-Props davon wissen.
 */

/** Hugo-Kind einer Seite, wie BaseLayout es erwartet. */
export type PageKind = 'home' | 'section' | 'page';

/** Kind, das BaseLayout und Head kennen: die Seiten aus `pageRoutes` plus die 404-Seite. */
export type LayoutKind = PageKind | '404';

interface PageRoute {
  /** Pfad der Seite relativ zur Startseite */
  path: string;
  kind: PageKind;
  /** Hugo-Section (nur der Blog) */
  section?: 'blog';
}

/** Seiten der `pages`-Collection: ID (Dateiname ohne Endung) -> Route. */
export const pageRoutes = {
  home: { path: '', kind: 'home' },
  about: { path: 'about/', kind: 'page' },
  'mein-weg': { path: 'mein-weg/', kind: 'page' },
  kontakt: { path: 'kontakt/', kind: 'page' },
  impressum: { path: 'impressum/', kind: 'page' },
  blog: { path: 'blog/', kind: 'section', section: 'blog' },
} as const satisfies Record<string, PageRoute>;

export type PageId = keyof typeof pageRoutes;

/** Weitere Endpunkte, die keine Collection-Seite sind. */
export const specialPaths = {
  notFound: '404.html',
  sitemap: 'sitemap.xml',
  robots: 'robots.txt',
  /** RSS-Feed des Blogs */
  feed: 'blog/index.xml',
  /** Weiterleitungsseite der Visitenkarte */
  visitenkarte: 'visitenkarte/',
} as const;

function routeOf(id: string): PageRoute {
  const route = (pageRoutes as Record<string, PageRoute | undefined>)[id];
  if (!route) throw new Error(`Keine Route für Seite "${id}" in src/lib/routes.ts`);
  return route;
}

/** Pfad einer Seite der `pages`-Collection; wirft bei unbekannter ID. */
export const pagePath = (id: string): string => routeOf(id).path;

/** Hugo-Kind und -Section einer Seite der `pages`-Collection; wirft bei unbekannter ID. */
export const pageKind = (id: string): { kind: PageKind; section?: 'blog' } => {
  const { kind, section } = routeOf(id);
  return { kind, section };
};

/** Minimale Sicht auf einen Beitrag, damit routes.ts ohne Astro-Typen auskommt. */
interface PostLike {
  id: string;
  data: { slug?: string | undefined };
}

/**
 * URL-Segment eines Beitrags: Frontmatter `slug`, sonst die ID (Dateiname ohne
 * Endung). Nur für `getStaticPaths` der Beitragsroute gedacht; alle anderen
 * brauchen `postPath`.
 */
export const postSlug = (post: PostLike): string => post.data.slug ?? post.id;

/** Pfad eines Beitrags relativ zur Startseite: `blog/<slug>/`. */
export const postPath = (post: PostLike): string => `${pagePath('blog')}${postSlug(post)}/`;
