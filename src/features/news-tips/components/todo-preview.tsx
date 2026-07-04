'use client';

import Link from 'next/link';

import { Icons } from '@/components/icons';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { NewsTipRecordWithPriority, PriorityLevel } from '@/features/news-tips/api/types';
import { selectTodoItems } from '@/features/news-tips/utils/analytics';

const PRIORITY_BADGE: Record<PriorityLevel, 'destructive' | 'secondary' | 'outline'> = {
  high: 'destructive',
  medium: 'secondary',
  low: 'outline'
};

export function TodoPreview({ records }: { records: NewsTipRecordWithPriority[] }) {
  const items = selectTodoItems(records, 5);

  return (
    <Card>
      <CardHeader className='flex flex-row items-center justify-between pb-2'>
        <CardTitle className='text-sm font-medium'>待办预览 · 高优先级</CardTitle>
        <Button asChild variant='ghost' size='sm'>
          <Link href='/dashboard/news-tips/records?priority=high&sort=priority'>
            查看全部
            <Icons.arrowRight />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className='grid gap-2'>
        {items.length === 0 ? (
          <p className='text-muted-foreground py-6 text-center text-sm'>当前范围暂无高优先级待办</p>
        ) : (
          items.map((record) => (
            <Link
              key={record.id}
              href={`/dashboard/news-tips/records?priority=${record.priorityLevel}`}
              className='hover:bg-muted/70 grid min-w-0 gap-1 rounded-lg border p-3 transition-colors'
            >
              <div className='flex min-w-0 items-center justify-between gap-2'>
                <span className='min-w-0 truncate text-sm font-medium'>{record.title}</span>
                <Badge className='shrink-0' variant={PRIORITY_BADGE[record.priorityLevel]}>
                  {record.priorityLabel}
                </Badge>
              </div>
              <span className='text-muted-foreground text-xs'>
                {record.district}
                {record.street ?? ''} · {record.category} · {record.status}
              </span>
            </Link>
          ))
        )}
      </CardContent>
    </Card>
  );
}
