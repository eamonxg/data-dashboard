'use client';

import { useSuspenseQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { dashboardQueryOptions, recordsQueryOptions } from '@/features/news-tips/api/queries';
import { ActiveFilters } from '@/features/news-tips/components/active-filters';
import { CategoryBar } from '@/features/news-tips/components/category-bar';
import { ChannelPie } from '@/features/news-tips/components/channel-pie';
import { DistrictHeatGrid } from '@/features/news-tips/components/district-heat-grid';
import { WorkbenchNav } from '@/features/news-tips/components/section-nav';
import { TrendChart } from '@/features/news-tips/components/trend-chart';
import { useNewsTipFilterState } from '@/features/news-tips/hooks/use-news-tip-filter-state';

export function AnalyticsDashboard() {
  const { queryFilters, filterState, toggleFilter, removeFilter, clearFilters } =
    useNewsTipFilterState();
  const { data: dashboard } = useSuspenseQuery(dashboardQueryOptions(queryFilters));
  const { data: recordsResponse } = useSuspenseQuery(recordsQueryOptions(queryFilters));
  const records = recordsResponse.items;

  return (
    <div className='grid gap-4'>
      <WorkbenchNav />
      <ActiveFilters
        filters={filterState}
        resultCount={records.length}
        totalCount={recordsResponse.rangeTotalItems}
        updatedAt={dashboard.updatedAt}
        onRemove={removeFilter}
        onClear={clearFilters}
      />

      <div className='grid gap-4 xl:grid-cols-5'>
        <div className='xl:col-span-2'>
          <ChannelPie
            data={dashboard.channels}
            activeChannels={filterState.channel}
            onSelect={(channel) => toggleFilter('channel', channel)}
          />
        </div>
        <div className='xl:col-span-3'>
          <CategoryBar
            data={dashboard.categories}
            activeCategories={filterState.category}
            onSelect={(category) => toggleFilter('category', category)}
          />
        </div>
      </div>

      <div className='grid gap-4 xl:grid-cols-5'>
        <div className='xl:col-span-2'>
          <SourcePlatformPanel />
        </div>
        <div className='xl:col-span-3'>
          <StatusPanel />
        </div>
      </div>

      <DistrictHeatGrid
        data={dashboard.districts}
        activeDistricts={filterState.district}
        onSelect={(district) => toggleFilter('district', district)}
      />

      <TrendChart records={records} />
    </div>
  );
}

function SourcePlatformPanel() {
  const { queryFilters, filterState, toggleFilter } = useNewsTipFilterState();
  const { data } = useSuspenseQuery(dashboardQueryOptions(queryFilters));
  const total = data.sources.reduce((sum, item) => sum + item.count, 0);

  return (
    <Card>
      <CardHeader className='pb-2'>
        <CardTitle className='text-sm font-medium'>平台来源排行</CardTitle>
      </CardHeader>
      <CardContent className='grid gap-3'>
        {data.sources.map((item) => {
          const percent = total === 0 ? 0 : (item.count / total) * 100;
          const active = filterState.sourcePlatform.includes(item.sourcePlatform);

          return (
            <Button
              key={item.sourcePlatform}
              type='button'
              variant={active ? 'secondary' : 'ghost'}
              className='h-auto justify-start px-2 py-2'
              onClick={() => toggleFilter('sourcePlatform', item.sourcePlatform)}
            >
              <div className='grid w-full gap-2'>
                <div className='flex items-center justify-between gap-3'>
                  <span className='truncate text-sm font-medium'>{item.sourcePlatform}</span>
                  <span className='text-muted-foreground text-xs tabular-nums'>
                    {item.count} 条
                  </span>
                </div>
                <Progress value={percent} className='h-1.5' />
              </div>
            </Button>
          );
        })}
      </CardContent>
    </Card>
  );
}

function StatusPanel() {
  const { queryFilters, filterState, toggleFilter } = useNewsTipFilterState();
  const { data } = useSuspenseQuery(dashboardQueryOptions(queryFilters));
  const total = data.statuses.reduce((sum, item) => sum + item.count, 0);

  return (
    <Card>
      <CardHeader className='pb-2'>
        <CardTitle className='text-sm font-medium'>处置状态结构</CardTitle>
      </CardHeader>
      <CardContent className='grid gap-3 sm:grid-cols-2'>
        {data.statuses.map((item) => {
          const percent = total === 0 ? 0 : (item.count / total) * 100;
          const active = filterState.status.includes(item.status);

          return (
            <button
              key={item.status}
              type='button'
              className='hover:bg-muted/70 rounded-lg border p-3 text-left transition-colors'
              onClick={() => toggleFilter('status', item.status)}
            >
              <div className='flex items-center justify-between gap-3'>
                <Badge variant={active ? 'default' : 'outline'}>{item.status}</Badge>
                <span className='text-xl font-semibold tabular-nums'>{item.count}</span>
              </div>
              <div className='mt-3 grid gap-2'>
                <Progress value={percent} className='h-1.5' />
                <span className='text-muted-foreground text-xs tabular-nums'>
                  占当前结果 {percent.toFixed(1)}%
                </span>
              </div>
            </button>
          );
        })}
      </CardContent>
    </Card>
  );
}
