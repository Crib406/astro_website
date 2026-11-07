/**
 * Datumsangaben aus dem Frontmatter (Veröffentlichungsdatum der Beiträge).
 *
 * Wie in Hugo bleibt der Versatz zur UTC so, wie er im Frontmatter steht:
 * `2025-12-06T10:00:00+01:00` wird als `…+01:00` ausgegeben und als 6.12.2025
 * angezeigt, ganz gleich, in welcher Zeitzone der Bau läuft. Ein reines Datum
 * (`2025-12-06`) oder eine Zeit ohne Versatz gilt als UTC (`…T00:00:00Z`).
 *
 * Damit YAML den Versatz nicht verschluckt (ein unquotierter Zeitstempel wird
 * zu einem Date und verliert ihn), steht das Datum im Frontmatter als Text in
 * Anführungszeichen. Reine Funktionen ohne Astro-Abhängigkeit, damit auch die
 * Content-Konfiguration sie nutzen kann.
 */

const PATTERN = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?(Z|[+-]\d{2}:\d{2})?)?$/;

export interface LiteralDate {
  /** Normalisiert, wie Hugo es schreibt: `2006-01-02T15:04:05Z07:00` */
  iso: string;
  /** derselbe Zeitpunkt als Date (für Sortierung) */
  instant: Date;
  year: string;
  month: string;
  day: string;
  hour: string;
  minute: string;
  second: string;
  /** `Z` oder `+01:00` */
  offset: string;
}

/** Zerlegt ein Frontmatter-Datum; `undefined`, wenn der Text kein gültiges Datum ist. */
export function tryParseLiteralDate(text: string): LiteralDate | undefined {
  const m = PATTERN.exec(text.trim());
  if (!m) return undefined;
  const [, year, month, day, hour = '00', minute = '00', second = '00', zone = 'Z'] = m;
  const offset = /^[+-]00:00$/.test(zone) ? 'Z' : zone;
  const iso = `${year}-${month}-${day}T${hour}:${minute}:${second}${offset}`;
  const instant = new Date(iso);
  if (Number.isNaN(instant.getTime())) return undefined;
  // Einen 31. Februar rechnet Date stillschweigend in den März um; das soll auffallen.
  const calendarDay = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  if (calendarDay.toISOString().slice(0, 10) !== `${year}-${month}-${day}`) return undefined;
  return { iso, instant, year, month, day, hour, minute, second, offset };
}

/** Wie `tryParseLiteralDate`, wirft aber bei ungültigem Text. */
export function parseLiteralDate(text: string): LiteralDate {
  const parsed = tryParseLiteralDate(text);
  if (!parsed) throw new Error(`Ungültiges Datum "${text}" (erwartet: 2025-12-06 oder 2025-12-06T10:00:00+01:00)`);
  return parsed;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Hugo `02. Jan 2006` (englische Monatskürzel, wie in der Referenz). */
export function formatListDate(d: LiteralDate): string {
  return `${d.day}. ${MONTHS[Number(d.month) - 1]} ${d.year}`;
}

/** Hugo `02.01.2006`. */
export function formatPostDate(d: LiteralDate): string {
  return `${d.day}.${d.month}.${d.year}`;
}

/** RFC 822 mit numerischem Offset (Hugo: `Mon, 02 Jan 2006 15:04:05 -0700`). */
export function formatRfc822(d: LiteralDate): string {
  const weekday = WEEKDAYS[new Date(Date.UTC(Number(d.year), Number(d.month) - 1, Number(d.day))).getUTCDay()];
  const zone = d.offset === 'Z' ? '+0000' : d.offset.replace(':', '');
  return `${weekday}, ${d.day} ${MONTHS[Number(d.month) - 1]} ${d.year} ${d.hour}:${d.minute}:${d.second} ${zone}`;
}
