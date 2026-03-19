/**
 * Ledger import utilities.
 * Parses CSV/Excel files, auto-maps columns, matches rows to units,
 * and executes batch imports with GL integration.
 */

import Papa from 'papaparse';
import { compareAddresses, normalizeName } from './address-normalize';

// ─── Types ──────────────────────────────────────────

export interface LedgerField {
  key: string;
  label: string;
  required: boolean;
  keywords: string[];
}

/** The canonical fields we map CSV columns to */
export const LEDGER_FIELDS: LedgerField[] = [
  {
    key: 'unitIdentifier',
    label: 'Unit / Address / Name',
    required: true,
    keywords: ['name', 'address', 'unit', 'property', 'lot', 'owner', 'resident', 'tenant', 'home'],
  },
  {
    key: 'dueDate',
    label: 'Due Date',
    required: true,
    keywords: ['due date', 'date due', 'invoice date', 'billing date', 'due'],
  },
  {
    key: 'amountDue',
    label: 'Amount Due',
    required: true,
    keywords: ['amount due', 'amount owed', 'total', 'charge', 'balance', 'owed', 'amount'],
  },
  {
    key: 'amountPaid',
    label: 'Amount Paid',
    required: true,
    keywords: ['amount paid', 'paid', 'payment amount', 'received', 'collected'],
  },
  {
    key: 'status',
    label: 'Status',
    required: true,
    keywords: ['status', 'state', 'payment status'],
  },
  {
    key: 'paymentDate',
    label: 'Payment Date',
    required: false,
    keywords: ['payment date', 'last payment', 'paid date', 'date paid', 'last payment date', 'received date'],
  },
  {
    key: 'invoiceNumber',
    label: 'Invoice #',
    required: false,
    keywords: ['invoice', 'inv', 'invoice number', 'inv #', 'reference', 'ref', 'invoice #'],
  },
  {
    key: 'serviceFee',
    label: 'Service Fee',
    required: false,
    keywords: ['service fee', 'processing fee', 'fee', 'service fee paid', 'convenience fee', 'transaction fee'],
  },
  {
    key: 'chargeType',
    label: 'Charge Type',
    required: false,
    keywords: ['type', 'charge type', 'category', 'description', 'item type', 'transaction type'],
  },
];

export type ChargeType = 'assessment' | 'security_deposit' | 'other';

export const CHARGE_TYPE_OPTIONS: { value: ChargeType; label: string }[] = [
  { value: 'assessment', label: 'Assessment / Dues' },
  { value: 'security_deposit', label: 'Security Deposit' },
  { value: 'other', label: 'Other Fee' },
];

export type LedgerFieldKey = (typeof LEDGER_FIELDS)[number]['key'];
export type ColumnMapping = Record<string, LedgerFieldKey | ''>;

export interface ParsedLedgerRow {
  /** Raw row data keyed by original CSV column name */
  raw: Record<string, string>;
  /** Index in original file (1-based) */
  rowNumber: number;
}

export type MatchConfidence = 'exact' | 'fuzzy' | 'name' | 'unmatched';

export interface MatchedRow {
  row: ParsedLedgerRow;
  unitId: string | null;
  unitLabel: string | null;
  confidence: MatchConfidence;
  score: number;
  /** The mapped field values after applying column mapping */
  mapped: {
    unitIdentifier: string;
    dueDate: string;
    amountDue: number; // cents
    amountPaid: number; // cents
    status: string;
    paymentDate: string | null;
    invoiceNumber: string | null;
    serviceFee: number; // cents
    /** Raw charge type value from CSV (if column was mapped) */
    chargeType: string;
  };
}

export interface UnitBalance {
  unitId: string;
  unitLabel: string;
  totalCharged: number; // cents
  totalPaid: number; // cents
  balance: number; // cents (positive = owing, negative = credit)
  serviceFees: number; // cents
  rowCount: number;
}

export interface ImportResult {
  invoicesCreated: number;
  paymentsRecorded: number;
  depositsRecorded: number;
  depositAmount: number; // cents
  walletCredits: number;
  walletCreditAmount: number; // cents
  outstandingAmount: number; // cents
  glEntriesPosted: number;
  errors: { row: number; message: string }[];
}

// ─── Parsing ────────────────────────────────────────

