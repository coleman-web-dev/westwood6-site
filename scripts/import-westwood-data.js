#!/usr/bin/env node
/**
 * Import Westwood Community Six Real Data
 *
 * Parses household and member CSVs exported from Membershine/HOA Start
 * and generates SQL to import into DuesIQ.
 *
 * Usage:  node scripts/import-westwood-data.js
 * Output: supabase/import-westwood-data.sql
 *
 * CSV files expected at:
 *   ~/Downloads/housholds-Cory.csv  (all 329 homes)
 *   ~/Downloads/Members-Cory.csv    (signed-up members)
 */

const fs = require('fs');
const path = require('path');

// ============================================================
// CSV Parser - handles quoted fields with embedded newlines
// ============================================================

function parseCSV(content) {
  const records = [];
  let headers = null;
  let currentRecord = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const nextChar = content[i + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        currentField += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        currentRecord.push(currentField.trim());
        currentField = '';
      } else if (char === '\n' || (char === '\r' && nextChar === '\n')) {
        currentRecord.push(currentField.trim());
        currentField = '';

        if (char === '\r') i++;

        if (!headers) {
          headers = currentRecord;
        } else if (currentRecord.length > 0 && currentRecord.some((f) => f)) {
          const obj = {};
          headers.forEach((h, idx) => {
            obj[h] = currentRecord[idx] || '';
          });
          records.push(obj);
        }
        currentRecord = [];
      } else {
        currentField += char;
      }
    }
  }

  // Handle last record without trailing newline
  if (currentField || currentRecord.length > 0) {
    currentRecord.push(currentField.trim());
    if (headers && currentRecord.length > 0 && currentRecord.some((f) => f)) {
      const obj = {};
      headers.forEach((h, idx) => {
        obj[h] = currentRecord[idx] || '';
      });
      records.push(obj);
    }
  }

  return records;
}

// ============================================================
// Address Normalization
// ============================================================

function normalizeAddress(addr) {
  if (!addr) return '';
  return addr
    .toLowerCase()
    .replace(/\./g, '')
    .replace(/,/g, '')
    .replace(/\s+/g, ' ')
    .replace(/(\d+)(st|nd|rd|th)\b/g, '$1') // 83rd -> 83, 101st -> 101
    .replace(/\bnorthwest\b/gi, 'nw')
    .replace(/\bstreet\b/gi, 'st')
    .replace(/\bavenue\b/gi, 'ave')
    .replace(/\bterrace\b/gi, 'ter')
    .replace(/\bdrive\b/gi, 'dr')
    .replace(/\bcourt\b/gi, 'ct')
    .replace(/\blane\b/gi, 'ln')
    .replace(/\bway\b/gi, 'way')
    .trim();
}

// Extract direction + street number pattern (e.g., "nw 83" from "10204 nw 83rd st")
function extractDirStreet(normalizedAddr) {
  const match = normalizedAddr.match(/\b(nw|ne|sw|se)\s+(\d+)/);
  return match ? `${match[1]} ${match[2]}` : null;
}

function extractHouseNumber(addr) {
  if (!addr) return '';
  const match = addr.match(/^(\d+)/);
  return match ? match[1] : '';
}

// ============================================================
// SQL Helpers
// ============================================================

function escapeSQL(str) {
  if (str === null || str === undefined || str === '') return 'NULL';
  return `'${String(str).replace(/'/g, "''")}'`;
}

function cleanPhone(phone) {
  if (!phone) return null;
  // Remove everything except digits
  let cleaned = phone.replace(/[^\d]/g, '');
  // Remove leading 1 (country code) if 11 digits
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    cleaned = cleaned.substring(1);
  }
  // Must be at least 10 digits for a valid US number
  if (cleaned.length < 10) return null;
  if (cleaned.length > 10) return null; // too many digits, malformed
  // Format as XXX-XXX-XXXX
  return `${cleaned.substring(0, 3)}-${cleaned.substring(3, 6)}-${cleaned.substring(6)}`;
}

function cleanEmail(email) {
  if (!email) return null;
  return email.toLowerCase().trim();
}

function cleanName(name) {
  if (!name) return '';
  // Remove trailing commas and extra spaces
  return name.replace(/,\s*$/, '').trim();
}

// ============================================================
// Main Import Logic
// ============================================================

