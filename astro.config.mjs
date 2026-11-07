import { defineConfig } from 'astro/config';

// SITE und BASE_PATH setzt die CI für Branch-Vorschauen
// (z. B. BASE_PATH=/preview/<branch>/). Auf der Hauptseite gelten die Vorgaben.
const site = process.env.SITE ?? 'https://creimann.cc';

// SITE ist nur der Ursprung. Ein Pfad gehört in BASE_PATH; sonst würden
// Vorschau-Erkennung und alle URLs auseinanderlaufen.
const siteUrl = new URL(site);
if (siteUrl.pathname.replace(/\/+$/, '') !== '' || siteUrl.search || siteUrl.hash) {
  throw new Error(
    `SITE="${site}" enthält einen Pfad. SITE ist nur der Ursprung (z. B. https://creimann.cc); ` +
      'den Pfad für Vorschauen in BASE_PATH setzen (z. B. BASE_PATH=/preview/<branch>/).',
  );
}

export default defineConfig({
  site,
  base: process.env.BASE_PATH ?? '/',
  output: 'static',
  // Whitespace bleibt wie im Hugo-Markup (z. B. das Leerzeichen zwischen Text und <i>-Icon).
  compressHTML: false,
  trailingSlash: 'always',
  build: {
    format: 'directory',
  },
  // Kein Sitemap-Plugin: die Sitemap wird als eigener Endpunkt gebaut.
});
