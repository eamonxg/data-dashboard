'use client';

import { useSuspenseQuery } from '@tanstack/react-query';
import { dashboardQueryOptions } from '@/features/news-tips/api/queries';
import { ActiveFilters } from '@/features/news-tips/components/active-filters';
import { RecordsTable } from '@/features/news-tips/components/records-table';
import { useNewsTipFilterState } from '@/features/news-tips/hooks/use-news-tip-filter-state';
import { useRecordsWithOverrides } from '@/features/news-tips/hooks/use-records-with-overrides';

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
  const records = useRecordsWithOverrides(queryFilters);

  return (
    <div className='grid grid-cols-[minmax(0,1fr)] gap-4'>
      <ActiveFilters
        filters={filterState}
        resultCount={records.items.length}
        totalCount={records.rangeTotalItems}
        updatedAt={dashboard.updatedAt}
        onRemove={removeFilter}
        onClear={clearFilters}
      />
      <RecordsTable
        records={records.items}
        totalCount={records.rangeTotalItems}
        filters={filterState}
        sortMode={sortMode}
        onToggleFilter={toggleFilter}
        onClearFilters={clearFilters}
        onSortChange={changeSort}
      />
    </div>
  );
}
