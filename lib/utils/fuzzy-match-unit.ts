/**
 * Fuzzy match a unit from requester-provided fields.
 *
 * Matching strategy (in priority order):
 * 1. Exact unit_number match
 * 2. Normalized unit_number match (strip "lot", "unit", "#", leading zeros, etc.)
 * 3. Address similarity match
 * 4. Owner name match against members
 *
 * Uses multiple signals to increase confidence. If lot number matches exactly,
 * that's authoritative. Otherwise combines address and owner name signals.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

interface MatchInput {
  lotNumber?: string;
  propertyAddress?: string;
  ownerNames?: string;
}

interface MatchResult {
  id: string;
  status: string;
}

/**
 * Normalize a unit/lot number for comparison.
 * Strips common prefixes, punctuation, whitespace, and leading zeros.
 */
function normalizeUnitNumber(input: string): string {
  return input
    .toLowerCase()
    .replace(/\b(lot|unit|apt|suite|ste|#|no\.?|number)\b/gi, '')
    .replace(/[^a-z0-9]/g, '')
    .replace(/^0+/, '') || '0';
}

/**
 * Normalize an address for comparison.
 * Strips common abbreviations, punctuation, and whitespace.
 */
function normalizeAddress(input: string): string {
  return input
    .toLowerCase()
    .replace(/\b(street|st|avenue|ave|boulevard|blvd|drive|dr|road|rd|lane|ln|court|ct|circle|cir|way|place|pl|terrace|ter|trail|trl)\b/g, '')
    .replace(/\b(north|south|east|west|n|s|e|w|nw|ne|sw|se)\b/g, '')
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Simple token overlap score between two strings.
 * Returns 0-1 representing the fraction of tokens that match.
 */
function tokenOverlap(a: string, b: string): number {
  const tokensA = new Set(a.toLowerCase().split(/\s+/).filter(Boolean));
  const tokensB = new Set(b.toLowerCase().split(/\s+/).filter(Boolean));
  if (tokensA.size === 0 || tokensB.size === 0) return 0;

  let matches = 0;
  for (const token of tokensA) {
    if (tokensB.has(token)) matches++;
  }
  return matches / Math.max(tokensA.size, tokensB.size);
}

export async function fuzzyMatchUnit(
  supabase: SupabaseClient,
  communityId: string,
  input: MatchInput,
): Promise<MatchResult | null> {
  const lotNumber = input.lotNumber?.trim();
  const propertyAddress = input.propertyAddress?.trim();
  const ownerNames = input.ownerNames?.trim();

  if (!lotNumber && !propertyAddress && !ownerNames) return null;

  // Step 1: Try exact unit_number match first (fast path)
  if (lotNumber) {
    const { data: exactMatch } = await supabase
      .from('units')
      .select('id, status')
      .eq('community_id', communityId)
      .eq('unit_number', lotNumber)
      .single();

    if (exactMatch) return exactMatch;
  }

  // Fetch all community units for fuzzy comparison
  const { data: allUnits } = await supabase
    .from('units')
    .select('id, unit_number, address, status')
    .eq('community_id', communityId);

  if (!allUnits || allUnits.length === 0) return null;

  // Score each unit
  const scored: Array<{ unit: typeof allUnits[0]; score: number }> = [];
  const normalizedInput = lotNumber ? normalizeUnitNumber(lotNumber) : null;
  const normalizedAddr = propertyAddress ? normalizeAddress(propertyAddress) : null;

  for (const unit of allUnits) {
    let score = 0;

    // Step 2: Normalized unit number match
    if (normalizedInput && unit.unit_number) {
      const normalizedUnit = normalizeUnitNumber(unit.unit_number);
      if (normalizedUnit === normalizedInput) {
        score += 10; // Strong signal
      } else if (normalizedUnit.includes(normalizedInput) || normalizedInput.includes(normalizedUnit)) {
        score += 5; // Partial match
      }
    }

    // Step 3: Address similarity
    if (normalizedAddr && unit.address) {
      const normalizedUnitAddr = normalizeAddress(unit.address);
      if (normalizedUnitAddr === normalizedAddr) {
        score += 8;
      } else if (normalizedUnitAddr.includes(normalizedAddr) || normalizedAddr.includes(normalizedUnitAddr)) {
        score += 4;
      } else if (propertyAddress && unit.address) {
        const overlap = tokenOverlap(propertyAddress, unit.address);
        if (overlap >= 0.5) score += overlap * 6;
      }
    }

    if (score > 0) {
      scored.push({ unit, score });
    }
  }

  // Step 4: If no match from unit number or address, try owner names
  if (scored.length === 0 && ownerNames) {
    const nameTokens = ownerNames.toLowerCase().split(/[\s,&]+/).filter((t) => t.length > 1);
    if (nameTokens.length > 0) {
      // Search members by name fragments
      let query = supabase
        .from('members')
        .select('unit_id, first_name, last_name')
        .eq('community_id', communityId)
        .eq('member_role', 'owner');

      // Use ilike for the first significant name token
      const primaryName = nameTokens.find((t) => t.length > 2) || nameTokens[0];
      query = query.or(`first_name.ilike.%${primaryName}%,last_name.ilike.%${primaryName}%`);

      const { data: memberMatches } = await query;

      if (memberMatches && memberMatches.length > 0) {
        for (const m of memberMatches) {
          if (!m.unit_id) continue;
          const memberFullName = `${m.first_name} ${m.last_name}`.toLowerCase();
          const overlap = tokenOverlap(ownerNames, memberFullName);
          if (overlap >= 0.4) {
            const matchedUnit = allUnits.find((u) => u.id === m.unit_id);
            if (matchedUnit) {
              scored.push({ unit: matchedUnit, score: overlap * 6 });
            }
          }
        }
      }
    }
  }

  if (scored.length === 0) return null;

  // Return the highest-scoring match (must meet minimum threshold)
  scored.sort((a, b) => b.score - a.score);
  const best = scored[0];

  // Require a minimum score of 3 to avoid false matches
  if (best.score < 3) return null;

  return { id: best.unit.id, status: best.unit.status };
}
