import type { NewsTipOverride, OverridesMap } from '../api/types';

const STORAGE_KEY = 'news-tips:overrides:v1';
const EMPTY: OverridesMap = {};

let snapshot: OverridesMap | null = null;
const listeners = new Set<() => void>();

function safeStorage(): Storage | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    return localStorage;
  } catch {
    return null;
  }
}

function load(): OverridesMap {
  const storage = safeStorage();
  if (!storage) return {};

  try {
    const raw = storage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as OverridesMap) : {};
  } catch {
    return {};
  }
}

function persist(next: OverridesMap): void {
  const storage = safeStorage();
  if (!storage) return;

  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Private browsing or quota failures degrade to in-memory updates.
  }
}

function getSnapshot(): OverridesMap {
  if (snapshot === null) snapshot = load();
  return snapshot;
}

function emit(next: OverridesMap): void {
  snapshot = next;
  persist(next);
  for (const listener of listeners) listener();
}

export const overridesStore = {
  subscribe(callback: () => void): () => void {
    listeners.add(callback);
    return () => listeners.delete(callback);
  },
  getSnapshot,
  getServerSnapshot(): OverridesMap {
    return EMPTY;
  },
  setOverride(id: string, override: NewsTipOverride): void {
    emit({ ...getSnapshot(), [id]: override });
  },
  removeOverride(id: string): void {
    const current = getSnapshot();
    if (!(id in current)) return;

    const next = { ...current };
    delete next[id];
    emit(next);
  },
  resetAll(): void {
    emit({});
  }
};
