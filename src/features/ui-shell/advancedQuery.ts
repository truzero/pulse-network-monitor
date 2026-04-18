export type MemCmp = {
  op: ">" | "<";
  bytes: number;
};

export type AdvancedQuery = {
  port: number | null;
  mem: MemCmp[];
  users: string[];
  tokens: string[];
};

const memRe = /([<>])\s*(\d+(?:\.\d+)?)\s*(mb|gb)/gi;

function bytesFor(n: number, unit: string) {
  const u = unit.toLowerCase();
  const base = 1024 * 1024;
  return u === "gb" ? n * base * 1024 : n * base;
}

function fuzzySubsequence(hay: string, needle: string) {
  let hi = 0;
  for (let ni = 0; ni < needle.length; ni++) {
    const ch = needle[ni];
    hi = hay.indexOf(ch, hi);
    if (hi === -1) return false;
    hi++;
  }
  return true;
}

export function fuzzyMatchAny(hays: string[], token: string) {
  const t = token.toLowerCase();
  if (!t) return true;
  const isShort = t.length <= 2;
  const isPathy = t.includes("/") || t.includes(".");

  for (const h of hays) {
    const hay = h.toLowerCase();
    if (isShort || isPathy) {
      if (hay.includes(t)) return true;
      continue;
    }
    if (hay.includes(t)) return true;
    if (fuzzySubsequence(hay, t)) return true;
  }
  return false;
}

export function parseAdvancedQuery(raw: string, knownUsers: Set<string>): AdvancedQuery {
  const q = raw.trim();

  const mem: MemCmp[] = [];
  const stripped = q.replace(memRe, (_m, op, num, unit) => {
    const n = Number(num);
    if (Number.isFinite(n)) mem.push({ op, bytes: bytesFor(n, unit) });
    return " ";
  });

  const parts = stripped
    .split(/\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const users: string[] = [];
  const tokens: string[] = [];

  for (const p of parts) {
    const m = /^user:(.+)$/i.exec(p);
    if (m) {
      users.push(m[1].toLowerCase());
      continue;
    }
    const pl = p.toLowerCase();
    if (knownUsers.has(pl) || pl === "root") {
      users.push(pl);
      continue;
    }
    tokens.push(pl);
  }

  return { port: null, mem, users, tokens };
}

