/**
 * Branch-Vorschauen (Bau mit BASE_PATH=/preview/<branch>/).
 *
 * Zwei Betriebsarten:
 *  - Normaler Lauf (BASE_PATH nicht gesetzt): baut selbst eine Vorschau nach
 *    ${TMPDIR}/ und lässt die gesamte Testsuite dagegen laufen (DIST_DIR und
 *    BASE_PATH gesetzt). So ist `npm test` auch für Vorschauen aussagekräftig.
 *  - Vorschau-Lauf (BASE_PATH != /, von Hand oder durch den normalen Lauf):
 *    prüft die Vorschau-Invarianten gegen DIST_DIR:
 *      DIST_DIR=/pfad/zur/vorschau BASE_PATH=/preview/x/ node --test tests/preview.test.mjs
 */
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const inPreview = !['', '/'].includes(process.env.BASE_PATH ?? '/');

if (!inPreview) {
  const { allHtml, loadHtml } = await import('./helpers.mjs');

  test('Produktionsbau: keine Vorschau-Hinweisleiste', () => {
    for (const file of allHtml()) {
      assert.equal(loadHtml(file)('.preview-banner').length, 0, `${file}: Hinweisleiste im Produktionsbau`);
    }
  });

  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'creimann-preview-'));
  after(() => fs.rmSync(outDir, { recursive: true, force: true }));

  test('Vorschau-Bau (BASE_PATH=/preview/x/): gesamte Testsuite besteht', { timeout: 300_000 }, () => {
    // NODE_TEST_CONTEXT würde den inneren Testlauf zum Kindprozess des äußeren machen
    const { NODE_TEST_CONTEXT, ...outer } = process.env;
    const env = { ...outer, BASE_PATH: '/preview/x/' };
    const astro = path.join(root, 'node_modules/astro/bin/astro.mjs');
    execFileSync(process.execPath, [astro, 'build', '--outDir', outDir], { cwd: root, env, stdio: 'pipe' });
    const run = spawnSync(process.execPath, ['--test', 'tests/*.test.mjs'], {
      cwd: root,
      env: { ...env, DIST_DIR: outDir },
      encoding: 'utf8',
    });
    const failures = (run.stdout ?? '')
      .split('\n')
      .filter((l) => /^\s*✖/.test(l))
      .slice(0, 20)
      .join('\n');
    assert.equal(run.status, 0, `Testsuite gegen den Vorschau-Bau ist rot:\n${failures || run.stderr}`);
  });
} else {
  const { allHtml, loadHtml, read, origin, base, homeAbs, urlPathOf, specialPaths, redirectPages } = await import(
    './helpers.mjs'
  );
  const branch = base.replace(/^\/preview\/|\/$/g, '');
  const prod = (urlPath) => origin + '/' + urlPath.slice(base.length);

  test('Vorschau: Basispfad liegt unter /preview/<branch>/', () => {
    assert.match(base, /^\/preview\/[^/]+(\/[^/]+)*\/$/);
  });

  for (const file of allHtml()) {
    const $ = loadHtml(file);

    test(`${file}: noindex, nofollow`, () => {
      assert.equal($('meta[name="robots"]').attr('content').replace(/\s+/g, ''), 'noindex,nofollow');
    });

    if (!redirectPages.has(file)) {
      test(`${file}: canonical zeigt auf die Hauptseite (Produktions-URL ohne base)`, () => {
        const expected = prod(urlPathOf(file));
        assert.equal($('link[rel="canonical"]').attr('href'), expected);
        assert.equal($('meta[property="og:url"]').attr('content'), expected);
      });
    }

    if (!redirectPages.has(file)) {
      test(`${file}: Hinweisleiste mit Branch und Link zur Übersicht`, () => {
        const banner = $('.preview-banner');
        assert.equal(banner.length, 1, 'genau eine Hinweisleiste erwartet');
        assert.equal(banner.find('.preview-banner__branch').text().trim(), branch);
        assert.equal(banner.find('a').attr('href'), '/preview/');
      });
    }

    test(`${file}: alle wurzelabsoluten internen Verweise beginnen mit base`, () => {
      const urls = [];
      $('a[href], link[href], img[src], script[src], source[src]').each((_, el) => {
        if (el.name === 'link' && /canonical|alternate/.test(el.attribs.rel ?? '')) return;
        urls.push(el.attribs.href ?? el.attribs.src);
      });
      const outside = urls.filter(
        (u) => typeof u === 'string' && u.startsWith('/') && !u.startsWith('//') && !u.startsWith(base) && u !== '/preview/',
      );
      assert.deepEqual([...new Set(outside)], []);
    });

    test(`${file}: JSON-LD-Knoten verweisen auf die Vorschau-Adresse`, () => {
      const graphs = $('script[type="application/ld+json"]')
        .map((_, el) => JSON.parse($(el).text()))
        .get()
        .flatMap((j) => j['@graph'] ?? []);
      for (const n of graphs) {
        if (typeof n['@id'] === 'string') assert.ok(n['@id'].startsWith(homeAbs), `@id ${n['@id']}`);
      }
    });
  }

  test('robots.txt und Sitemap verweisen auf die Vorschau-Adresse', () => {
    assert.match(read(specialPaths.robots), new RegExp(`^Sitemap: ${homeAbs}${specialPaths.sitemap}$`, 'm'));
    const locs = [...read(specialPaths.sitemap).matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    assert.ok(locs.length > 0);
    for (const l of locs) assert.ok(l.startsWith(homeAbs), `${l} liegt nicht unter ${homeAbs}`);
  });
}
