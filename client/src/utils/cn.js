/** Tiny class-name joiner — no clsx dependency, handles conditionals the same way. */
export function cn(...parts) {
  const out = [];
  for (const p of parts) {
    if (!p) continue;
    if (typeof p === 'string' || typeof p === 'number') out.push(String(p));
    else if (Array.isArray(p)) out.push(cn(...p));
    else if (typeof p === 'object') for (const [k, v] of Object.entries(p)) if (v) out.push(k);
  }
  return out.join(' ');
}

export default cn;
