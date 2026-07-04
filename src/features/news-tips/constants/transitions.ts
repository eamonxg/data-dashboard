import type { NewsTipStatus } from '../api/types';

export const ALLOWED_TRANSITIONS: Record<NewsTipStatus, NewsTipStatus[]> = {
  待审核: ['跟进中', '不予采用'],
  跟进中: ['已采用', '不予采用', '待审核'],
  已采用: [],
  不予采用: []
};

export const TERMINAL_STATUSES: NewsTipStatus[] = ['已采用', '不予采用'];

export function canTransition(from: NewsTipStatus, to: NewsTipStatus): boolean {
  if (from === to) return false;
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export function requiresReason(to: NewsTipStatus): boolean {
  return to === '不予采用';
}
