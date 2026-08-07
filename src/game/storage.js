export function readStorage(key, fallback = null) {
  try { return localStorage.getItem(key) ?? fallback; } catch (error) { return fallback; }
}

export function writeStorage(key, value) {
  try { localStorage.setItem(key, value); return true; } catch (error) { return false; }
}

export function removeStorage(key) {
  try { localStorage.removeItem(key); } catch (error) { /* Storage can be unavailable in private contexts. */ }
}
