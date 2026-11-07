import type { APIRoute } from 'astro';
import { absUrl } from '../lib/site';
import { specialPaths } from '../lib/routes';

/**
 * Wie hugo/layouts/robots.txt. Bewusst kein "Disallow: /preview/": ein
 * gesperrter Pfad wird nicht gelesen, Google sähe das noindex der
 * Vorschauseiten nicht (siehe Kommentar im Hugo-Template).
 */
export const GET: APIRoute = () => {
  const body = `User-agent: *\nAllow: /\n\nSitemap: ${absUrl(specialPaths.sitemap)}\n`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
