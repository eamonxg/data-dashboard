'use client';

import { useRouter } from 'next/navigation';
import { useSuspenseQuery } from '@tanstack/react-query';

import { dashboardQueryOptions, recordsQueryOptions } from '@/features/news-tips/api/queries';
import type { InsightItem, NewsTipFilters } from '@/features/news-tips/api/types';
import { CategoryBar } from '@/features/news-tips/components/category-bar';
import { ChannelPie } from '@/features/news-tips/components/channel-pie';
import { RegionHeatMap } from '@/features/news-tips/components/region-heat-map';
import { InsightStrip } from '@/features/news-tips/components/insight-strip';
import { KpiCards } from '@/features/news-tips/components/kpi-cards';
import { StatusProgress } from '@/features/news-tips/components/status-progress';
import { TodoPreview } from '@/features/news-tips/components/todo-preview';
import { TrendChart } from '@/features/news-tips/components/trend-chart';
import { useNewsTipParams } from '@/features/news-tips/hooks/use-news-tip-params';
import {
  buildRecordsHref,
  insightToPatch,
  type RecordsHrefPatch
} from '@/features/news-tips/utils/records-href';

export function Cockpit() {
  const router = useRouter();
  const { params } = useNewsTipParams();

  const rangeFilters: NewsTipFilters = {
    range: params.range,
    ...(params.dateFrom ? { dateFrom: params.dateFrom } : {}),
    ...(params.dateTo ? { dateTo: params.dateTo } : {}),
    sort: 'priority'
  };

  const { data: dashboard } = useSuspenseQuery(dashboardQueryOptions(rangeFilters));
  const { data: recordsResponse } = useSuspenseQuery(recordsQueryOptions(rangeFilters));
  const records = recordsResponse.items;

  const drill = (patch: RecordsHrefPatch) => {
    router.push(
      buildRecordsHref(
        { range: params.range, dateFrom: params.dateFrom, dateTo: params.dateTo },
        patch
      )
    );
  };

  const handleInsight = (insight: InsightItem) => {
    drill(insightToPatch(insight));
  };

  return (
    <div className='grid grid-cols-[minmax(0,1fr)] gap-4'>
      <InsightStrip insights={dashboard.insights} activeInsightId={null} onApply={handleInsight} />

      <KpiCards filters={rangeFilters} />

      <StatusProgress data={dashboard.statuses} onSelect={(status) => drill({ status })} />

      <div className='grid gap-4 xl:grid-cols-5'>
        <div className='xl:col-span-2'>
          <ChannelPie
            data={dashboard.channels}
            activeChannels={[]}
            onSelect={(channel) => drill({ channel })}
          />
        </div>
        <div className='xl:col-span-3'>
          <CategoryBar
            data={dashboard.categories}
            activeCategories={[]}
            onSelect={(category) => drill({ category })}
          />
        </div>
      </div>

      <RegionHeatMap
        data={dashboard.districts}
        activeDistricts={[]}
        onSelect={(district) => drill({ district })}
      />

      <TrendChart records={records} />

      <TodoPreview records={records} />
    </div>
  );
}
