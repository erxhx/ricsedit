import { createHash } from 'crypto';

export type AppointmentStatus = 'confirmed' | 'completed' | 'cancelled' | 'blocked';
export type StaffId = 'eric' | 'livi';

export interface Appointment {
  id: string;
  date: string;       // YYYY-MM-DD
  startTime: string;  // HH:MM
  endTime: string;    // HH:MM
  staff: StaffId;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  service: string;
  durationMinutes: number;
  price: number;
  status: AppointmentStatus;
  notes?: string;
  manageToken: string; // unique token for client self-serve cancel/reschedule
}

/** Deterministic token derived from appointment id — stable across restarts */
function makeToken(id: string): string {
  return createHash('sha256').update(`edit-studio-manage-${id}`).digest('hex').slice(0, 24);
}

// Returns YYYY-MM-DD for a date offset from today
function dateOffset(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function endTime(start: string, mins: number): string {
  const [h, m] = start.split(':').map(Number);
  const total = h * 60 + m + mins;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

// Deterministic fake contact info seeded from client name
const EMAILS: Record<string, string> = {
  'Mia Laurent':  'mia.laurent@gmail.com',
  'Jade Kim':     'jade.kim@icloud.com',
  'Sara Bloom':   'sara.bloom@gmail.com',
  'Jordan Mitchell': 'jordan.mitchell@gmail.com',
  'Maya Chen': 'maya.chen@icloud.com',
  'Sam Torres': 'sam.torres@gmail.com',
  'Priya Sharma': 'priya.sharma@outlook.com',
  'Chloe Park': 'chloepark92@gmail.com',
  'Marcus Webb': 'marcus.webb@gmail.com',
  'Taylor Brooks': 'tbrooks@gmail.com',
  'Noah Fischer': 'noah.fischer@icloud.com',
  'Ava Martinez': 'ava.martinez@gmail.com',
  "Liam O'Brien": 'liam.obrien@gmail.com',
  'Sofia Nguyen': 'sofia.nguyen@icloud.com',
  'Ethan Clarke': 'ethan.clarke@gmail.com',
  'Hannah Lee': 'hannahlee@gmail.com',
  'Ryan Patel': 'ryan.patel@gmail.com',
  'Emma Wilson': 'emma.wilson@icloud.com',
  'Isabelle Roy': 'isabelle.roy@gmail.com',
  'Daniel Kim': 'daniel.kim@gmail.com',
  'James Harper': 'james.harper@gmail.com',
  'Aisha Johnson': 'aisha.j@gmail.com',
  'Leah Thompson': 'leah.thompson@icloud.com',
  'Connor Davis': 'connor.davis@gmail.com',
  'Natalie Scott': 'natalie.scott@gmail.com',
  'Tyler Nguyen': 'tyler.nguyen@gmail.com',
  'Benjamin White': 'ben.white@gmail.com',
  'Grace Liu': 'grace.liu@icloud.com',
  'Oliver Brown': 'oliver.brown@gmail.com',
  'Zoe Anderson': 'zoe.anderson@icloud.com',
  'Finn Walsh': 'finn.walsh@gmail.com',
  'Lily Chen': 'lily.chen@gmail.com',
  'Max Jensen': 'max.jensen@gmail.com',
  'Ruby Park': 'ruby.park@icloud.com',
  'Jack Morrison': 'jack.morrison@gmail.com',
  'Amber Singh': 'amber.singh@icloud.com',
  'Claire Dupont': 'claire.dupont@gmail.com',
};

const PHONES: string[] = [
  '250-555-0142','250-555-0218','778-555-0374','250-555-0491','778-555-0563',
  '250-555-0687','778-555-0712','250-555-0834','778-555-0956','250-555-0123',
  '778-555-0247','250-555-0381','778-555-0415','250-555-0529','778-555-0643',
  '250-555-0778','778-555-0812','250-555-0934','778-555-0158','250-555-0263',
  '778-555-0397','250-555-0431','778-555-0545','250-555-0669','778-555-0783',
  '250-555-0817','778-555-0921','250-555-0035','778-555-0169','250-555-0274',
  '778-555-0388','250-555-0412','778-555-0536','250-555-0650',
];

let phoneIdx = 0;
const phoneMap: Record<string, string> = {};
function getPhone(name: string): string {
  if (!phoneMap[name]) phoneMap[name] = PHONES[phoneIdx++ % PHONES.length];
  return phoneMap[name];
}

function apt(
  id: string, daysOffset: number, start: string,
  staff: StaffId, clientName: string, service: string,
  duration: number, price: number, status: AppointmentStatus = 'confirmed',
  notes?: string
): Appointment {
  return {
    id, date: dateOffset(daysOffset), startTime: start,
    endTime: endTime(start, duration), staff, clientName,
    clientEmail: EMAILS[clientName] ?? `${clientName.toLowerCase().replace(/[' ]/g, '.')}@gmail.com`,
    clientPhone: getPhone(clientName),
    service, durationMinutes: duration, price, status, notes,
    manageToken: makeToken(id),
  };
}

declare global { var __mockApts: Appointment[] | undefined; var __manualCounter: number | undefined; }

const SEED: Appointment[] = [
  // Today (offset 0) — shown in "Today" view
  apt('1', 0, '10:00', 'eric', 'Jordan Mitchell',  'Haircut + Beard',      60, 60),
  apt('2', 0, '10:00', 'livi', 'Maya Chen',         'Classic Full Body',    60, 60),
  apt('12',0, '11:00', 'livi', 'Mia Laurent',       'Classic Full Body',    60, 60),
  apt('3', 0, '11:30', 'eric', 'Sam Torres',        'Haircut',              45, 40),
  apt('4', 0, '12:00', 'livi', 'Priya Sharma',      'Brow Wax & Shape',     30, 25),
  apt('5', 0, '13:00', 'livi', 'Chloe Park',        'Brazilian',            45, 50),
  apt('6', 0, '13:30', 'eric', 'Marcus Webb',       'Haircut',              45, 40),
  apt('7', 0, '14:00', 'livi', 'Taylor Brooks',     'Rapid Full Body',      45, 70),
  apt('8', 0, '15:00', 'eric', 'Noah Fischer',      'Freshen Up — Cut',     30, 25),
  apt('9', 0, '15:30', 'livi', 'Ava Martinez',      'Underarm',             15, 20),
  apt('10',0, '16:00', 'eric', "Liam O'Brien",      'Haircut + Beard',      60, 60),
  apt('11',0, '16:00', 'livi', 'Sofia Nguyen',      'Brow Wax & Shape',     30, 25, 'confirmed', 'First visit'),

  // +1 day
  apt('20', 1, '10:30', 'eric', 'Ethan Clarke',    'Senior Cut',            30, 30),
  apt('21', 1, '11:00', 'livi', 'Hannah Lee',       'Classic Full Body',    60, 60),
  apt('22', 1, '13:00', 'eric', 'Ryan Patel',       'Haircut',              45, 40),
  apt('23', 1, '14:30', 'livi', 'Emma Wilson',      'French',               40, 45),

  // +2 days
  apt('30', 2, '10:00', 'livi', 'Isabelle Roy',     'Rapid Full Body',      45, 70),
  apt('31', 2, '11:00', 'eric', 'Daniel Kim',       'Kids Cut',             30, 30),
  apt('35', 2, '11:00', 'livi', 'Jade Kim',         'Rapid Full Body',      45, 70),
  apt('32', 2, '13:00', 'eric', 'James Harper',     'Haircut + Beard',      60, 60),
  apt('33', 2, '14:00', 'livi', 'Aisha Johnson',    'Brow Wax & Shape',     30, 25),
  apt('34', 2, '15:00', 'livi', 'Leah Thompson',    'Full Leg',             55, 70),

  // +3 days
  apt('40', 3, '10:00', 'eric', 'Connor Davis',     'Beard Trim',           25, 25),
  apt('41', 3, '11:00', 'livi', 'Natalie Scott',    'Classic Full Body',    60, 60),
  apt('42', 3, '12:00', 'eric', 'Tyler Nguyen',     'Freshen Up — Cut',     30, 25),
  apt('43', 3, '14:00', 'eric', 'Benjamin White',   'Haircut',              45, 40),
  apt('44', 3, '15:30', 'livi', 'Grace Liu',        'Brow Tint',            20, 15),

  // +4 days
  apt('50', 4, '10:00', 'eric', 'Oliver Brown',     'Haircut + Beard',      60, 60),
  apt('51', 4, '10:00', 'livi', 'Zoe Anderson',     'Bikini',               30, 35),
  apt('52', 4, '12:00', 'eric', 'Finn Walsh',       'Haircut',              45, 40),
  apt('53', 4, '13:00', 'livi', 'Lily Chen',        'Brazilian',            45, 50),
  apt('54', 4, '14:00', 'livi', 'Sara Bloom',       'Rapid Full Body',      45, 70),

  // +5 days
  apt('60', 5, '11:00', 'eric', 'Max Jensen',       'Haircut',              45, 40),
  apt('61', 5, '13:00', 'livi', 'Ruby Park',        'Classic Full Body',    60, 60),

  // +6 days
  apt('70', 6, '10:00', 'eric', 'Jack Morrison',    'Haircut + Beard',      60, 60),
  apt('71', 6, '11:00', 'livi', 'Amber Singh',      'Brow Wax & Shape',     30, 25),
  apt('72', 6, '14:00', 'livi', 'Claire Dupont',    'Rapid Full Body',      45, 70),

  // Past appointments — repeat clients (for history section)

  // -4 weeks
  apt('100', -28, '10:00', 'eric', 'Jordan Mitchell',  'Haircut + Beard',   60, 60, 'completed'),
  apt('101', -28, '11:00', 'livi', 'Maya Chen',         'Classic Full Body', 60, 60, 'completed'),
  apt('102', -28, '13:00', 'livi', 'Mia Laurent',       'Classic Full Body', 60, 60, 'completed'),
  apt('103', -28, '11:30', 'eric', 'Sam Torres',        'Haircut',           45, 40, 'completed'),
  apt('104', -28, '12:00', 'livi', 'Priya Sharma',      'Brow Wax & Shape',  30, 25, 'completed'),
  apt('105', -28, '13:00', 'livi', 'Chloe Park',        'Brazilian',         45, 50, 'completed'),
  apt('106', -28, '13:30', 'eric', 'Marcus Webb',       'Haircut',           45, 40, 'completed'),

  // -8 weeks
  apt('110', -56, '10:00', 'eric', 'Jordan Mitchell',  'Haircut + Beard',   60, 60, 'completed'),
  apt('111', -56, '11:00', 'livi', 'Maya Chen',         'Rapid Full Body',   45, 70, 'completed'),
  apt('112', -56, '11:00', 'livi', 'Mia Laurent',       'Classic Full Body', 60, 60, 'completed'),
  apt('113', -56, '11:30', 'eric', 'Sam Torres',        'Haircut',           45, 40, 'cancelled'),
  apt('114', -56, '14:00', 'livi', 'Jade Kim',          'Rapid Full Body',   45, 70, 'completed'),
  apt('115', -56, '15:00', 'livi', 'Sara Bloom',        'Classic Full Body', 60, 60, 'completed'),
  apt('116', -56, '13:30', 'eric', 'Marcus Webb',       'Freshen Up — Cut',  30, 25, 'completed'),

  // -12 weeks
  apt('120', -84, '10:00', 'eric', 'Jordan Mitchell',  'Haircut',           45, 40, 'completed'),
  apt('121', -84, '10:00', 'livi', 'Maya Chen',         'Classic Full Body', 60, 60, 'completed'),
  apt('122', -84, '13:00', 'livi', 'Priya Sharma',      'Full Leg',          55, 70, 'completed'),
  apt('123', -84, '13:00', 'livi', 'Chloe Park',        'Brazilian',         45, 50, 'completed'),
  apt('124', -84, '11:00', 'livi', 'Jade Kim',          'Classic Full Body', 60, 60, 'completed'),
  apt('125', -84, '14:00', 'livi', 'Sara Bloom',        'Rapid Full Body',   45, 70, 'cancelled'),

  // -16 weeks
  apt('130', -112, '10:00', 'eric', 'Jordan Mitchell',  'Haircut + Beard',  60, 60, 'completed'),
  apt('131', -112, '11:00', 'livi', 'Mia Laurent',       'Rapid Full Body',  45, 70, 'completed'),
  apt('132', -112, '11:30', 'eric', 'Sam Torres',        'Haircut + Beard',  60, 60, 'completed'),
  apt('133', -112, '13:00', 'livi', 'Chloe Park',        'Brazilian',        45, 50, 'completed'),
];

// Single shared instance across all Next.js workers/module contexts
export const MOCK_APPOINTMENTS: Appointment[] =
  global.__mockApts ?? (global.__mockApts = SEED);

export function getAppointmentById(id: string): Appointment | null {
  return MOCK_APPOINTMENTS.find((a) => a.id === id) ?? null;
}

export const SERVICE_CATALOG: Record<StaffId, { name: string; duration: number; price: number }[]> = {
  eric: [
    { name: 'Haircut + Beard', duration: 60, price: 60 },
    { name: 'Haircut', duration: 45, price: 40 },
    { name: 'Freshen Up — Cut', duration: 30, price: 25 },
    { name: 'Senior Cut', duration: 30, price: 30 },
    { name: 'Kids Cut', duration: 30, price: 30 },
    { name: 'Beard Trim', duration: 25, price: 25 },
  ],
  livi: [
    // — Sunless Tan (names match services.ts) —
    { name: 'Classic Full Body', duration: 60, price: 60 },
    { name: 'Rapid Full Body',   duration: 45, price: 70 },
    { name: 'Face Tan',          duration: 20, price: 15 },
    // — Waxing —
    { name: 'Brazilian', duration: 45, price: 50 },
    { name: 'French', duration: 40, price: 45 },
    { name: 'Full Leg', duration: 55, price: 70 },
    { name: 'Bikini', duration: 30, price: 35 },
    { name: 'Underarm', duration: 15, price: 20 },
    { name: 'Brow Wax & Shape', duration: 30, price: 25 },
    { name: 'Brow Tint', duration: 20, price: 15 },
  ],
};

export interface ClientRecord {
  name: string;
  email: string;
  phone: string;
  visitCount?: number;
  lastVisit?: string; // "YYYY-MM-DD"
}

/** Search clients by name, email, or phone prefix.
 *  TODO: replace body with a Supabase query when the DB is wired up. */
export function searchClients(query: string): ClientRecord[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];
  const seen = new Set<string>();
  const results: ClientRecord[] = [];
  for (const apt of MOCK_APPOINTMENTS) {
    if (seen.has(apt.clientName)) continue;
    if (
      apt.clientName.toLowerCase().includes(q) ||
      apt.clientEmail.toLowerCase().includes(q) ||
      apt.clientPhone.replace(/\D/g, '').includes(q.replace(/\D/g, ''))
    ) {
      seen.add(apt.clientName);
      results.push({ name: apt.clientName, email: apt.clientEmail, phone: apt.clientPhone });
    }
  }
  // Sort: names that start with the query first
  results.sort((a, b) => {
    const aStarts = a.name.toLowerCase().startsWith(q) ? 0 : 1;
    const bStarts = b.name.toLowerCase().startsWith(q) ? 0 : 1;
    return aStarts - bStarts || a.name.localeCompare(b.name);
  });
  return results.slice(0, 5);
}

export function updateAppointment(id: string, patch: Partial<Omit<Appointment, 'id'>>): Appointment | null {
  const idx = MOCK_APPOINTMENTS.findIndex((a) => a.id === id);
  if (idx === -1) return null;
  MOCK_APPOINTMENTS[idx] = { ...MOCK_APPOINTMENTS[idx], ...patch };
  return MOCK_APPOINTMENTS[idx];
}

export function createAppointment(data: Omit<Appointment, 'id' | 'manageToken'>): Appointment {
  if (global.__manualCounter === undefined) global.__manualCounter = 1000;
  const id = String(global.__manualCounter++);
  const newApt: Appointment = { id, manageToken: makeToken(id), ...data };
  MOCK_APPOINTMENTS.push(newApt);
  return newApt;
}

export function getAppointmentByToken(token: string): Appointment | null {
  return MOCK_APPOINTMENTS.find((a) => a.manageToken === token) ?? null;
}

/** All appointments for a client, newest first, excluding one id.
 *  TODO: replace with a Supabase query keyed on client_id when the DB is wired up. */
export function getAppointmentsByClient(clientName: string, excludeId: string): Appointment[] {
  return MOCK_APPOINTMENTS
    .filter((a) => a.clientName === clientName && a.id !== excludeId)
    .sort((a, b) => b.date.localeCompare(a.date) || b.startTime.localeCompare(a.startTime));
}

export function getAppointmentsForDate(date: string): Appointment[] {
  return MOCK_APPOINTMENTS
    .filter((a) => a.date === date)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
}

export function getAppointmentsForRange(startDate: string, endDate: string): Appointment[] {
  return MOCK_APPOINTMENTS
    .filter((a) => a.date >= startDate && a.date <= endDate)
    .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));
}
