/**
 * UX-Paket nach der Migration: Menü, aktuelle Seite, Skip-Link, Fokus,
 * sichtbare Mailadresse, Beitragskopf ohne Überschriften-Sprung.
 * Läuft auch im Vorschau-Bau (base-fähige Verweise).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  allHtml, loadHtml, read, redirectPages, pagePath, specialPaths, base, blogPublic,
  publishedPosts, urlPathOf,
} from './helpers.mjs';

const menuFiles = allHtml().filter((f) => !redirectPages.has(f));
const lists = {
  Desktop: 'header nav.tmp-mainmenu-nav ul.tmp-mainmenu',
  Mobil: '.tmp-popup-mobile-menu ul.tmp-mainmenu',
};

const menuPaths = [
  base + pagePath('home'),
  base + pagePath('about'),
  base + pagePath('mein-weg'),
  ...(blogPublic ? [base + pagePath('blog')] : []),
  base + pagePath('kontakt'),
];

/** Menüeintrag, der für diese Seite aktuell sein muss (oder undefined). */
function expectedCurrent(file) {
  const here = urlPathOf(file);
  const home = base + pagePath('home');
  return menuPaths.find((p) => (p === home ? here === home : here.startsWith(p)));
}

for (const file of menuFiles) {
  const $ = loadHtml(file);

  for (const [name, sel] of Object.entries(lists)) {
    test(`${file}: ${name}menü ist flach, enthält Kontakt und kein href="#"`, () => {
      const hrefs = $(`${sel} > li > a`).map((_, a) => a.attribs.href).get();
      assert.deepEqual(hrefs, menuPaths);
      assert.equal($(`${sel} ul, ${sel} .has-dropdown`).length, 0, 'Untermenü im Menü');
    });

    test(`${file}: ${name}menü markiert die aktuelle Seite genau einmal richtig`, () => {
      const current = $(`${sel} a[aria-current]`);
      const want = expectedCurrent(file);
      if (!want) {
        assert.equal(current.length, 0, 'aria-current auf einer Seite ohne Menüeintrag');
        return;
      }
      assert.equal(current.length, 1);
      assert.equal(current.attr('aria-current'), 'page');
      assert.equal(current.attr('href'), want);
    });
  }

  test(`${file}: kein href="#" in Kopf und Menü`, () => {
    const bad = $('header a[href="#"], .tmp-popup-mobile-menu a[href="#"]').length;
    assert.equal(bad, 0);
  });

  test(`${file}: Skip-Link ist das erste Element im body und sein Ziel existiert`, () => {
    const first = $('body').children().first();
    assert.ok(first.is('a.skip-link'), 'erstes Element im body ist nicht der Skip-Link');
    const target = first.attr('href');
    assert.match(target, /^#[^/]+$/, 'Skip-Link soll ein reiner Fragment-Link sein');
    assert.equal($(target).length, 1, `Ziel ${target} fehlt oder ist nicht eindeutig`);
    assert.ok($(target).is('main'), 'Ziel ist nicht <main>');
  });
}

test('404.html: wurzelabsolute, base-fähige Menülinks inkl. Kontakt', () => {
  const $ = loadHtml(specialPaths.notFound);
  const hrefs = $(`${lists.Desktop} > li > a`).map((_, a) => a.attribs.href).get();
  assert.ok(hrefs.includes(base + pagePath('kontakt')));
});

test('Kontaktseite: Mailadresse steht sichtbar als Text', () => {
  const $ = loadHtml(`${pagePath('kontakt')}index.html`);
  const mail = $('main .service-card-link[href^="mailto:"]');
  assert.equal(mail.length, 1);
  const address = mail.attr('href').replace(/^mailto:/, '');
  assert.ok(mail.text().includes(address), `${address} steht nicht als Text im Mail-Link`);
});

for (const post of publishedPosts) {
  test(`${post.path}: keine Überschrift (h3–h6) vor der ersten h2`, () => {
    const $ = loadHtml(`${post.path}index.html`);
    const heads = $('main h1, main h2, main h3, main h4, main h5, main h6')
      .map((_, el) => el.tagName)
      .get();
    const firstH2 = heads.indexOf('h2');
    assert.ok(firstH2 >= 0, 'keine h2 im Beitrag');
    assert.deepEqual(heads.slice(0, firstH2).filter((h) => h !== 'h1'), []);
  });
}

test('CSS-Bündel enthält eine :focus-visible-Regel mit sichtbarer Linie', () => {
  const $ = loadHtml('index.html');
  const href = $('link[rel="stylesheet"][href*="bundle.min"]').attr('href');
  assert.ok(href, 'kein CSS-Bündel verlinkt');
  const css = read(href.slice(base.length));
  assert.match(css, /:focus-visible\s*\{[^}]*outline:\s*2px solid/);
});
