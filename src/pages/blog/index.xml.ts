/*
  RSS-Feed des Blogs (Hugo: Standard-RSS-Vorlage für die Sektion `blog`).
  Gleiche Felder und Reihenfolge wie in der Hugo-Ausgabe.
*/
import type { APIRoute } from 'astro';
import { getEntry } from 'astro:content';
import { absUrl, langRegion, siteTitle } from '../../lib/site';
import { formatRfc822, getPosts, slugOf, summaryHtml } from '../../lib/blog';

const xml = (s: string): string =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&#34;')
    .replace(/'/g, '&#39;');

export const GET: APIRoute = async () => {
  const page = (await getEntry('pages', 'blog'))!;
  const posts = await getPosts();

  const title = page.data.title === siteTitle ? siteTitle : `${page.data.title} on ${siteTitle}`;
  const link = absUrl('blog/');

  const items = posts
    .map((post) => {
      const url = absUrl(`blog/${slugOf(post)}/`);
      return `
			<item>
				<title>${xml(post.data.title)}</title>
				<link>${url}</link>
				<pubDate>${post.data.date ? formatRfc822(post.data.date) : ''}</pubDate>
				<guid>${url}</guid>
				<description>${xml(summaryHtml(post))}</description>
			</item>`;
    })
    .join('');

  const body = `<?xml version="1.0" encoding="utf-8" standalone="yes"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
	<channel>
		<title>${xml(title)}</title>
		<link>${link}</link>
		<description>Recent content in ${xml(title)}</description>
		<generator>Astro</generator>
		<language>${langRegion.toLowerCase()}</language>
		<atom:link href="${absUrl('blog/index.xml')}" rel="self" type="application/rss+xml" />${items}
	</channel>
</rss>`;

  return new Response(body, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } });
};
