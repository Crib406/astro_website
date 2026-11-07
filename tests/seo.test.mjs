import { test } from 'node:test';
import assert from 'node:assert/strict';
import { allHtml, loadHtml, redirectPages, origin, urlPathOf, base, specialPaths } from './helpers.mjs';

const pageTypes = new Set([
  'WebPage',
  'ProfilePage',
  'ContactPage',
  'CollectionPage',
  'AboutPage',
  'BlogPosting',
  'Article',
]);

const types = (node) => [].concat(node['@type'] ?? []);

for (const file of allHtml()) {
  if (redirectPages.has(file)) continue;
  const $ = loadHtml(file);
  const meta = (sel) => ($(sel).attr('content') ?? '').trim();
  const is404 = file === specialPaths.notFound;

  test(`${file}: <html lang="de">`, () => {
    assert.equal($('html').attr('lang'), 'de');
  });

  test(`${file}: genau ein <title>, nicht leer`, () => {
    assert.equal($('title').length, 1);
    assert.ok($('title').text().trim().length > 0);
  });

  test(`${file}: meta description`, () => {
    assert.ok(meta('meta[name="description"]').length > 0, 'meta description fehlt oder ist leer');
  });

  test(`${file}: robots und absolutes canonical`, () => {
    assert.ok(meta('meta[name="robots"]').length > 0, 'meta robots fehlt');
    const canon = $('link[rel="canonical"]');
    if (is404) {
      assert.equal(canon.length, 0, 'die 404-Seite hat kein canonical');
      return;
    }
    assert.equal(canon.length, 1, 'genau ein canonical erwartet');
    assert.match(canon.attr('href'), /^https?:\/\/[^/]+\//, 'canonical muss absolut sein');
  });

  test(`${file}: og:* und twitter:* vollständig`, () => {
    for (const p of [
      'og:locale',
      'og:type',
      'og:title',
      'og:description',
      'og:site_name',
      'og:image',
      'og:image:type',
      'og:image:width',
      'og:image:height',
      'og:image:alt',
    ]) {
      assert.ok(meta(`meta[property="${p}"]`), `${p} fehlt`);
    }
    for (const n of ['twitter:card', 'twitter:title', 'twitter:description', 'twitter:image', 'twitter:image:alt']) {
      assert.ok(meta(`meta[name="${n}"]`), `${n} fehlt`);
    }
    assert.match(meta('meta[property="og:image"]'), /^https?:\/\//, 'og:image muss absolut sein');
    if (is404) {
      assert.equal($('meta[property="og:url"]').length, 0, 'die 404-Seite hat kein og:url');
    } else {
      assert.match(meta('meta[property="og:url"]'), /^https?:\/\//, 'og:url muss absolut sein');
      assert.equal(meta('meta[property="og:url"]'), $('link[rel="canonical"]').attr('href'), 'og:url und canonical weichen ab');
    }
    assert.equal(meta('meta[property="og:title"]'), $('title').text().trim(), 'og:title und title weichen ab');
  });

  test(`${file}: JSON-LD parsebar, @graph mit WebSite, Person und Seite`, () => {
    if (is404) {
      assert.equal($('script[type="application/ld+json"]').length, 0, 'die 404-Seite hat kein JSON-LD');
      return;
    }
    const blocks = $('script[type="application/ld+json"]')
      .map((_, e) => $(e).text())
      .get();
    assert.ok(blocks.length >= 1, 'kein JSON-LD');
    const parsed = blocks.map((b) => JSON.parse(b));
    const main = parsed.find((j) => Array.isArray(j['@graph']));
    assert.ok(main, 'kein JSON-LD mit @graph');
    assert.equal(main['@context'], 'https://schema.org');
    const all = main['@graph'];
    const kinds = all.flatMap(types);
    assert.ok(kinds.includes('WebSite'), 'WebSite fehlt im @graph');
    assert.ok(kinds.includes('Person'), 'Person fehlt im @graph');
    const pageNode = all.find((n) => types(n).some((t) => pageTypes.has(t)));
    assert.ok(pageNode, `kein Seitenknoten (${[...pageTypes].join('/')}) im @graph`);
    // Der Seitenknoten gehört zu dieser Seite: seine @id ist der Permalink (Ursprung + base + Pfad),
    // in Vorschauen also nicht das canonical, das auf die Hauptseite zeigt.
    const permalink = origin + urlPathOf(file);
    assert.ok(
      [pageNode['@id'], pageNode.url].includes(permalink),
      `Seitenknoten (${pageNode['@id']}) passt nicht zum Permalink (${permalink})`,
    );
  });

  test(`${file}: robots`, () => {
    const robots = meta('meta[name="robots"]').replace(/\s+/g, '');
    if (file === specialPaths.notFound) assert.equal(robots, 'noindex,nofollow', '404 muss noindex sein');
    else if (base !== '/') assert.equal(robots, 'noindex,nofollow', 'Vorschauen müssen noindex sein');
    else assert.equal(robots, 'index,follow');
  });

  if (file !== 'index.html' && file !== '404.html') {
    test(`${file}: BreadcrumbList im JSON-LD`, () => {
      const parsed = $('script[type="application/ld+json"]')
        .map((_, e) => JSON.parse($(e).text()))
        .get();
      const crumbs = parsed.flatMap((j) => j['@graph'] ?? [j]).filter((n) => types(n).includes('BreadcrumbList'));
      assert.equal(crumbs.length, 1, 'genau eine BreadcrumbList erwartet');
      assert.ok(crumbs[0].itemListElement.length >= 2);
    });
  }
}
