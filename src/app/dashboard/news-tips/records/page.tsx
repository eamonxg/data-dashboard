import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { Suspense } from 'react';
import PageContainer from '@/components/layout/page-container';
import { getQueryClient } from '@/lib/query-client';
import { dashboardQueryOptions, recordsQueryOptions } from '@/features/news-tips/api/queries';
import type { NewsTipFilters } from '@/features/news-tips/api/types';
import { RecordsWorkbench } from '@/features/news-tips/components/records-workbench';
import { CockpitToolbar } from '@/features/news-tips/components/toolbar';

export const metadata = {
  title: '深圳报料线索明细台'
};

export const dynamic = 'force-static';

const defaultFilters: NewsTipFilters = {
  range: 'month',
  sort: 'priority'
};

export default async function NewsTipRecordsPage() {
  const queryClient = getQueryClient();

  void queryClient.prefetchQuery(dashboardQueryOptions(defaultFilters));
  void queryClient.prefetchQuery(recordsQueryOptions(defaultFilters));

  return (
    <PageContainer
      pageTitle='深圳报料线索明细台'
      pageDescription='按状态、平台、渠道、区域和优先级筛选线索，展开处理轨迹并导出 CSV'
      pageHeaderAction={<CockpitToolbar />}
    >
      <HydrationBoundary state={dehydrate(queryClient)}>
        <Suspense fallback={null}>
          <RecordsWorkbench />
        </Suspense>
      </HydrationBoundary>
    </PageContainer>
  );
}
