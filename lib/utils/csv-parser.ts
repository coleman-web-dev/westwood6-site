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
  mailing_address: string;
}

export interface ParsedVendor {
  name: string;
  company: string;
  phone: string;
  email: string;
  category: string;
  license_number: string;
  insurance_expiry: string;
  tax_id: string;
  notes: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  zip: string;
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

    const mailingAddress = (row.mailing_address ?? '').trim();

    data.push({
      first_name: firstName,
      last_name: lastName,
      email,
      unit_number: unitNumber,
      role,
      mailing_address: mailingAddress,
    });
  }

  return { data, errors };
}

/**
 * Known aliases for vendor column headers.
 * Maps various common header names to our canonical field names.
 */
const VENDOR_COLUMN_ALIASES: Record<string, keyof ParsedVendor> = {
  name: 'name',
  vendor_name: 'name',
  vendor: 'name',
  'vendor name': 'name',
  'contact name': 'name',
  contact: 'name',
  company: 'company',
  company_name: 'company',
  'company name': 'company',
  business: 'company',
  'business name': 'company',
  phone: 'phone',
  phone_number: 'phone',
  'phone number': 'phone',
  tel: 'phone',
  telephone: 'phone',
  email: 'email',
  email_address: 'email',
  'email address': 'email',
  category: 'category',
  type: 'category',
  vendor_type: 'category',
  'vendor type': 'category',
  service: 'category',
  'service type': 'category',
  license: 'license_number',
  license_number: 'license_number',
  'license number': 'license_number',
  'license #': 'license_number',
  'license no': 'license_number',
  insurance_expiry: 'insurance_expiry',
  'insurance expiry': 'insurance_expiry',
  'insurance exp': 'insurance_expiry',
  'insurance expiration': 'insurance_expiry',
  tax_id: 'tax_id',
  'tax id': 'tax_id',
  ein: 'tax_id',
  ssn: 'tax_id',
  'ein/ssn': 'tax_id',
  notes: 'notes',
  note: 'notes',
  comments: 'notes',
  description: 'notes',
  address: 'address_line1',
  address_line1: 'address_line1',
  'address line 1': 'address_line1',
  'street address': 'address_line1',
  street: 'address_line1',
  address_line2: 'address_line2',
  'address line 2': 'address_line2',
  suite: 'address_line2',
  apt: 'address_line2',
  city: 'city',
  state: 'state',
  province: 'state',
  zip: 'zip',
  zipcode: 'zip',
  'zip code': 'zip',
  postal: 'zip',
  'postal code': 'zip',
};

/**
 * Auto-detect column mapping from CSV headers.
 * Returns a map of CSV column name -> ParsedVendor field name.
 */
export function autoMapVendorColumns(
  headers: string[],
): Record<string, keyof ParsedVendor | ''> {
  const mapping: Record<string, keyof ParsedVendor | ''> = {};

  for (const header of headers) {
    const normalized = header.trim().toLowerCase().replace(/[_\s]+/g, ' ').replace(/[#]/g, '');
    // Try exact match first, then normalized
    const match =
      VENDOR_COLUMN_ALIASES[header.trim().toLowerCase()] ??
      VENDOR_COLUMN_ALIASES[normalized] ??
      '';
    mapping[header] = match;
  }

  return mapping;
}

/**
 * Parse a CSV string of vendors using the provided column mapping.
 * Returns parsed data and any validation errors.
 */
export function parseVendorsCSV(
  csvString: string,
  columnMapping: Record<string, keyof ParsedVendor | ''>,
): ParseResult<ParsedVendor> {
  const result = Papa.parse<Record<string, string>>(csvString, {
    header: true,
    skipEmptyLines: true,
  });

  const data: ParsedVendor[] = [];
  const errors: string[] = [];

  if (result.errors.length > 0) {
    for (const err of result.errors) {
      errors.push(
        `Row ${err.row !== undefined ? err.row + 1 : '?'}: ${err.message}`,
      );
    }
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // Invert the mapping: field -> csv column name
  const fieldToColumn: Partial<Record<keyof ParsedVendor, string>> = {};
  for (const [csvCol, field] of Object.entries(columnMapping)) {
    if (field) fieldToColumn[field] = csvCol;
  }

  function getField(row: Record<string, string>, field: keyof ParsedVendor): string {
    const col = fieldToColumn[field];
    if (!col) return '';
    return (row[col] ?? '').trim();
  }

  for (let i = 0; i < result.data.length; i++) {
    const row = result.data[i];
    const rowNum = i + 1;

    const name = getField(row, 'name');
    const company = getField(row, 'company');

    if (!name && !company) {
      errors.push(`Row ${rowNum}: Must have at least a "Name" or "Company".`);
      continue;
    }

    const email = getField(row, 'email');
    if (email && !emailRegex.test(email)) {
      errors.push(`Row ${rowNum}: Invalid email format "${email}".`);
      continue;
    }

    data.push({
      // If no name provided, use company as the name
      name: name || company,
      company,
      phone: getField(row, 'phone'),
      email,
      category: getField(row, 'category'),
      license_number: getField(row, 'license_number'),
      insurance_expiry: getField(row, 'insurance_expiry'),
      tax_id: getField(row, 'tax_id'),
      notes: getField(row, 'notes'),
      address_line1: getField(row, 'address_line1'),
      address_line2: getField(row, 'address_line2'),
      city: getField(row, 'city'),
      state: getField(row, 'state'),
      zip: getField(row, 'zip'),
    });
  }

  return { data, errors };
}
