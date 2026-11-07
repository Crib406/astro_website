#!/usr/bin/env node
/**
 * Vergleicht den Astro-Bau (dist/) mit dem Hugo-Referenzbau.
 *
 *   HUGO_REF_DIR=/pfad/zum/hugo-public-raw npm run compare:hugo [-- Seite …] [--all]
 *
 * - HUGO_REF_DIR   Pflicht: Verzeichnis des Hugo-Referenzbaus (hugo build --destination …)
 * - DIST_DIR       optional: Astro-Ausgabe (Standard: ./dist)
 * - Seite …        optional: nur diese Dateien prüfen (z. B. about/index.html)
 * - --all          alle Abweichungen ausgeben (Standard: höchstens 40 je Seite)
 *
 * Vergleich der HTML-Seiten auf DOM-Ebene mit Normalisierung von Leerraum,
 * Attributreihenfolge, Hashes der Bündel-URLs, JSON-LD (geparst, Schlüssel
 * sortiert), Kommentaren und der Hugo-Generator-Meta. Nicht-HTML-Dateien
 * (sitemap.xml, robots.txt, RSS, statische Dateien) werden mitgeprüft.
 * Bewusst akzeptierte Abweichungen stehen in scripts/compare-hugo.allow.json
 * (page oder "*", path genau oder als Präfix an einer Leerzeichen-Grenze,
 * optional exp/act als genauer Wert, reason). Ausnahmen ohne Treffer werden am
 * Ende gemeldet und gelten als Fehler.
 * Exit-Code 1 bei Abweichungen oder ungenutzten Ausnahmen, 2 bei falscher Bedienung.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { load } from 'cheerio';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');

const args = process.argv.slice(2);
const showAll = args.includes('--all');
const onlyPages = args.filter((a) => !a.startsWith('--'));

const refDirEnv = process.env.HUGO_REF_DIR;
if (!refDirEnv) {
  console.error(
    'Fehler: HUGO_REF_DIR ist nicht gesetzt.\n' +
      'Setze die Variable auf den Hugo-Referenzbau, z. B.:\n' +
      '  HUGO_REF_DIR=/pfad/zu/hugo-public-raw npm run compare:hugo',
  );
  process.exit(2);
}
const refDir = path.resolve(refDirEnv);
const distDir = path.resolve(process.env.DIST_DIR ?? path.join(root, 'dist'));
if (!fs.existsSync(refDir) || !fs.statSync(refDir).isDirectory()) {
  console.error(`Fehler: HUGO_REF_DIR "${refDir}" existiert nicht oder ist kein Verzeichnis.`);
  process.exit(2);
}
if (!fs.existsSync(distDir)) {
  console.error(`Fehler: "${distDir}" fehlt. Zuerst bauen: npm run build`);
  process.exit(2);
}

/* ---------- Ausnahmen ---------- */

const allowFile = path.join(here, 'compare-hugo.allow.json');
/** @type {{page:string,path:string,exp?:string,act?:string,reason?:string}[]} */
const allow = fs.existsSync(allowFile) ? JSON.parse(fs.readFileSync(allowFile, 'utf8')) : [];
for (const [i, a] of allow.entries()) {
  if (typeof a.page !== 'string' || typeof a.path !== 'string' || typeof a.reason !== 'string') {
    console.error(`Fehler: Eintrag ${i + 1} in compare-hugo.allow.json braucht page, path und reason (Text).`);
    process.exit(2);
  }
}
/** Einträge der Ausnahmenliste, die mindestens eine Abweichung freigegeben haben. */
const usedAllow = new Set();
/**
 * Eine Ausnahme gilt nur, wenn die Seite passt (`page`, `*` = jede Seite), der
 * Pfad genau oder als Präfix an einer Grenze (Leerzeichen) passt und, falls
 * angegeben, auch der erwartete (`exp`) bzw. tatsächliche (`act`) Wert genau
 * dem Eintrag entspricht. So sind bewusste Abweichungen einzeln benannt und
 * keine Pauschalfreigabe für ganze Pfade. Jeder Treffer wird vermerkt, damit
 * am Ende ungenutzte Einträge gemeldet werden können.
 */
const isAllowed = (d) => {
  let allowed = false;
  for (const a of allow) {
    if (
      (a.page === '*' || a.page === d.page) &&
      (d.path === a.path || d.path.startsWith(a.path + ' ')) &&
      (a.exp === undefined || a.exp === d.exp) &&
      (a.act === undefined || a.act === d.act)
    ) {
      usedAllow.add(a);
      allowed = true;
    }
  }
  return allowed;
};

