/**
 * Standard-Ursprung der Seite (ohne Pfad, ohne abschließenden Schrägstrich).
 *
 * Die einzige Stelle, an der die Adresse der Produktivseite steht. Sie wird
 * von `astro.config.mjs`, `src/lib/site.ts` und `tests/helpers.mjs` gelesen
 * und deshalb als schlichtes `.mjs` ohne Abhängigkeiten geführt. Vorschau-
 * Builds überschreiben sie über die Umgebungsvariable `SITE`.
 */
export const defaultOrigin = 'https://creimann.cc';
