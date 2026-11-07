import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { tryParseLiteralDate } from './lib/dates';

/**
 * Seiten (home, about, mein-weg, kontakt, impressum, blog): Hugo-Frontmatter
 * und Rohinhalt. Der Body wird nicht als Markdown gerendert, sondern als
 * Rohtext per set:html ausgegeben (wie Hugos .RawContent | safeHTML).
 */
const pages = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/pages' }),
  schema: z
    .object({
      title: z.string(),
      description: z.string().optional(),
      seo_title: z.string().optional(),
      /** schema.org-Felder, die in den Seitenknoten des JSON-LD-Graphen gemischt werden */
      jsonld: z.record(z.string(), z.any()).optional(),
      sitemap_exclude: z.boolean().optional(),
      aliases: z.array(z.string()).optional(),
      url: z.string().optional(),
      layout: z.string().optional(),
      type: z.string().optional(),
      /** Änderungsdatum (in Hugo aus Git, hier fest im Frontmatter) */
      lastmod: z.coerce.date().optional(),
      cascade: z.any().optional(),
    })
    .passthrough(),
});

/**
 * Blogbeiträge. Großzügig optional, damit alte und neue Felder durchgehen.
 * Entwürfe (draft: true) werden von den Routen ausgefiltert.
 */
const blog = defineCollection({
  // Leere oder fehlende Ordner brechen den Build nicht: die Collection ist dann leer.
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/blog' }),
  schema: z
    .object({
      title: z.string(),
      /** Text in Anführungszeichen, damit der Versatz erhalten bleibt (siehe lib/dates.ts) */
      date: z
        .string({
          error:
            'date muss als Text in Anführungszeichen stehen, z. B. "2025-12-06T10:00:00+01:00" (sonst geht der Versatz verloren)',
        })
        .refine((s) => tryParseLiteralDate(s) !== undefined, {
          error: 'date ist kein gültiges Datum (erwartet: "2025-12-06" oder "2025-12-06T10:00:00+01:00")',
        })
        .transform((s) => tryParseLiteralDate(s)!.iso),
      lastmod: z.coerce.date().optional(),
      draft: z.boolean().optional(),
      author: z.string().optional(),
      image: z.string().optional(),
      slug: z.string().optional(),
      description: z.string().optional(),
      summary: z.string().optional(),
      seo_title: z.string().optional(),
      seo_description: z.string().optional(),
      category: z.string().optional(),
      categories: z.array(z.string()).optional(),
      tags: z.array(z.string()).optional(),
      reading_time: z.union([z.number(), z.string()]).optional(),
      jsonld: z.record(z.string(), z.any()).optional(),
      sitemap_exclude: z.boolean().optional(),
      aliases: z.array(z.string()).optional(),
      url: z.string().optional(),
      layout: z.string().optional(),
      type: z.string().optional(),
    })
    .passthrough(),
});

export const collections = { pages, blog };
