import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load } from 'cheerio';
import { read, homeAbs, publishedPosts, unpublishedPosts, specialPaths, pages } from './helpers.mjs';

const xml = read(specialPaths.feed);
const $ = load(xml, { xmlMode: true });
const items = $('item')
  .map((_, el) => ({
    title: $(el).children('title').text(),
    link: $(el).children('link').text().trim(),
    guid: $(el).children('guid').text().trim(),
    pubDate: $(el).children('pubDate').text().trim(),
    description: $(el).children('description').text(),
  }))
  .get();

const RFC822 = /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun), \d{2} (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d{4} \d{2}:\d{2}:\d{2} [+-]\d{4}$/;

test('RSS: wohlgeformt mit Kanal, Titel, Link und Selbstverweis', () => {
  assert.match(xml, /^<\?xml/);
  assert.equal($('rss').length, 1);
  assert.equal($('channel').length, 1);
  assert.ok($('channel > title').text().trim().length > 0, 'Kanaltitel fehlt');
  assert.equal($('channel > link').text().trim(), `${homeAbs}blog/`);
  assert.equal($('channel > atom\\:link').attr('href'), homeAbs + specialPaths.feed);
});

test('RSS: ein Eintrag je veröffentlichtem Beitrag, in Reihenfolge Datum absteigend', () => {
  assert.equal(items.length, publishedPosts.length);
  const expected = publishedPosts
    .toSorted((a, b) => new Date(b.data.date) - new Date(a.data.date) || a.data.title.localeCompare(b.data.title, 'de'))
    .map((p) => homeAbs + p.path);
  assert.deepEqual(items.map((i) => i.link), expected);
});

test('RSS: keine Entwürfe oder Beiträge mit Datum in der Zukunft', () => {
  for (const p of unpublishedPosts) {
    assert.ok(!items.some((i) => i.link === homeAbs + p.path), `${p.path} darf nicht im Feed stehen`);
    assert.ok(!items.some((i) => i.title === p.data.title), `"${p.data.title}" darf nicht im Feed stehen`);
  }
});

test('RSS: link und guid absolut unter der Startseite und gleich', () => {
  for (const i of items) {
    assert.ok(i.link.startsWith(`${homeAbs}blog/`) && i.link.endsWith('/'), `link ${i.link}`);
    assert.equal(i.guid, i.link);
  }
});

test('RSS: pubDate im RFC-822-Format und passend zum Datum im Frontmatter', () => {
  for (const p of publishedPosts) {
    const item = items.find((i) => i.link === homeAbs + p.path);
    assert.ok(item, `${p.path} fehlt im Feed`);
    assert.match(item.pubDate, RFC822, `pubDate "${item.pubDate}"`);
    assert.equal(new Date(item.pubDate).getTime(), new Date(p.data.date).getTime(), `${p.path}: pubDate stimmt nicht mit date überein`);
  }
});

test('RSS: Titel und Beschreibung sind nicht leer', () => {
  for (const i of items) {
    assert.ok(i.title.trim().length > 0, `${i.link}: Titel leer`);
    assert.ok(i.description.trim().length > 0, `${i.link}: Beschreibung leer`);
  }
});

test('RSS: Kanaltitel und -beschreibung deutsch aus der Blog-Seite, kein generator', () => {
  const blog = pages.find((p) => p.id === 'blog').data;
  assert.equal($('channel > title').text(), blog.title);
  assert.equal($('channel > description').text(), blog.description);
  assert.equal($('channel > generator').length, 0, 'generator soll fehlen');
  assert.ok(!/Recent content| on /.test($('channel > title').text() + $('channel > description').text()), 'englischer Hugo-Standardtext');
  assert.equal($('channel > language').text(), 'de-de');
});
