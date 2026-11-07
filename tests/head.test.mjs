/**
 * SEO-Phase: Preloads, Beschriftung von Icon-Bedienelementen, 404-Seite und
 * Beitrags-Metadaten im <head>. Geprüft wird nur das gebaute dist/.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  allHtml,
  loadHtml,
  exists,
  resolveInternal,
  redirectPages,
  posts,
  publishedPosts,
  specialPaths,
  base,
} from './helpers.mjs';

const htmlFiles = allHtml().filter((f) => !redirectPages.has(f));

/* ---------- Preloads ---------- */

const fontFiles = [
  'assets/fonts/fraunces/fraunces-variable.woff2',
  'assets/fonts/source-sans-3/source-sans-3-variable.woff2',
];
const breadcrumbBg = 'assets/images/breadcrumb/breadcum-bg.png';

for (const file of htmlFiles) {
  const $ = loadHtml(file);
  const preloads = $('link[rel="preload"]').toArray();
  const hasBreadcrumb = $('.breadcrumb-area').length > 0;

  test(`${file}: Schriften vorgeladen (as=font, type, crossorigin) und Dateien vorhanden`, () => {
    const fonts = preloads.filter((el) => el.attribs.as === 'font');
    assert.deepEqual(
      fonts.map((el) => el.attribs.href).sort(),
      fontFiles.map((f) => base + f).sort(),
      'beide Text-Schriften, base-fähig',
    );
    for (const el of fonts) {
      assert.equal(el.attribs.type, 'font/woff2');
      assert.ok('crossorigin' in el.attribs, `${el.attribs.href}: crossorigin fehlt (Schriften werden sonst doppelt geladen)`);
      const r = resolveInternal(el.attribs.href, file);
      assert.equal(r.kind, 'file', `${el.attribs.href} liegt nicht unter base`);
      assert.ok(exists(r.file), `${el.attribs.href}: Datei fehlt im Bau`);
    }
  });

  test(`${file}: Breadcrumb-Hintergrund nur vorgeladen, wenn die Seite die Breadcrumb zeigt`, () => {
    const images = preloads.filter((el) => el.attribs.as === 'image');
    if (!hasBreadcrumb) {
      assert.equal(images.length, 0, 'Seite ohne Breadcrumb lädt das Kopfbild vor');
      return;
    }
    assert.equal(images.length, 1, 'Seite mit Breadcrumb lädt das Kopfbild nicht vor');
    const el = images[0];
    assert.equal(el.attribs.href, base + breadcrumbBg);
    assert.equal(el.attribs.fetchpriority, 'high');
    assert.ok(exists(resolveInternal(el.attribs.href, file).file), 'Kopfbild fehlt im Bau');
  });

  test(`${file}: keine weiteren Preloads`, () => {
    assert.equal(preloads.length, fontFiles.length + (hasBreadcrumb ? 1 : 0));
  });
}

/* ---------- Bedienelemente ohne Text brauchen einen Namen ---------- */

/** Zugänglicher Name wie ihn Screenreader bilden (vereinfacht): aria-label, Text, Bild-alt. */
function nameOf($, el) {
  const label = ($(el).attr('aria-label') ?? '').trim();
  if (label) return label;
  const text = $(el).text().replace(/\s+/g, ' ').trim();
  if (text) return text;
  return $(el)
    .find('img[alt]')
    .map((_, img) => $(img).attr('alt').trim())
    .get()
    .join(' ')
    .trim();
}

