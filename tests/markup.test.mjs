import { test } from 'node:test';
import assert from 'node:assert/strict';
import { allHtml, loadHtml, read, redirectPages } from './helpers.mjs';

for (const file of allHtml()) {
  const $ = loadHtml(file);

  if (!redirectPages.has(file)) {
    test(`${file}: genau ein <h1>`, () => {
      assert.equal($('h1').length, 1, `${$('h1').length} <h1> gefunden`);
      assert.ok($('h1').text().trim().length > 0, '<h1> ist leer');
    });
  }

  test(`${file}: jedes <img> hat alt, width und height`, () => {
    const bad = [];
    $('img').each((_, el) => {
      const a = el.attribs;
      const missing = ['alt', 'width', 'height'].filter((k) => a[k] === undefined);
      if (missing.length) bad.push(`${a.src ?? '(ohne src)'}: fehlt ${missing.join(', ')}`);
    });
    assert.deepEqual(bad, []);
  });

  test(`${file}: keine nicht umgesetzten Hugo-Shortcodes`, () => {
    // {{< … >}} und {{% … %}} sind Hugo-Shortcodes; im Astro-Bau darf nichts davon stehen bleiben
    const text = read(file);
    assert.doesNotMatch(text, /\{\{\s*[<%]/, 'Hugo-Shortcode im Seitentext');
  });

  test(`${file}: keine doppelten id-Attribute`, () => {
    const seen = new Map();
    $('[id]').each((_, el) => seen.set(el.attribs.id, (seen.get(el.attribs.id) ?? 0) + 1));
    const dup = [...seen].filter(([, n]) => n > 1).map(([id, n]) => `${id} (${n}x)`);
    assert.deepEqual(dup, []);
  });
}
