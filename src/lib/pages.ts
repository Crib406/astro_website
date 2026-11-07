/**
 * Seiten- und Beitragsdaten für BaseLayout. Alle Routen holen ihre Props hier
 * (`pageProps`, `postProps`) statt sie selbst aus dem Frontmatter zu
 * übersetzen, damit eine Seite nirgends vergessen wird, wenn ein Feld dazukommt.
 */
import { getEntry, type CollectionEntry } from 'astro:content';
import type { BlogEntry } from './blog';
import type { Json } from './jsonld';
import { pageKind, type LayoutKind, type PageId } from './routes';

export type PageEntry = CollectionEntry<'pages'>;

/** Props von BaseLayout (Slot = Inhalt von <main>). */
export interface BaseLayoutProps {
  /** Seitentitel (Frontmatter `title`) */
  title: string;
  description?: string | undefined;
  /** Frontmatter `seo_title`: ersetzt den berechneten <title> */
  seoTitle?: string | undefined;
  /** Hugo-Kind der Seite (`home` = Startseite): home, section (z. B. Blog-Übersicht), page (Einzelseite/Beitrag), 404 */
  kind?: LayoutKind;
  /** Hugo-Section, z. B. 'blog'. Mit kind 'page' ergibt das einen Blogbeitrag (BlogPosting, og:type article) */
  section?: string | undefined;
  /** Frontmatter `jsonld`: wird in den Seitenknoten des JSON-LD-Graphen gemischt */
  jsonld?: Json | undefined;
  /** Veröffentlichungsdatum (Blog) als ISO-Text, wörtlich aus dem Frontmatter */
  date?: string | undefined;
  /** Änderungsdatum (JSON-LD dateModified) */
  lastmod?: Date | string | undefined;
  /** Titelbild eines Beitrags (Pfad oder URL) */
  image?: string | undefined;
  /** Die Seite zeigt die Breadcrumb (Seitenkopf mit Hintergrundbild): dessen Bild wird vorgeladen */
  breadcrumb?: boolean | undefined;
  /** absolute Seiten-URL; Standard: aus der Request-URL (`Astro.url`), nur zum Überschreiben gedacht */
  permalink?: string | undefined;
}

/** Eintrag der `pages`-Collection; mit klarer Fehlermeldung, falls die Datei fehlt. */
export async function getPage(id: PageId): Promise<PageEntry> {
  const entry = await getEntry('pages', id);
  if (!entry) throw new Error(`Seite "${id}" fehlt: src/content/pages/${id}.md anlegen.`);
  return entry;
}

/** BaseLayout-Props einer Seite der `pages`-Collection. */
export function pageProps(entry: PageEntry): BaseLayoutProps {
  const { data } = entry;
  const { kind, section } = pageKind(entry.id);
  return {
    title: data.title,
    description: data.description,
    seoTitle: data.seo_title,
    jsonld: data.jsonld,
    lastmod: data.lastmod,
    // Alle Seiten außer der Startseite beginnen mit der Breadcrumb (tests/head.test.mjs prüft das gegen das HTML).
    breadcrumb: kind !== 'home',
    kind,
    section,
  };
}

/** BaseLayout-Props eines Blogbeitrags. */
export function postProps(entry: BlogEntry): BaseLayoutProps {
  const { data } = entry;
  return {
    title: data.title,
    description: data.description,
    seoTitle: data.seo_title,
    jsonld: data.jsonld,
    date: data.date,
    lastmod: data.lastmod,
    image: data.image,
    breadcrumb: true,
    kind: 'page',
    section: 'blog',
  };
}
