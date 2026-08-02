/**
 * Shared TypeScript types for the admin and booking system.
 * These types are referenced across db.ts, notifications.ts, and admin components.
 */

export type AppointmentStatus = 'confirmed' | 'completed' | 'cancelled' | 'blocked' | 'no_show';
/** A staff member id from the roster in lib/staff.ts (e.g. 'eric', 'livi'). */
export type StaffId = string;

/**
 * A tip recorded by hand, for money the online booking flow never saw — cash
 * left at the counter, or a tip added on the Square terminal at checkout.
 *
 * Kept as a list rather than a single running total so a mis-entry can be
 * removed instead of silently overwritten, and so who logged it is on record.
 * Money entered by hand needs an audit trail more than it needs brevity.
 */
export interface ManualTip {
  /** Client-generated id, used to delete a single entry. */
  id: string;
  amountCents: number;
  /** Where it came from: cash in hand, or added to a card at the terminal. */
  method: 'cash' | 'card';
  /** ISO timestamp of when it was logged (not when it was received). */
  at: string;
  /** Staff id of whoever logged it. */
  byStaff: string;
  note?: string;
}

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
  // Staff-written notes about a client are NOT here. They live in the
  // `client_notes` table keyed by phone (dbGetClientNotes/dbSaveClientNotes),
  // which is what the section labelled "Admin notes" in AppointmentDetail
  // reads and writes. See SPEC.md §12.
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
    balanceDueCents?: number; // deposits: amount to collect at the studio (incl. tax)
    /** Set when a no-show fee was charged to the card on file. */
    noShowCharge?: {
      paymentId: string;
      amountCents: number;
      status: string;
      at: string; // ISO timestamp
    };
  };
  /**
   * Hand-logged tips — cash, or a tip added at the POS terminal. Deliberately
   * a sibling of `payment` rather than a field inside it: `payment` means "a
   * Square payment happened", and half the codebase reads `apt.payment` as
   * exactly that. A cash-paying client has a tip but no payment.
   *
   * Optional column (`manual_tips` jsonb) — absent until the SQL is run.
   */
  manualTips?: ManualTip[];
}

export interface ClientRecord {
  name: string;
  email: string;
  phone: string;
  visitCount?: number;
  lastVisit?: string;   // "YYYY-MM-DD"
  lastService?: string;
}
