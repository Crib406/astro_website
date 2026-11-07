import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { absUrl, blogPublic, isoDate } from '../lib/site';
import { getPublishedPosts } from '../lib/blog';
import { getPage } from '../lib/pages';
import { pagePath, postPath } from '../lib/routes';
import { escapeXml } from '../lib/xml';

/**
 * Sitemap: Startseite fest (weekly, 1.0), danach
 * alle weiteren Seiten und Beiträge (monthly, 0.7). Ausgenommen sind Seiten mit
 * `sitemap_exclude` und, solange `blogPublic` aus ist, Blog-Übersicht und
 * Beiträge. Reihenfolge: Seiten, dann Beiträge (Hugo ordnet nach
 * Gewicht/Datum, das ist für Suchmaschinen ohne Bedeutung). `lastmod` ist
 * das Pflichtfeld aus dem Frontmatter.
 */

type Entry = { loc: string; lastmod: Date; changefreq: string; priority: string };

const urlXml = (e: Entry) =>
  [
    '  <url>',
    `    <loc>${escapeXml(e.loc)}</loc>`,
    `    <lastmod>${isoDate(e.lastmod)}</lastmod>`,
    `    <changefreq>${e.changefreq}</changefreq>`,
    `    <priority>${e.priority}</priority>`,
    '  </url>',
  ].join('\n');

export const GET: APIRoute = async () => {
  const home = await getPage('home');
  const entries: Entry[] = [
    { loc: absUrl(pagePath('home')), lastmod: home.data.lastmod, changefreq: 'weekly', priority: '1.0' },
  ];

  for (const page of await getCollection('pages')) {
    if (page.id === 'home' || page.data.sitemap_exclude) continue;
    if (page.id === 'blog' && !blogPublic) continue;
    entries.push({
      loc: absUrl(pagePath(page.id)),
      lastmod: page.data.lastmod,
      changefreq: 'monthly',
      priority: '0.7',
    });
  }

  if (blogPublic) {
    for (const post of await getPublishedPosts()) {
      entries.push({
        loc: absUrl(postPath(post)),
        lastmod: post.data.lastmod,
        changefreq: 'monthly',
        priority: '0.7',
      });
    }
  }

  const xml =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    entries.map(urlXml).join('\n') +
    '\n</urlset>\n';
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
