import { test } from 'node:test';
import assert from 'node:assert/strict';
import { allHtml, loadHtml, read, walk } from './helpers.mjs';

// Seiten mit Seitenkopf: alle außer den reinen Weiterleitungen (die haben kein Burger-Menü)
const pagesWithBurger = allHtml().filter((f) => loadHtml(f)('.humberger_menu_active').length > 0);

test('mindestens die Startseite hat ein mobiles Menü', () => {
  assert.ok(pagesWithBurger.includes('index.html'));
});

for (const file of pagesWithBurger) {
  test(`${file}: Burger hat aria-controls und aria-expanded="false", Ziel genau einmal`, () => {
    const $ = loadHtml(file);
    const burger = $('.humberger_menu_active');
    assert.equal(burger.length, 1);
    assert.equal(burger.attr('aria-expanded'), 'false');
    const target = burger.attr('aria-controls');
    assert.ok(target, 'aria-controls fehlt');
    assert.equal($(`[id="${target}"]`).length, 1, `id "${target}" nicht genau einmal`);
    assert.ok($(`[id="${target}"]`).hasClass('tmp-popup-mobile-menu'));
  });
}

const jsBundles = walk().filter((f) => /^assets\/js\/bundle\.min\.[0-9a-f]+\.js$/.test(f));

test('genau ein JS-Bündel', () => {
  assert.equal(jsBundles.length, 1, jsBundles.join(', '));
});

test('JS-Bündel: kein SmoothScroll-Plugin mehr, reduzierte Bewegung wird beachtet', () => {
  const js = read(jsBundles[0]);
  assert.doesNotMatch(js, /SmoothScroll/, 'SmoothScroll steckt noch im Bündel');
  assert.match(js, /prefers-reduced-motion/);
});

test('JS-Bündel: menuCurrentLink ist entfernt, splitA11y und aria-expanded sind da', () => {
  const js = read(jsBundles[0]);
  assert.doesNotMatch(js, /menuCurrentLink/);
  assert.match(js, /splitA11y/);
  assert.match(js, /aria-expanded/);
});
