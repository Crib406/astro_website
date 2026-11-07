/**
 * JSON-LD: Graph aus WebSite, Person und Seite; @id-Verweise lösen sich
 * innerhalb des Graphen auf; Eigenschaften der SEO-Phase (Person ohne
 * areaServed, Porträt als Bild, alternateName, Autor mit Name und URL).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { allHtml, loadHtml, exists, homeAbs, redirectPages, specialPaths, publishedPosts, base } from './helpers.mjs';

const types = (n) => [].concat(n['@type'] ?? []);
const files = allHtml().filter((f) => !redirectPages.has(f) && f !== specialPaths.notFound);

function blocksOf(file) {
  const $ = loadHtml(file);
  return $('script[type="application/ld+json"]')
    .map((_, e) => JSON.parse($(e).text()))
    .get();
}

/** Alle Objekte unterhalb von `v` (einschließlich v). */
function* objects(v) {
  if (Array.isArray(v)) for (const x of v) yield* objects(x);
  else if (v && typeof v === 'object') {
    yield v;
    for (const x of Object.values(v)) yield* objects(x);
  }
}

for (const file of files) {
  const blocks = blocksOf(file);
  const graph = blocks.find((b) => b['@graph'])['@graph'];

  test(`${file}: @id-Verweise lösen sich im Graphen auf`, () => {
    // Knoten mit eigener Definition (mehr als nur @id) aus allen Blöcken
    const defined = new Set();
    for (const b of blocks) for (const o of objects(b)) if (o['@id'] && Object.keys(o).length > 1) defined.add(o['@id']);
    const refs = [];
    for (const b of blocks) for (const o of objects(b)) if (o['@id'] && Object.keys(o).length === 1) refs.push(o['@id']);
    assert.ok(refs.length > 0, 'keine @id-Verweise gefunden');
    for (const id of refs) assert.ok(defined.has(id), `@id ${id} wird nirgends definiert`);
    // Die Knoten des Graphen haben eindeutige @id
    const ids = graph.map((n) => n['@id']);
    assert.equal(new Set(ids).size, ids.length, 'doppelte @id im Graphen');
  });

  test(`${file}: Person ohne areaServed, mit Porträt, einheitliche credentialCategory`, () => {
    const person = graph.find((n) => types(n).includes('Person'));
    assert.ok(!('areaServed' in person), 'areaServed an Person ist in schema.org nicht definiert');
    assert.equal(person.image, `${homeAbs}assets/images/about/uebermichich.webp`);
    assert.ok(exists('assets/images/about/uebermichich.webp'), 'Porträt fehlt im Bau');
    const cats = (person.hasCredential ?? []).map((c) => c.credentialCategory);
    assert.ok(cats.length > 0);
    for (const c of cats) assert.equal(c, c.toLowerCase(), `credentialCategory "${c}" nicht klein geschrieben`);
  });

  test(`${file}: WebSite mit alternateName`, () => {
    const site = graph.find((n) => types(n).includes('WebSite'));
    assert.deepEqual(site.alternateName, ['Christoph Reimann', 'creimann.cc']);
    assert.equal(site.url, homeAbs);
  });
}

test('BlogPosting: author mit @id, name und url', () => {
  assert.ok(publishedPosts.length > 0);
  for (const p of publishedPosts) {
    const graph = blocksOf(`${p.path}index.html`).find((b) => b['@graph'])['@graph'];
    const post = graph.find((n) => types(n).includes('BlogPosting'));
    assert.ok(post, `${p.path}: kein BlogPosting`);
    const person = graph.find((n) => types(n).includes('Person'));
    assert.equal(post.author['@id'], person['@id']);
    assert.equal(post.author.name, person.name);
    assert.equal(post.author.url, homeAbs);
    assert.ok(post.author.name && post.author.url);
  }
});

test('Seiten, die keine Beiträge sind, haben kein BlogPosting', () => {
  const postFiles = new Set(publishedPosts.map((p) => `${p.path}index.html`));
  for (const file of files.filter((f) => !postFiles.has(f))) {
    const graph = blocksOf(file).find((b) => b['@graph'])['@graph'];
    assert.ok(!graph.some((n) => types(n).includes('BlogPosting')), `${file}: BlogPosting`);
  }
});

test('Vorschau-Hinweis: Person.image liegt unter der Adresse des Baus', () => {
  const graph = blocksOf('index.html').find((b) => b['@graph'])['@graph'];
  const person = graph.find((n) => types(n).includes('Person'));
  assert.ok(person.image.startsWith(homeAbs), `${person.image} liegt nicht unter ${homeAbs} (base ${base})`);
});
