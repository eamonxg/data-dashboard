'use client';

import { useSyncExternalStore } from 'react';

import type { OverridesMap } from '../api/types';
import { overridesStore } from '../lib/overrides-store';

export function useOverrides(): OverridesMap {
  return useSyncExternalStore(
    overridesStore.subscribe,
    overridesStore.getSnapshot,
    overridesStore.getServerSnapshot
  );
}