// File paths
const homeDir = process.env.USERPROFILE || process.env.HOME;
const householdsPath = path.join(homeDir, 'Downloads', 'housholds-Cory.csv');
const membersPath = path.join(homeDir, 'Downloads', 'Members-Cory.csv');
const outputPath = path.join(__dirname, '..', 'supabase', 'import-westwood-data.sql');

// Read files
console.log('Reading CSV files...');
const householdsContent = fs.readFileSync(householdsPath, 'utf-8');
const membersContent = fs.readFileSync(membersPath, 'utf-8');

// Parse CSVs
console.log('Parsing households...');
const households = parseCSV(householdsContent);
console.log(`  Found ${households.length} household records`);

console.log('Parsing members...');
const memberRecords = parseCSV(membersContent);
console.log(`  Found ${memberRecords.length} member records`);

// ============================================================
// Step 1: Build units from households
// ============================================================

const unitsByLot = new Map(); // lot -> [unit objects]
const units = [];

for (const hh of households) {
  const lot = (hh['Lot Number'] || '').trim();
  const addressLine1 = (hh['Address Line 1'] || '').trim();
  const city = (hh['City'] || 'Tamarac').trim().replace(/\s+$/, '');
  const state = (hh['State'] || 'Florida').trim();
  const zip = (hh['ZIP'] || '33321').trim();
  const accessType = (hh['Access Type'] || 'Owner').trim();
  const labels = (hh['Labels'] || 'monthly').trim().toLowerCase();
  const title = cleanName(hh['Household Title'] || '');
  const mailingAddr = (hh['Mailing Address'] || '').trim();

  if (!lot) continue;

  // Map payment frequency
  let paymentFreq = 'monthly';
  if (labels === 'annual') paymentFreq = 'annual';
  else if (labels === 'semi-annual') paymentFreq = 'semi_annual';
  else if (labels === 'quarterly') paymentFreq = 'quarterly';

  // Build full address
  const stateAbbrev = state === 'Florida' ? 'FL' : state;
  const fullAddress = `${addressLine1}, ${city}, ${stateAbbrev} ${zip}`;

  const unit = {
    lot,
    unitNumber: lot, // may be modified for duplicates
    addressLine1,
    fullAddress,
    normalizedAddress: normalizeAddress(addressLine1),
    houseNumber: extractHouseNumber(addressLine1),
    paymentFrequency: paymentFreq,
    accessType,
    householdTitle: title,
    mailingAddress: mailingAddr,
    members: [],
  };

  if (!unitsByLot.has(lot)) {
    unitsByLot.set(lot, []);
  }
  unitsByLot.get(lot).push(unit);
  units.push(unit);
}

// Handle duplicate lot numbers by appending A/B suffix
let dupPairs = 0;
for (const [lot, lotUnits] of unitsByLot) {
  if (lotUnits.length > 1) {
    dupPairs++;
    // Sort by house number for consistency
    lotUnits.sort(
      (a, b) => parseInt(a.houseNumber || '0') - parseInt(b.houseNumber || '0')
    );
    lotUnits.forEach((u, idx) => {
      const suffix = String.fromCharCode(65 + idx); // A, B, C...
      u.unitNumber = `${lot}${suffix}`;
    });
  }
}
console.log(
  `\nUnit processing:`
);
console.log(`  Total units: ${units.length}`);
console.log(`  Unique lot numbers: ${unitsByLot.size}`);
console.log(
  `  Duplicate lots (duplexes): ${dupPairs} pairs (${dupPairs * 2} units)`
);

// ============================================================
// Step 2: Map members to units
// ============================================================

// Build a lookup: normalized address -> unit (for fallback matching)
const unitsByAddress = new Map();
for (const u of units) {
  const key = `${u.houseNumber}-${u.normalizedAddress}`;
  unitsByAddress.set(key, u);
}

let matchedCount = 0;
let unmatchedMembers = [];

