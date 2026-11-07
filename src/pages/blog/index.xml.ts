/*
  RSS-Feed des Blogs (Hugo: Standard-RSS-Vorlage für die Sektion `blog`).
  Gleiche Felder und Reihenfolge wie in der Hugo-Ausgabe, aber mit deutschen
  Texten: Kanaltitel und -beschreibung kommen aus der Blog-Seite
  (src/content/pages/blog.md) statt aus Hugos englischem "Recent content in …
  on …"; die Zeile <generator> entfällt.
*/
import type { APIRoute } from 'astro';
import { absUrl, langRegion } from '../../lib/site';
import { getPublishedPosts, postDate, summaryHtml } from '../../lib/blog';
import { getPage } from '../../lib/pages';
import { pagePath, postPath, specialPaths } from '../../lib/routes';
import { formatRfc822 } from '../../lib/dates';

const xml = (s: string): string =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&#34;')
    .replace(/'/g, '&#39;');

export const GET: APIRoute = async () => {
  const page = await getPage('blog');
  const posts = await getPublishedPosts();

  const { title, description } = page.data;
  if (!description) throw new Error('src/content/pages/blog.md braucht eine description (RSS-Kanalbeschreibung).');
  const link = absUrl(pagePath('blog'));

  const items = posts
    .map((post) => {
      const url = absUrl(postPath(post));
      return `
			<item>
				<title>${xml(post.data.title)}</title>
				<link>${url}</link>
				<pubDate>${formatRfc822(postDate(post))}</pubDate>
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
		<description>${xml(description)}</description>
		<language>${langRegion.toLowerCase()}</language>
		<atom:link href="${absUrl(specialPaths.feed)}" rel="self" type="application/rss+xml" />${items}
	</channel>
</rss>`;

  return new Response(body, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } });
};
