/**
 * Blog-Helfer: Beitragsliste und die Zusammenfassung wie in Hugo
 * (`.Summary | plainify | truncate 150`).
 */
import { getCollection, type CollectionEntry } from 'astro:content';
import { parseLiteralDate, type LiteralDate } from './dates';

export type BlogEntry = CollectionEntry<'blog'>;

/** URL-Segment eines Beitrags (Hugo: Frontmatter `slug`). */
export const slugOf = (entry: BlogEntry): string => entry.data.slug ?? entry.id;

/** Veröffentlichungsdatum eines Beitrags, wörtlich mit dem Versatz aus dem Frontmatter. */
export const postDate = (entry: BlogEntry): LiteralDate => parseLiteralDate(entry.data.date);

/** Veröffentlichte Beiträge (ohne Entwürfe), Datum absteigend wie in Hugo. */
export async function getPosts(): Promise<BlogEntry[]> {
  const all = await getCollection('blog', ({ data }) => data.draft !== true);
  return all.sort((a, b) => postDate(b).instant.getTime() - postDate(a).instant.getTime());
}

/** Kleiner Ersatz für Hugos Inline-Markdown (Goldmark mit Typographer) der Summary. */
function inlineHtml(md: string): string {
  let s = md
    .replace(/<[^>]*>/g, '') // rohes HTML wird (wie in Hugo ohne unsafe) nicht übernommen
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
 * `summary`, sonst die ersten 70 Wörter des Textes (Hugo-Standard).
 */
export function summaryHtml(entry: BlogEntry): string {
  const fm = entry.data.summary;
  if (fm) return inlineHtml(fm.trim());
  const text = (entry.body ?? '')
    .replace(/^#+\s.*$/gm, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/[*_`>#-]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return inlineHtml(text.split(' ').slice(0, 70).join(' '));
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
