'use client';
import { createContext, useContext } from 'react';

export interface RevenueAccess {
  /** Whether the current viewer may see studio-wide revenue. */
  canSeeAllRevenue: boolean;
  /**
   * The viewer's staff id. Scopes revenue to their own when restricted, and
   * also orders the day grid so their column comes first.
   */
  viewerStaff: string;
  /**
   * The viewer's share of a service price, 0–1. Only meaningful when
   * `canSeeAllRevenue` is false, where money is shown as their payout —
   * this share of the service, plus their tips in full.
   */
  commissionRate: number;
}

// Default: full access (keeps components working if a provider isn't mounted).
// The rate is 0 to match: with full access nothing reads it, and if something
// ever did, showing nothing beats inventing a payout.
const RevenueAccessContext = createContext<RevenueAccess>({
  canSeeAllRevenue: true,
  viewerStaff: '',
  commissionRate: 0,
});

export function RevenueAccessProvider({
  value,
  children,
}: {
  value: RevenueAccess;
  children: React.ReactNode;
}) {
  return <RevenueAccessContext.Provider value={value}>{children}</RevenueAccessContext.Provider>;
}

export function useRevenueAccess(): RevenueAccess {
  return useContext(RevenueAccessContext);
}
