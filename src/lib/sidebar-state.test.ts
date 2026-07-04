import { describe, expect, test } from 'bun:test';

import { getSidebarDefaultOpen } from './sidebar-state';

describe('getSidebarDefaultOpen', () => {
  test('defaults to expanded when no sidebar cookie exists', () => {
    expect(getSidebarDefaultOpen()).toBe(true);
  });

  test('respects an explicitly collapsed sidebar cookie', () => {
    expect(getSidebarDefaultOpen('false')).toBe(false);
  });

  test('respects an explicitly expanded sidebar cookie', () => {
    expect(getSidebarDefaultOpen('true')).toBe(true);
  });
});
