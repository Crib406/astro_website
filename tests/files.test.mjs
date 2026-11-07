import { test } from 'node:test';
import assert from 'node:assert/strict';
import { exists, walk, htmlPages, read, distDir } from './helpers.mjs';

const expectedFiles = [
  ...htmlPages,
  'sitemap.xml',
  'robots.txt',
  'blog/index.xml',
  'CNAME',
  'favicon.ico',
];

for (const file of expectedFiles) {
  test(`Datei vorhanden: ${file}`, () => {
    assert.ok(exists(file), `${file} fehlt in ${distDir}`);
  });
}

for (const [dir, ext] of [
  ['assets/css', 'css'],
  ['assets/js', 'js'],
]) {
  test(`genau ein Bündel ${dir}/bundle.min.<hash>.${ext}`, () => {
    const re = new RegExp(`^${dir}/bundle\\.min\\.[0-9a-f]{64}\\.${ext}$`);
    const found = walk().filter((f) => re.test(f));
    assert.equal(found.length, 1, `gefunden: ${found.join(', ') || 'keins'}`);
  });
}

test('Bereichs-Feeds (about, kontakt, mein-weg, impressum) entfallen', () => {
  for (const s of ['about', 'kontakt', 'mein-weg', 'impressum']) {
    assert.ok(!exists(`${s}/index.xml`), `${s}/index.xml sollte es nicht geben`);
  }
});

test('Entwürfe werden nicht gebaut', () => {
  assert.ok(!exists('blog/loyalitaet/index.html'), 'blog/loyalitaet/ ist ein Entwurf');
});

test('CNAME enthält die Domain', () => {
  assert.match(read('CNAME').trim(), /^[a-z0-9.-]+\.[a-z]+$/);
});

test('blog/index.xml ist wohlgeformtes RSS', () => {
  const xml = read('blog/index.xml');
  assert.match(xml, /^<\?xml/);
  assert.match(xml, /<rss[\s>]/);
  assert.match(xml, /<channel>/);
});
