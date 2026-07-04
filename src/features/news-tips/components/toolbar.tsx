'use client';

import { useMemo } from 'react';
import type { DateRange } from 'react-day-picker';
import { useIsFetching, useQueryClient } from '@tanstack/react-query';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Icons } from '@/components/icons';
import { newsTipKeys } from '@/features/news-tips/api/queries';
import { TIME_RANGE_OPTIONS } from '@/features/news-tips/constants/options';
import { useNewsTipParams } from '@/features/news-tips/hooks/use-news-tip-params';
import type { TimeRange } from '@/features/news-tips/api/types';

function parseDate(value: string | null): Date | undefined {
  if (!value) return undefined;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return undefined;
  const [, year, month, day] = match;
  return new Date(Number(year), Number(month) - 1, Number(day));
}

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDateLabel(from: string | null, to: string | null) {
  if (!from && !to) return '选择日期';
  if (from && to) return `${from} 至 ${to}`;
  return from ?? to ?? '选择日期';
}

export function CockpitToolbar() {
  const { params, setParams } = useNewsTipParams();
  const queryClient = useQueryClient();
  const isFetching = useIsFetching({ queryKey: newsTipKeys.all }) > 0;
  const selectedRange = useMemo<DateRange | undefined>(() => {
    const from = parseDate(params.dateFrom);
    const to = parseDate(params.dateTo);
    if (!from && !to) return undefined;
    return { from, to };
  }, [params.dateFrom, params.dateTo]);

  const handleRangeChange = (value: string) => {
    const range = value as TimeRange;

    void setParams({
      range,
      ...(range === 'custom' ? {} : { dateFrom: null, dateTo: null })
    });
  };

  const handleDateSelect = (range: DateRange | undefined) => {
    void setParams({
      range: 'custom',
      dateFrom: range?.from ? formatDate(range.from) : null,
      dateTo: range?.to ? formatDate(range.to) : range?.from ? formatDate(range.from) : null
    });
  };

  const handleRefresh = () => {
    void queryClient.invalidateQueries({ queryKey: newsTipKeys.all });
  };

  return (
    <div className='flex flex-wrap items-center gap-2'>
      <Tabs value={params.range} onValueChange={handleRangeChange}>
        <TabsList>
          {TIME_RANGE_OPTIONS.map((option) => (
            <TabsTrigger key={option.value} value={option.value}>
              {option.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <Popover>
        <PopoverTrigger asChild>
          <Button variant='outline' size='sm' aria-label='选择自定义日期范围'>
            <Icons.calendar data-icon='inline-start' />
            <span className='hidden sm:inline'>
              {formatDateLabel(params.dateFrom, params.dateTo)}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent align='end' className='w-auto p-0'>
          <Calendar
            mode='range'
            numberOfMonths={2}
            selected={selectedRange}
            onSelect={handleDateSelect}
          />
        </PopoverContent>
      </Popover>

      <Button
        variant='outline'
        size='icon'
        isLoading={isFetching}
        onClick={handleRefresh}
        aria-label='刷新'
      >
        <Icons.refresh />
      </Button>
    </div>
  );
}
