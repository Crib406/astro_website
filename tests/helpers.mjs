/**
 * Gemeinsame Helfer für die Tests. Die Tests lesen nur das gebaute `dist/`
 * (kein Netzwerk, keine Browser). Vorher bauen: `npm run build`.
 *
 * Umgebung:
 *   DIST_DIR   Ausgabeverzeichnis (Standard: ./dist)
 *   SITE       Ursprung der Seite (Standard: https://creimann.cc)
 *   BASE_PATH  Basispfad des Baus (Standard: /), z. B. /preview/<branch>/
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { load } from 'cheerio';
import YAML from 'yaml';
import { pagePath, specialPaths } from '../src/lib/routes.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const distDir = path.resolve(process.env.DIST_DIR ?? path.join(root, 'dist'));
export const origin = (process.env.SITE ?? 'https://creimann.cc').replace(/\/+$/, '');
const baseTrim = (process.env.BASE_PATH ?? '/').replace(/^\/+|\/+$/g, '');
export const base = baseTrim ? `/${baseTrim}/` : '/';
export const homeAbs = origin + base;

if (!fs.existsSync(path.join(distDir, 'index.html'))) {
  throw new Error(
    `Kein Bau gefunden in "${distDir}". Die Tests prüfen das gebaute Ergebnis: zuerst "npm run build" ausführen.`,
  );
}

/* ---------- Erwartungen aus dem Quelltext ---------- */

const contentDir = path.join(root, 'src/content');

/** Frontmatter einer Markdown-Datei (YAML liest Zeitstempel als Text, genau wie sie dastehen). */
function frontmatterOf(file) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---/.exec(fs.readFileSync(file, 'utf8'));
  if (!m) throw new Error(`${file}: kein Frontmatter`);
  return YAML.parse(m[1]);
}

function readCollection(dir) {
  const full = path.join(contentDir, dir);
  if (!fs.existsSync(full)) return [];
  return fs
    .readdirSync(full)
    .filter((f) => f.endsWith('.md'))
    .sort()
    .map((f) => ({ id: f.replace(/\.md$/, ''), data: frontmatterOf(path.join(full, f)) }));
}

/** Seiten der Collection `pages` (id = Dateiname ohne Endung) mit Frontmatter. */
export const pages = readCollection('pages');

/** Alle Beiträge der Collection `blog` mit Frontmatter und URL-Pfad `blog/<slug>/`. */
export const posts = readCollection('blog').map((p) => ({
  ...p,
  path: `${pagePath('blog')}${p.data.slug ?? p.id}/`,
}));

/** Beitrag ist gebaut: kein Entwurf und Datum nicht in der Zukunft (Hugo: buildFuture=false). */
export const isPublished = (p) => p.data.draft !== true && new Date(p.data.date) <= new Date();
export const publishedPosts = posts.filter(isPublished);
export const unpublishedPosts = posts.filter((p) => !isPublished(p));

/** Pfad (relativ zur Startseite) einer Seite der Collection `pages`. */
export { pagePath, specialPaths };

/** Schalter `blogPublic` aus src/lib/site.ts. */
export const blogPublic = /export const blogPublic = (true|false);/.exec(
  fs.readFileSync(path.join(root, 'src/lib/site.ts'), 'utf8'),
)?.[1] === 'true';

/** Dateien, die ein Bau haben muss: alle Seiten und veröffentlichten Beiträge als index.html plus Sonderseiten. */
export const expectedHtmlFiles = [
  ...pages.map((p) => `${pagePath(p.id)}index.html`),
  ...publishedPosts.map((p) => `${p.path}index.html`),
  specialPaths.notFound,
  `${specialPaths.visitenkarte}index.html`,
];

/** Seiten ohne Kopf-Metadaten und Überschrift (reine Weiterleitung). */
export const redirectPages = new Set(['visitenkarte/index.html']);

export function walk(dir = distDir, rel = '', out = []) {
  for (const e of fs.readdirSync(path.join(dir, rel), { withFileTypes: true })) {
    const r = rel ? `${rel}/${e.name}` : e.name;
    if (e.isDirectory()) walk(dir, r, out);
    else out.push(r);
  }
  return out;
}

/** Alle HTML-Dateien im Bau (relativ zu dist). */
export const allHtml = () => walk().filter((f) => f.endsWith('.html'));

export const read = (rel) => fs.readFileSync(path.join(distDir, rel), 'utf8');
export const exists = (rel) => fs.existsSync(path.join(distDir, rel));
export const loadHtml = (rel) => load(read(rel));

/** URL-Pfad (mit base) einer Datei in dist: about/index.html -> /about/ */
export function urlPathOf(rel) {
  const p = rel.endsWith('index.html') ? rel.slice(0, -'index.html'.length) : rel;
  return base + p;
}

/**
 * Löst eine Verweis-URL einer Seite auf eine Datei in dist auf.
 * @returns {{kind:'ignore'}|{kind:'file',file:string,url:string,slashless:boolean}|{kind:'outside',url:string}}
 */
export function resolveInternal(raw, pageRel) {
  const url = raw.trim();
  if (url === '' || url.startsWith('#')) return { kind: 'ignore' };
  if (/^(mailto|tel|sms|javascript|data|blob|about):/i.test(url)) return { kind: 'ignore' };
  let u;
  try {
    u = new URL(url, `http://dist.invalid${urlPathOf(pageRel)}`);
  } catch {
    return { kind: 'ignore' };
  }
  if (u.origin !== 'http://dist.invalid') {
    // absolute URL: nur eigene Adresse prüfen, alles andere ist extern
    if (u.origin !== origin) return { kind: 'ignore' };
    if (base !== '/' && !u.pathname.startsWith(base)) return { kind: 'ignore' };
  }
  let p = decodeURIComponent(u.pathname);
  if (!p.startsWith(base)) return { kind: 'outside', url };
  p = p.slice(base.length);
  const hasExt = /\.[a-z0-9]+$/i.test(p.split('/').pop());
  const slashless = !hasExt && p !== '' && !p.endsWith('/');
  let file = p;
  if (p === '' || p.endsWith('/')) file = p + 'index.html';
  else if (!hasExt) file = p + '/index.html';
  return { kind: 'file', file, url, slashless };
}

/** Muster für Reste aus Hugo, die im Astro-Bau nicht mehr vorkommen dürfen. */
export const legacyPatterns = [
  { re: /(^|\/)(about|kontakt|mein-weg|impressum)\/index\.xml$/, why: 'leerer Bereichs-Feed (entfällt)' },
  { re: /^\/?(tags|categories|series)(\/|$)/, why: 'Hugo-Taxonomie (gibt es nicht)' },
  { re: /(^|\/)page\/\d+\/?$/, why: 'Hugo-Pagination (gibt es nicht)' },
  { re: /localhost|127\.0\.0\.1|example\.org/, why: 'Entwicklungs-/Platzhalteradresse' },
  { re: /\{\{|\}\}|%7B%7B|\[object |undefined/, why: 'nicht ersetzter Platzhalter' },
];
