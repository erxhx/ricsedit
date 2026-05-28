#!/usr/bin/env node
/**
 * Import Acuity Scheduling appointment export → Supabase
 *
 * Usage:
 *   node scripts/import-acuity.mjs path/to/acuity-export.csv
 *   node scripts/import-acuity.mjs path/to/acuity-export.csv --confirm
 *
 * Runs in DRY-RUN mode by default (prints a preview, inserts nothing).
 * Pass --confirm to actually write to the database.
 *
 * ── SETUP ─────────────────────────────────────────────────────────────────────
 * 1. In Acuity: Reports → Appointments → Export → CSV
 *    (make sure "Include client info" and "Include notes" are checked)
 * 2. Make sure .env.local is present with SUPABASE_URL + SUPABASE_SECRET_KEY
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * ── CALENDAR → STAFF MAPPING ─────────────────────────────────────────────────
 * Edit CALENDAR_MAP below so each Acuity calendar name maps to 'eric' or 'livi'.
 * Keys are matched case-insensitively. Use 'eric' as the fallback if unsure.
 */

import { createClient } from '@supabase/supabase-js';
import { createHash, randomBytes } from 'crypto';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// ── Config ────────────────────────────────────────────────────────────────────

/** Map your Acuity calendar name(s) → staff ID. Case-insensitive. */
const CALENDAR_MAP = {
  'eric':  'eric',
  'livi':  'livi',
  'livia': 'livi',
  // add more as needed, e.g. "edit studio": "eric"
};

/** Fallback staff if the calendar name isn't in CALENDAR_MAP */
const DEFAULT_STAFF = 'eric';

