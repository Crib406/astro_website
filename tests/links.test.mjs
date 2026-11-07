import { test } from 'node:test';
import assert from 'node:assert/strict';
import { allHtml, loadHtml, exists, read, walk, resolveInternal, legacyPatterns, urlPathOf, base } from './helpers.mjs';

/** Alle Verweise einer Seite: [Beschreibung, URL]. */
function references($) {
  const refs = [];
  const add = (what, url) => {
    if (typeof url === 'string' && url.trim() !== '') refs.push([what, url]);
  };
  $('a[href]').each((_, e) => add(`<a href>`, e.attribs.href));
  $('area[href]').each((_, e) => add(`<area href>`, e.attribs.href));
  $('link[href]').each((_, e) => {
    // canonical/alternate zeigen in Vorschauen bewusst auf die Hauptseite
    if (/canonical|alternate/.test(e.attribs.rel ?? '')) return;
    add(`<link rel="${e.attribs.rel ?? ''}" href>`, e.attribs.href);
  });
  $('script[src]').each((_, e) => add('<script src>', e.attribs.src));
  $('img[src], source[src], video[src], audio[src], iframe[src], track[src]').each((_, e) =>
    add(`<${e.name} src>`, e.attribs.src),
  );
  $('video[poster]').each((_, e) => add('<video poster>', e.attribs.poster));
  $('img[srcset], source[srcset]').each((_, e) => {
    for (const part of e.attribs.srcset.split(',')) add(`<${e.name} srcset>`, part.trim().split(/\s+/)[0]);
  });
  $('[style]').each((_, e) => {
    for (const m of e.attribs.style.matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/g)) add('style url()', m[1]);
  });
  $('meta[property="og:image"], meta[name="twitter:image"], meta[property="og:url"]').each((_, e) =>
    add(`<meta ${e.attribs.property ?? e.attribs.name}>`, e.attribs.content),
  );
  $('meta[http-equiv="refresh"]').each((_, e) => {
    const m = /url=(.+)$/i.exec(e.attribs.content ?? '');
    if (m) add('meta refresh', m[1].trim());
  });
  return refs;
}

for (const file of allHtml()) {
  const $ = loadHtml(file);

  test(`${file}: interne Verweise zeigen auf vorhandene Dateien`, () => {
    const problems = [];
    for (const [what, url] of references($)) {
      for (const l of legacyPatterns) {
        if (l.re.test(url)) problems.push(`${what} ${url}: Hugo-Altlast, ${l.why}`);
      }
      const r = resolveInternal(url, file);
      if (r.kind === 'ignore') continue;
      if (r.kind === 'outside') {
        problems.push(`${what} ${url}: liegt außerhalb von base (${base})`);
        continue;
      }
      if (r.slashless) problems.push(`${what} ${url}: Seitenlink ohne abschließenden Schrägstrich`);
      if (!exists(r.file)) problems.push(`${what} ${url}: Datei ${r.file} fehlt in dist`);
    }
    assert.deepEqual([...new Set(problems)], []);
  });

  if (file === '404.html') {
    test('404.html: nur wurzelabsolute Links (die Seite wird unter beliebigen Pfaden ausgeliefert)', () => {
      const rel = references($)
        .filter(([, u]) => !/^([a-z][a-z0-9+.-]*:|\/|#|\/\/)/i.test(u))
        .map(([w, u]) => `${w} ${u}`);
      assert.deepEqual(rel, []);
    });
  }
}

// Schriften und Bilder, auf die das CSS-Bündel verweist (relativ zur CSS-Datei)
const cssFiles = walk().filter((f) => /^assets\/css\/bundle\.min\.[0-9a-f]+\.css$/.test(f));
for (const cssFile of cssFiles) {
  test(`${cssFile}: Schriften im CSS zeigen auf vorhandene Dateien`, (t) => {
    const css = read(cssFile);
    const missing = new Set();
    const deadImages = new Set();
    for (const m of css.matchAll(/url\(\s*(['"]?)([^'")]+)\1\s*\)/g)) {
      const raw = m[2];
      if (/^(data:|#|https?:|\/\/)/.test(raw)) continue;
      const u = new URL(raw, `http://dist.invalid${urlPathOf(cssFile)}`);
      let p = decodeURIComponent(u.pathname);
      const isFont = /\.(woff2?|ttf|otf|eot)$/i.test(p);
      if (!p.startsWith(base)) {
        (isFont ? missing : deadImages).add(`${raw}: außerhalb von base`);
        continue;
      }
      p = p.slice(base.length);
      if (!exists(p)) (isFont ? missing : deadImages).add(`${raw} -> ${p}`);
    }
    // Das Vorlagen-CSS (Hugo-Altlast) verweist auf viele Bilder, die es nie gab
    // und die keine Seite benutzt. Das ist kein Fehler des Baus, nur ein Hinweis.
    if (deadImages.size) t.diagnostic(`${deadImages.size} Bild-Verweise im CSS ohne Datei (Vorlagen-Altlast, unbenutzt)`);
    assert.deepEqual([...missing], []);
  });
}
