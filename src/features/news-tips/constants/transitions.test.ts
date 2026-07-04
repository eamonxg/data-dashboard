import { describe, expect, test } from 'bun:test';

import { canTransition, requiresReason, TERMINAL_STATUSES } from './transitions';

describe('canTransition', () => {
  test('待审核可到跟进中和不予采用', () => {
    expect(canTransition('待审核', '跟进中')).toBe(true);
    expect(canTransition('待审核', '不予采用')).toBe(true);
  });

  test('待审核不能直接到已采用', () => {
    expect(canTransition('待审核', '已采用')).toBe(false);
  });

  test('跟进中可到已采用/不予采用/退回待审核', () => {
    expect(canTransition('跟进中', '已采用')).toBe(true);
    expect(canTransition('跟进中', '不予采用')).toBe(true);
    expect(canTransition('跟进中', '待审核')).toBe(true);
  });

  test('终态不能拖出', () => {
    expect(canTransition('已采用', '跟进中')).toBe(false);
    expect(canTransition('不予采用', '待审核')).toBe(false);
  });

  test('同列不算流转', () => {
    expect(canTransition('待审核', '待审核')).toBe(false);
  });
});

describe('requiresReason', () => {
  test('落到不予采用需要理由', () => {
    expect(requiresReason('不予采用')).toBe(true);
    expect(requiresReason('跟进中')).toBe(false);
  });
});

describe('TERMINAL_STATUSES', () => {
  test('含已采用与不予采用', () => {
    expect(TERMINAL_STATUSES).toContain('已采用');
    expect(TERMINAL_STATUSES).toContain('不予采用');
  });
});