/* ---------- Dateien ---------- */

function walk(dir, base = dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, base, out);
    else out.push(path.relative(base, p).split(path.sep).join('/'));
  }
  return out;
}

/** Bündel-Dateinamen ohne Hash, damit sie zwischen den Bauten zuordenbar sind. */
const normFile = (f) => f.replace(/(bundle\.min\.)[0-9a-f]{64}(\.(css|js))$/, '$1<hash>$2');
const normHash = (s) => s.replace(/(bundle\.min\.)[0-9a-f]{64}(\.(css|js))/g, '$1<hash>$2');

/* ---------- Normalisierter Baum ---------- */

const INLINE = new Set(
  'a abbr b bdi bdo br cite code data dfn em i img kbd label mark q s samp small span strong sub sup time u var wbr button input select textarea'.split(
    ' ',
  ),
);
const RAW_TEXT = new Set(['pre', 'textarea']);
const collapse = (s) => s.replace(/\s+/g, ' ');

function sortKeys(v) {
  if (Array.isArray(v)) return v.map(sortKeys);
  if (v && typeof v === 'object') {
    return Object.fromEntries(
      Object.keys(v)
        .sort()
        .map((k) => [k, sortKeys(v[k])]),
    );
  }
  return v;
}

function isInlineNode(n) {
  return n && (n.t === 'text' || INLINE.has(n.name));
}

/** Baut aus einem domhandler-Knoten den normalisierten Baum. */
function build(node, opts, parentName = '') {
  if (node.type === 'text') return { t: 'text', raw: node.data };
  if (node.type === 'comment' || node.type === 'directive') return null;
  if (!['tag', 'script', 'style'].includes(node.type)) return null;

  const name = node.name;
  const attrs = {};
  for (const [k, v] of Object.entries(node.attribs ?? {})) {
    attrs[k] = normHash(collapse(v).trim());
  }
  // Hugo-Generator ist kein Inhalt
  if (name === 'meta' && attrs.name === 'generator') return null;

  const el = { t: 'el', name, attrs, children: [] };
  const raw = (node.children ?? []).map((c) => build(c, opts, name)).filter(Boolean);

  if (name === 'script' && attrs.type === 'application/ld+json') {
    const text = raw.map((c) => c.raw).join('');
    try {
      el.json = sortKeys(JSON.parse(text));
    } catch {
      el.jsonError = true;
      el.children = [{ t: 'text', text: collapse(text).trim() }];
    }
    return finalize(el);
  }
  if (name === 'script' || name === 'style') {
    el.children = [{ t: 'text', text: normHash(collapse(raw.map((c) => c.raw).join('')).trim()) }].filter(
      (c) => c.text,
    );
    return finalize(el);
  }
  if (RAW_TEXT.has(name)) {
    el.children = raw.map((c) => (c.t === 'text' ? { t: 'text', text: c.raw } : c));
    return finalize(el);
  }

  // Leerraum: zusammenfassen; nur dort behalten, wo er im Satz sichtbar ist
  // Textknoten, die nur durch entfernte Kommentare getrennt waren, verschmelzen
  const kids = [];
  for (const c of raw) {
    const last = kids[kids.length - 1];
    if (c.t === 'text' && last && last.t === 'text') last.raw += c.raw;
    else kids.push(c.t === 'text' ? { ...c } : c);
  }
  const out = [];
  for (let i = 0; i < kids.length; i++) {
    const k = kids[i];
    if (k.t !== 'text') {
      out.push(k);
      continue;
    }
    let text = collapse(k.raw);
    const prev = kids[i - 1];
    const next = kids[i + 1];
    const keepLead = prev ? isInlineNode(prev) : INLINE.has(name);
    const keepTrail = next ? isInlineNode(next) : INLINE.has(name);
    if (!keepLead) text = text.replace(/^ /, '');
    if (!keepTrail) text = text.replace(/ $/, '');
    if (text === '') continue;
    // Zwei Textknoten (durch entfernte Kommentare) verschmelzen
    const last = out[out.length - 1];
    if (last && last.t === 'text') last.text = collapse(last.text + text);
    else out.push({ t: 'text', text });
  }
  el.children = out;
  return finalize(el);
}

