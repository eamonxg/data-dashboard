import type {
  CategoryBar,
  ChannelSlice,
  DistrictStat,
  Granularity,
  NewsTipCategory,
  NewsTipChannel,
  NewsTipRecord,
  NewsTipRecordWithPriority,
  NewsTipSourcePlatform,
  NewsTipStatus,
  PriorityLevel,
  ShenzhenDistrict,
  TrendPoint
} from '../api/types';
import {
  NEWS_TIP_CATEGORIES,
  NEWS_TIP_CHANNELS,
  NEWS_TIP_DISTRICTS,
  NEWS_TIP_STATUSES
} from '../constants/options';

export type NewsTipFilterKind =
  | 'status'
  | 'category'
  | 'sourcePlatform'
  | 'channel'
  | 'district'
  | 'priority';
export type NewsTipSortMode = 'priority' | 'createdAt' | 'responseMinutes';

export interface NewsTipFilterState {
  status: NewsTipStatus[];
  category: NewsTipCategory[];
  sourcePlatform: NewsTipSourcePlatform[];
  channel: NewsTipChannel[];
  district: ShenzhenDistrict[];
  priority: PriorityLevel[];
}

export type NewsTipFilterValue = NewsTipFilterState[NewsTipFilterKind][number];

export const emptyNewsTipFilters: NewsTipFilterState = {
  status: [],
  category: [],
  sourcePlatform: [],
  channel: [],
  district: [],
  priority: []
};

export function hasActiveFilters(filters: NewsTipFilterState): boolean {
  return Object.values(filters).some((values) => values.length > 0);
}

export function toggleFilterValue(
  filters: NewsTipFilterState,
  kind: NewsTipFilterKind,
  value: NewsTipFilterValue
): NewsTipFilterState {
  const values = filters[kind];
  const nextValues = values.includes(value as never)
    ? values.filter((item) => item !== value)
    : [...values, value as never];

  return { ...filters, [kind]: nextValues };
}

export function setSingleFilterValue(
  filters: NewsTipFilterState,
  kind: NewsTipFilterKind,
  value: NewsTipFilterValue
): NewsTipFilterState {
  return { ...filters, [kind]: [value] };
}

export function removeFilterValue(
  filters: NewsTipFilterState,
  kind: NewsTipFilterKind,
  value: NewsTipFilterValue
): NewsTipFilterState {
  return { ...filters, [kind]: filters[kind].filter((item) => item !== value) };
}

export function filterNewsTipRecords(
  records: NewsTipRecordWithPriority[],
  filters: NewsTipFilterState
): NewsTipRecordWithPriority[] {
  return records.filter((record) => {
    if (filters.status.length > 0 && !filters.status.includes(record.status)) return false;
    if (filters.category.length > 0 && !filters.category.includes(record.category)) return false;
    if (
      filters.sourcePlatform.length > 0 &&
      !filters.sourcePlatform.includes(record.sourcePlatform)
    ) {
      return false;
    }
    if (filters.channel.length > 0 && !filters.channel.includes(record.channel)) return false;
    if (filters.district.length > 0 && !filters.district.includes(record.district)) return false;
    if (filters.priority.length > 0 && !filters.priority.includes(record.priorityLevel)) {
      return false;
    }
    return true;
  });
}

