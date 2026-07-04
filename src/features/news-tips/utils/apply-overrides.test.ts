import { describe, expect, test } from 'bun:test';

import type { NewsTipRecordWithPriority, TimelineEntry } from '../api/types';
import { applyOverrides } from './apply-overrides';

const NOW = new Date('2026-07-04T08:00:00.000Z');

function baseRecord(): NewsTipRecordWithPriority {
  return {
    id: 'SZ-BL-20260704-001',
    title: 't',
    description: 'd',
    category: '民生投诉',
    sourcePlatform: '深圳新闻网',
    sourceUrl: null,
    referenceTopic: 'x',
    channel: '报料小程序',
    status: '待审核',
    district: '南山区',
    street: null,
    locationName: null,
    reporter: '陈先生',
    assignee: '林嘉豪',
    department: null,
    createdAt: '2026-07-04T07:00:00.000Z',
    firstResponseAt: null,
    responseMinutes: null,
    riskTags: [],
    timeline: [
      { time: '2026-07-04T07:00:00.000Z', action: '线索提交', operator: '陈先生', note: 'n' }
    ],
    priorityLevel: 'low',
    priorityLabel: '常规',
    priorityReason: 'r',
    priorityScore: 1,
    ageMinutes: 60
  };
}

const append: TimelineEntry = {
  time: '2026-07-04T07:30:00.000Z',
  action: '首次审核',
  operator: '当前编辑',
  note: '审核通过'
};

describe('applyOverrides', () => {
  test('无 override 原样返回', () => {
    const records = [baseRecord()];
    expect(applyOverrides(records, {}, NOW)).toEqual(records);
  });

  test('覆盖状态并重算优先级', () => {
    const result = applyOverrides(
      [baseRecord()],
      {
        'SZ-BL-20260704-001': {
          id: 'SZ-BL-20260704-001',
          status: '跟进中',
          timelineAppends: [],
          updatedAt: ''
        }
      },
      NOW
    );

    expect(result[0].status).toBe('跟进中');
    expect(result[0].priorityLabel).toBeDefined();
  });

  test('覆盖 assignee', () => {
    const result = applyOverrides(
      [baseRecord()],
      {
        'SZ-BL-20260704-001': {
          id: 'SZ-BL-20260704-001',
          assignee: '周敏仪',
          timelineAppends: [],
          updatedAt: ''
        }
      },
      NOW
    );

    expect(result[0].assignee).toBe('周敏仪');
  });

  test('合并并按时间排序 timeline', () => {
    const result = applyOverrides(
      [baseRecord()],
      {
        'SZ-BL-20260704-001': {
          id: 'SZ-BL-20260704-001',
          timelineAppends: [append],
          updatedAt: ''
        }
      },
      NOW
    );

    expect(result[0].timeline).toHaveLength(2);
    expect(result[0].timeline[1]).toEqual(append);
  });
});
