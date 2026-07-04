import { queryOptions } from '@tanstack/react-query';
import { getDashboardData, getRecords, getTrend } from './service';
import type { BaoliaoFilters, Granularity, TimeRange } from './types';

export const baoliaoKeys = {
  all: ['baoliao'] as const,
  dashboard: (range: TimeRange) => [...baoliaoKeys.all, 'dashboard', range] as const,
  trend: (g: Granularity, range: TimeRange) => [...baoliaoKeys.all, 'trend', g, range] as const,
  records: (filters: BaoliaoFilters) => [...baoliaoKeys.all, 'records', filters] as const
};

export const dashboardQueryOptions = (range: TimeRange) =>
  queryOptions({
    queryKey: baoliaoKeys.dashboard(range),
    queryFn: () => getDashboardData(range)
  });

export const trendQueryOptions = (g: Granularity, range: TimeRange) =>
  queryOptions({
    queryKey: baoliaoKeys.trend(g, range),
    queryFn: () => getTrend(g, range)
  });

export const recordsQueryOptions = (filters: BaoliaoFilters) =>
  queryOptions({
    queryKey: baoliaoKeys.records(filters),
    queryFn: () => getRecords(filters)
  });
