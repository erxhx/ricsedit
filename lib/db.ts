/**
 * Real database functions — replaces the mock versions in admin-mock.ts.
 * All queries run server-side using the secret Supabase key.
 */

import { db } from './supabase';
import type { Appointment, AppointmentStatus, ClientRecord } from './admin-mock';

// ── Row mapper ────────────────────────────────────────────────────────────────
// Supabase returns snake_case; our app uses camelCase.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toApt(row: any): Appointment {
  return {
    id:              String(row.id),
    date:            row.date,
    startTime:       row.start_time.slice(0, 5),   // "HH:MM:SS" → "HH:MM"
    endTime:         row.end_time.slice(0, 5),
    staff:           row.staff,
    clientName:      row.client_name,
    clientEmail:     row.client_email,
    clientPhone:     row.client_phone,
    service:         row.service,
    durationMinutes: row.duration_minutes,
    price:           Number(row.price),
    status:          row.status as AppointmentStatus,
    notes:           row.notes ?? undefined,
    adminNotes:      row.admin_notes ?? undefined,
    manageToken:     row.manage_token,
  };
}

// ── Reads ─────────────────────────────────────────────────────────────────────

export async function dbGetAppointmentById(id: string): Promise<Appointment | null> {
  const { data, error } = await db
    .from('appointments')
    .select('*')
    .eq('id', id)
    .single();
  if (error || !data) return null;
  return toApt(data);
}

export async function dbGetAppointmentByToken(token: string): Promise<Appointment | null> {
  const { data, error } = await db
    .from('appointments')
    .select('*')
    .eq('manage_token', token)
    .single();
  if (error || !data) return null;
  return toApt(data);
}

export async function dbGetAppointmentsForDate(date: string): Promise<Appointment[]> {
  const { data, error } = await db
    .from('appointments')
    .select('*')
    .eq('date', date)
    .order('start_time');
  if (error || !data) return [];
  return data.map(toApt);
}

export async function dbGetAppointmentsForRange(
  startDate: string,
  endDate: string,
): Promise<Appointment[]> {
  const { data, error } = await db
    .from('appointments')
    .select('*')
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date')
    .order('start_time');
  if (error || !data) return [];
  return data.map(toApt);
}

export async function dbGetAppointmentsByClient(
  clientName: string,
  excludeId: string,
): Promise<Appointment[]> {
  const { data, error } = await db
    .from('appointments')
    .select('*')
    .eq('client_name', clientName)
    .neq('id', excludeId)
    .order('date', { ascending: false })
    .order('start_time', { ascending: false });
  if (error || !data) return [];
  return data.map(toApt);
}

export async function dbSearchClients(query: string): Promise<ClientRecord[]> {
  const q = query.toLowerCase().trim();
  if (!q) return [];

  // Search by name, email, or phone (partial match on all three)
  const { data, error } = await db
    .from('appointments')
    .select('client_name, client_email, client_phone, date, status, service')
    .or(`client_name.ilike.%${q}%,client_email.ilike.%${q}%,client_phone.ilike.%${q}%`)
    .order('date', { ascending: false }); // newest first so first-seen = most recent contact info

  if (error || !data) return [];

  // Group by name, computing visit count + last visit date
  const map = new Map<string, ClientRecord>();
  for (const row of data) {
    const existing = map.get(row.client_name);
    const isActive = row.status !== 'cancelled' && row.status !== 'blocked';
    if (!existing) {
      map.set(row.client_name, {
        name:        row.client_name,
        email:       row.client_email,
        phone:       row.client_phone,
        visitCount:  isActive ? 1 : 0,
        lastVisit:   isActive ? row.date : undefined,
        lastService: isActive ? row.service : undefined,
      });
    } else {
      if (isActive) {
        existing.visitCount = (existing.visitCount ?? 0) + 1;
        if (!existing.lastVisit || row.date > existing.lastVisit) {
          existing.lastVisit   = row.date;
          existing.lastService = row.service;
        }
      }
    }
  }

  const results = Array.from(map.values());

  // Sort: name starts-with query first, then alphabetical
  results.sort((a, b) => {
    const aStarts = a.name.toLowerCase().startsWith(q) ? 0 : 1;
    const bStarts = b.name.toLowerCase().startsWith(q) ? 0 : 1;
    return aStarts - bStarts || a.name.localeCompare(b.name);
  });

  return results.slice(0, 6);
}