function finalize(el) {
  const attrStr = Object.keys(el.attrs)
    .sort()
    .map((k) => `${k}=${JSON.stringify(el.attrs[k])}`)
    .join(' ');
  const inner = el.json !== undefined ? JSON.stringify(el.json) : el.children.map(sigOf).join('');
  el.sig = `<${el.name} ${attrStr}>${inner}</${el.name}>`;
  return el;
}
const sigOf = (n) => (n.t === 'text' ? `"${n.text}"` : n.sig);

function parseHtml(src, xml = false) {
  const $ = load(src, xml ? { xmlMode: true } : undefined);
  const roots = $.root().get(0).children;
  const doc = { t: 'el', name: '#document', attrs: {}, children: [] };
  for (const r of roots) {
    const b = build(r, { xml });
    if (b && b.t === 'el') doc.children.push(b);
  }
  return finalize(doc);
}

/* ---------- Diff ---------- */

const short = (s, n = 110) => {
  s = String(s);
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
};

function label(el, idx) {
  let s = el.name;
  if (el.attrs.id) s += `#${el.attrs.id}`;
  else if (el.attrs.class) s += `.${el.attrs.class.split(' ')[0]}`;
  else if (el.name === 'meta') {
    const key = el.attrs.name ?? el.attrs.property ?? el.attrs['http-equiv'];
    if (key) s += `[${key}]`;
  } else if (el.name === 'link' && el.attrs.rel) s += `[${el.attrs.rel}]`;
  else if (el.name === 'script' && el.attrs.type) s += `[${el.attrs.type}]`;
  return idx > 1 ? `${s}:${idx}` : s;
}

/** Position unter gleich benannten Geschwistern (1-basiert, wie nth-of-type). */
function labelsOf(children) {
  const seen = {};
  return children.map((c) => {
    if (c.t === 'text') return '#text';
    const key = label(c, 1);
    seen[key] = (seen[key] ?? 0) + 1;
    return label(c, seen[key]);
  });
}

function lcs(a, b) {
  const n = a.length;
  const m = b.length;
  const dp = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--)
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const pairs = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      pairs.push([i, j]);
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) i++;
    else j++;
  }
  return pairs;
}

function diffJson(exp, act, p, out) {
  if (JSON.stringify(exp) === JSON.stringify(act)) return;
  const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
  if (isObj(exp) && isObj(act)) {
    for (const k of new Set([...Object.keys(exp), ...Object.keys(act)])) {
      if (!(k in act)) out.push({ path: `${p} .${k}`, exp: short(JSON.stringify(exp[k])), act: '(fehlt)' });
      else if (!(k in exp)) out.push({ path: `${p} .${k}`, exp: '(fehlt)', act: short(JSON.stringify(act[k])) });
      else diffJson(exp[k], act[k], `${p} .${k}`, out);
    }
  } else if (Array.isArray(exp) && Array.isArray(act)) {
    for (let i = 0; i < Math.max(exp.length, act.length); i++) {
      if (i >= act.length) out.push({ path: `${p}[${i}]`, exp: short(JSON.stringify(exp[i])), act: '(fehlt)' });
      else if (i >= exp.length) out.push({ path: `${p}[${i}]`, exp: '(fehlt)', act: short(JSON.stringify(act[i])) });
      else diffJson(exp[i], act[i], `${p}[${i}]`, out);
    }
  } else {
    out.push({ path: p, exp: short(JSON.stringify(exp)), act: short(JSON.stringify(act)) });
  }
}

const sub = (p, s) => (p ? `${p} > ${s}` : s);

function describe(n) {
  return n.t === 'text' ? `Text "${short(n.text, 80)}"` : `<${n.name}${n.attrs.class ? ` class="${short(n.attrs.class, 40)}"` : ''}>`;
}

