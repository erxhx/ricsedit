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
  /** Square payment info — set when the booking charged a deposit/prepayment
   * or stored a card on file. Optional column; absent until the SQL is run. */
  payment?: {
    paymentId: string;
    amountCents: number;
    currency: string;
    status: string;
    cardBrand?: string;
    last4?: string;
    customerId?: string;
    cardId?: string;
    refunded?: boolean;
    tipCents?: number;    // portion of amountCents that was a tip
    prepaid?: boolean;    // true when the client paid the service in full at booking
    gstCents?: number;    // GST included in amountCents
    pstCents?: number;    // PST (products) included in amountCents
    /** Set when a no-show fee was charged to the card on file. */
    noShowCharge?: {
      paymentId: string;
      amountCents: number;
      status: string;
      at: string; // ISO timestamp
    };
  };
}

export interface ClientRecord {
  name: string;
  email: string;
  phone: string;
  visitCount?: number;
  lastVisit?: string;   // "YYYY-MM-DD"
  lastService?: string;
}
