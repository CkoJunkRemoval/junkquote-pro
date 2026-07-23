const HISTORY_PREFIX = "junkquote:global-search:";
export function historyKey(scope: string) { return `${HISTORY_PREFIX}${scope}`; }
export function readSearchHistory(storage: Pick<Storage, "getItem">, scope: string) {
  try { const value = JSON.parse(storage.getItem(historyKey(scope)) ?? "[]"); return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string").slice(0, 5) : []; } catch { return []; }
}
export function writeSearchHistory(storage: Pick<Storage, "getItem" | "setItem">, scope: string, term: string) {
  const next = [term.trim(), ...readSearchHistory(storage, scope).filter((item) => item !== term.trim())].filter(Boolean).slice(0, 5);
  storage.setItem(historyKey(scope), JSON.stringify(next));
}
export function clearGlobalSearchHistory(storage: Pick<Storage, "length" | "key" | "removeItem">) {
  const keys = Array.from({ length: storage.length }, (_, index) => storage.key(index)).filter((key): key is string => Boolean(key?.startsWith(HISTORY_PREFIX)));
  keys.forEach((key) => storage.removeItem(key));
}
export function isLatestSearchRequest(request: number, current: number) { return request === current; }
