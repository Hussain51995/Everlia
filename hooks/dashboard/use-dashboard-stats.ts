"use client";

import { useMemo } from "react";
import { useCards, useCustomers, useResponses } from "@/hooks/cards";
import {
  buildDashboardStats,
  emptyDashboardStats,
  type DashboardStats,
} from "@/lib/dashboard/stats";

export function useDashboardStats(): {
  stats: DashboardStats;
  isLoading: boolean;
  isFetching: boolean;
  error: Error | null;
} {
  const customersQuery = useCustomers();
  const cardsQuery = useCards();
  const responsesQuery = useResponses();

  const isLoading =
    customersQuery.isLoading || cardsQuery.isLoading || responsesQuery.isLoading;
  const isFetching =
    customersQuery.isFetching ||
    cardsQuery.isFetching ||
    responsesQuery.isFetching;

  const error =
    (customersQuery.error as Error | null) ??
    (cardsQuery.error as Error | null) ??
    (responsesQuery.error as Error | null) ??
    null;

  const stats = useMemo(() => {
    if (isLoading) return emptyDashboardStats();
    return buildDashboardStats(
      customersQuery.data ?? [],
      cardsQuery.data ?? [],
      responsesQuery.data ?? []
    );
  }, [
    isLoading,
    customersQuery.data,
    cardsQuery.data,
    responsesQuery.data,
  ]);

  return { stats, isLoading, isFetching, error };
}
