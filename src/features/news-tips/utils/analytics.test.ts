import { describe, expect, test } from 'bun:test';

import type { NewsTipRecordWithPriority } from '../api/types';
import { groupRecordsByStatus, selectTodoItems } from './analytics';

function record(
  id: string,
  priorityLevel: NewsTipRecordWithPriority['priorityLevel'],
  status: NewsTipRecordWithPriority['status']
): NewsTipRecordWithPriority {
  return { id, priorityLevel, status } as NewsTipRecordWithPriority;
}

describe('selectTodoItems', () => {
  test('高优先级优先，其次中优先级，截断到 limit', () => {
    const records = [
      record('a', 'low', '已采用'),
      record('b', 'high', '待审核'),
      record('c', 'medium', '跟进中'),
      record('d', 'high', '跟进中')
    ];
    const todo = selectTodoItems(records, 2);
    expect(todo.map((r) => r.id)).toEqual(['b', 'd']);
  });

  test('高优先不足时用中优先补足', () => {
    const records = [record('a', 'medium', '跟进中'), record('b', 'high', '待审核')];
    expect(selectTodoItems(records, 5).map((r) => r.id)).toEqual(['b', 'a']);
  });
});

describe('groupRecordsByStatus', () => {
  test('按待审核/跟进中/已采用/不予采用四列分组', () => {
    const records = [
      record('a', 'high', '待审核'),
      record('b', 'low', '已采用'),
      record('c', 'medium', '待审核')
    ];
    const groups = groupRecordsByStatus(records);
    expect(groups.map((g) => g.status)).toEqual(['待审核', '跟进中', '已采用', '不予采用']);
    expect(groups[0].items.map((r) => r.id)).toEqual(['a', 'c']);
    expect(groups[1].items).toEqual([]);
  });
});
