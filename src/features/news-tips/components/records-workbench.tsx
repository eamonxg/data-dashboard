'use client';

import { useSuspenseQuery } from '@tanstack/react-query';
import { dashboardQueryOptions, recordsQueryOptions } from '@/features/news-tips/api/queries';
import { ActiveFilters } from '@/features/news-tips/components/active-filters';
import { RecordsTable } from '@/features/news-tips/components/records-table';
import { WorkbenchNav } from '@/features/news-tips/components/section-nav';
import { useNewsTipFilterState } from '@/features/news-tips/hooks/use-news-tip-filter-state';

export function RecordsWorkbench() {
  const {
    queryFilters,
    filterState,
    sortMode,
    toggleFilter,
    removeFilter,
    clearFilters,
    changeSort
  } = useNewsTipFilterState();
  const { data: dashboard } = useSuspenseQuery(dashboardQueryOptions(queryFilters));
  const { data: recordsResponse } = useSuspenseQuery(recordsQueryOptions(queryFilters));

  return (
    <div className='grid gap-4'>
      <WorkbenchNav />
      <ActiveFilters
        filters={filterState}
        resultCount={recordsResponse.items.length}
        totalCount={recordsResponse.rangeTotalItems}
        updatedAt={dashboard.updatedAt}
        onRemove={removeFilter}
        onClear={clearFilters}
      />
      <RecordsTable
        records={recordsResponse.items}
        totalCount={recordsResponse.rangeTotalItems}
        filters={filterState}
        sortMode={sortMode}
        onToggleFilter={toggleFilter}
        onClearFilters={clearFilters}
        onSortChange={changeSort}
      />
    </div>
  );
}
