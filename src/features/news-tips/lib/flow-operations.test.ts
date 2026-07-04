import { describe, expect, test } from 'bun:test';

import type { NewsTipRecordWithPriority } from '../api/types';
import { buildMove, buildNote, buildReassign, buildRevert, OPERATOR } from './flow-operations';

const NOW = 1751616000000;

function rec(status: NewsTipRecordWithPriority['status'] = '待审核'): NewsTipRecordWithPriority {
  return {
    id: 'r1',
    status,
    assignee: '林嘉豪',
    department: '街道办事处',
    timeline: [
      {
        time: '2026-07-04T07:00:00.000Z',
        action: '线索提交',
        operator: '陈先生',
        note: 'n'
      }
    ]
  } as NewsTipRecordWithPriority;
}

describe('buildMove', () => {
  test('待审核→跟进中 追加首次审核轨迹', () => {
    const { override, operation } = buildMove(rec('待审核'), '跟进中', undefined, null, NOW);

    expect(override.status).toBe('跟进中');
    expect(override.timelineAppends.at(-1)?.action).toBe('首次审核');
    expect(operation.kind).toBe('move');
    expect(operation.prevOverride).toBeNull();
  });

  test('→不予采用 记录 rejectedFrom 与理由', () => {
    const { override } = buildMove(rec('跟进中'), '不予采用', '信息不实', null, NOW);

    expect(override.status).toBe('不予采用');
    expect(override.rejectedFrom).toBe('跟进中');
    expect(override.timelineAppends.at(-1)?.note).toContain('信息不实');
    expect(override.timelineAppends.at(-1)?.operator).toBe(OPERATOR);
  });

  test('→已采用 追加采用发布', () => {
    const { override } = buildMove(rec('跟进中'), '已采用', undefined, null, NOW);

    expect(override.timelineAppends.at(-1)?.action).toBe('采用发布');
  });
});

describe('buildReassign', () => {
  test('改 assignee 并追加编辑分拨', () => {
    const { override } = buildReassign(rec(), '周敏仪', null, NOW);

    expect(override.assignee).toBe('周敏仪');
    expect(override.timelineAppends.at(-1)?.action).toBe('编辑分拨');
  });
});

describe('buildNote', () => {
  test('仅追加记者跟进备注,不改状态', () => {
    const { override } = buildNote(rec('跟进中'), '已联系街道核实', null, NOW);

    expect(override.status).toBeUndefined();
    expect(override.timelineAppends.at(-1)?.action).toBe('记者跟进');
    expect(override.timelineAppends.at(-1)?.note).toBe('已联系街道核实');
  });
});

describe('buildRevert', () => {
  test('已采用撤回到跟进中', () => {
    const prev = { id: 'r1', status: '已采用' as const, timelineAppends: [], updatedAt: '' };
    const { to } = buildRevert(rec('已采用'), prev, NOW);

    expect(to).toBe('跟进中');
  });

  test('不予采用撤回到 rejectedFrom', () => {
    const prev = {
      id: 'r1',
      status: '不予采用' as const,
      rejectedFrom: '待审核' as const,
      timelineAppends: [],
      updatedAt: ''
    };
    const { to } = buildRevert(rec('不予采用'), prev, NOW);

    expect(to).toBe('待审核');
  });
});
