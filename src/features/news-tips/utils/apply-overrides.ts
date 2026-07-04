import type { NewsTipRecordWithPriority, OverridesMap } from '../api/types';
import { derivePriority } from '../lib/priority';

export function applyOverrides(
  records: NewsTipRecordWithPriority[],
  overrides: OverridesMap,
  now: Date
): NewsTipRecordWithPriority[] {
  if (Object.keys(overrides).length === 0) return records;

  return records.map((record) => {
    const override = overrides[record.id];
    if (!override) return record;

    const timeline =
      override.timelineAppends.length === 0
        ? record.timeline
        : [...record.timeline, ...override.timelineAppends].toSorted(
            (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()
          );

    const next = {
      ...record,
      status: override.status ?? record.status,
      assignee: override.assignee ?? record.assignee,
      timeline
    };

    return derivePriority(next, now);
  });
}