function diffNode(exp, act, p, out) {
  if (exp.sig === act.sig) return;
  // Attribute
  for (const k of new Set([...Object.keys(exp.attrs), ...Object.keys(act.attrs)])) {
    if (exp.attrs[k] !== act.attrs[k]) {
      out.push({
        path: `${p} @${k}`,
        exp: exp.attrs[k] === undefined ? '(fehlt)' : short(exp.attrs[k]),
        act: act.attrs[k] === undefined ? '(fehlt)' : short(act.attrs[k]),
      });
    }
  }
  if (exp.json !== undefined || act.json !== undefined) {
    if (exp.json !== undefined && act.json !== undefined) diffJson(exp.json, act.json, `${p} (JSON-LD)`, out);
    else out.push({ path: `${p} (JSON-LD)`, exp: exp.json !== undefined ? 'JSON' : 'kein JSON', act: act.json !== undefined ? 'JSON' : 'kein JSON' });
    return;
  }
  const el = exp.children;
  const al = act.children;
  const pairs = lcs(el.map(sigOf), al.map(sigOf));
  const eLabels = labelsOf(el);
  const aLabels = labelsOf(al);
  const gaps = [];
  let pi = 0;
  let pj = 0;
  for (const [i, j] of [...pairs, [el.length, al.length]]) {
    gaps.push([pi, i, pj, j]);
    pi = i + 1;
    pj = j + 1;
  }
  for (const [i0, i1, j0, j1] of gaps) {
    const e = el.slice(i0, i1);
    const a = al.slice(j0, j1);
    // gleichartige Knoten der Lücke paarweise vergleichen, Rest ist fehlend/zusätzlich
    const usedA = new Set();
    for (let x = 0; x < e.length; x++) {
      const en = e[x];
      const ey = eLabels[i0 + x];
      let match = -1;
      for (let y = 0; y < a.length; y++) {
        if (usedA.has(y)) continue;
        const an = a[y];
        if (en.t === 'text' && an.t === 'text') { match = y; break; }
        if (en.t === 'el' && an.t === 'el' && en.name === an.name) { match = y; break; }
      }
      if (match < 0) {
        out.push({ path: sub(p, ey), exp: describe(en), act: '(fehlt)' });
        continue;
      }
      usedA.add(match);
      const an = a[match];
      if (en.t === 'text') out.push({ path: sub(p, '#text'), exp: `"${short(en.text)}"`, act: `"${short(an.text)}"` });
      else diffNode(en, an, sub(p, ey), out);
    }
    a.forEach((an, y) => {
      if (!usedA.has(y)) out.push({ path: sub(p, aLabels[j0 + y]), exp: '(fehlt)', act: describe(an) });
    });
  }
}

/* ---------- Nicht-HTML ---------- */

function sitemapEntries(src) {
  const $ = load(src, { xmlMode: true });
  return $('url')
    .map((_, u) => {
      const g = (t) => $(u).find(t).first().text().trim();
      return `${g('loc')} | lastmod ${g('lastmod') || '-'} | ${g('changefreq')} | ${g('priority')}`;
    })
    .get();
}

function compareXml(file, refSrc, distSrc) {
  const out = [];
  if (file === 'sitemap.xml') {
    const r = new Set(sitemapEntries(refSrc));
    const d = new Set(sitemapEntries(distSrc));
    for (const e of r) if (!d.has(e)) out.push({ path: '<url>', exp: e, act: '(fehlt)' });
    for (const e of d) if (!r.has(e)) out.push({ path: '<url>', exp: '(fehlt)', act: e });
    return out;
  }
  const strip = (src) => {
    const $ = load(src, { xmlMode: true });
    $('generator, lastBuildDate').remove();
    return $.root().html();
  };
  diffNode(parseHtml(strip(refSrc), true), parseHtml(strip(distSrc), true), file, out);
  return out;
}

/* ---------- Lauf ---------- */

const refFiles = walk(refDir).filter((f) => !f.endsWith('.DS_Store'));
const distFiles = walk(distDir).filter((f) => !f.endsWith('.DS_Store'));
const refMap = new Map(refFiles.map((f) => [normFile(f), f]));
const distMap = new Map(distFiles.map((f) => [normFile(f), f]));

const results = []; // { page, diffs[], allowed[] }
const isText = (f) => /\.(html|xml|txt)$/.test(f);

function record(page, diffs) {
  const tagged = diffs.map((d) => ({ ...d, page, allowed: isAllowed({ ...d, page }) }));
  results.push({
    page,
    diffs: tagged.filter((d) => !d.allowed),
    allowed: tagged.filter((d) => d.allowed),
  });
}

const wanted = (f) => onlyPages.length === 0 || onlyPages.includes(f);