/**
 * Parse a CSV string into raw rows.
 */
export function parseLedgerCSV(csvString: string): {
  headers: string[];
  rows: ParsedLedgerRow[];
  errors: string[];
} {
  const result = Papa.parse<Record<string, string>>(csvString, {
    header: true,
    skipEmptyLines: true,
  });

  const errors: string[] = [];
  if (result.errors.length > 0) {
    for (const err of result.errors) {
      errors.push(`Row ${err.row !== undefined ? err.row + 1 : '?'}: ${err.message}`);
    }
  }

  const headers = result.meta.fields ?? [];
  const rows: ParsedLedgerRow[] = result.data.map((row, i) => ({
    raw: row,
    rowNumber: i + 1,
  }));

  return { headers, rows, errors };
}

/**
 * Parse an Excel file (ArrayBuffer) into raw rows.
 * Uses the first sheet.
 */
export async function parseLedgerExcel(buffer: ArrayBuffer): Promise<{
  headers: string[];
  rows: ParsedLedgerRow[];
  errors: string[];
}> {
  const XLSX = await import('xlsx');
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    return { headers: [], rows: [], errors: ['No sheets found in workbook.'] };
  }

  const sheet = workbook.Sheets[sheetName];
  const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });

  if (jsonData.length === 0) {
    return { headers: [], rows: [], errors: ['Sheet is empty.'] };
  }

  const headers = Object.keys(jsonData[0]);
  const rows: ParsedLedgerRow[] = jsonData.map((row, i) => ({
    raw: Object.fromEntries(Object.entries(row).map(([k, v]) => [k, String(v ?? '')])),
    rowNumber: i + 1,
  }));

  return { headers, rows, errors: [] };
}

// ─── Column Mapping ─────────────────────────────────

/**
 * Auto-detect column mapping from CSV/Excel headers.
 */
