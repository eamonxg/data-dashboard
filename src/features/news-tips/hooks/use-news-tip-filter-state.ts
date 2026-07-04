'use client';

import { useMemo } from 'react';
import type { InsightItem } from '@/features/news-tips/api/types';
import { useNewsTipParams } from '@/features/news-tips/hooks/use-news-tip-params';
import {
  emptyNewsTipFilters,
  removeFilterValue,
  toggleFilterValue,
  type NewsTipFilterKind,
  type NewsTipFilterState,
  type NewsTipFilterValue,
  type NewsTipSortMode
} from '@/features/news-tips/utils/analytics';

export function useNewsTipFilterState() {
  const { params, filters: queryFilters, granularity, setParams } = useNewsTipParams();

  const filterState = useMemo<NewsTipFilterState>(
    () => ({
      status: params.status,
      category: params.category,
      sourcePlatform: params.sourcePlatform,
      channel: params.channel,
      district: params.district,
      priority: params.priority
    }),
    [
      params.category,
      params.channel,
      params.district,
      params.priority,
      params.sourcePlatform,
      params.status
    ]
  );

  const commitFilterState = (nextFilters: NewsTipFilterState) => {
    void setParams({
      status: nextFilters.status,
      category: nextFilters.category,
      sourcePlatform: nextFilters.sourcePlatform,
      channel: nextFilters.channel,
      district: nextFilters.district,
      priority: nextFilters.priority
    });
  };

  const toggleFilter = (kind: NewsTipFilterKind, value: NewsTipFilterValue) => {
    commitFilterState(toggleFilterValue(filterState, kind, value));
  };

  const removeFilter = (kind: NewsTipFilterKind, value: NewsTipFilterValue) => {
    commitFilterState(removeFilterValue(filterState, kind, value));
  };

  const clearFilters = () => {
    commitFilterState(emptyNewsTipFilters);
  };

  const changeSort = (sortMode: NewsTipSortMode) => {
    void setParams({ sort: sortMode });
  };

  const applyInsight = (insight: InsightItem) => {
    if (insight.action.type === 'sort') {
      void setParams({ sort: insight.action.value });
      return;
    }

    if (insight.action.type === 'filter-status') {
      void setParams({ status: [insight.action.value] });
      return;
    }

    if (insight.action.type === 'filter-category') {
      void setParams({ category: [insight.action.value] });
      return;
    }

    if (insight.action.type === 'filter-sourcePlatform') {
      void setParams({ sourcePlatform: [insight.action.value] });
      return;
    }

    if (insight.action.type === 'filter-channel') {
      void setParams({ channel: [insight.action.value] });
      return;
    }

    if (insight.action.type === 'filter-district') {
      void setParams({ district: [insight.action.value] });
      return;
    }

    void setParams({ priority: [insight.action.value] });
  };

  return {
    params,
    queryFilters,
    granularity,
    setParams,
    filterState,
    sortMode: params.sort,
    toggleFilter,
    removeFilter,
    clearFilters,
    changeSort,
    applyInsight
  };
}
