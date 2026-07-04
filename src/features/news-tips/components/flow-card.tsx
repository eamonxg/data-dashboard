'use client';

import { useDraggable } from '@dnd-kit/core';

import { Icons } from '@/components/icons';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import type { NewsTipRecordWithPriority } from '@/features/news-tips/api/types';
import { TERMINAL_STATUSES } from '@/features/news-tips/constants/transitions';
import { cn } from '@/lib/utils';

interface FlowCardProps {
  record: NewsTipRecordWithPriority;
  onDetail: () => void;
  onReassign: () => void;
  onNote: () => void;
  onRevert: () => void;
}

export function FlowCard({ record, onDetail, onReassign, onNote, onRevert }: FlowCardProps) {
  const isTerminal = TERMINAL_STATUSES.includes(record.status);
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: record.id,
    disabled: isTerminal,
    data: { status: record.status }
  });
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'bg-card grid gap-2 rounded-lg border p-3 shadow-xs transition-shadow',
        isDragging && 'z-10 opacity-50 shadow-lg'
      )}
    >
      <div className='flex items-start justify-between gap-2'>
        <button
          type='button'
          className={cn(
            'min-w-0 flex-1 touch-none text-left text-sm font-medium',
            isTerminal ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'
          )}
          disabled={isTerminal}
          {...(isTerminal ? {} : { ...attributes, ...listeners })}
        >
          <span className='block truncate'>{record.title}</span>
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant='ghost'
              size='icon'
              className='size-7 shrink-0'
              aria-label='打开操作菜单'
            >
              <Icons.ellipsis className='size-4' />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end'>
            <DropdownMenuItem onSelect={onDetail}>查看详情</DropdownMenuItem>
            <DropdownMenuItem onSelect={onReassign}>转派处理人</DropdownMenuItem>
            <DropdownMenuItem onSelect={onNote}>追加备注</DropdownMenuItem>
            {isTerminal ? <DropdownMenuItem onSelect={onRevert}>撤回</DropdownMenuItem> : null}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <span className='text-muted-foreground text-xs'>
        {record.district} · {record.category}
      </span>
      <div className='flex items-center justify-between gap-2 text-xs'>
        <Badge variant='outline' className='max-w-[60%] truncate'>
          {record.priorityLabel}
        </Badge>
        <span className='text-muted-foreground truncate tabular-nums'>{record.assignee}</span>
      </div>
    </div>
  );
}
