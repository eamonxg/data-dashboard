import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { Suspense } from 'react';
import PageContainer from '@/components/layout/page-container';
import { getQueryClient } from '@/lib/query-client';
import {
  dashboardQueryOptions,
  recordsQueryOptions,
  trendQueryOptions
} from '@/features/news-tips/api/queries';
import type { Granularity, NewsTipFilters } from '@/features/news-tips/api/types';
import { AnalyticsDashboard } from '@/features/news-tips/components/analytics-dashboard';
import { CockpitToolbar } from '@/features/news-tips/components/toolbar';

export const metadata = {
  title: '深圳报料数据仪表盘'
};

export const dynamic = 'force-static';

const defaultFilters: NewsTipFilters = {
  range: 'month',
  sort: 'priority'
};

const defaultGranularity: Granularity = 'day';

export default async function NewsTipAnalyticsPage() {
  const queryClient = getQueryClient();

  void queryClient.prefetchQuery(dashboardQueryOptions(defaultFilters));
  void queryClient.prefetchQuery(recordsQueryOptions(defaultFilters));
  void queryClient.prefetchQuery(trendQueryOptions(defaultFilters, defaultGranularity));

  return (
    <PageContainer
      pageTitle='深圳报料数据仪表盘'
      pageDescription='平台来源、线索类型、区域热区、处置状态与趋势分析'
      pageHeaderAction={<CockpitToolbar />}
    >
      <HydrationBoundary state={dehydrate(queryClient)}>
        <Suspense fallback={null}>
          <AnalyticsDashboard />
        </Suspense>
      </HydrationBoundary>
    </PageContainer>
  );
}