export function autoMapLedgerColumns(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {};
  const usedFields = new Set<string>();

  for (const header of headers) {
    const normalized = header.trim().toLowerCase().replace(/[_\s]+/g, ' ').replace(/[#]/g, '');

    let bestMatch: LedgerFieldKey | '' = '';
    let bestScore = 0;

    for (const field of LEDGER_FIELDS) {
      if (usedFields.has(field.key)) continue;

      for (const keyword of field.keywords) {
        // Exact match on normalized header
        if (normalized === keyword) {
          if (bestScore < 10) {
            bestMatch = field.key;
            bestScore = 10;
          }
        }
        // Header contains keyword
        else if (normalized.includes(keyword) && keyword.length > 2) {
          const score = keyword.length; // Longer keyword = more specific = better match
          if (score > bestScore) {
            bestMatch = field.key;
            bestScore = score;
          }
        }
        // Keyword contains header (for short headers like "paid")
        else if (keyword.includes(normalized) && normalized.length > 2) {
          const score = normalized.length * 0.5;
          if (score > bestScore) {
            bestMatch = field.key;
            bestScore = score;
          }
        }
      }
    }

    mapping[header] = bestMatch;
    if (bestMatch) usedFields.add(bestMatch);
  }

  return mapping;
}

// ─── Value Extraction ───────────────────────────────

/**
 * Parse a dollar string like "$42.00" or "42" into cents.
 */
export function parseDollarsToCents(value: string): number {
  if (!value || value.toLowerCase() === 'n/a' || value.toLowerCase() === 'none') return 0;
  const cleaned = value.replace(/[$,\s]/g, '');
  const num = parseFloat(cleaned);
  if (isNaN(num)) return 0;
  return Math.round(num * 100);
}

/**
 * Parse a date string (M/D/YY, M/D/YYYY, YYYY-MM-DD, etc.) into YYYY-MM-DD format.
 */
export function parseDateString(value: string): string | null {
  if (!value || value.toLowerCase() === 'n/a' || value.toLowerCase() === 'none') return null;

  const trimmed = value.trim();

  // Try ISO format first (YYYY-MM-DD)
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;

  // Try M/D/YY or M/D/YYYY
  const slashMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (slashMatch) {
    const month = slashMatch[1].padStart(2, '0');
    const day = slashMatch[2].padStart(2, '0');
    let year = slashMatch[3];
    if (year.length === 2) {
      const num = parseInt(year, 10);
      year = (num >= 50 ? '19' : '20') + year;
    }
    return `${year}-${month}-${day}`;
  }

  // Try Date.parse as fallback
  const d = new Date(trimmed);
  if (!isNaN(d.getTime())) {
    return d.toISOString().split('T')[0];
  }

  return null;
}

/**
 * Apply column mapping to extract mapped values from a raw row.
 */
export function applyMapping(
  row: ParsedLedgerRow,
  mapping: ColumnMapping,
): MatchedRow['mapped'] {
  // Invert mapping: field key -> csv column name
  const fieldToCol: Partial<Record<LedgerFieldKey, string>> = {};
  for (const [csvCol, fieldKey] of Object.entries(mapping)) {
    if (fieldKey) fieldToCol[fieldKey] = csvCol;
  }

  function get(key: LedgerFieldKey): string {
    const col = fieldToCol[key];
    if (!col) return '';
    return (row.raw[col] ?? '').trim();
  }

  // For amountDue: some systems put the remaining balance, not original charge.
  // If amountDue is 0 and amountPaid > 0, the original charge was the amountPaid.
  const rawAmountDue = parseDollarsToCents(get('amountDue'));
  const rawAmountPaid = parseDollarsToCents(get('amountPaid'));
  const status = get('status').toLowerCase();

  // Derive the original invoice amount
  let amountDue = rawAmountDue;
  if (rawAmountDue === 0 && rawAmountPaid > 0 && (status === 'paid' || status === 'complete')) {
    // "Amount Owed" is $0 because it's paid. Original charge = amountPaid
    amountDue = rawAmountPaid;
  } else if (rawAmountDue > 0 && rawAmountPaid > 0) {
    // Partially paid: original amount = owed + paid
    amountDue = rawAmountDue + rawAmountPaid;
  } else if (rawAmountDue > 0 && rawAmountPaid === 0) {
    // Unpaid: amount due is the charge
    amountDue = rawAmountDue;
  }

  return {
    unitIdentifier: get('unitIdentifier'),
    dueDate: parseDateString(get('dueDate')) || '',
    amountDue,
    amountPaid: rawAmountPaid,
    status: get('status'),
    paymentDate: parseDateString(get('paymentDate')),
    invoiceNumber: get('invoiceNumber') || null,
    serviceFee: parseDollarsToCents(get('serviceFee')),
    chargeType: get('chargeType'),
  };
}

// ─── Unit Matching ──────────────────────────────────

export interface UnitRecord {
  id: string;
  unit_number: string;
  address: string | null;
}

export interface MemberRecord {
  id: string;
  unit_id: string | null;
  first_name: string;
  last_name: string;
}

/**
 * Match parsed rows to units using address and name matching.
 * Returns matched rows sorted by confidence (worst first).
 */
export function matchRowsToUnits(
  rows: ParsedLedgerRow[],
  mapping: ColumnMapping,
  units: UnitRecord[],
  members: MemberRecord[],
): MatchedRow[] {
  // Build lookup structures
  const unitsByAddress = new Map<string, UnitRecord>();
  for (const unit of units) {
    if (unit.address) {
      unitsByAddress.set(unit.address.toLowerCase().trim(), unit);
    }
  }

  // Build member name -> unit lookup
  const membersByName = new Map<string, { member: MemberRecord; unitId: string }>();
  for (const m of members) {
    if (m.unit_id) {
      const fullName = normalizeName(`${m.first_name} ${m.last_name}`);
      membersByName.set(fullName, { member: m, unitId: m.unit_id });
    }
  }

  const results: MatchedRow[] = [];

  for (const row of rows) {
    const mapped = applyMapping(row, mapping);
    const identifier = mapped.unitIdentifier;

    if (!identifier) {
      results.push({
        row,
        unitId: null,
        unitLabel: null,
        confidence: 'unmatched',
        score: 0,
        mapped,
      });
      continue;
    }

    // 1. Try exact address match
    const exactUnit = unitsByAddress.get(identifier.toLowerCase().trim());
    if (exactUnit) {
      results.push({
        row,
        unitId: exactUnit.id,
        unitLabel: `Unit ${exactUnit.unit_number}${exactUnit.address ? ` - ${exactUnit.address}` : ''}`,
        confidence: 'exact',
        score: 1.0,
        mapped,
      });
      continue;
    }

    // 2. Try fuzzy address match
    let bestFuzzyUnit: UnitRecord | null = null;
    let bestFuzzyScore = 0;

    for (const unit of units) {
      if (!unit.address) continue;
      const score = compareAddresses(identifier, unit.address);
      if (score > bestFuzzyScore && score >= 0.6) {
        bestFuzzyScore = score;
        bestFuzzyUnit = unit;
      }
    }

    if (bestFuzzyUnit && bestFuzzyScore >= 0.6) {
      results.push({
        row,
        unitId: bestFuzzyUnit.id,
        unitLabel: `Unit ${bestFuzzyUnit.unit_number}${bestFuzzyUnit.address ? ` - ${bestFuzzyUnit.address}` : ''}`,
        confidence: 'fuzzy',
        score: bestFuzzyScore,
        mapped,
      });
      continue;
    }

    // 3. Try member name match
    const normalizedIdentifier = normalizeName(identifier);
    const memberMatch = membersByName.get(normalizedIdentifier);
    if (memberMatch) {
      const unit = units.find((u) => u.id === memberMatch.unitId);
      results.push({
        row,
        unitId: memberMatch.unitId,
        unitLabel: unit
          ? `Unit ${unit.unit_number}${unit.address ? ` - ${unit.address}` : ''}`
          : `Unit (${memberMatch.member.first_name} ${memberMatch.member.last_name})`,
        confidence: 'name',
        score: 0.7,
        mapped,
      });
      continue;
    }

    // 4. Try partial name match (first + last name anywhere in members)
    const nameParts = normalizedIdentifier.split(' ').filter((p) => p.length > 1);
    let bestNameMatch: { member: MemberRecord; unitId: string } | null = null;

    if (nameParts.length >= 2) {
      for (const [, entry] of membersByName) {
        const memberNameNorm = normalizeName(`${entry.member.first_name} ${entry.member.last_name}`);
        // Check if all significant name parts appear in the member name or vice versa
        const partsMatch = nameParts.filter((p) => memberNameNorm.includes(p));
        if (partsMatch.length >= 2) {
          bestNameMatch = entry;
          break;
        }
      }
    }

    if (bestNameMatch) {
      const unit = units.find((u) => u.id === bestNameMatch!.unitId);
      results.push({
        row,
        unitId: bestNameMatch.unitId,
        unitLabel: unit
          ? `Unit ${unit.unit_number}${unit.address ? ` - ${unit.address}` : ''}`
          : `Unit (${bestNameMatch.member.first_name} ${bestNameMatch.member.last_name})`,
        confidence: 'name',
        score: 0.5,
        mapped,
      });
      continue;
    }

    // 5. Unmatched
    results.push({
      row,
      unitId: null,
      unitLabel: null,
      confidence: 'unmatched',
      score: 0,
      mapped,
    });
  }

  // Sort: unmatched first, then fuzzy, then name, then exact
  const confidenceOrder: Record<MatchConfidence, number> = {
    unmatched: 0,
    fuzzy: 1,
    name: 2,
    exact: 3,
  };

  results.sort((a, b) => {
    const confDiff = confidenceOrder[a.confidence] - confidenceOrder[b.confidence];
    if (confDiff !== 0) return confDiff;
    return a.score - b.score;
  });

  return results;
}

// ─── Balance Calculation ────────────────────────────

/**
 * Calculate per-unit balances from matched rows.
 */
export function calculateUnitBalances(matchedRows: MatchedRow[]): UnitBalance[] {
  const balanceMap = new Map<string, UnitBalance>();

  for (const mr of matchedRows) {
    if (!mr.unitId) continue;

    const existing = balanceMap.get(mr.unitId) || {
      unitId: mr.unitId,
      unitLabel: mr.unitLabel || 'Unknown',
      totalCharged: 0,
      totalPaid: 0,
      balance: 0,
      serviceFees: 0,
      rowCount: 0,
    };

    existing.totalCharged += mr.mapped.amountDue;
    existing.totalPaid += mr.mapped.amountPaid;
    existing.serviceFees += mr.mapped.serviceFee;
    existing.rowCount += 1;
    existing.balance = existing.totalCharged - existing.totalPaid;

    balanceMap.set(mr.unitId, existing);
  }

  const balances = Array.from(balanceMap.values());
  // Sort: owing (positive balance) first, then by amount
  balances.sort((a, b) => b.balance - a.balance);
  return balances;
}

// ─── Charge Type Helpers ────────────────────────────

/**
 * Resolve the charge type for a row.
 * Priority: 1) CSV column value (if mapped), 2) amount-based map from review step, 3) default to 'assessment'
 */
export function resolveChargeType(
  row: MatchedRow,
  chargeTypeMap: Record<number, ChargeType>,
): ChargeType {
  // If the CSV had a chargeType column mapped with a value, try to parse it
  if (row.mapped.chargeType) {
    const val = row.mapped.chargeType.toLowerCase();
    if (val.includes('deposit') || val.includes('security')) return 'security_deposit';
    if (val.includes('assessment') || val.includes('due') || val.includes('fee')) return 'assessment';
  }
  // Fall back to amount-based mapping from review step
  const fromAmount = chargeTypeMap[row.mapped.amountDue];
  if (fromAmount) return fromAmount;
  return 'assessment';
}

/**
 * Get distinct charge amounts from matched rows (for the amount-grouping UI).
 * Includes auto-detection: the most common amount is assumed to be monthly dues,
 * and amounts that are clean multiples are flagged as likely assessments.
 */
export function getDistinctAmounts(rows: MatchedRow[]): {
  amount: number;
  count: number;
  /** Whether this amount is likely an assessment (multiple of the base dues amount) */
  likelyAssessment: boolean;
}[] {
  const counts = new Map<number, number>();
  for (const r of rows) {
    if (!r.unitId) continue;
    counts.set(r.mapped.amountDue, (counts.get(r.mapped.amountDue) || 0) + 1);
  }

  const entries = Array.from(counts.entries())
    .map(([amount, count]) => ({ amount, count }))
    .sort((a, b) => b.count - a.count);

  // The most frequent amount is likely the base monthly dues
  const baseAmount = entries.length > 0 ? entries[0].amount : 0;

  return entries.map(({ amount, count }) => ({
    amount,
    count,
    likelyAssessment:
      baseAmount > 0 && amount > 0 && amount % baseAmount === 0,
  }));
}

/**
 * Build a default chargeTypeMap: amounts that are multiples of the base dues default
 * to 'assessment', others are left unset (will show as needing review).
 */
export function buildDefaultChargeTypeMap(
  distinctAmounts: { amount: number; likelyAssessment: boolean }[],
): Record<number, ChargeType> {
  const map: Record<number, ChargeType> = {};
  for (const { amount, likelyAssessment } of distinctAmounts) {
    map[amount] = likelyAssessment ? 'assessment' : 'assessment';
  }
  return map;
}

// ─── Formatting Helpers ─────────────────────────────

export function formatCents(cents: number): string {
  const dollars = Math.abs(cents) / 100;
  const formatted = dollars.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
  return cents < 0 ? `-${formatted}` : formatted;
}

export function confidenceLabel(c: MatchConfidence): string {
  switch (c) {
    case 'exact':
      return 'Exact match';
    case 'fuzzy':
      return 'Fuzzy match';
    case 'name':
      return 'Matched by name';
    case 'unmatched':
      return 'Unmatched';
  }
}

export function confidenceColor(c: MatchConfidence): string {
  switch (c) {
    case 'exact':
      return 'text-green-600 dark:text-green-400';
    case 'fuzzy':
      return 'text-amber-600 dark:text-amber-400';
    case 'name':
      return 'text-yellow-600 dark:text-yellow-400';
    case 'unmatched':
      return 'text-red-600 dark:text-red-400';
  }
}

export function confidenceBg(c: MatchConfidence): string {
  switch (c) {
    case 'exact':
      return 'bg-green-50 dark:bg-green-950/30';
    case 'fuzzy':
      return 'bg-amber-50 dark:bg-amber-950/30';
    case 'name':
      return 'bg-yellow-50 dark:bg-yellow-950/30';
    case 'unmatched':
      return 'bg-red-50 dark:bg-red-950/30';
  }
}