export function sortNewsTipRecords(
  records: NewsTipRecordWithPriority[],
  sortMode: NewsTipSortMode
): NewsTipRecordWithPriority[] {
  return records.toSorted((a, b) => {
    if (sortMode === 'priority') {
      if (b.priorityScore !== a.priorityScore) return b.priorityScore - a.priorityScore;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
    if (sortMode === 'responseMinutes') {
      return (b.responseMinutes ?? -1) - (a.responseMinutes ?? -1);
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

export function aggregateChannels(records: NewsTipRecord[]): ChannelSlice[] {
  return NEWS_TIP_CHANNELS.map((channel) => ({
    channel,
    count: records.filter((record) => record.channel === channel).length
  }));
}

export function aggregateCategories(records: NewsTipRecord[]): CategoryBar[] {
  return NEWS_TIP_CATEGORIES.map((category) => {
    const inCategory = records.filter((record) => record.category === category);
    return {
      category,
      count: inCategory.length,
      adopted: inCategory.filter((record) => record.status === '已采用').length
    };
  });
}

export function aggregateDistricts(records: NewsTipRecord[]): DistrictStat[] {
  const total = records.length;
  return NEWS_TIP_DISTRICTS.map((district) => {
    const inDistrict = records.filter((record) => record.district === district);
    const adopted = inDistrict.filter((record) => record.status === '已采用').length;
    const rejected = inDistrict.filter((record) => record.status === '不予采用').length;
    const denominator = adopted + rejected;

    return {
      district,
      count: inDistrict.length,
      pendingCount: inDistrict.filter((record) => record.status === '待审核').length,
      adoptionRate: denominator === 0 ? 0 : Math.round((adopted / denominator) * 1000) / 10,
      share: total === 0 ? 0 : Math.round((inDistrict.length / total) * 1000) / 10
    };
  }).toSorted((a, b) => b.count - a.count);
}

export function aggregateStatuses(
  records: NewsTipRecord[]
): { status: NewsTipStatus; count: number }[] {
  return NEWS_TIP_STATUSES.map((status) => ({
    status,
    count: records.filter((record) => record.status === status).length
  }));
}

function startOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

function startOfISOWeek(date: Date): Date {
  const result = startOfDay(date);
  const day = result.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  result.setDate(result.getDate() + diff);
  return result;
}

function startOfMonth(date: Date): Date {
  const result = startOfDay(date);
  result.setDate(1);
  return result;
}

function isoWeekNumber(date: Date): number {
  const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNr = (target.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - dayNr + 3);
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  const firstDayNr = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayNr + 3);
  const dayMs = 24 * 60 * 60 * 1000;
  return 1 + Math.round((target.getTime() - firstThursday.getTime()) / (7 * dayMs));
}

function adoptionRate(records: NewsTipRecord[]): number {
  const adopted = records.filter((record) => record.status === '已采用').length;
  const rejected = records.filter((record) => record.status === '不予采用').length;
  const denominator = adopted + rejected;
  return denominator === 0 ? 0 : Math.round((adopted / denominator) * 1000) / 10;
}

function completionRate(records: NewsTipRecord[]): number {
  if (records.length === 0) return 0;
  const completed = records.filter(
    (record) => record.status === '已采用' || record.status === '不予采用'
  ).length;
  return Math.round((completed / records.length) * 1000) / 10;
}

export function aggregateTrend(records: NewsTipRecord[], granularity: Granularity): TrendPoint[] {
  const buckets = new Map<string, { label: string; records: NewsTipRecord[]; order: number }>();

  for (const record of records) {
    const date = new Date(record.createdAt);
    let key: string;
    let label: string;
    let order: number;

    if (granularity === 'day') {
      key = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
      label = `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(
        2,
        '0'
      )}`;
      order = startOfDay(date).getTime();
    } else if (granularity === 'week') {
      const weekStart = startOfISOWeek(date);
      const week = isoWeekNumber(date);
      key = `${date.getFullYear()}-W${week}`;
      label = `第${week}周`;
      order = weekStart.getTime();
    } else {
      key = `${date.getFullYear()}-${date.getMonth() + 1}`;
      label = `${date.getMonth() + 1}月`;
      order = startOfMonth(date).getTime();
    }

    if (!buckets.has(key)) buckets.set(key, { label, records: [], order });
    buckets.get(key)!.records.push(record);
  }

  return Array.from(buckets.values())
    .toSorted((a, b) => a.order - b.order)
    .map((bucket) => ({
      label: bucket.label,
      count: bucket.records.length,
      completionRate: completionRate(bucket.records),
      adoptionRate: adoptionRate(bucket.records)
    }));
}

export function selectTodoItems(
  records: NewsTipRecordWithPriority[],
  limit: number
): NewsTipRecordWithPriority[] {
  const high = records.filter((record) => record.priorityLevel === 'high');
  const medium = records.filter((record) => record.priorityLevel === 'medium');
  return [...high, ...medium].slice(0, limit);
}

export interface StatusGroup {
  status: NewsTipStatus;
  items: NewsTipRecordWithPriority[];
}

export function groupRecordsByStatus(records: NewsTipRecordWithPriority[]): StatusGroup[] {
  return NEWS_TIP_STATUSES.map((status) => ({
    status,
    items: records.filter((record) => record.status === status)
  }));
}
