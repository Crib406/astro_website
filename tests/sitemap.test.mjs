import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load } from 'cheerio';
import { read, exists, loadHtml, resolveInternal, homeAbs, origin, base } from './helpers.mjs';

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

test('sitemap.xml: jede URL hat eine gebaute Seite, die indexiert werden darf und sich selbst als canonical meldet', () => {
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
    if (/noindex/.test(robots)) problems.push(`${e.loc}: robots "${robots}"`);
    const canon = $('link[rel="canonical"]').attr('href');
    // In Branch-Vorschauen zeigt das canonical bewusst auf die Hauptseite
    if (base === '/' && canon !== e.loc) problems.push(`${e.loc}: canonical ist ${canon}`);
  }
  assert.deepEqual(problems, []);
});

test('sitemap.xml: keine Seiten mit sitemap_exclude (impressum, blog, Beiträge)', () => {
  const locs = entries.map((e) => e.loc);
  for (const p of ['impressum/', 'blog/']) {
    assert.ok(!locs.includes(homeAbs + p), `${p} darf nicht in der Sitemap stehen`);
  }
  assert.ok(!locs.some((l) => l.startsWith(homeAbs + 'blog/')), 'Beiträge erben sitemap_exclude vom Blog');
  assert.ok(!locs.some((l) => l.includes('visitenkarte')), 'Weiterleitung gehört nicht in die Sitemap');
});

test('robots.txt: erlaubt alles und verweist auf die Sitemap', () => {
  const lines = read('robots.txt').split(/\r?\n/);
  assert.ok(lines.includes('User-agent: *'));
  assert.ok(lines.includes('Allow: /'));
  assert.ok(lines.includes(`Sitemap: ${homeAbs}sitemap.xml`), 'Sitemap-Zeile fehlt oder ist nicht absolut');
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
