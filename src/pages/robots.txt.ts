import type { APIRoute } from 'astro';
import { absUrl } from '../lib/site';
import { specialPaths } from '../lib/routes';

/**
 * robots.txt der Seite. Bewusst kein "Disallow: /preview/": ein
 * gesperrter Pfad wird nicht gelesen, Google sähe das noindex der
 * Vorschauseiten nicht.
 */
export const GET: APIRoute = () => {
  const body = `User-agent: *\nAllow: /\n\nSitemap: ${absUrl(specialPaths.sitemap)}\n`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
