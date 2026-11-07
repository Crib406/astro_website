/**
 * Strukturierte Daten als ein zusammenhängender Graph (Hugo: jsonld.html):
 *
 *   WebSite  <Startseite>#website   die Website als Ganzes
 *   Person   <Startseite>#person    Daten aus src/data/person.yaml
 *   Seite    <Seiten-URL>           WebPage, ProfilePage, BlogPosting, …
 *
 * Die Knoten verweisen per @id aufeinander. Die Seite wird aus Titel,
 * Beschreibung und Datum abgeleitet; das Frontmatter-Feld `jsonld` enthält nur,
 * was davon abweicht (meist nur der @type) und wird rekursiv hineingemischt.
 * @id, url und isPartOf werden danach erzwungen.
 *
 * Anders als in Hugo müssen die Schlüssel nicht repariert werden: YAML behält
 * die Schreibweise (datePublished bleibt datePublished).
 */
import YAML from 'yaml';
import personRaw from '../data/person.yaml?raw';
import { absUrl, homeUrl, isoDate, langRegion, siteTitle } from './site';

export type Json = Record<string, any>;

const person: Json = YAML.parse(personRaw);

export interface PageSeo {
  /** Seitentitel (Frontmatter `title`) */
  title: string;
  description?: string;
  isHome?: boolean;
  /** Blogbeitrag (section blog, kind page) */
  isPost?: boolean;
  /** absolute Seiten-URL */
  permalink: string;
  /** Änderungsdatum (wird in UTC als …Z ausgegeben) */
  lastmod?: Date | string;
  /** Veröffentlichungsdatum (Blog) als ISO-Text mit dem Versatz aus dem Frontmatter, wörtlich ausgegeben */
  date?: string;
  /** Titelbild des Beitrags (Pfad oder URL) */
  image?: string;
  /** Inhalt des Frontmatter-Felds `jsonld` */
  jsonld?: Json;
}

const isPlainObject = (v: unknown): v is Json =>
  typeof v === 'object' && v !== null && !Array.isArray(v) && !(v instanceof Date);

/** Wie Hugos `merge`: Maps rekursiv, die rechte Seite gewinnt, alles andere wird ersetzt. */
export function deepMerge(base: Json, extra: Json): Json {
  const out: Json = { ...base };
  for (const [k, v] of Object.entries(extra)) {
    out[k] = isPlainObject(v) && isPlainObject(out[k]) ? deepMerge(out[k], v) : v;
  }
  return out;
}

export function buildGraph(page: PageSeo, ogImage: string): Json {
  const home = homeUrl();
  const personRef = { '@id': `${home}#person` };
  const websiteRef = { '@id': `${home}#website` };

  const website: Json = {
    '@type': 'WebSite',
    '@id': `${home}#website`,
    url: home,
    name: siteTitle,
    inLanguage: langRegion,
    publisher: personRef,
  };

  const personNode: Json = deepMerge(person, {
    '@type': 'Person',
    '@id': `${home}#person`,
    url: home,
    image: ogImage,
  });

  let node: Json = {
    '@type': page.isPost ? 'BlogPosting' : 'WebPage',
    name: page.isHome ? siteTitle : page.title,
    inLanguage: langRegion,
  };
  if (page.description) node.description = page.description;
  if (page.lastmod) node.dateModified = isoDate(page.lastmod);
  if (page.isPost) {
    node.headline = page.title;
    node.author = personRef;
    node.mainEntityOfPage = page.permalink;
    if (page.date) node.datePublished = page.date;
    if (page.image) node.image = absUrl(page.image);
  } else {
    node.about = personRef;
  }

  if (page.jsonld) node = deepMerge(node, page.jsonld);
  if (node['@type'] === 'ProfilePage') node.mainEntity = personRef;

  node = deepMerge(node, { '@id': page.permalink, url: page.permalink, isPartOf: websiteRef });

  return { '@context': 'https://schema.org', '@graph': [website, personNode, node] };
}

/** JSON für <script type="application/ld+json">; `<` wird maskiert, damit nichts den Skript-Block beendet. */
export function toScriptJson(data: Json): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}
