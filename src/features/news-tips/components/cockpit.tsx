'use client';

import { useState } from 'react';
import { useSuspenseQuery } from '@tanstack/react-query';

import { dashboardQueryOptions } from '@/features/news-tips/api/queries';
import type { InsightItem } from '@/features/news-tips/api/types';
import { ActiveFilters } from '@/features/news-tips/components/active-filters';
import { CategoryBar } from '@/features/news-tips/components/category-bar';
import { ChannelPie } from '@/features/news-tips/components/channel-pie';
import { DistrictHeatGrid } from '@/features/news-tips/components/district-heat-grid';
import { InsightStrip } from '@/features/news-tips/components/insight-strip';
import { KpiCards } from '@/features/news-tips/components/kpi-cards';
import { NewsTipsSectionNav } from '@/features/news-tips/components/section-nav';
import { useNewsTipFilterState } from '@/features/news-tips/hooks/use-news-tip-filter-state';

export function Cockpit() {
  const { queryFilters, filterState, toggleFilter, removeFilter, clearFilters, applyInsight } =
    useNewsTipFilterState();
  const { data: dashboard } = useSuspenseQuery(dashboardQueryOptions(queryFilters));
  const [activeInsightId, setActiveInsightId] = useState<string | null>(null);

  const handleClearFilters = () => {
    setActiveInsightId(null);
    clearFilters();
  };

  const handleApplyInsight = (insight: InsightItem) => {
    setActiveInsightId(insight.id);
    applyInsight(insight);
  };

  return (
    <div className='grid gap-4'>
      <NewsTipsSectionNav />

      <ActiveFilters
        filters={filterState}
        resultCount={dashboard.filteredCount}
        totalCount={dashboard.rangeTotalCount}
        updatedAt={dashboard.updatedAt}
        onRemove={removeFilter}
        onClear={handleClearFilters}
      />

      <KpiCards />

      <InsightStrip
        insights={dashboard.insights}
        activeInsightId={activeInsightId}
        onApply={handleApplyInsight}
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

      <DistrictHeatGrid
        data={dashboard.districts}
        activeDistricts={filterState.district}
        onSelect={(district) => toggleFilter('district', district)}
      />
    </div>
  );
}