for (const m of memberRecords) {
  const lot = (m['Lot #'] || '').trim();
  const memberAddr = normalizeAddress(m['Address Line 1'] || '');
  const memberHouseNum = extractHouseNumber(m['Address Line 1'] || '');

  let matched = false;

  // Strategy 1: Exact lot number match
  if (unitsByLot.has(lot)) {
    const lotUnits = unitsByLot.get(lot);
    if (lotUnits.length === 1) {
      // Single unit for this lot, direct match
      lotUnits[0].members.push(m);
      matched = true;
    } else {
      // Multiple units share this lot, use house number to disambiguate
      let bestMatch = null;
      for (const u of lotUnits) {
        if (memberHouseNum && memberHouseNum === u.houseNumber) {
          bestMatch = u;
          break;
        }
      }
      if (bestMatch) {
        bestMatch.members.push(m);
        matched = true;
      } else {
        // Fallback: assign to first unit
        lotUnits[0].members.push(m);
        matched = true;
      }
    }
  }

  // Strategy 2: Address-based matching (for mismatched lot numbers)
  // Uses house number + direction/street pattern (e.g., "nw 83") to handle
  // cases where lot numbers differ between CSVs but addresses match
  if (!matched && memberHouseNum) {
    const memberDirStreet = extractDirStreet(memberAddr);

    for (const u of units) {
      if (memberHouseNum === u.houseNumber) {
        // First try: exact street comparison
        const memberStreet = memberAddr.replace(/^\d+\s*/, '').substring(0, 15);
        const unitStreet = u.normalizedAddress
          .replace(/^\d+\s*/, '')
          .substring(0, 15);
        if (memberStreet && unitStreet && memberStreet === unitStreet) {
          u.members.push(m);
          matched = true;
          break;
        }
        // Second try: direction + street number match (handles "83 St" vs "83rd Street")
        if (!matched && memberDirStreet) {
          const unitDirStreet = extractDirStreet(u.normalizedAddress);
          if (unitDirStreet && memberDirStreet === unitDirStreet) {
            u.members.push(m);
            matched = true;
            break;
          }
        }
      }
    }
  }

  if (matched) {
    matchedCount++;
  } else {
    unmatchedMembers.push(m);
  }
}

console.log(`\nMember mapping:`);
console.log(`  Matched: ${matchedCount}/${memberRecords.length}`);
console.log(`  Unmatched: ${unmatchedMembers.length}`);

if (unmatchedMembers.length > 0) {
  console.log(`\n  Unmatched members (will be listed in SQL comments):`);
  for (const m of unmatchedMembers) {
    console.log(
      `    ${m['First Name']} ${m['Last Name']} - Lot: ${m['Lot #']} - ${m['Address Line 1']}`
    );
  }
}

// Count units with and without members
const unitsWithMembers = units.filter((u) => u.members.length > 0).length;
const unitsWithoutMembers = units.filter((u) => u.members.length === 0).length;
console.log(`\n  Units with members: ${unitsWithMembers}`);
console.log(`  Units without members: ${unitsWithoutMembers}`);

// ============================================================
// Step 3: Generate SQL
// ============================================================

let totalMembersInserted = 0;

let sql = `-- ============================================================
-- DuesIQ - Import Westwood Community Six Real Data
-- ============================================================
-- Generated: ${new Date().toISOString().split('T')[0]}
--
-- Source files:
--   housholds-Cory.csv  (${households.length} households)
--   Members-Cory.csv    (${memberRecords.length} members)
--
-- Run AFTER cleanup-seed-data.sql has cleared test data.
-- ============================================================

BEGIN;

DO $$
DECLARE
  v_community_id UUID;
  v_unit_id UUID;
BEGIN
  -- Get the existing Westwood 6 community
  SELECT id INTO v_community_id FROM communities WHERE slug = 'westwood6';

  IF v_community_id IS NULL THEN
    RAISE EXCEPTION 'Community westwood6 not found. Create the community first.';
  END IF;

  RAISE NOTICE 'Importing Westwood 6 data for community: %', v_community_id;
  RAISE NOTICE 'Creating ${units.length} units and ${matchedCount} members...';

`;

