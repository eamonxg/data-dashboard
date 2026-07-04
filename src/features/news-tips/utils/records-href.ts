import type { InsightItem } from '../api/types';

export const RECORDS_PATH = '/dashboard/news-tips/records';

export type RecordsHrefBase = {
  range: string;
  dateFrom?: string | null;
  dateTo?: string | null;
};

export type RecordsHrefPatch = Partial<
  Record<
    'status' | 'category' | 'sourcePlatform' | 'channel' | 'district' | 'priority' | 'sort',
    string
  >
>;

export function buildRecordsHref(base: RecordsHrefBase, patch: RecordsHrefPatch): string {
  const search = new URLSearchParams();

  if (base.range) search.set('range', base.range);
  if (base.dateFrom) search.set('dateFrom', base.dateFrom);
  if (base.dateTo) search.set('dateTo', base.dateTo);

  for (const [key, value] of Object.entries(patch)) {
    if (value != null && value !== '') search.set(key, value);
  }

  const qs = search.toString();
  return qs ? `${RECORDS_PATH}?${qs}` : RECORDS_PATH;
}

export function insightToPatch(insight: InsightItem): RecordsHrefPatch {
  const action = insight.action;

  switch (action.type) {
    case 'sort':
      return { sort: action.value };
    case 'filter-status':
      return { status: action.value };
    case 'filter-category':
      return { category: action.value };
    case 'filter-sourcePlatform':
      return { sourcePlatform: action.value };
    case 'filter-channel':
      return { channel: action.value };
    case 'filter-district':
      return { district: action.value };
    case 'filter-priority':
      return { priority: action.value };
  }
}
