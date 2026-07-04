'use client';

import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { useNewsTipParams } from '@/features/news-tips/hooks/use-news-tip-params';

export function TodayTodoButton() {
  const { setParams } = useNewsTipParams();

  const showTodayTodo = () => {
    void setParams({
      range: 'today',
      dateFrom: null,
      dateTo: null,
      status: ['待审核'],
      category: [],
      sourcePlatform: [],
      channel: [],
      district: [],
      priority: [],
      sort: 'priority'
    });
  };

  return (
    <Button variant='outline' size='sm' onClick={showTodayTodo}>
      <Icons.clock />
      今日待办
    </Button>
  );
}
