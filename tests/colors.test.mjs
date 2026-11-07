/**
 * Farbpalette: Messing (#E6A94A) ist der einzige warme Akzent, das frühere
 * Neongrün (#2BFF8A) darf nirgends mehr ausgeliefert werden.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { distDir, allHtml, read } from './helpers.mjs';

const cssDir = path.join(distDir, 'assets/css');
const css = fs.readdirSync(cssDir)
  .filter((f) => f.endsWith('.css'))
  .map((f) => fs.readFileSync(path.join(cssDir, f), 'utf8'))
  .join('\n');

test('Kein Neongrün (#2BFF8A / rgb(43,255,138)) mehr im CSS-Bündel', () => {
  assert.doesNotMatch(css, /#2bff8a|43,\s*255,\s*138/i);
});

test('Kein Neongrün in den ausgelieferten HTML-Seiten', () => {
  for (const f of allHtml()) {
    assert.doesNotMatch(read(f), /#2bff8a|43,\s*255,\s*138/i, f);
  }
});

test('Messing ist der Akzent, ein Messing statt zwei', () => {
  assert.match(css, /--color-accent-strong:\s*#e6a94a/i);
  assert.match(css, /--color-brass:\s*var\(--color-accent-strong\)/i);
  assert.doesNotMatch(css, /#d6aa62/i);
});

test('Lichtkegel sind reine Hintergrundebenen (kein Pointer-Fang)', () => {
  assert.match(css, /radial-gradient\(ellipse 40% 58% at 72% 36%/);
  assert.match(css, /\.breadcrumb-area\.breadcrumb-bg\{background-image:radial-gradient/);
});
