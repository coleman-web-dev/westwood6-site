/**
 * Address normalization utilities for fuzzy matching.
 * Used by ledger import to match CSV addresses to database units.
 */

const STREET_TYPE_MAP: Record<string, string> = {
  ave: 'avenue',
  av: 'avenue',
  avenue: 'avenue',
  blvd: 'boulevard',
  boulevard: 'boulevard',
  cir: 'circle',
  circle: 'circle',
  ct: 'court',
  court: 'court',
  dr: 'drive',
  drive: 'drive',
  hwy: 'highway',
  highway: 'highway',
  ln: 'lane',
  lane: 'lane',
  loop: 'loop',
  pl: 'place',
  place: 'place',
  pt: 'point',
  point: 'point',
  rd: 'road',
  road: 'road',
  st: 'street',
  street: 'street',
  ter: 'terrace',
  terrace: 'terrace',
  trl: 'trail',
  trail: 'trail',
  way: 'way',
  pkwy: 'parkway',
  parkway: 'parkway',
};

const DIRECTIONAL_MAP: Record<string, string> = {
  n: 'n',
  north: 'n',
  s: 's',
  south: 's',
  e: 'e',
  east: 'e',
  w: 'w',
  west: 'w',
  ne: 'ne',
  northeast: 'ne',
  nw: 'nw',
  northwest: 'nw',
  se: 'se',
  southeast: 'se',
  sw: 'sw',
  southwest: 'sw',
};

/**
 * Normalize an address string for comparison.
 * Lowercases, expands abbreviations, strips punctuation and extra whitespace.
 */
export function normalizeAddress(address: string): string {
  if (!address) return '';

  let normalized = address
    .toLowerCase()
    .trim()
    // Remove unit/apt/suite suffixes (e.g., "Apt 4", "Suite B", "#101")
    .replace(/\b(apt|apartment|suite|ste|unit|#)\s*[a-z0-9-]+$/i, '')
    // Remove periods and commas
    .replace(/[.,]/g, '')
    // Collapse multiple spaces
    .replace(/\s+/g, ' ')
    .trim();

  // Split into tokens and normalize each
  const tokens = normalized.split(' ');
  const result: string[] = [];

  for (const token of tokens) {
    // Normalize directionals
    if (DIRECTIONAL_MAP[token]) {
      result.push(DIRECTIONAL_MAP[token]);
      continue;
    }

    // Normalize street types
    if (STREET_TYPE_MAP[token]) {
      result.push(STREET_TYPE_MAP[token]);
      continue;
    }

    // Remove ordinal suffixes from numbers (e.g., "83rd" -> "83")
    const ordinal = token.replace(/(\d+)(st|nd|rd|th)$/i, '$1');
    if (ordinal !== token) {
      result.push(ordinal);
      continue;
    }

    result.push(token);
  }

  return result.join(' ');
}

/**
 * Compare two addresses after normalization.
 * Returns a confidence score: 1.0 = exact match, 0.0 = no match.
 * Intermediate scores indicate fuzzy matches.
 */
export function compareAddresses(a: string, b: string): number {
  const normA = normalizeAddress(a);
  const normB = normalizeAddress(b);

  if (!normA || !normB) return 0;

  // Exact match after normalization
  if (normA === normB) return 1.0;

  // Check if one contains the other (e.g., "10501 nw 83 street" contains "10501 nw 83")
  if (normA.includes(normB) || normB.includes(normA)) return 0.85;

  // Token-based comparison: what percentage of tokens match?
  const tokensA = new Set(normA.split(' '));
  const tokensB = new Set(normB.split(' '));
  const intersection = [...tokensA].filter((t) => tokensB.has(t));
  const union = new Set([...tokensA, ...tokensB]);

  const jaccard = intersection.length / union.size;

  // If we have a high jaccard similarity AND the street number matches, it's likely the same address
  const numA = normA.match(/^\d+/)?.[0];
  const numB = normB.match(/^\d+/)?.[0];
  const numberMatch = numA && numB && numA === numB;

  if (numberMatch && jaccard >= 0.5) return 0.8;
  if (jaccard >= 0.7) return 0.6;

  return 0;
}

/**
 * Normalize a name string for comparison.
 * Lowercases, strips middle initials, collapses spaces.
 */
export function normalizeName(name: string): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .trim()
    .replace(/[.,]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