for (const file of htmlFiles) {
  const $ = loadHtml(file);

  test(`${file}: alle Links, Buttons und role=button haben einen zugänglichen Namen`, () => {
    const unnamed = $('a[href], button, [role="button"]')
      .toArray()
      .filter((el) => !nameOf($, el))
      .map((el) => $.html(el).replace(/\s+/g, ' ').slice(0, 120));
    assert.deepEqual(unnamed, []);
  });

  test(`${file}: aria-label deutsch und nicht leer`, () => {
    $('[aria-label]').each((_, el) => {
      const v = $(el).attr('aria-label').trim();
      assert.ok(v.length > 0, 'leeres aria-label');
      assert.ok(!/\b(open|close|scroll|profile|menu)\b/i.test(v), `"${v}" sieht englisch aus`);
    });
  });

  test(`${file}: Menü-Knöpfe, LinkedIn-Links und Nach-oben-Knopf sind beschriftet`, () => {
    const label = (sel) => $(sel).toArray().map((el) => $(el).attr('aria-label'));
    assert.deepEqual(label('button.humberger_menu_active'), ['Menü öffnen']);
    assert.deepEqual(label('button.close-button'), ['Menü schließen']);
    assert.deepEqual(label('.scrollToTop'), ['Nach oben scrollen']);
    assert.equal($('.scrollToTop').attr('role'), 'button');
    const linkedin = $('a[href*="linkedin.com"]').toArray();
    assert.ok(linkedin.length > 0);
    for (const a of linkedin) {
      assert.ok(nameOf($, a).includes('LinkedIn'), `LinkedIn-Link ohne Namen: ${$.html(a).replace(/\s+/g, ' ')}`);
    }
    $('a[href*="linkedin.com"]:has(i.fa-linkedin, i.fa-linkedin-in)').each((_, a) => {
      if (!$(a).text().trim()) {
        assert.equal($(a).attr('aria-label'), 'LinkedIn-Profil von Christoph B. Reimann');
      }
    });
  });
}

/* ---------- 404 ---------- */

test('404: deutscher Titel, noindex, kein canonical, kein og:url, kein JSON-LD', () => {
  const $ = loadHtml(specialPaths.notFound);
  assert.equal($('title').text().trim(), 'Seite nicht gefunden – Christoph B. Reimann');
  assert.equal($('meta[property="og:title"]').attr('content'), 'Seite nicht gefunden – Christoph B. Reimann');
  assert.equal($('meta[name="robots"]').attr('content').replace(/\s+/g, ''), 'noindex,nofollow');
  assert.equal($('link[rel="canonical"]').length, 0);
  assert.equal($('meta[property="og:url"]').length, 0);
  assert.equal($('script[type="application/ld+json"]').length, 0);
  assert.equal($('.breadcrumb-area').length, 0);
});

test('alle anderen Seiten haben weiterhin canonical und JSON-LD (kein Verlust durch die 404-Regel)', () => {
  for (const file of htmlFiles.filter((f) => f !== specialPaths.notFound)) {
    const $ = loadHtml(file);
    assert.equal($('link[rel="canonical"]').length, 1, `${file}: canonical`);
    assert.ok($('script[type="application/ld+json"]').length >= 1, `${file}: JSON-LD`);
  }
});

/* ---------- Beiträge: article:*-Metadaten ---------- */

test('Beiträge: article:published_time wörtlich aus date, article:modified_time aus lastmod, og:type article', () => {
  assert.ok(publishedPosts.length > 0);
  for (const p of publishedPosts) {
    const $ = loadHtml(`${p.path}index.html`);
    assert.equal($('meta[property="og:type"]').attr('content'), 'article');
    assert.equal($('meta[property="article:published_time"]').attr('content'), String(p.data.date));
    const mod = $('meta[property="article:modified_time"]').attr('content');
    assert.equal(new Date(mod).getTime(), new Date(p.data.lastmod).getTime(), `${p.path}: modified_time`);
    assert.match(mod, /Z$/);
  }
});

test('andere Seiten haben keine article:*-Metadaten und og:type website', () => {
  const postFiles = new Set(posts.map((p) => `${p.path}index.html`));
  for (const file of htmlFiles.filter((f) => !postFiles.has(f))) {
    const $ = loadHtml(file);
    assert.equal($('meta[property^="article:"]').length, 0, `${file}: article:*`);
    assert.equal($('meta[property="og:type"]').attr('content'), 'website', `${file}: og:type`);
  }
});
