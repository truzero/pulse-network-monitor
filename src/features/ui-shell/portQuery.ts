/** Port-only queries: `3000` or `:3000`. Returns null for text filters. */
export function parsePortQuery(raw: string): number | null {
  const t = raw.trim();
  const colon = /^:(\d+)$/.exec(t);
  if (colon) return Number(colon[1]);
  if (/^\d+$/.test(t)) return Number(t);
  return null;
}

