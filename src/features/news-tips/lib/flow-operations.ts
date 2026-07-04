import type {
  FlowOperation,
  NewsTipOverride,
  NewsTipRecordWithPriority,
  NewsTipStatus,
  TimelineEntry
} from '../api/types';

export const OPERATOR = '当前编辑';

function operationId(recordId: string, now: number): string {
  return `${recordId}-${now}`;
}

function withAppend(
  prev: NewsTipOverride | null,
  id: string,
  entry: TimelineEntry
): NewsTipOverride {
  const base: NewsTipOverride = prev ?? { id, timelineAppends: [], updatedAt: '' };
  return {
    ...base,
    timelineAppends: [...base.timelineAppends, entry],
    updatedAt: entry.time
  };
}

function moveEntry(to: NewsTipStatus, reason: string | undefined, iso: string): TimelineEntry {
  if (to === '跟进中') {
    return { time: iso, action: '首次审核', operator: OPERATOR, note: '审核通过,进入跟进' };
  }

  if (to === '已采用') {
    return { time: iso, action: '采用发布', operator: OPERATOR, note: '线索已采用并进入发布记录' };
  }

  if (to === '不予采用') {
    return {
      time: iso,
      action: '不予采用',
      operator: OPERATOR,
      note: `不予采用:${reason ?? '未填写理由'}`
    };
  }

  return { time: iso, action: '编辑分拨', operator: OPERATOR, note: '退回待审核' };
}

export function buildMove(
  record: NewsTipRecordWithPriority,
  to: NewsTipStatus,
  reason: string | undefined,
  prev: NewsTipOverride | null,
  now: number
): { override: NewsTipOverride; operation: FlowOperation } {
  const iso = new Date(now).toISOString();
  let override = withAppend(prev, record.id, moveEntry(to, reason, iso));
  override = { ...override, status: to };

  if (to === '不予采用') {
    override = { ...override, rejectedFrom: record.status };
  }

  return {
    override,
    operation: {
      id: operationId(record.id, now),
      recordId: record.id,
      kind: 'move',
      prevOverride: prev,
      label: `已流转到${to}`
    }
  };
}

export function buildReassign(
  record: NewsTipRecordWithPriority,
  assignee: string,
  prev: NewsTipOverride | null,
  now: number
): { override: NewsTipOverride; operation: FlowOperation } {
  const iso = new Date(now).toISOString();
  const entry: TimelineEntry = {
    time: iso,
    action: '编辑分拨',
    operator: OPERATOR,
    note: `转派给${assignee}`
  };
  const override = { ...withAppend(prev, record.id, entry), assignee };

  return {
    override,
    operation: {
      id: operationId(record.id, now),
      recordId: record.id,
      kind: 'reassign',
      prevOverride: prev,
      label: `已转派给${assignee}`
    }
  };
}

export function buildNote(
  record: NewsTipRecordWithPriority,
  text: string,
  prev: NewsTipOverride | null,
  now: number
): { override: NewsTipOverride; operation: FlowOperation } {
  const iso = new Date(now).toISOString();
  const entry: TimelineEntry = { time: iso, action: '记者跟进', operator: OPERATOR, note: text };

  return {
    override: withAppend(prev, record.id, entry),
    operation: {
      id: operationId(record.id, now),
      recordId: record.id,
      kind: 'note',
      prevOverride: prev,
      label: '已追加备注'
    }
  };
}

export function buildRevert(
  record: NewsTipRecordWithPriority,
  prev: NewsTipOverride | null,
  now: number
): { override: NewsTipOverride | null; operation: FlowOperation; to: NewsTipStatus } {
  const to: NewsTipStatus =
    record.status === '不予采用' ? (prev?.rejectedFrom ?? '跟进中') : '跟进中';
  const iso = new Date(now).toISOString();
  const entry: TimelineEntry = {
    time: iso,
    action: '编辑分拨',
    operator: OPERATOR,
    note: `撤回到${to}`
  };
  const base = withAppend(prev, record.id, entry);
  const override: NewsTipOverride = { ...base, status: to, rejectedFrom: undefined };

  return {
    override,
    operation: {
      id: operationId(record.id, now),
      recordId: record.id,
      kind: 'revert',
      prevOverride: prev,
      label: `已撤回到${to}`
    },
    to
  };
}
