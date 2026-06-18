'use client';
import { createContext, useContext } from 'react';

export interface RevenueAccess {
  /** Whether the current viewer may see studio-wide revenue. */
  canSeeAllRevenue: boolean;
  /** The viewer's staff id — used to scope revenue to their own when restricted. */
  viewerStaff: string;
}

// Default: full access (keeps components working if a provider isn't mounted).
const RevenueAccessContext = createContext<RevenueAccess>({
  canSeeAllRevenue: true,
  viewerStaff: '',
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
