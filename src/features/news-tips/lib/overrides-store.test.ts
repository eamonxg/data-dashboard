import { afterEach, beforeEach, describe, expect, test } from 'bun:test';

import type { NewsTipOverride } from '../api/types';
import { overridesStore } from './overrides-store';

function memoryStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => void map.set(key, value),
    removeItem: (key: string) => void map.delete(key)
  } as Storage;
}

const ov: NewsTipOverride = {
  id: 'a',
  status: '跟进中',
  timelineAppends: [],
  updatedAt: 'now'
};

beforeEach(() => {
  Object.defineProperty(globalThis, 'localStorage', {
    value: memoryStorage(),
    configurable: true
  });
  overridesStore.resetAll();
});

afterEach(() => {
  overridesStore.resetAll();
});

describe('overridesStore', () => {
  test('setOverride 后 getSnapshot 可读', () => {
    overridesStore.setOverride('a', ov);
    expect(overridesStore.getSnapshot()['a'].status).toBe('跟进中');
  });

  test('快照引用在变更后改变(供 useSyncExternalStore 判等)', () => {
    const before = overridesStore.getSnapshot();
    overridesStore.setOverride('a', ov);
    expect(overridesStore.getSnapshot()).not.toBe(before);
  });

  test('subscribe 在变更时被调用', () => {
    let calls = 0;
    const unsubscribe = overridesStore.subscribe(() => {
      calls += 1;
    });

    overridesStore.setOverride('a', ov);
    expect(calls).toBe(1);
    unsubscribe();
    overridesStore.setOverride('a', ov);
    expect(calls).toBe(1);
  });

  test('removeOverride 删除条目', () => {
    overridesStore.setOverride('a', ov);
    overridesStore.removeOverride('a');
    expect(overridesStore.getSnapshot()['a']).toBeUndefined();
  });

  test('getServerSnapshot 恒为稳定空对象', () => {
    expect(overridesStore.getServerSnapshot()).toEqual({});
    expect(overridesStore.getServerSnapshot()).toBe(overridesStore.getServerSnapshot());
  });
});
