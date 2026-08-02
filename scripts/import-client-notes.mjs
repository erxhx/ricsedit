#!/usr/bin/env node
/**
 * Import Acuity client-list notes → appointments.admin_notes
 *
 * Usage:
 *   node scripts/import-client-notes.mjs path/to/list.csv
 *   node scripts/import-client-notes.mjs path/to/list.csv --confirm
 *
 * Dry-run by default. Pass --confirm to write.
 *
 * ── WHY THIS IS SEPARATE FROM import-acuity.mjs ──────────────────────────────
 * Acuity keeps two different things called "notes":
 *
 *   • Appointment notes — one per booking, exported by Reports → Appointments.
 *     Those come in through import-acuity.mjs and land in `notes`.
 *   • Client notes — one per person, shown against every one of their
 *     appointments in Acuity's UI, and NOT present in the appointment export.
 *     They only appear in Clients → export. That is this file.
 *
 * The distinction is invisible from the appointment export alone: it simply has
 * an empty Notes column for a client whose note lives on their client record.
 *
 * ── WHERE THEY GO: client_notes, NOT the admin_notes column ──────────────────
 * Two things in this codebase are called "admin notes" and they are not the
 * same:
 *
 *   • `appointments.admin_notes` — a column that exists, is mapped in lib/db.ts,
 *     and is rendered by nothing. Dead weight.
 *   • The `client_notes` table, keyed by phone — this is what the section
 *     LABELLED "Admin notes" in AppointmentDetail actually reads and writes
 *     ("persistent across all appointments, internal only").
 *
 * Client notes belong in the latter: one row per person rather than a copy on
 * every appointment, already visible, and editable by staff without drifting
 * out of sync.
 *
 * ── KEYING ───────────────────────────────────────────────────────────────────
 * dbGetClientNotes does an exact match on the phone string handed to it, which
 * is whatever `appointments.client_phone` holds. Those are mostly E.164 but not
 * all ("2505802340" with no country code), and the CSV uses Acuity's own
 * formats ("'+1250…", "(250) 888-8669"). So the key is taken from the matched
 * APPOINTMENT rather than from the CSV — a normaliser would only have to agree
 * with the app's lookup forever, and this cannot disagree with it.
 *
 * Never overwrites an existing note — one a human wrote outranks a snapshot.
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const csvPath = process.argv[2];
const CONFIRM = process.argv.includes('--confirm');
if (!csvPath) {
  console.error('Usage: node scripts/import-client-notes.mjs <list.csv> [--confirm]');
  process.exit(1);
}

// ── env ───────────────────────────────────────────────────────────────────────
let envText = '';
try { envText = readFileSync(resolve(__dirname, '../.env.local'), 'utf8'); } catch {}
for (const line of envText.split('\n')) {
  const m = line.match(/^([^#=\s]+)\s*=\s*(.*)/);
  if (m) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
}
const URL_ = process.env.SUPABASE_URL;
const KEY  = process.env.SUPABASE_SECRET_KEY;
if (!URL_ || !KEY) { console.error('Missing SUPABASE_URL / SUPABASE_SECRET_KEY'); process.exit(1); }
const BASE = `${URL_}/rest/v1/appointments`;
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' };

// ── CSV ───────────────────────────────────────────────────────────────────────
function parseCsv(text) {
  const rows = []; let row = [], cur = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"' && text[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') q = false; else cur += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(cur); cur = ''; }
    else if (c === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; }
    else if (c !== '\r') cur += c;
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  return rows.filter(r => r.length > 3);
}

const rows = parseCsv(readFileSync(csvPath, 'utf8'));
const head = rows[0].map(h => h.trim());
const I = n => head.indexOf(n);
for (const req of ['First Name', 'Last Name', 'Email', 'Notes']) {
  if (I(req) === -1) { console.error(`Missing column: ${req}`); process.exit(1); }
}

// Acuity stores several addresses comma-separated on one client.
const emailsOf = s => (s ?? '').toLowerCase().split(',').map(e => e.trim()).filter(e => e.includes('@'));
const normName = s => (s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');

const clients = [];
for (let i = 1; i < rows.length; i++) {
  const f = rows[i];
  const note = (f[I('Notes')] ?? '').trim();
  if (!note) continue;
  const banned = I('Banned') !== -1 && (f[I('Banned')] ?? '').trim().toUpperCase() === 'Y';
  clients.push({
    name: `${(f[I('First Name')] || '').trim()} ${(f[I('Last Name')] || '').trim()}`.trim(),
    emails: emailsOf(f[I('Email')]),
    // The Banned flag has no column of its own on `appointments`, so it is
    // folded into the note rather than dropped on the floor.
    note: banned ? `[BANNED] ${note}` : note,
  });
}
console.log(`Clients carrying a note: ${clients.length}\n`);

// ── appointments ──────────────────────────────────────────────────────────────
const db = [];
for (let from = 0; ; from += 1000) {
  // Paged: PostgREST caps a response at 1000 rows whatever `limit` says.
  const r = await fetch(`${BASE}?select=id,client_name,client_email,client_phone`, {
    headers: { ...H, Range: `${from}-${from + 999}` },
  });
  if (!r.ok) { console.error(`Read failed: ${r.status}`); process.exit(1); }
  const page = await r.json();
  db.push(...page);
  if (page.length < 1000) break;
}
console.log(`Appointments in database: ${db.length}`);

const byEmail = new Map(), byName = new Map();
for (const a of db) {
  for (const e of emailsOf(a.client_email)) {
    if (!byEmail.has(e)) byEmail.set(e, []);
    byEmail.get(e).push(a);
  }
  const n = normName(a.client_name);
  if (n) { if (!byName.has(n)) byName.set(n, []); byName.get(n).push(a); }
}

// Existing client_notes, so a human's edits are never clobbered.
const existing = new Map();
{
  const r = await fetch(`${URL_}/rest/v1/client_notes?select=phone,notes`, { headers: H });
  if (r.ok) for (const n of await r.json()) existing.set(n.phone, n.notes);
}
console.log(`Existing client_notes rows: ${existing.size}`);

const planned  = new Map();  // phone → note
const skipped  = [];         // a human already wrote a note for this phone
const orphans  = [];         // note with no appointment, or no phone to key on

for (const c of clients) {
  let hits = [];
  for (const e of c.emails) hits.push(...(byEmail.get(e) ?? []));
  // Email first — names in the client list drift from names on bookings
  // ("Sara Lloyd - Walters" vs "Sara Lloyd-Walters"). Name is the fallback for
  // the handful of clients with no address on file.
  if (!hits.length) hits = byName.get(normName(c.name)) ?? [];
  if (!hits.length) { orphans.push({ ...c, why: 'no matching appointment' }); continue; }

  // One row per distinct phone this client books under, so the note resolves
  // whichever of their appointments is opened.
  const phones = [...new Set(hits.map(a => (a.client_phone ?? '').trim()).filter(Boolean))];
  if (!phones.length) { orphans.push({ ...c, why: 'appointments carry no phone' }); continue; }
  for (const p of phones) {
    if (existing.has(p) && String(existing.get(p)).trim()) { skipped.push({ phone: p, c }); continue; }
    planned.set(p, c.note);
  }
}

console.log(`client_notes rows to write : ${planned.size}`);
console.log(`Skipped (already written)  : ${skipped.length}`);
console.log(`Notes that cannot be placed: ${orphans.length}`);
for (const o of orphans) console.log(`  ⚠ ${o.name} (${o.why}) — "${o.note.slice(0, 50)}"`);

if (!CONFIRM) {
  console.log('\n✓ DRY RUN — nothing written.');
  console.log(`  Re-run with --confirm:\n\n  node scripts/import-client-notes.mjs "${csvPath}" --confirm\n`);
  process.exit(0);
}

console.log(`\nWriting ${planned.size} client_notes rows…`);
let done = 0, failed = 0;
for (const [phone, notes] of planned) {
  const r = await fetch(`${URL_}/rest/v1/client_notes`, {
    method: 'POST',
    headers: { ...H, Prefer: 'resolution=merge-duplicates' },
    body: JSON.stringify({ phone, notes, updated_at: new Date().toISOString() }),
  });
  if (r.ok) done++; else { failed++; console.error(`  ✗ ${phone}: ${r.status} ${await r.text()}`); }
  if (done % 25 === 0) process.stdout.write(`  ✓ ${done}/${planned.size}\r`);
}
console.log(`\n\nDone. ${done} written, ${failed} failed.`);
