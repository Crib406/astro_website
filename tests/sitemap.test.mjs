import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load } from 'cheerio';
import {
  read,
  exists,
  loadHtml,
  resolveInternal,
  homeAbs,
  origin,
  base,
  pages,
  publishedPosts,
  blogPublic,
  pagePath,
  specialPaths,
} from './helpers.mjs';

const sitemap = load(read('sitemap.xml'), { xmlMode: true });
const entries = sitemap('url')
  .map((_, u) => ({
    loc: sitemap(u).find('loc').text().trim(),
    lastmod: sitemap(u).find('lastmod').text().trim(),
    changefreq: sitemap(u).find('changefreq').text().trim(),
    priority: sitemap(u).find('priority').text().trim(),
  }))
  .get();

/** Datei in dist zu einer Sitemap-URL (nur für URLs unter der eigenen Basis). */
const fileOf = (loc) => resolveInternal(loc, 'index.html');

test('sitemap.xml: enthält die Startseite zuerst, weekly, Priorität 1.0', () => {
  assert.ok(entries.length >= 1);
  assert.equal(entries[0].loc, homeAbs);
  assert.equal(entries[0].changefreq, 'weekly');
  assert.equal(entries[0].priority, '1.0');
});

test('sitemap.xml: URLs eindeutig und absolut mit Schrägstrich am Ende', () => {
  const locs = entries.map((e) => e.loc);
  assert.equal(new Set(locs).size, locs.length, 'doppelte URLs');
  for (const l of locs) assert.match(l, /^https?:\/\/[^/]+\/.*\/$|^https?:\/\/[^/]+\/$/, `${l} ist nicht wohlgeformt`);
});

test('sitemap.xml: lastmod im Format JJJJ-MM-TTThh:mm:ssZ (soweit vorhanden)', () => {
  for (const e of entries) {
    if (e.lastmod) assert.match(e.lastmod, /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(Z|[+-]\d\d:\d\d)$/, `${e.loc}: ${e.lastmod}`);
  }
});

test('sitemap.xml: jede URL hat eine gebaute Seite, die (auf der Hauptseite) indexiert werden darf und sich selbst als canonical meldet', () => {
  const problems = [];
  for (const e of entries) {
    const r = fileOf(e.loc);
    if (r.kind !== 'file') {
      problems.push(`${e.loc}: gehört nicht zur Basis ${origin}${base}`);
      continue;
    }
    if (!exists(r.file)) {
      problems.push(`${e.loc}: ${r.file} fehlt in dist`);
      continue;
    }
    const $ = loadHtml(r.file);
    const robots = ($('meta[name="robots"]').attr('content') ?? 'index').toLowerCase();
    // Auf der Hauptseite müssen alle Sitemap-Seiten indexierbar sein, in Branch-Vorschauen
    // (base != '/') ist jede Seite noindex und das canonical zeigt auf die Hauptseite.
    if (base === '/') {
      if (/noindex/.test(robots)) problems.push(`${e.loc}: robots "${robots}"`);
      const canon = $('link[rel="canonical"]').attr('href');
      if (canon !== e.loc) problems.push(`${e.loc}: canonical ist ${canon}`);
    } else if (!/noindex/.test(robots)) {
      problems.push(`${e.loc}: in der Vorschau wird noindex erwartet, robots ist "${robots}"`);
    }
  }
  assert.deepEqual(problems, []);
});

test('sitemap.xml: enthält genau die Seiten und Beiträge, die laut Frontmatter und blogPublic hineingehören', () => {
  const expected = [homeAbs];
  for (const p of pages) {
    if (p.id === 'home' || p.data.sitemap_exclude) continue;
    if (p.id === 'blog' && !blogPublic) continue;
    expected.push(homeAbs + pagePath(p.id));
  }
  if (blogPublic) for (const p of publishedPosts) expected.push(homeAbs + p.path);
  assert.deepEqual([...entries.map((e) => e.loc)].sort(), expected.sort());
});

test('sitemap.xml: Weiterleitung, 404 und Entwürfe stehen nicht darin', () => {
  const locs = entries.map((e) => e.loc);
  assert.ok(!locs.some((l) => l.includes('visitenkarte')), 'Weiterleitung gehört nicht in die Sitemap');
  assert.ok(!locs.some((l) => l.includes('404')), '404 gehört nicht in die Sitemap');
});

test('sitemap.xml: lastmod entspricht dem dateModified im JSON-LD der Seite', () => {
  const problems = [];
  for (const e of entries) {
    const r = fileOf(e.loc);
    if (r.kind !== 'file' || !exists(r.file)) continue; // meldet der Test oben
    const $ = loadHtml(r.file);
    const graph = $('script[type="application/ld+json"]')
      .map((_, el) => JSON.parse($(el).text()))
      .get()
      .flatMap((j) => j['@graph'] ?? []);
    const node = graph.find((n) => n['@id'] === e.loc);
    if (!node) problems.push(`${e.loc}: Seitenknoten im JSON-LD fehlt`);
    else if (node.dateModified !== e.lastmod) problems.push(`${e.loc}: sitemap ${e.lastmod}, JSON-LD ${node.dateModified}`);
  }
  assert.deepEqual(problems, []);
});

test('sitemap.xml: lastmod entspricht dem Frontmatter (als UTC)', () => {
  const problems = [];
  const sources = [
    { loc: homeAbs, lastmod: pages.find((p) => p.id === 'home').data.lastmod },
    ...pages.filter((p) => p.id !== 'home').map((p) => ({ loc: homeAbs + pagePath(p.id), lastmod: p.data.lastmod })),
    ...publishedPosts.map((p) => ({ loc: homeAbs + p.path, lastmod: p.data.lastmod })),
  ];
  for (const e of entries) {
    const src = sources.find((x) => x.loc === e.loc);
    if (!src) continue;
    const expected = new Date(src.lastmod).toISOString().replace(/\.\d{3}Z$/, 'Z');
    if (e.lastmod !== expected) problems.push(`${e.loc}: ${e.lastmod}, Frontmatter ${expected}`);
  }
  assert.deepEqual(problems, []);
});

test('robots.txt: erlaubt alles und verweist auf die Sitemap', () => {
  const lines = read('robots.txt').split(/\r?\n/);
  assert.ok(lines.includes('User-agent: *'));
  assert.ok(lines.includes('Allow: /'));
  assert.ok(lines.includes(`Sitemap: ${homeAbs}${specialPaths.sitemap}`), 'Sitemap-Zeile fehlt oder ist nicht absolut');
  assert.ok(!lines.some((l) => /^disallow:\s*\S/i.test(l)), 'kein Disallow (noindex der Vorschauen muss lesbar bleiben)');
});

test('visitenkarte/: leitet auf die Startseite weiter', () => {
  const $ = loadHtml('visitenkarte/index.html');
  assert.equal($('link[rel="canonical"]').attr('href'), homeAbs);
  assert.match($('meta[name="robots"]').attr('content'), /noindex/);
  assert.equal($('meta[http-equiv="refresh"]').attr('content'), `0; url=${homeAbs}`);
  const html = $.html();
  assert.ok(html.includes(`window.location.replace("${homeAbs}")`), 'JS-Weiterleitung fehlt');
  assert.equal($('body a').attr('href'), homeAbs, 'Fallback-Link fehlt');
});
