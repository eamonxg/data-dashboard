'use client';

import { useCallback } from 'react';
import { toast } from 'sonner';

import type {
  FlowOperation,
  NewsTipOverride,
  NewsTipRecordWithPriority,
  NewsTipStatus
} from '../api/types';
import { buildMove, buildNote, buildReassign, buildRevert } from '../lib/flow-operations';
import { overridesStore } from '../lib/overrides-store';
import { useOverrides } from './use-overrides';

export function useFlowActions() {
  const overrides = useOverrides();

  const commit = useCallback(
    (recordId: string, override: NewsTipOverride | null, operation: FlowOperation) => {
      if (override === null) {
        overridesStore.removeOverride(recordId);
      } else {
        overridesStore.setOverride(recordId, override);
      }

      toast(operation.label, {
        action: {
          label: '撤销',
          onClick: () => {
            if (operation.prevOverride) {
              overridesStore.setOverride(recordId, operation.prevOverride);
            } else {
              overridesStore.removeOverride(recordId);
            }
          }
        }
      });
    },
    []
  );

  const moveStatus = useCallback(
    (record: NewsTipRecordWithPriority, to: NewsTipStatus, reason?: string) => {
      const prev = overrides[record.id] ?? null;
      const { override, operation } = buildMove(record, to, reason, prev, Date.now());
      commit(record.id, override, operation);
    },
    [commit, overrides]
  );

  const reassign = useCallback(
    (record: NewsTipRecordWithPriority, assignee: string) => {
      const prev = overrides[record.id] ?? null;
      const { override, operation } = buildReassign(record, assignee, prev, Date.now());
      commit(record.id, override, operation);
    },
    [commit, overrides]
  );

  const addNote = useCallback(
    (record: NewsTipRecordWithPriority, text: string) => {
      const prev = overrides[record.id] ?? null;
      const { override, operation } = buildNote(record, text, prev, Date.now());
      commit(record.id, override, operation);
    },
    [commit, overrides]
  );

  const revert = useCallback(
    (record: NewsTipRecordWithPriority) => {
      const prev = overrides[record.id] ?? null;
      const { override, operation } = buildRevert(record, prev, Date.now());
      commit(record.id, override, operation);
    },
    [commit, overrides]
  );

  return { moveStatus, reassign, addNote, revert };
}
