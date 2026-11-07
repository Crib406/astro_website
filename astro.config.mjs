import { defineConfig } from 'astro/config';

// SITE und BASE_PATH setzt die CI für Branch-Vorschauen
// (z. B. BASE_PATH=/preview/<branch>/). Auf der Hauptseite gelten die Vorgaben.
export default defineConfig({
  site: process.env.SITE ?? 'https://creimann.cc',
  base: process.env.BASE_PATH ?? '/',
  output: 'static',
  trailingSlash: 'always',
  build: {
    format: 'directory',
  },
  // Kein Sitemap-Plugin: die Sitemap wird als eigener Endpunkt gebaut.
});
