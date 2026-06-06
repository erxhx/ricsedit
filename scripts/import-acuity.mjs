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

const MONTH_NAMES = {
  january:1, february:2, march:3, april:4, may:5, june:6,
  july:7, august:8, september:9, october:10, november:11, december:12,
};

/**
 * Parse an Acuity datetime string to { date: "YYYY-MM-DD", time: "HH:MM:SS" }.
 * Handles combined: "October 7, 2025 6:20 pm"
 * Also handles standalone date strings: "April 3, 2024" "4/3/2024" "2024-04-03"
 */
function parseDateTime(raw) {
  raw = raw.trim();

  // Combined "Month D, YYYY H:MM am/pm"
  const combined = raw.match(/^(\w+)\s+(\d{1,2}),?\s+(\d{4})\s+(\d{1,2}):(\d{2})\s*(am|pm)$/i);
  if (combined) {
    const mon = MONTH_NAMES[combined[1].toLowerCase()];
    if (!mon) return null;
    let h = parseInt(combined[4], 10);
    const min = combined[5];
    const mer = combined[6].toLowerCase();
    if (mer === 'pm' && h !== 12) h += 12;
    if (mer === 'am' && h === 12) h = 0;
    return {
      date: `${combined[3]}-${String(mon).padStart(2,'0')}-${String(combined[2]).padStart(2,'0')}`,
      time: `${String(h).padStart(2,'0')}:${min}:00`,
    };
  }

  // Standalone date only — fallback
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return { date: raw, time: null };
  const longM = raw.match(/^(\w+)\s+(\d{1,2}),?\s+(\d{4})$/);
  if (longM) {
    const d = new Date(`${longM[1]} ${longM[2]}, ${longM[3]}`);
    if (!isNaN(d)) return { date: d.toISOString().slice(0, 10), time: null };
  }
  const shortM = raw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (shortM) {
    const d = new Date(`${shortM[3]}-${shortM[1].padStart(2,'0')}-${shortM[2].padStart(2,'0')}`);
    if (!isNaN(d)) return { date: d.toISOString().slice(0, 10), time: null };
  }

  return null;
}

/**
 * Parse a standalone time string to HH:MM:SS.
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
// Note: Acuity embeds date+time together in "Start Time" — no separate Date column needed.
const criticalMissing = [];
if (idxTime === -1)      criticalMissing.push('Start Time');
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

  const startRaw  = get(idxTime);
  const startParsed = parseDateTime(startRaw);
  const date      = startParsed?.date ?? null;
  const startTime = startParsed?.time ?? null;

  if (!date || !startTime) {
    errors.push(`Row ${r + 1}: could not parse start time="${startRaw}" — skipped`);
    continue;
  }

  // End time: prefer explicit end time column, fall back to start + duration
  let endTime = null;
  const endTimeRaw = get(idxEndTime);
  if (endTimeRaw) {
    const endParsed = parseDateTime(endTimeRaw);
    endTime = endParsed?.time ?? parseTime(endTimeRaw);
  }

  const durationRaw = get(idxDuration);
  const durationMinutes = durationRaw ? parseInt(durationRaw, 10) : 30;

  if (!endTime && startTime) {
    endTime = addMinutes(startTime, isNaN(durationMinutes) ? 30 : durationMinutes);
  }

  // Acuity puts a date string in Canceled when cancelled, or leaves it empty
  const cancelledRaw = get(idxCancelled).toLowerCase();
  const isCancelled  = cancelledRaw !== '' && cancelledRaw !== 'no' && cancelledRaw !== 'false' && cancelledRaw !== '0';

  const priceRaw = get(idxPrice).replace(/[$,]/g, '');
  const price = priceRaw ? parseFloat(priceRaw) : 0;

  records.push({
    date,
    start_time:       startTime,
    end_time:         endTime,
    staff:            mapStaff(get(idxCalendar)),
    client_name:      clientName || '(unknown)',
    client_email:     get(idxEmail) || '',  // empty string satisfies NOT NULL for rows with no email
    client_phone:     get(idxPhone).replace(/^'+/, '') || '',  // Acuity prefixes with ' to stop Excel formula parsing
    service:          get(idxService) || 'Haircut',
    duration_minutes: isNaN(durationMinutes) ? 30 : durationMinutes,
    price:            isNaN(price) ? 0 : price,
    status:           isCancelled ? 'cancelled' : 'confirmed',
    reminder_sent:    true,  // suppress automated reminders for all imported Acuity records
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
// Node 20 has no native WebSocket — disable realtime so the client doesn't try to init it
const db = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth:     { persistSession: false },
  realtime: { transport: class DummyWS { constructor() { setTimeout(() => this.onopen?.(), 9999999); } send(){} close(){} } },
});

const BATCH = 100;
let inserted = 0;
let failed = 0;

for (let i = 0; i < records.length; i += BATCH) {
  const batch = records.slice(i, i + BATCH);

  let data, error;
  for (let attempt = 1; attempt <= 3; attempt++) {
    ({ data, error } = await db.from('appointments').insert(batch).select('id'));
    if (!error) break;
    if (attempt < 3) {
      process.stdout.write(`  ↻ Batch ${i}–${i + batch.length} attempt ${attempt} failed (${error.message}), retrying…\n`);
      await new Promise(r => setTimeout(r, 1000 * attempt));
    }
  }

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