// ── Load .env.local manually (no dotenv dep required) ─────────────────────────

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '../.env.local');
let envText = '';
try { envText = readFileSync(envPath, 'utf8'); } catch {}
for (const line of envText.split('\n')) {
  const m = line.match(/^([^#=\s]+)\s*=\s*(.*)/);
  if (m) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SECRET_KEY in .env.local');
  process.exit(1);
}

// ── CLI args ──────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const csvPath = args.find(a => !a.startsWith('--'));
const DRY_RUN = !args.includes('--confirm');

if (!csvPath) {
  console.error('Usage: node scripts/import-acuity.mjs <file.csv> [--confirm]');
  process.exit(1);
}

// ── CSV parser (handles quoted fields with embedded commas/newlines) ───────────

function parseCSV(text) {
  const rows = [];
  let i = 0;
  const n = text.length;

  while (i < n) {
    const row = [];
    // skip leading \r\n between rows
    while (i < n && (text[i] === '\r' || text[i] === '\n')) i++;
    if (i >= n) break;

    while (i < n) {
      if (text[i] === '"') {
        // quoted field
        i++; // skip opening quote
        let field = '';
        while (i < n) {
          if (text[i] === '"' && text[i + 1] === '"') {
            field += '"'; i += 2;
          } else if (text[i] === '"') {
            i++; break; // closing quote
          } else {
            field += text[i++];
          }
        }
        row.push(field);
        if (i < n && text[i] === ',') i++;
      } else {
        // unquoted field — ends at comma or newline
        let field = '';
        while (i < n && text[i] !== ',' && text[i] !== '\r' && text[i] !== '\n') {
          field += text[i++];
        }
        row.push(field.trim());
        if (i < n && text[i] === ',') i++;
      }
      // end of row?
      if (i >= n || text[i] === '\r' || text[i] === '\n') break;
    }
    if (row.length) rows.push(row);
  }
  return rows;
}

// ── Date/time parsers ─────────────────────────────────────────────────────────

/**
 * Parse Acuity date strings to YYYY-MM-DD.
 * Handles: "April 3, 2024"  "4/3/2024"  "2024-04-03"
 */
function parseDate(raw) {
  raw = raw.trim();
  // Already ISO
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

  // "Month D, YYYY"
  const longM = raw.match(/^(\w+)\s+(\d{1,2}),?\s+(\d{4})$/);
  if (longM) {
    const d = new Date(`${longM[1]} ${longM[2]}, ${longM[3]}`);
    if (!isNaN(d)) return d.toISOString().slice(0, 10);
  }

  // "M/D/YYYY" or "M-D-YYYY"
  const shortM = raw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (shortM) {
    const d = new Date(`${shortM[3]}-${shortM[1].padStart(2,'0')}-${shortM[2].padStart(2,'0')}`);
    if (!isNaN(d)) return d.toISOString().slice(0, 10);
  }

  return null;
}

/**
 * Parse Acuity time strings to HH:MM:SS.
 * Handles: "10:00am"  "10:00 AM"  "14:00"  "2:30pm"
 */
function parseTime(raw) {
  raw = raw.trim().toLowerCase().replace(/\s/g, '');
  const m = raw.match(/^(\d{1,2}):(\d{2})(am|pm)?$/);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = m[2];
  const meridiem = m[3];
  if (meridiem === 'pm' && h !== 12) h += 12;
  if (meridiem === 'am' && h === 12) h = 0;
  return `${String(h).padStart(2,'0')}:${min}:00`;
}

/** Add durationMinutes to a HH:MM:SS time string */
function addMinutes(timeStr, minutes) {
  const [h, m] = timeStr.split(':').map(Number);
  const total = h * 60 + m + minutes;
  return `${String(Math.floor(total / 60) % 24).padStart(2,'0')}:${String(total % 60).padStart(2,'0')}:00`;
}

/** Deterministic manage token from appointment id (matches the app's makeToken) */
function makeToken(id) {
  return createHash('sha256').update(`edit-studio-manage-${id}`).digest('hex').slice(0, 24);
}

/** Fallback: random token for rows we can't derive an id for in advance */
function randomToken() {
  return randomBytes(12).toString('hex');
}

// ── Map staff ─────────────────────────────────────────────────────────────────

function mapStaff(calendarName) {
  if (!calendarName) return DEFAULT_STAFF;
  const key = calendarName.toLowerCase().trim();
  for (const [k, v] of Object.entries(CALENDAR_MAP)) {
    if (key.includes(k.toLowerCase())) return v;
  }
  return DEFAULT_STAFF;
}

// ── Main ──────────────────────────────────────────────────────────────────────

const raw = readFileSync(resolve(process.cwd(), csvPath), 'utf8').replace(/^﻿/, ''); // strip BOM
const rows = parseCSV(raw);
if (rows.length < 2) {
  console.error('CSV appears empty or has no data rows.');
  process.exit(1);
}

const headers = rows[0].map(h => h.trim().toLowerCase());
console.log(`\nDetected columns: ${headers.join(' | ')}\n`);

// Column index helper
const col = (names) => {
  for (const name of names) {
    const idx = headers.indexOf(name.toLowerCase());
    if (idx !== -1) return idx;
  }
  return -1;
};

const idxFirstName    = col(['first name', 'firstname']);
const idxLastName     = col(['last name', 'lastname']);
const idxEmail        = col(['email']);
const idxPhone        = col(['phone', 'phone number']);
const idxDate         = col(['date', 'appointment date']);
const idxTime         = col(['time', 'start time', 'appointment time']);
const idxEndTime      = col(['end time', 'endtime']);
const idxDuration     = col(['duration', 'duration (mins)', 'duration (minutes)']);
const idxService      = col(['type', 'appointment type', 'service']);
const idxCalendar     = col(['calendar', 'staff', 'provider']);
const idxPrice        = col(['price', 'amount', 'cost']);
const idxPaid         = col(['paid', 'amount paid', 'payment']);
const idxCancelled    = col(['cancelled', 'canceled', 'cancelled?', 'canceled?']);
const idxNotes        = col(['notes', 'intake form', 'client notes', 'appointment notes']);

// Warn about missing critical columns
const criticalMissing = [];
if (idxDate === -1)      criticalMissing.push('Date');
if (idxTime === -1)      criticalMissing.push('Time');
if (idxFirstName === -1 && col(['name', 'client name', 'full name']) === -1)
  criticalMissing.push('First Name / Name');
if (criticalMissing.length) {
  console.error(`Missing critical columns: ${criticalMissing.join(', ')}`);
  console.error('Check your Acuity export settings.');
  process.exit(1);
}

// ── Parse rows ────────────────────────────────────────────────────────────────

const records = [];
const errors = [];

for (let r = 1; r < rows.length; r++) {
  const row = rows[r];
  if (row.length < 3) continue; // skip blank lines

  const get = (idx) => (idx !== -1 && row[idx] != null ? row[idx].trim() : '');

  // Client name
  let clientName;
  if (idxFirstName !== -1) {
    const first = get(idxFirstName);
    const last  = idxLastName !== -1 ? get(idxLastName) : '';
    clientName = [first, last].filter(Boolean).join(' ');
  } else {
    const nameIdx = col(['name', 'client name', 'full name']);
    clientName = get(nameIdx);
  }

  const dateRaw  = get(idxDate);
  const timeRaw  = get(idxTime);
  const date     = parseDate(dateRaw);
  const startTime = parseTime(timeRaw);

  if (!date || !startTime) {
    errors.push(`Row ${r + 1}: could not parse date="${dateRaw}" or time="${timeRaw}" — skipped`);
    continue;
  }

  // End time: prefer explicit end time column, fall back to start + duration
  let endTime = null;
  const endTimeRaw = get(idxEndTime);
  if (endTimeRaw) endTime = parseTime(endTimeRaw);

  const durationRaw = get(idxDuration);
  const durationMinutes = durationRaw ? parseInt(durationRaw, 10) : 30;

  if (!endTime && startTime) {
    endTime = addMinutes(startTime, isNaN(durationMinutes) ? 30 : durationMinutes);
  }

  const cancelledRaw = get(idxCancelled).toLowerCase();
  const isCancelled  = ['yes', 'true', '1', 'cancelled', 'canceled'].includes(cancelledRaw);

  const priceRaw = get(idxPrice).replace(/[$,]/g, '');
  const price = priceRaw ? parseFloat(priceRaw) : 0;

  records.push({
    date,
    start_time:       startTime,
    end_time:         endTime,
    staff:            mapStaff(get(idxCalendar)),
    client_name:      clientName || '(unknown)',
    client_email:     get(idxEmail) || null,
    client_phone:     get(idxPhone) || null,
    service:          get(idxService) || 'Haircut',
    duration_minutes: isNaN(durationMinutes) ? 30 : durationMinutes,
    price:            isNaN(price) ? 0 : price,
    status:           isCancelled ? 'cancelled' : 'completed',
    notes:            get(idxNotes) || null,
    // manage_token inserted after we get the DB-assigned id
  });
}

// ── Report ────────────────────────────────────────────────────────────────────

console.log(`Parsed ${records.length} appointments from ${rows.length - 1} CSV rows.`);
if (errors.length) {
  console.log(`\nSkipped rows (${errors.length}):`);
  errors.forEach(e => console.log(`  ⚠ ${e}`));
}

if (records.length === 0) {
  console.log('\nNothing to import.');
  process.exit(0);
}

// Preview table
console.log('\nPreview (first 10 rows):');
console.log('─'.repeat(100));
console.log(
  'Date'.padEnd(12) +
  'Start'.padEnd(8) +
  'Staff'.padEnd(7) +
  'Client'.padEnd(22) +
  'Service'.padEnd(22) +
  'Price'.padEnd(8) +
  'Status',
);
console.log('─'.repeat(100));
for (const r of records.slice(0, 10)) {
  console.log(
    r.date.padEnd(12) +
    r.start_time.slice(0,5).padEnd(8) +
    r.staff.padEnd(7) +
    r.client_name.slice(0, 20).padEnd(22) +
    r.service.slice(0, 20).padEnd(22) +
    `$${r.price.toFixed(2)}`.padEnd(8) +
    r.status,
  );
}
if (records.length > 10) console.log(`  … and ${records.length - 10} more`);
console.log('─'.repeat(100));

// Staff breakdown
const byStaff = records.reduce((acc, r) => { acc[r.staff] = (acc[r.staff] || 0) + 1; return acc; }, {});
console.log('\nStaff breakdown:', Object.entries(byStaff).map(([k,v]) => `${k}: ${v}`).join(', '));

const byStatus = records.reduce((acc, r) => { acc[r.status] = (acc[r.status] || 0) + 1; return acc; }, {});
console.log('Status breakdown:', Object.entries(byStatus).map(([k,v]) => `${k}: ${v}`).join(', '));

if (DRY_RUN) {
  console.log('\n✓ DRY RUN complete — no data written.');
  console.log('  Re-run with --confirm to import:\n');
  console.log(`  node scripts/import-acuity.mjs "${csvPath}" --confirm\n`);
  process.exit(0);
}

// ── Insert ────────────────────────────────────────────────────────────────────

console.log(`\nInserting ${records.length} rows into Supabase…`);
const db = createClient(SUPABASE_URL, SUPABASE_KEY);

const BATCH = 100;
let inserted = 0;
let failed = 0;

for (let i = 0; i < records.length; i += BATCH) {
  const batch = records.slice(i, i + BATCH);
  const { data, error } = await db.from('appointments').insert(batch).select('id');

  if (error) {
    console.error(`  ✗ Batch ${i}–${i + batch.length}: ${error.message}`);
    failed += batch.length;
    continue;
  }

  // Back-fill manage_token using the DB-assigned id
  if (data && data.length) {
    const updates = data.map(r => ({ id: r.id, manage_token: makeToken(String(r.id)) }));
    for (const u of updates) {
      await db.from('appointments').update({ manage_token: u.manage_token }).eq('id', u.id);
    }
  }

  inserted += batch.length;
  process.stdout.write(`  ✓ ${inserted}/${records.length}\r`);
}

console.log(`\n\nDone. ${inserted} inserted, ${failed} failed.`);
if (failed) console.log('  Check error messages above — failed rows were not imported.');