// Generate unit + member inserts
for (const unit of units) {
  // Unit comment header
  sql += `  -- ================================================================\n`;
  sql += `  -- Unit ${unit.unitNumber}: ${unit.householdTitle} (${unit.accessType})\n`;
  sql += `  -- ${unit.fullAddress}\n`;
  if (unit.paymentFrequency !== 'monthly') {
    sql += `  -- Payment: ${unit.paymentFrequency}\n`;
  }
  if (unit.mailingAddress) {
    sql += `  -- Mailing: ${unit.mailingAddress.replace(/\n/g, ', ')}\n`;
  }
  sql += `  -- Members: ${unit.members.length}\n`;
  sql += `  -- ================================================================\n`;

  sql += `  INSERT INTO units (id, community_id, unit_number, address, status, payment_frequency)\n`;
  sql += `  VALUES (gen_random_uuid(), v_community_id, ${escapeSQL(unit.unitNumber)}, ${escapeSQL(unit.fullAddress)}, 'active', ${escapeSQL(unit.paymentFrequency)})\n`;
  sql += `  RETURNING id INTO v_unit_id;\n\n`;

  // Insert members for this unit
  if (unit.members.length > 0) {
    // Sort members: try to put the one matching household title first
    unit.members.sort((a, b) => {
      const aLast = (a['Last Name'] || '').toLowerCase();
      const bLast = (b['Last Name'] || '').toLowerCase();
      const titleLower = unit.householdTitle.toLowerCase();

      const aMatch = titleLower.includes(aLast) || aLast.includes(titleLower);
      const bMatch = titleLower.includes(bLast) || bLast.includes(titleLower);

      if (aMatch && !bMatch) return -1;
      if (!aMatch && bMatch) return 1;
      return 0;
    });

    for (let i = 0; i < unit.members.length; i++) {
      const m = unit.members[i];
      const firstName = cleanName(m['First Name'] || '');
      const lastName = cleanName(m['Last Name'] || '');
      const email = cleanEmail(m['Email Address']);
      const phone = cleanPhone(m['Phone Number']);

      // First member is owner/tenant, rest are members
      let memberRole = 'member';
      if (i === 0) {
        memberRole =
          unit.accessType.toLowerCase() === 'renter' ? 'tenant' : 'owner';
      }

      sql += `  INSERT INTO members (id, community_id, unit_id, first_name, last_name, email, phone, member_role, system_role, is_approved)\n`;
      sql += `  VALUES (gen_random_uuid(), v_community_id, v_unit_id, ${escapeSQL(firstName)}, ${escapeSQL(lastName)}, ${email ? escapeSQL(email) : 'NULL'}, ${phone ? escapeSQL(phone) : 'NULL'}, '${memberRole}', 'resident', true);\n`;

      totalMembersInserted++;
    }
  }

  sql += '\n';
}

// Unmatched members section
if (unmatchedMembers.length > 0) {
  sql += `  -- ================================================================\n`;
  sql += `  -- UNMATCHED MEMBERS (could not map to a unit)\n`;
  sql += `  -- Review these manually and assign to correct units\n`;
  sql += `  -- ================================================================\n`;
  for (const m of unmatchedMembers) {
    sql += `  -- ${m['First Name']} ${m['Last Name']} | ${m['Email Address']} | Lot: ${m['Lot #']} | ${m['Address Line 1']}\n`;
  }
  sql += '\n';
}

// Summary
sql += `  -- ================================================================\n`;
sql += `  -- IMPORT SUMMARY\n`;
sql += `  -- ================================================================\n`;
sql += `  -- Total units created:   ${units.length}\n`;
sql += `  -- Total members created: ${totalMembersInserted}\n`;
sql += `  -- Unmatched members:     ${unmatchedMembers.length}\n`;
sql += `  -- Units without members: ${unitsWithoutMembers}\n`;
sql += `  -- Duplicate lot pairs:   ${dupPairs}\n`;
sql += `  -- ================================================================\n\n`;
sql += `  RAISE NOTICE 'Import complete!';\n`;
sql += `  RAISE NOTICE '  Units created:   ${units.length}';\n`;
sql += `  RAISE NOTICE '  Members created: ${totalMembersInserted}';\n`;

if (unmatchedMembers.length > 0) {
  sql += `  RAISE NOTICE '  Unmatched members: ${unmatchedMembers.length} (see SQL comments)';\n`;
}

sql += `\nEND $$;\n\nCOMMIT;\n`;

// Write output
fs.writeFileSync(outputPath, sql, 'utf-8');
console.log(`\n========================================`);
console.log(`SQL written to: ${outputPath}`);
console.log(`  Units: ${units.length}`);
console.log(`  Members: ${totalMembersInserted}`);
console.log(`========================================`);
