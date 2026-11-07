import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { tryParseLiteralDate } from './lib/dates';

/**
 * Änderungsdatum: Pflichtfeld, von Hand gepflegt (die Historie des Repos
 * beginnt mit der Migration, daher kein Datum aus der Versionsverwaltung).
 * Es steht als UTC-Zeitpunkt im Frontmatter (`2026-08-12T18:00:38Z`) und
 * speist Sitemap `<lastmod>` und JSON-LD `dateModified`. Bei jeder inhaltlichen
 * Änderung einer Seite anheben, bei reinen Frontmatter- oder Layoutänderungen nicht.
 */
const lastmod = z.preprocess(
  // Text in ein Datum wandeln; was sich nicht wandeln lässt, bleibt Text und
  // erscheint so in der Fehlermeldung (z.coerce.date() würde "Invalid Date" melden).
  (value) => {
    if (typeof value !== 'string') return value;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? value : parsed;
  },
  z.date({
    error: (issue) =>
      issue.input === undefined
        ? 'lastmod fehlt. Pflichtfeld, z. B. lastmod: 2026-08-12T18:00:38Z (Zeitpunkt der letzten inhaltlichen Änderung, UTC)'
        : `lastmod "${String(issue.input)}" ist kein gültiges Datum. Erwartet z. B. 2026-08-12T18:00:38Z`,
  }),
);

/** schema.org-Felder, die in den Seitenknoten des JSON-LD-Graphen gemischt werden. */
const jsonld = z.record(z.string(), z.any());

/**
 * Seiten (home, about, mein-weg, kontakt, impressum, blog): Frontmatter und
 * Rohinhalt. Der Body wird nicht als Markdown gerendert, sondern als Rohtext
 * per set:html ausgegeben (wie Hugos .RawContent | safeHTML). Unbekannte
 * Felder sind ein Fehler (strictObject), damit Altlasten nicht unbemerkt bleiben.
 */
const pages = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/pages' }),
  schema: z.strictObject({
    title: z.string(),
    description: z.string().optional(),
    seo_title: z.string().optional(),
    jsonld: jsonld.optional(),
    /** Seite nicht in die Sitemap aufnehmen */
    sitemap_exclude: z.boolean().optional(),
    lastmod,
  }),
});

/**
 * Blogbeiträge (Markdown, von Astro gerendert). Entwürfe (draft: true) und
 * Beiträge mit Datum in der Zukunft erzeugen keine Seite.
 */
const blog = defineCollection({
  // Leere oder fehlende Ordner brechen den Bau nicht: die Collection ist dann leer.
  loader: glob({ pattern: '*.md', base: './src/content/blog' }),
  schema: z.strictObject({
    title: z.string(),
    /** Text in Anführungszeichen, damit der Versatz erhalten bleibt (siehe lib/dates.ts) */
    date: z
      .string({
        error: (issue) =>
          issue.input === undefined
            ? 'date fehlt. Pflichtfeld, als Text in Anführungszeichen, z. B. "2025-12-06T10:00:00+01:00"'
            : 'date muss als Text in Anführungszeichen stehen, z. B. "2025-12-06T10:00:00+01:00" (sonst geht der Versatz verloren)',
      })
      .refine((s) => tryParseLiteralDate(s) !== undefined, {
        error: 'date ist kein gültiges Datum (erwartet: "2025-12-06" oder "2025-12-06T10:00:00+01:00")',
      })
      .transform((s) => tryParseLiteralDate(s)!.iso),
    lastmod,
    draft: z.boolean().optional(),
    /** Kurztext für Blogübersicht und RSS (Pflicht, es gibt keinen Ersatz aus dem Text) */
    summary: z
      .string({ error: 'summary fehlt. Pflichtfeld: Kurztext für Blogübersicht und RSS' })
      .trim()
      .min(1, { error: 'summary ist leer. Pflichtfeld: Kurztext für Blogübersicht und RSS' }),
    description: z.string().optional(),
    seo_title: z.string().optional(),
    /** Abweichendes URL-Segment, sonst der Dateiname */
    slug: z.string().optional(),
    /** Autorname (Pflicht): steht im Beitragskopf als „Von …“ */
    author: z
      .string({ error: 'author fehlt. Pflichtfeld: Name der Autorin bzw. des Autors, z. B. "Christoph B. Reimann"' })
      .trim()
      .min(1, { error: 'author ist leer. Pflichtfeld: Name der Autorin bzw. des Autors' }),
    author_role: z.string().optional(),
    author_bio: z.string().optional(),
    /** Titelbild, Pfad mit führendem / relativ zur Basis */
    image: z.string().optional(),
    featured_image: z.string().optional(),
    /** Kategorie (Pflicht): steht im Beitragskopf als Überschrift */
    category: z
      .string({ error: 'category fehlt. Pflichtfeld: Kategorie des Beitrags, z. B. "Zugehörigkeit"' })
      .trim()
      .min(1, { error: 'category ist leer. Pflichtfeld: Kategorie des Beitrags' }),
    tags: z.array(z.string()).optional(),
    reading_time: z.union([z.number(), z.string()]).optional(),
    jsonld: jsonld.optional(),
  }),
});

export const collections = { pages, blog };
