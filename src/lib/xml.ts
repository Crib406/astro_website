/**
 * Text für XML-Inhalt und Attributwerte maskieren (Sitemap, RSS-Feed).
 * Die Anführungszeichen als `&#34;` und `&#39;`, so schreibt auch Hugo.
 */
export const escapeXml = (s: string): string =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&#34;')
    .replace(/'/g, '&#39;');
