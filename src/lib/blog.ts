/**
 * Blog-Helfer: Beitragsliste und die Zusammenfassung wie in Hugo
 * (`.Summary | plainify | truncate 150`).
 */
import { getCollection, type CollectionEntry } from 'astro:content';
import { parseLiteralDate, type LiteralDate } from './dates';

export type BlogEntry = CollectionEntry<'blog'>;

/** Veröffentlichungsdatum eines Beitrags, wörtlich mit dem Versatz aus dem Frontmatter. */
export const postDate = (entry: BlogEntry): LiteralDate => parseLiteralDate(entry.data.date);

/**
 * Veröffentlichte Beiträge: ohne Entwürfe und ohne Beiträge mit Datum in der
 * Zukunft (Hugo: buildFuture=false). Sortierung wie Hugos Standard für Seiten
 * ohne Gewicht: Datum absteigend, bei gleichem Datum nach Titel aufsteigend
 * (ohne Beachtung der Groß-/Kleinschreibung). Die Blog-Übersicht, die
 * Beitragsrouten, der RSS-Feed und die Sitemap nutzen alle diese Liste.
 */
export async function getPublishedPosts(now: Date = new Date()): Promise<BlogEntry[]> {
  const all = await getCollection('blog', ({ data }) => data.draft !== true);
  return all
    .filter((post) => postDate(post).instant <= now)
    .sort(
      (a, b) =>
        postDate(b).instant.getTime() - postDate(a).instant.getTime() ||
        a.data.title.localeCompare(b.data.title, 'de', { sensitivity: 'base' }),
    );
}

/** Kleiner Ersatz für Hugos Inline-Markdown (Goldmark mit Typographer) der Summary. */
function inlineHtml(md: string): string {
  let s = md
    .replace(/<[^>]*>/g, '') // eingebettete Tags verwerfen
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  s = s
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1');
  s = s
    .replace(/(^|[\s(\[>])"/g, '$1&ldquo;')
    .replace(/"/g, '&rdquo;')
    .replace(/(^|[\s(\[>])'/g, '$1&lsquo;')
    .replace(/'/g, '&rsquo;')
    .replace(/\.\.\./g, '&hellip;')
    .replace(/---/g, '&mdash;')
    .replace(/--/g, '&ndash;');
  return s;
}

/**
 * Hugos `.Summary` eines Beitrags als Inline-HTML: das Frontmatter-Feld
 * `summary` (Pflichtfeld im Schema, ein Ersatz aus dem Text entfällt).
 */
export function summaryHtml(entry: BlogEntry): string {
  return inlineHtml(entry.data.summary);
}

/** Hugo `plainify`: Tags entfernen, Entitäten bleiben stehen. */
export const plainify = (html: string): string => html.replace(/<[^>]*>/g, '');

/**
 * Hugo `truncate` (tpl/strings): gezählt wird in Zeichen; wird das (length+1)-te
 * Zeichen erreicht, wird am Ende des letzten vollständigen Wortes abgeschnitten
 * und " …" angehängt. Das Ergebnis ist in Hugo HTML-typisiert (nicht erneut escaped).
 */
export function truncate(text: string, length: number, omission = ' …'): string {
  const chars = [...text];
  if (chars.length <= length) return text;
  let lastWordIndex = 0;
  let lastNonSpace = 0;
  let currentLen = 0;
  let pos = 0; // Index in UTF-16-Einheiten
  for (const ch of chars) {
    currentLen++;
    if (/\s/u.test(ch)) lastWordIndex = lastNonSpace;
    else lastNonSpace = pos + ch.length;
    if (currentLen > length) {
      const end = lastWordIndex === 0 ? pos : lastWordIndex;
      return text.slice(0, end) + omission;
    }
    pos += ch.length;
  }
  return text;
}

/** `.Summary | plainify | truncate 150` (Text enthält ggf. HTML-Entitäten; per set:html ausgeben). */
export function listSummary(entry: BlogEntry): string {
  return truncate(plainify(summaryHtml(entry)).trim(), 150);
}
