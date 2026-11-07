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

/** Alle URLs (Dateien) der Seite, die ein Bau enthalten muss. */
export const htmlPages = [
  'index.html',
  'about/index.html',
  'mein-weg/index.html',
  'kontakt/index.html',
  'impressum/index.html',
  'blog/index.html',
  'blog/integritaet/index.html',
  '404.html',
  'visitenkarte/index.html',
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
