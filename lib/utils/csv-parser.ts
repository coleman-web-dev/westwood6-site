import Papa from 'papaparse';

export interface ParsedUnit {
  unit_number: string;
  address: string;
}

export interface ParsedMember {
  first_name: string;
  last_name: string;
  email: string;
  unit_number: string;
  role: 'owner' | 'member' | 'tenant';
}

export interface ParseResult<T> {
  data: T[];
  errors: string[];
}

const VALID_ROLES = ['owner', 'member', 'tenant'] as const;

/**
 * Parse a CSV string of units. Expected columns: unit_number, address
 * Returns parsed data and any validation errors.
 */
export function parseUnitsCSV(csvString: string): ParseResult<ParsedUnit> {
  const result = Papa.parse<Record<string, string>>(csvString, {
    header: true,
    skipEmptyLines: true,
  });

  const data: ParsedUnit[] = [];
  const errors: string[] = [];

  if (result.errors.length > 0) {
    for (const err of result.errors) {
      errors.push(
        `Row ${err.row !== undefined ? err.row + 1 : '?'}: ${err.message}`,
      );
    }
  }

  for (let i = 0; i < result.data.length; i++) {
    const row = result.data[i];
    const rowNum = i + 1;
    const unitNumber = (row.unit_number ?? '').trim();

    if (!unitNumber) {
      errors.push(`Row ${rowNum}: Missing required field "unit_number".`);
      continue;
    }

    data.push({
      unit_number: unitNumber,
      address: (row.address ?? '').trim(),
    });
  }

  return { data, errors };
}

/**
 * Parse a CSV string of members. Expected columns: first_name, last_name, email, unit_number, role
 * Optionally validate unit_numbers against existing units.
 */
export function parseMembersCSV(
  csvString: string,
  validUnitNumbers?: string[],
): ParseResult<ParsedMember> {
  const result = Papa.parse<Record<string, string>>(csvString, {
    header: true,
    skipEmptyLines: true,
  });

  const data: ParsedMember[] = [];
  const errors: string[] = [];

  if (result.errors.length > 0) {
    for (const err of result.errors) {
      errors.push(
        `Row ${err.row !== undefined ? err.row + 1 : '?'}: ${err.message}`,
      );
    }
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const validUnitSet = validUnitNumbers
    ? new Set(validUnitNumbers.map((u) => u.trim()))
    : null;

  for (let i = 0; i < result.data.length; i++) {
    const row = result.data[i];
    const rowNum = i + 1;

    const firstName = (row.first_name ?? '').trim();
    const lastName = (row.last_name ?? '').trim();
    const email = (row.email ?? '').trim();
    const unitNumber = (row.unit_number ?? '').trim();
    const rawRole = (row.role ?? '').trim().toLowerCase();

    if (!firstName) {
      errors.push(`Row ${rowNum}: Missing required field "first_name".`);
      continue;
    }

    if (!lastName) {
      errors.push(`Row ${rowNum}: Missing required field "last_name".`);
      continue;
    }

    if (email && !emailRegex.test(email)) {
      errors.push(`Row ${rowNum}: Invalid email format "${email}".`);
      continue;
    }

    const role: ParsedMember['role'] =
      VALID_ROLES.includes(rawRole as (typeof VALID_ROLES)[number])
        ? (rawRole as ParsedMember['role'])
        : 'owner';

    if (rawRole && !VALID_ROLES.includes(rawRole as (typeof VALID_ROLES)[number])) {
      errors.push(
        `Row ${rowNum}: Invalid role "${rawRole}", defaulting to "owner".`,
      );
    }

    if (validUnitSet && unitNumber && !validUnitSet.has(unitNumber)) {
      errors.push(
        `Row ${rowNum}: Unit number "${unitNumber}" does not match any known unit.`,
      );
    }

    data.push({
      first_name: firstName,
      last_name: lastName,
      email,
      unit_number: unitNumber,
      role,
    });
  }

  return { data, errors };
}
