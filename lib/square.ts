/**
 * Square client — server-side only.
 *
 * Env:
 *   SQUARE_ENV            'sandbox' | 'production'
 *   SQUARE_ACCESS_TOKEN   secret — grants account access
 *   SQUARE_APPLICATION_ID client-safe — renders the Web Payments card form
 *   SQUARE_LOCATION_ID    which Square location payments post to
 */

import { SquareClient, SquareEnvironment } from 'square';

export function squareConfigured(): boolean {
  return !!(process.env.SQUARE_ACCESS_TOKEN && process.env.SQUARE_APPLICATION_ID);
}

export function squareClient(): SquareClient {
  return new SquareClient({
    token: process.env.SQUARE_ACCESS_TOKEN,
    environment: process.env.SQUARE_ENV === 'production'
      ? SquareEnvironment.Production
      : SquareEnvironment.Sandbox,
  });
}

/** Client-side config for the Web Payments SDK (safe to expose to admins/funnel). */
export function squarePublicConfig(): { applicationId: string | null; locationId: string | null; env: string } {
  return {
    applicationId: process.env.SQUARE_APPLICATION_ID ?? null,
    locationId: process.env.SQUARE_LOCATION_ID ?? null,
    env: process.env.SQUARE_ENV === 'production' ? 'production' : 'sandbox',
  };
}

// ── Payment operations ──────────────────────────────────────────────────────

export interface PaymentRecord {
  paymentId: string;
  amountCents: number;   // total charged (service base + tip)
  currency: string;
  status: string;
  cardBrand?: string;
  last4?: string;
  customerId?: string;
  cardId?: string;       // set when the card was saved on file
  tipCents?: number;     // portion of amountCents that was a tip
  prepaid?: boolean;     // true when this was a full prepayment of the service
}

/** Find or create a Square Customer for a booking client (matched by email). */
export async function findOrCreateCustomer(
  name: string, email: string, phone?: string,
): Promise<string> {
  const client = squareClient();
  // NOTE: the Square TS SDK (v43+) expects snake_case field names in request
  // bodies, not the camelCase shown in much of the older docs.
  const search = await client.customers.search({
    query: { filter: { email_address: { exact: email } } },
    limit: BigInt(1),
  } as Parameters<typeof client.customers.search>[0]);
  const existing = search.customers?.[0]?.id;
  if (existing) return existing;

  const [givenName, ...rest] = name.split(' ');
  const created = await client.customers.create({
    idempotencyKey: `cust-${email}-${Date.now()}`,
    givenName,
    familyName: rest.join(' ') || undefined,
    emailAddress: email,
    phoneNumber: phone || undefined,
  });
  const id = created.customer?.id;
  if (!id) throw new Error('Failed to create Square customer');
  return id;
}

/**
 * Charge a deposit/prepayment with a Web Payments SDK token.
 * `idempotencyKey` must be unique per booking attempt (we pass one from the
 * client so retries of the same submit can't double-charge).
 */
export async function chargeDeposit(opts: {
  sourceId: string;             // card token from the SDK
  verificationToken?: string;   // buyer-verification (SCA) token
  amountCents: number;          // service base (NOT including tip)
  tipCents?: number;            // optional tip; charged in addition to amountCents
  note: string;
  customerId?: string;
  idempotencyKey: string;
}): Promise<PaymentRecord> {
  const client = squareClient();
  const tip = opts.tipCents && opts.tipCents > 0 ? opts.tipCents : 0;
  const res = await client.payments.create({
    idempotencyKey: opts.idempotencyKey,
    sourceId: opts.sourceId,
    verificationToken: opts.verificationToken,
    customerId: opts.customerId,
    locationId: process.env.SQUARE_LOCATION_ID,
    note: opts.note.slice(0, 500),
    // Square charges amountMoney + tipMoney; keep them separate so tips are
    // categorized as tips in Square reporting.
    amountMoney: { amount: BigInt(opts.amountCents), currency: 'CAD' },
    ...(tip > 0 ? { tipMoney: { amount: BigInt(tip), currency: 'CAD' } } : {}),
  });
  const p = res.payment;
  if (!p?.id || p.status === 'FAILED' || p.status === 'CANCELED') {
    throw new Error(`Payment ${p?.status ?? 'failed'}`);
  }
  return {
    paymentId: p.id,
    amountCents: opts.amountCents + tip,  // total charged, for refund correctness
    currency: 'CAD',
    status: p.status ?? 'COMPLETED',
    cardBrand: p.cardDetails?.card?.cardBrand ?? undefined,
    last4: p.cardDetails?.card?.last4 ?? undefined,
    customerId: opts.customerId,
    tipCents: tip > 0 ? tip : undefined,
  };
}

/**
 * Save a card on file against a customer. `sourceId` is either a fresh SDK
 * token (store-only flows) or a completed payment id (store-after-charge —
 * lets one tokenization both charge and save).
 */
export async function storeCardOnFile(opts: {
  sourceId: string;
  verificationToken?: string;
  customerId: string;
  idempotencyKey: string;
}): Promise<{ cardId: string; brand?: string; last4?: string }> {
  const client = squareClient();
  const res = await client.cards.create({
    idempotencyKey: opts.idempotencyKey,
    sourceId: opts.sourceId,
    verificationToken: opts.verificationToken,
    card: { customerId: opts.customerId },
  });
  const card = res.card;
  if (!card?.id) throw new Error('Failed to save card on file');
  return { cardId: card.id, brand: card.cardBrand ?? undefined, last4: card.last4 ?? undefined };
}

/** Refund a payment in full (deposit refunds on timely cancellations). */
export async function refundPayment(paymentId: string, amountCents: number, reason: string): Promise<boolean> {
  try {
    const client = squareClient();
    const res = await client.refunds.refundPayment({
      idempotencyKey: `refund-${paymentId}`,
      paymentId,
      amountMoney: { amount: BigInt(amountCents), currency: 'CAD' },
      reason: reason.slice(0, 192),
    });
    const status = res.refund?.status;
    return status === 'PENDING' || status === 'COMPLETED';
  } catch (err) {
    console.error('[square] refund failed', paymentId, err);
    return false;
  }
}