for (const [key, refFile] of [...refMap].sort(([a], [b]) => a.localeCompare(b))) {
  if (!wanted(key)) continue;
  const distFile = distMap.get(key);
  if (!distFile) {
    record(key, [{ path: '(Datei)', exp: 'vorhanden', act: 'fehlt in dist' }]);
    continue;
  }
  const refBuf = fs.readFileSync(path.join(refDir, refFile));
  const distBuf = fs.readFileSync(path.join(distDir, distFile));
  if (key.endsWith('.html')) {
    const out = [];
    diffNode(parseHtml(refBuf.toString('utf8')), parseHtml(distBuf.toString('utf8')), '', out);
    // Dokumenttyp: Hugo schreibt <!doctype html>
    const dt = (b) => /^\s*<!doctype html>/i.test(b.toString('utf8').slice(0, 200));
    if (dt(refBuf) !== dt(distBuf)) out.unshift({ path: '<!doctype>', exp: dt(refBuf) ? 'vorhanden' : 'fehlt', act: dt(distBuf) ? 'vorhanden' : 'fehlt' });
    record(key, out);
  } else if (key.endsWith('.xml')) {
    record(key, compareXml(key, refBuf.toString('utf8'), distBuf.toString('utf8')));
  } else if (key.endsWith('.txt')) {
    const n = (b) => b.toString('utf8').replace(/\r\n/g, '\n').trim();
    const out = [];
    if (n(refBuf) !== n(distBuf)) {
      const rl = n(refBuf).split('\n');
      const dl = n(distBuf).split('\n');
      for (let i = 0; i < Math.max(rl.length, dl.length); i++)
        if (rl[i] !== dl[i]) out.push({ path: `Zeile ${i + 1}`, exp: short(rl[i] ?? '(fehlt)'), act: short(dl[i] ?? '(fehlt)') });
    }
    record(key, out);
  } else if (/\.(css|js|map)$/.test(key)) {
    record(key, []); // Bündel: nur Vorhandensein (Inhalt hängt vom Minifier ab)
  } else {
    const h = (b) => crypto.createHash('sha256').update(b).digest('hex').slice(0, 12);
    record(key, h(refBuf) === h(distBuf) ? [] : [{ path: '(Inhalt)', exp: `sha ${h(refBuf)}`, act: `sha ${h(distBuf)}` }]);
  }
}

// Zusätzliche Seiten/Feeds in dist, die es in der Referenz nicht gibt
for (const key of [...distMap.keys()].sort()) {
  if (!wanted(key) || refMap.has(key)) continue;
  record(key, [{ path: '(Datei)', exp: 'fehlt in Referenz', act: 'vorhanden in dist' }]);
}

/* ---------- Ausgabe ---------- */

const LIMIT = 40;
let bad = 0;
let okCount = 0;
let allowedCount = 0;
for (const r of results) {
  allowedCount += r.allowed.length;
  if (r.diffs.length === 0) {
    okCount++;
    // Nur Seiten/Textdateien einzeln aufführen, sonst bleibt die Liste riesig
    if (isText(r.page)) console.log(`OK    ${r.page}${r.allowed.length ? `  (${r.allowed.length} erlaubt)` : ''}`);
    continue;
  }
  bad++;
  console.log(`DIFF  ${r.page}  (${r.diffs.length} Abweichung${r.diffs.length === 1 ? '' : 'en'})`);
  const lines = showAll ? r.diffs : r.diffs.slice(0, LIMIT);
  for (const d of lines) console.log(`  ${d.path}\n    erwartet: ${d.exp}\n    ist:      ${d.act}`);
  if (lines.length < r.diffs.length) console.log(`  … ${r.diffs.length - lines.length} weitere (mit --all alle anzeigen)`);
}
console.log(
  `\n${results.length} Dateien geprüft: ${okCount} OK, ${bad} mit Abweichungen` +
    (allowedCount ? `, ${allowedCount} Abweichungen laut compare-hugo.allow.json akzeptiert` : '') +
    '.',
);

// Ungenutzte Ausnahmen (nur bei vollem Lauf aussagekräftig): die Liste soll sauber bleiben.
const unused = onlyPages.length === 0 ? allow.filter((a) => !usedAllow.has(a)) : [];
if (unused.length) {
  console.warn(`\nWARNUNG: ${unused.length} Eintrag${unused.length === 1 ? '' : 'e'} in compare-hugo.allow.json ohne Wirkung (entfernen oder korrigieren):`);
  for (const a of unused) {
    console.warn(`  page=${a.page}  path=${short(a.path, 100)}${a.exp !== undefined ? `\n    exp=${short(a.exp)}` : ''}${a.act !== undefined ? `\n    act=${short(a.act)}` : ''}`);
  }
}
process.exit(bad || unused.length ? 1 : 0);
