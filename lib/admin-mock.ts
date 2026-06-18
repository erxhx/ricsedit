/**
 * Shared TypeScript types for the admin and booking system.
 * These types are referenced across db.ts, notifications.ts, and admin components.
 */

export type AppointmentStatus = 'confirmed' | 'completed' | 'cancelled' | 'blocked' | 'no_show';
/** A staff member id from the roster in lib/staff.ts (e.g. 'eric', 'livi'). */
export type StaffId = string;

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
  notes?: string;         // client-submitted note from booking form
  adminNotes?: string;    // internal admin note — never shown to the client
  reminderSent?: boolean; // true once the 24h reminder email/SMS has been dispatched
  intakeResponses?: { category: string; fields: Record<string, unknown> };
  manageToken: string;    // unique token for client self-serve cancel/reschedule
}

export interface ClientRecord {
  name: string;
  email: string;
  phone: string;
  visitCount?: number;
  lastVisit?: string;   // "YYYY-MM-DD"
  lastService?: string;
}
