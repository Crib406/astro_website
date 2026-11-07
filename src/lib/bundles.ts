/**
 * CSS- und JS-Bündel, identisch zur Hugo-Pipeline.
 *
 * CSS: bootstrap.min.css + kompiliertes style.scss (Dart Sass), minifiziert.
 * JS:  die Skripte in der Reihenfolge aus hugo/layouts/partials/scripts.html,
 *      minifiziert, ohne Bündelung oder Modulumbau (klassische Skripte).
 *
 * Beide werden einmal pro Prozess gebaut und im Speicher gehalten. Der
 * Dateiname trägt einen sha256-Fingerabdruck des Inhalts. Die Endpunkte unter
 * src/pages/assets/css/ und src/pages/assets/js/ liefern den Inhalt aus.
 *
 * Die Quellen liegen in src/legacy/ und werden relativ zum Projektordner
 * gelesen (Astro läuft immer im Projektstamm). Das Bündel muss unter
 * assets/css/ liegen, damit ../fonts/ im SCSS auf /assets/fonts/ zeigt.
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as sass from 'sass';
import { transform } from 'esbuild';
import { relUrl } from './site';

export interface Bundle {
  /** Inhalt des Bündels */
  content: string;
  /** sha256 des Inhalts (hex) */
  hash: string;
  /** Dateiname, z. B. `bundle.min.<hash>.css` */
  file: string;
  /** base-fähiger Pfad für href/src, z. B. `/assets/css/bundle.min.<hash>.css` */
  href: string;
}

const legacy = (...parts: string[]) => path.resolve(process.cwd(), 'src/legacy', ...parts);

/** Reihenfolge wie hugo/layouts/partials/scripts.html: jQuery zuerst, main.js zuletzt. */
export const jsFiles = [
  'vendor/jquery.js',
  'vendor/waypoints.min.js',
  'vendor/appear.js',
  'vendor/jquery-one-page-nav.js',
  'plugins/gsap.js',
  'plugins/splittext.js',
  'plugins/scrolltigger.js',
  'plugins/scrolltoplugins.js',
  'plugins/smoothscroll.js',
  'vendor/bootstrap.min.js',
  'vendor/waw.js',
  'plugins/animation.js',
  'plugins/contact.form.js',
  'vendor/backtop.js',
  'main.js',
];

function makeBundle(content: string, ext: 'css' | 'js'): Bundle {
  const hash = createHash('sha256').update(content).digest('hex');
  const file = `bundle.min.${hash}.${ext}`;
  return { content, hash, file, href: relUrl(`assets/${ext}/${file}`) };
}

/**
 * Importer für das SCSS-Template. Dart Sass bricht bei `@import 'elements/error'`
 * ab, weil sowohl `_error.scss` als auch `error.scss` existieren (beide leer;
 * Hugo löst das stillschweigend auf). Die Quellen bleiben unverändert, daher
 * gewinnt hier bei Mehrdeutigkeit die Partial-Datei (`_name.scss`).
 */
const scssExts = ['.scss', '.sass', '.css'];

function resolveScss(target: string): string | undefined {
  const { dir, base, ext } = path.parse(target);
  const names = scssExts.includes(ext) ? [base] : scssExts.map((e) => base + e);
  for (const name of names) {
    for (const candidate of [`_${name}`, name]) {
      const file = path.join(dir, candidate);
      if (existsSync(file)) return file;
    }
  }
}

const scssImporter: sass.Importer<'sync'> = {
  canonicalize(url, context) {
    if (/^[a-z][a-z0-9+.-]*:/i.test(url) && !url.startsWith('file:')) return null;
    const requested = url.startsWith('file:') ? fileURLToPath(url) : url;
    const dirs = path.isAbsolute(requested)
      ? ['/']
      : [context.containingUrl ? path.dirname(fileURLToPath(context.containingUrl)) : legacy('scss')];
    for (const dir of dirs) {
      const file = resolveScss(path.resolve(dir, requested));
      if (file) return pathToFileURL(file);
    }
    return null;
  },
  load(canonicalUrl) {
    const file = fileURLToPath(canonicalUrl);
    const ext = path.extname(file);
    return {
      contents: readFileSync(file, 'utf8'),
      syntax: ext === '.sass' ? 'indented' : ext === '.css' ? 'css' : 'scss',
      sourceMapUrl: canonicalUrl,
    };
  },
};

async function buildCss(): Promise<Bundle> {
  const bootstrap = await readFile(legacy('css/vendor/bootstrap.min.css'), 'utf8');
  const entry = legacy('scss/style.scss');
  const compiled = sass.compileString(await readFile(entry, 'utf8'), {
    url: pathToFileURL(entry),
    importer: scssImporter,
    style: 'compressed',
    // Das Template nutzt noch @import & Co.; die Deprecation-Warnungen sind Rauschen.
    logger: sass.Logger.silent,
    quietDeps: true,
  });
  // Ein eventuelles @charset aus Sass würde mitten im Bündel stehen.
  const scss = compiled.css.replace(/^﻿/, '').replace(/^@charset "UTF-8";/, '');
  const { code } = await transform(`${bootstrap}\n${scss}`, { loader: 'css', minify: true });
  return makeBundle(code, 'css');
}

async function buildJs(): Promise<Bundle> {
  const sources = await Promise.all(jsFiles.map((f) => readFile(legacy('js', f), 'utf8')));
  const { code } = await transform(sources.join('\n'), { loader: 'js', minify: true });
  return makeBundle(code, 'js');
}

let cssBundle: Promise<Bundle> | undefined;
let jsBundle: Promise<Bundle> | undefined;

/** CSS-Bündel (einmal pro Prozess gebaut). */
export const getCssBundle = () => (cssBundle ??= buildCss());
/** JS-Bündel (einmal pro Prozess gebaut). */
export const getJsBundle = () => (jsBundle ??= buildJs());
