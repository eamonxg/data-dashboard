'use client';

import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import type { NewsTipRecordWithPriority } from '@/features/news-tips/api/types';
import { NEWS_TIP_ASSIGNEES } from '@/features/news-tips/constants/options';

const REJECT_PRESETS = ['信息不实', '重复线索', '不属实/无法核实', '不具备采用价值'];

type OpenProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function RejectDialog({
  open,
  onOpenChange,
  onConfirm
}: OpenProps & { onConfirm: (reason: string) => void }) {
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (open) setReason('');
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>不予采用</DialogTitle>
          <DialogDescription>请填写不予采用的理由,将记入处理轨迹。</DialogDescription>
        </DialogHeader>
        <div className='flex flex-wrap gap-2'>
          {REJECT_PRESETS.map((preset) => (
            <Button
              key={preset}
              type='button'
              variant='outline'
              size='sm'
              onClick={() => setReason(preset)}
            >
              {preset}
            </Button>
          ))}
        </div>
        <Textarea
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder='填写理由...'
          rows={3}
        />
        <DialogFooter>
          <Button type='button' variant='outline' onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            type='button'
            disabled={reason.trim().length === 0}
            onClick={() => {
              onConfirm(reason.trim());
              onOpenChange(false);
            }}
          >
            确认不予采用
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ReassignDialog({
  open,
  onOpenChange,
  current,
  onConfirm
}: OpenProps & { current: string; onConfirm: (assignee: string) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>转派处理人</DialogTitle>
          <DialogDescription>当前处理人:{current}</DialogDescription>
        </DialogHeader>
        <div className='grid grid-cols-2 gap-2 sm:grid-cols-3'>
          {NEWS_TIP_ASSIGNEES.filter((name) => name !== current).map((name) => (
            <Button
              key={name}
              type='button'
              variant='outline'
              onClick={() => {
                onConfirm(name);
                onOpenChange(false);
              }}
            >
              {name}
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function NoteDialog({
  open,
  onOpenChange,
  onConfirm
}: OpenProps & { onConfirm: (text: string) => void }) {
  const [text, setText] = useState('');

  useEffect(() => {
    if (open) setText('');
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>追加处理备注</DialogTitle>
          <DialogDescription>备注将作为「记者跟进」记入处理轨迹。</DialogDescription>
        </DialogHeader>
        <Textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder='填写处理进展...'
          rows={3}
        />
        <DialogFooter>
          <Button type='button' variant='outline' onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            type='button'
            disabled={text.trim().length === 0}
            onClick={() => {
              onConfirm(text.trim());
              onOpenChange(false);
            }}
          >
            追加备注
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function DetailDialog({
  open,
  onOpenChange,
  record
}: OpenProps & { record: NewsTipRecordWithPriority | null }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-h-[80vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle>{record?.title}</DialogTitle>
          <DialogDescription>
            {record ? `${record.district} · ${record.category} · ${record.assignee}` : ''}
          </DialogDescription>
        </DialogHeader>
        {record ? (
          <div className='grid gap-3 text-sm'>
            <p className='text-muted-foreground leading-6'>{record.description}</p>
            <div className='grid gap-2'>
              {record.timeline.map((entry, index) => (
                <div
                  key={`${entry.time}-${entry.action}-${index}`}
                  className='grid gap-0.5 border-l-2 pl-3'
                >
                  <span className='font-medium'>{entry.action}</span>
                  <span className='text-muted-foreground text-xs'>
                    {new Date(entry.time).toLocaleString('zh-CN')} · {entry.operator}
                  </span>
                  <span className='text-xs'>{entry.note}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
