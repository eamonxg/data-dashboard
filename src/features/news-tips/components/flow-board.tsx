'use client';

import { useState, type ReactNode } from 'react';
import {
  DndContext,
  DragOverlay,
  useDroppable,
  type DragStartEvent,
  type DragEndEvent
} from '@dnd-kit/core';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { NewsTipRecordWithPriority, NewsTipStatus } from '@/features/news-tips/api/types';
import { FlowCard, FlowCardOverlay } from '@/features/news-tips/components/flow-card';
import {
  DetailDialog,
  NoteDialog,
  ReassignDialog,
  RejectDialog
} from '@/features/news-tips/components/flow-dialogs';
import { canTransition, requiresReason } from '@/features/news-tips/constants/transitions';
import { useFlowActions } from '@/features/news-tips/hooks/use-flow-actions';
import { useNewsTipParams } from '@/features/news-tips/hooks/use-news-tip-params';
import { useRecordsWithOverrides } from '@/features/news-tips/hooks/use-records-with-overrides';
import { groupRecordsByStatus } from '@/features/news-tips/utils/analytics';
import { cn } from '@/lib/utils';

type DialogState =
  | { kind: 'reject'; record: NewsTipRecordWithPriority; to: NewsTipStatus }
  | { kind: 'reassign'; record: NewsTipRecordWithPriority }
  | { kind: 'note'; record: NewsTipRecordWithPriority }
  | { kind: 'detail'; record: NewsTipRecordWithPriority }
  | null;

function Column({
  status,
  count,
  activeFrom,
  children
}: {
  status: NewsTipStatus;
  count: number;
  activeFrom: NewsTipStatus | null;
  children: ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const legal = activeFrom !== null && canTransition(activeFrom, status);
  const illegal = activeFrom !== null && activeFrom !== status && !legal;

  return (
    <Card className='flex flex-col'>
      <CardHeader className='flex flex-row items-center justify-between pb-2'>
        <CardTitle className='text-sm font-medium'>{status}</CardTitle>
        <Badge variant='secondary'>{count}</Badge>
      </CardHeader>
      <CardContent
        ref={setNodeRef}
        className={cn(
          'grid min-h-32 content-start gap-2 overflow-y-auto rounded-md transition-colors md:max-h-[70vh]',
          legal && isOver && 'bg-primary/5 ring-primary ring-2',
          legal && !isOver && 'ring-primary/40 ring-1',
          illegal && 'opacity-50'
        )}
      >
        {children}
      </CardContent>
    </Card>
  );
}

export function FlowBoard() {
  const { filters } = useNewsTipParams();
  const { items } = useRecordsWithOverrides(filters);
  const groups = groupRecordsByStatus(items);
  const { moveStatus, reassign, addNote, revert } = useFlowActions();

  const [activeFrom, setActiveFrom] = useState<NewsTipStatus | null>(null);
  const [activeRecord, setActiveRecord] = useState<NewsTipRecordWithPriority | null>(null);
  const [dialog, setDialog] = useState<DialogState>(null);

  function handleDragStart(event: DragStartEvent) {
    setActiveFrom((event.active.data.current?.status as NewsTipStatus) ?? null);
    setActiveRecord(items.find((item) => item.id === String(event.active.id)) ?? null);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveFrom(null);
    setActiveRecord(null);

    const to = event.over?.id as NewsTipStatus | undefined;
    const record = items.find((item) => item.id === String(event.active.id));

    if (!to || !record || !canTransition(record.status, to)) return;

    if (requiresReason(to)) {
      setDialog({ kind: 'reject', record, to });
      return;
    }

    moveStatus(record, to);
  }

  return (
    <div className='grid gap-4'>
      <DndContext
        onDragStart={handleDragStart}
        onDragCancel={() => {
          setActiveFrom(null);
          setActiveRecord(null);
        }}
        onDragEnd={handleDragEnd}
      >
        <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
          {groups.map((group) => (
            <Column
              key={group.status}
              status={group.status}
              count={group.items.length}
              activeFrom={activeFrom}
            >
              {group.items.length === 0 ? (
                <p className='text-muted-foreground py-6 text-center text-xs'>暂无线索</p>
              ) : (
                group.items.map((record) => (
                  <FlowCard
                    key={record.id}
                    record={record}
                    onDetail={() => setDialog({ kind: 'detail', record })}
                    onReassign={() => setDialog({ kind: 'reassign', record })}
                    onNote={() => setDialog({ kind: 'note', record })}
                    onRevert={() => revert(record)}
                  />
                ))
              )}
            </Column>
          ))}
        </div>
        <DragOverlay>{activeRecord ? <FlowCardOverlay record={activeRecord} /> : null}</DragOverlay>
      </DndContext>

      <RejectDialog
        open={dialog?.kind === 'reject'}
        onOpenChange={(open) => !open && setDialog(null)}
        onConfirm={(reason) => {
          if (dialog?.kind === 'reject') moveStatus(dialog.record, dialog.to, reason);
        }}
      />
      <ReassignDialog
        open={dialog?.kind === 'reassign'}
        onOpenChange={(open) => !open && setDialog(null)}
        current={dialog?.kind === 'reassign' ? dialog.record.assignee : ''}
        onConfirm={(assignee) => {
          if (dialog?.kind === 'reassign') reassign(dialog.record, assignee);
        }}
      />
      <NoteDialog
        open={dialog?.kind === 'note'}
        onOpenChange={(open) => !open && setDialog(null)}
        onConfirm={(text) => {
          if (dialog?.kind === 'note') addNote(dialog.record, text);
        }}
      />
      <DetailDialog
        open={dialog?.kind === 'detail'}
        onOpenChange={(open) => !open && setDialog(null)}
        record={dialog?.kind === 'detail' ? dialog.record : null}
      />
    </div>
  );
}
