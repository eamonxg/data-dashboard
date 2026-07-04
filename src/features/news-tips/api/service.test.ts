import { describe, expect, test } from 'bun:test';

import {
  NEWS_TIP_CATEGORIES,
  NEWS_TIP_CHANNELS,
  NEWS_TIP_DISTRICTS,
  NEWS_TIP_SOURCE_PLATFORMS,
  NEWS_TIP_STATUSES
} from '../constants/options';
import { getAllNewsTipRecords, getDashboardData, getRecords } from './service';
import type { NewsTipRecord } from './types';

const GUANGZHOU_DISTRICT_NAMES = [
  [36234, 31168],
  [22825, 27827],
  [33620, 28286],
  [28023, 29664],
  [30333, 20113],
  [40644, 22484],
  [30058, 31162],
  [33457, 37117],
  [21335, 27801],
  [20174, 21270],
  [22686, 22478]
].map((chars) => String.fromCodePoint(...chars));

function uniqueDays(records: NewsTipRecord[]) {
  return new Set(records.map((record) => record.createdAt.slice(0, 10)));
}

function sortedUniqueDays(records: NewsTipRecord[]) {
  return Array.from(uniqueDays(records)).toSorted();
}

function generatedDateRange(records: NewsTipRecord[]) {
  const days = sortedUniqueDays(records);
  const firstDay = days[0];
  const lastDay = days[days.length - 1];

  if (!firstDay || !lastDay) {
    throw new Error('Expected generated news tip records to contain dated rows');
  }

  return { firstDay, lastDay };
}

describe('Shenzhen news tip service data contract', () => {
  test('uses all Shenzhen districts and no Guangzhou district names', async () => {
    const records = await getAllNewsTipRecords();
    const districtSet = new Set(records.map((record) => record.district));

    for (const district of NEWS_TIP_DISTRICTS) {
      expect(districtSet.has(district)).toBe(true);
    }

    for (const record of records) {
      const searchableText = [
        record.district,
        record.street,
        record.locationName,
        record.title,
        record.description
      ]
        .filter(Boolean)
        .join(' ');

      for (const name of GUANGZHOU_DISTRICT_NAMES) {
        expect(searchableText.includes(name)).toBe(false);
        expect(searchableText.includes(`${name}区`)).toBe(false);
      }
    }
  });

  test('generates at least 600 records across at least 170 unique days', async () => {
    const records = await getAllNewsTipRecords();

    expect(records.length).toBeGreaterThanOrEqual(600);
    expect(uniqueDays(records).size).toBeGreaterThanOrEqual(170);
  });

  test('today range has at least 12 generated records', async () => {
    const records = await getAllNewsTipRecords();
    const { lastDay } = generatedDateRange(records);
    const result = await getRecords({ range: 'today' });

    expect(result.items.length).toBeGreaterThanOrEqual(12);
    expect(result.rangeTotalItems).toBeGreaterThanOrEqual(12);

    for (const record of result.items) {
      expect(record.createdAt.slice(0, 10)).toBe(lastDay);
    }
  });

  test('covers every category, channel, status, and source platform', async () => {
    const records = await getAllNewsTipRecords();

    for (const category of NEWS_TIP_CATEGORIES) {
      expect(
        records.filter((record) => record.category === category).length
      ).toBeGreaterThanOrEqual(30);
    }

    for (const sourcePlatform of NEWS_TIP_SOURCE_PLATFORMS) {
      expect(records.some((record) => record.sourcePlatform === sourcePlatform)).toBe(true);
    }

    for (const channel of NEWS_TIP_CHANNELS) {
      expect(records.some((record) => record.channel === channel)).toBe(true);
    }

    for (const status of NEWS_TIP_STATUSES) {
      expect(records.some((record) => record.status === status)).toBe(true);
    }
  });

  test('filters by source platform', async () => {
    const records = await getAllNewsTipRecords();
    const { firstDay, lastDay } = generatedDateRange(records);
    const sourcePlatform = NEWS_TIP_SOURCE_PLATFORMS[0];
    const expected = records.filter((record) => record.sourcePlatform === sourcePlatform);
    const result = await getRecords({
      range: 'custom',
      dateFrom: firstDay,
      dateTo: lastDay,
      sourcePlatform: [sourcePlatform]
    });

    expect(result.items.length).toBe(expected.length);
    expect(result.items.length).toBeGreaterThan(0);

    for (const record of result.items) {
      expect(record.sourcePlatform).toBe(sourcePlatform);
    }
  });

  test('returns dashboard aggregation shape for source, status, category, and district buckets', async () => {
    const records = await getAllNewsTipRecords();
    const { firstDay, lastDay } = generatedDateRange(records);
    const dashboard = await getDashboardData({
      range: 'custom',
      dateFrom: firstDay,
      dateTo: lastDay
    });

    expect(dashboard.sources.length).toBe(NEWS_TIP_SOURCE_PLATFORMS.length);
    expect(dashboard.statuses.length).toBe(NEWS_TIP_STATUSES.length);
    expect(dashboard.categories.length).toBe(NEWS_TIP_CATEGORIES.length);
    expect(dashboard.districts.length).toBe(NEWS_TIP_DISTRICTS.length);

    expect(dashboard.sources[0]).toHaveProperty('sourcePlatform');
    expect(dashboard.sources[0]).toHaveProperty('count');
    expect(dashboard.statuses[0]).toHaveProperty('status');
    expect(dashboard.statuses[0]).toHaveProperty('completionShare');
    expect(dashboard.categories[0]).toHaveProperty('category');
    expect(dashboard.categories[0]).toHaveProperty('adopted');
    expect(dashboard.districts[0]).toHaveProperty('district');
    expect(dashboard.districts[0]).toHaveProperty('pendingCount');
  });

  test('keeps location, source reference, and timeline fields populated', async () => {
    const records = await getAllNewsTipRecords();
    const locatedRecords = records.filter((record) => record.street || record.locationName);
    const referencedRecords = records.filter((record) => record.sourceUrl || record.referenceTopic);

    expect(locatedRecords.length / records.length).toBeGreaterThanOrEqual(0.8);
    expect(referencedRecords.length).toBeGreaterThanOrEqual(20);

    for (const record of records.slice(0, 50)) {
      expect(record.id).toMatch(/^SZ-BL-\d{8}-\d{3}$/);
      expect(record.sourcePlatform).toBeTruthy();
      expect(record.referenceTopic).toBeTruthy();
      expect(Array.isArray(record.riskTags)).toBe(true);
      expect(record.timeline.length).toBeGreaterThanOrEqual(record.status === '待审核' ? 1 : 2);
    }
  });

  test('filters custom date ranges inclusively through end of day', async () => {
    const records = await getAllNewsTipRecords();
    const days = sortedUniqueDays(records);
    const targetDay = days[Math.floor(days.length / 2)];

    if (!targetDay) {
      throw new Error('Expected generated news tip records to contain a middle date');
    }

    const expectedCount = records.filter((record) => record.createdAt.startsWith(targetDay)).length;
    const result = await getRecords({
      range: 'custom',
      dateFrom: targetDay,
      dateTo: targetDay
    });

    expect(result.items.length).toBe(expectedCount);
    expect(result.items.length).toBeGreaterThan(0);

    for (const record of result.items) {
      expect(record.createdAt.slice(0, 10)).toBe(targetDay);
    }
  });
});
