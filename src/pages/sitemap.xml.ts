import type { APIRoute } from 'astro';
import { getCollection, getEntry } from 'astro:content';
import { absUrl, isoDate } from '../lib/site';
import { pagePath } from '../lib/routes';

/**
 * Sitemap wie hugo/layouts/sitemap.xml: Startseite fest (weekly, 1.0), danach
 * alle weiteren Seiten und Beiträge (monthly, 0.7) ohne `sitemap_exclude`.
 * Reihenfolge: Seiten, dann Beiträge (Hugo ordnet nach Gewicht/Datum, das ist
 * für Suchmaschinen ohne Bedeutung).
 */
const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

type Entry = { loc: string; lastmod?: Date; changefreq: string; priority: string };

const urlXml = (e: Entry) =>
  [
    '  <url>',
    `    <loc>${esc(e.loc)}</loc>`,
    ...(e.lastmod ? [`    <lastmod>${isoDate(e.lastmod)}</lastmod>`] : []),
    `    <changefreq>${e.changefreq}</changefreq>`,
    `    <priority>${e.priority}</priority>`,
    '  </url>',
  ].join('\n');

export const GET: APIRoute = async () => {
  const home = await getEntry('pages', 'home');
  const entries: Entry[] = [
    { loc: absUrl(''), lastmod: home?.data.lastmod, changefreq: 'weekly', priority: '1.0' },
  ];

  const pages = await getCollection('pages');
  for (const page of pages) {
    // Der Blog ist (wie in Hugo) nicht verlinkt und bleibt aus der Sitemap.
    if (page.id === 'home' || page.id === 'blog' || page.data.sitemap_exclude) continue;
    entries.push({
      loc: absUrl(pagePath(page.id)),
      lastmod: page.data.lastmod,
      changefreq: 'monthly',
      priority: '0.7',
    });
  }

  const xml =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    entries.map(urlXml).join('\n') +
    '\n</urlset>\n';
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
