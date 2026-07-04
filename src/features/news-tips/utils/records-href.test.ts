import { describe, expect, test } from 'bun:test';

import type { InsightItem } from '../api/types';
import { RECORDS_PATH, buildRecordsHref, insightToPatch } from './records-href';

describe('buildRecordsHref', () => {
  test('保留时间范围并写入单个筛选', () => {
    const href = buildRecordsHref({ range: 'week' }, { district: '福田区' });
    const url = new URL(href, 'http://x');
    expect(url.pathname).toBe(RECORDS_PATH);
    expect(url.searchParams.get('range')).toBe('week');
    expect(url.searchParams.get('district')).toBe('福田区');
  });

  test('自定义范围带上起止日期', () => {
    const href = buildRecordsHref(
      { range: 'custom', dateFrom: '2026-06-01', dateTo: '2026-06-30' },
      { status: '待审核' }
    );
    const url = new URL(href, 'http://x');
    expect(url.searchParams.get('dateFrom')).toBe('2026-06-01');
    expect(url.searchParams.get('dateTo')).toBe('2026-06-30');
    expect(url.searchParams.get('status')).toBe('待审核');
  });

  test('忽略空值', () => {
    const href = buildRecordsHref({ range: 'month', dateFrom: null }, {});
    const url = new URL(href, 'http://x');
    expect(url.searchParams.has('dateFrom')).toBe(false);
    expect(url.searchParams.get('range')).toBe('month');
  });
});

describe('insightToPatch', () => {
  test('filter-district 映射到 district', () => {
    const insight = { action: { type: 'filter-district', value: '龙岗区' } } as InsightItem;
    expect(insightToPatch(insight)).toEqual({ district: '龙岗区' });
  });

  test('sort 映射到 sort', () => {
    const insight = { action: { type: 'sort', value: 'responseMinutes' } } as InsightItem;
    expect(insightToPatch(insight)).toEqual({ sort: 'responseMinutes' });
  });
});
