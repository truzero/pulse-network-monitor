import type { ProcessRow } from "@/schemas/pulse";

export function isSystemTask(r: ProcessRow): boolean {
  if (r.uid === 0) return true;
  const exe = r.exe ?? "";
  if (exe.startsWith("/System/")) return true;
  const cmd0 = r.cmd[0];
  if (cmd0?.startsWith("/System/")) return true;
  return false;
}

