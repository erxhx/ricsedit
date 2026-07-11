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