export interface ClientSummary {
  name: string;
  email: string;
  phone: string;
  visitCount: number;
  lastVisit: string;   // "YYYY-MM-DD"
  lastService: string;
  totalSpent: number;
}

export async function dbGetAllClients(): Promise<ClientSummary[]> {
  const { data, error } = await db
    .from('appointments')
    .select('client_name, client_email, client_phone, date, service, price, status')
    .order('date', { ascending: false });

  if (error || !data) return [];

  const map = new Map<string, ClientSummary>();
  for (const row of data) {
    if (!map.has(row.client_name)) {
      map.set(row.client_name, {
        name:        row.client_name,
        email:       row.client_email ?? '',
        phone:       row.client_phone ?? '',
        visitCount:  0,
        lastVisit:   '',
        lastService: '',
        totalSpent:  0,
      });
    }
    const c = map.get(row.client_name)!;
    c.visitCount++;
    if (!c.lastVisit || row.date > c.lastVisit) {
      c.lastVisit   = row.date;
      c.lastService = row.service;
    }
    if (row.status !== 'cancelled') {
      c.totalSpent += Number(row.price) || 0;
    }
  }

  return Array.from(map.values()).sort((a, b) =>
    b.lastVisit.localeCompare(a.lastVisit),
  );
}

export async function dbGetClientAppointments(clientName: string): Promise<Appointment[]> {
  const { data, error } = await db
    .from('appointments')
    .select('*')
    .eq('client_name', clientName)
    .order('date', { ascending: false })
    .order('start_time', { ascending: false });
  if (error || !data) return [];
  return data.map(toApt);
}

// ── Writes ────────────────────────────────────────────────────────────────────

export async function dbCreateAppointment(
  data: Omit<Appointment, 'id' | 'manageToken'>,
): Promise<Appointment> {
  const { data: row, error } = await db
    .from('appointments')
    .insert({
      date:             data.date,
      start_time:       data.startTime,
      end_time:         data.endTime,
      staff:            data.staff,
      client_name:      data.clientName,
      client_email:     data.clientEmail,
      client_phone:     data.clientPhone,
      service:          data.service,
      duration_minutes: data.durationMinutes,
      price:            data.price,
      status:           data.status,
      notes:            data.notes ?? null,
    })
    .select()
    .single();

  if (error || !row) throw new Error(error?.message ?? 'Failed to create appointment');
  return toApt(row);
}

/**
 * Returns confirmed appointments for a given date that haven't had a reminder sent yet.
 * Requires the `reminder_sent` column — see SQL migration in SPEC.md.
 */
export async function dbGetAppointmentsNeedingReminder(date: string): Promise<Appointment[]> {
  const { data, error } = await db
    .from('appointments')
    .select('*')
    .eq('date', date)
    .eq('status', 'confirmed')
    .or('reminder_sent.is.null,reminder_sent.eq.false');
  if (error || !data) return [];
  return data.map(toApt);
}

/** Marks an appointment's reminder as sent so it won't be re-sent. */
export async function dbMarkReminderSent(id: string): Promise<void> {
  await db.from('appointments').update({ reminder_sent: true }).eq('id', id);
}

export async function dbUpdateAppointment(
  id: string,
  patch: Partial<Omit<Appointment, 'id'>>,
): Promise<Appointment | null> {
  // Build the snake_case update object
  const update: Record<string, unknown> = {};
  if (patch.date            !== undefined) update.date             = patch.date;
  if (patch.startTime       !== undefined) update.start_time       = patch.startTime;
  if (patch.endTime         !== undefined) update.end_time         = patch.endTime;
  if (patch.staff           !== undefined) update.staff            = patch.staff;
  if (patch.clientName      !== undefined) update.client_name      = patch.clientName;
  if (patch.clientEmail     !== undefined) update.client_email     = patch.clientEmail;
  if (patch.clientPhone     !== undefined) update.client_phone     = patch.clientPhone;
  if (patch.service         !== undefined) update.service          = patch.service;
  if (patch.durationMinutes !== undefined) update.duration_minutes = patch.durationMinutes;
  if (patch.price           !== undefined) update.price            = patch.price;
  if (patch.status          !== undefined) update.status           = patch.status;
  if (patch.notes           !== undefined) update.notes            = patch.notes ?? null;
  if (patch.adminNotes      !== undefined) update.admin_notes      = patch.adminNotes ?? null;

  const { data: row, error } = await db
    .from('appointments')
    .update(update)
    .eq('id', id)
    .select()
    .single();

  if (error || !row) return null;
  return toApt(row);
}
