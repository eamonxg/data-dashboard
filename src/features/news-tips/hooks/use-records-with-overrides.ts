'use client';

import { useMemo } from 'react';
import { useSuspenseQuery } from '@tanstack/react-query';

import { recordsQueryOptions } from '../api/queries';
import type { NewsTipFilters } from '../api/types';
import { applyOverrides } from '../utils/apply-overrides';
import { useOverrides } from './use-overrides';

export function useRecordsWithOverrides(filters: NewsTipFilters) {
  const { data } = useSuspenseQuery(recordsQueryOptions(filters));
  const overrides = useOverrides();

  const items = useMemo(
    () => applyOverrides(data.items, overrides, new Date()),
    [data.items, overrides]
  );

  return {
    items,
    rangeTotalItems: data.rangeTotalItems,
    totalItems: data.totalItems,
    allItems: data.allItems
  };
}
