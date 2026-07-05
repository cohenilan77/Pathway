// Deterministic, content-addressed ids. Using a stable hash of the meaningful
// parts (not Date.now()/random) makes the engine idempotent — re-running an
// agent over the same input does not create duplicate roadmap items, tasks, or
// events — and makes the behaviour trivially testable.

function stableHash(str) {
  let h = 5381;
  const s = String(str);
  for (let i = 0; i < s.length; i += 1) {
    h = ((h << 5) + h) ^ s.charCodeAt(i);
  }
  // Unsigned, base36 for compactness.
  return (h >>> 0).toString(36);
}

export function slug(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

// id = `${prefix}_${hash(parts)}` — deterministic for the same inputs.
export function makeId(prefix, ...parts) {
  return `${prefix}_${stableHash(parts.map(p => (p == null ? '' : String(p))).join('|'))}`;
}
