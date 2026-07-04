# 处理流转看板 · 操作交互 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把只读的「处理流转」看板升级为可操作:拖拽改状态、转派、追加备注、撤回,操作以 localStorage 覆盖层持久化,看板与线索明细表数据一致。

**Architecture:** 服务端 mock 读取路径不变;新增一个客户端 overrides 外部 store(localStorage),组件经 `useSyncExternalStore` 订阅,在共享 hook `useRecordsWithOverrides` 里用纯函数 `applyOverrides` 合并。看板与明细表读同一 store 因此一致。优先级逻辑 `derivePriority` 抽到共享 `lib/priority.ts` 供服务端与覆盖层复用。拖拽用 `@dnd-kit/core`,反馈用 `sonner`(已挂载)。

**Tech Stack:** Next.js 16, React 19, TanStack Query v5, `@dnd-kit/core`(新增), sonner, shadcn/ui(Dialog / DropdownMenu / Textarea), bun test。

## Global Constraints

- 纯前端:不引入 Server Action / route handler / 后端接口;覆盖层仅客户端 localStorage。`output: 'export'` 静态导出必须仍成立。
- Icons 只从 `@/components/icons` 引入,不直接引 `@tabler/icons-react`。
- 页头用 `PageContainer` props,不手动引 `<Heading>`。
- 格式:单引号、JSX 单引号、无尾逗号、2 空格缩进。
- 测试用 `bun:test`(`import { describe, expect, test } from 'bun:test'`);运行 `bun test <path>`。项目无 `test` npm script。
- 时间/随机:应用代码可用 `Date.now()`。操作员标识 starter 无登录态,统一 `'当前编辑'`。
- localStorage key 版本化:`news-tips:overrides:v1`。
- 提交信息以 `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>` 结尾。

---

## File Structure

新增:
- `src/features/news-tips/lib/priority.ts` — 共享优先级推导(从 service 抽出)
- `src/features/news-tips/constants/transitions.ts` — 流转规则 + 校验
- `src/features/news-tips/utils/apply-overrides.ts`(+`.test.ts`)— 纯函数合并覆盖层
- `src/features/news-tips/lib/overrides-store.ts`(+`.test.ts`)— localStorage 外部 store
- `src/features/news-tips/lib/flow-operations.ts`(+`.test.ts`)— 纯函数构建 override/操作快照
- `src/features/news-tips/hooks/use-overrides.ts` — `useSyncExternalStore` 封装
- `src/features/news-tips/hooks/use-records-with-overrides.ts` — 合并 hook
- `src/features/news-tips/hooks/use-flow-actions.ts` — 动作 + toast/undo 编排
- `src/features/news-tips/components/flow-card.tsx` — 可拖拽卡片 + ⋯ 菜单
- `src/features/news-tips/components/flow-dialogs.tsx` — 理由/转派/备注/详情弹窗

修改:
- `src/features/news-tips/api/service.ts` — 改用共享 `derivePriority`
- `src/features/news-tips/constants/options.ts` — 导出 `NEWS_TIP_ASSIGNEES`
- `src/features/news-tips/api/types.ts` — 新增 `NewsTipOverride`/`FlowOperation`
- `src/features/news-tips/components/flow-board.tsx` — 拖拽化 + 用合并 hook
- `src/features/news-tips/components/records-workbench.tsx` — 改用合并 hook
- `package.json` — 新增 `@dnd-kit/core`

---

## Task 1: 抽出共享优先级逻辑 `lib/priority.ts`

纯重构,行为不变。把 `derivePriority`、`minutesSince`、`EMERGENCY_RISK_TAGS` 从 `service.ts` 移到 `lib/priority.ts`,service 改为导入。

**Files:**
- Create: `src/features/news-tips/lib/priority.ts`
- Modify: `src/features/news-tips/api/service.ts`(删除 259-720 区间内的 `minutesSince`/`EMERGENCY_RISK_TAGS`/`derivePriority`,改 import)
- Test: `src/features/news-tips/api/service.test.ts`(已存在,作为回归)

**Interfaces:**
- Produces: `derivePriority(record: NewsTipRecord, now: Date): NewsTipRecordWithPriority`、`minutesSince(iso: string, now: Date): number`

- [ ] **Step 1: 创建 `lib/priority.ts`**,内容为从 service 原样搬来的实现:

```ts
import { PRIORITY_LABELS } from '../constants/options';
import type { NewsTipRecord, NewsTipRecordWithPriority, PriorityLevel } from '../api/types';

const EMERGENCY_RISK_TAGS = new Set(['公共安全', '消防风险', '交通事故', '暴雨积水', '食品安全']);

export function minutesSince(iso: string, now: Date): number {
  return Math.max(0, Math.round((now.getTime() - new Date(iso).getTime()) / (60 * 1000)));
}

export function derivePriority(record: NewsTipRecord, now: Date): NewsTipRecordWithPriority {
  const ageMinutes = minutesSince(record.createdAt, now);
  const hasEmergencyRisk = record.riskTags.some((tag) => EMERGENCY_RISK_TAGS.has(tag));
  let priorityLevel: PriorityLevel = 'low';
  let priorityReason = '未命中超时、突发或高触达渠道规则';

  if (
    (record.category === '突发事件' || hasEmergencyRisk) &&
    record.status !== '已采用' &&
    record.status !== '不予采用'
  ) {
    priorityLevel = 'high';
    priorityReason = '突发或公共安全线索尚未完成处置,需要优先核实';
  } else if (record.status === '待审核' && ageMinutes > 60) {
    priorityLevel = 'high';
    priorityReason = `待审核 ${ageMinutes} 分钟,超过 60 分钟分诊线`;
  } else if (record.responseMinutes !== null && record.responseMinutes > 240) {
    priorityLevel = 'high';
    priorityReason = `响应时长 ${record.responseMinutes} 分钟,超过 240 分钟预警线`;
  } else if (record.status === '跟进中' && ageMinutes > 180) {
    priorityLevel = 'medium';
    priorityReason = `跟进中 ${ageMinutes} 分钟,建议持续关注进展`;
  } else if (
    record.category === '民生投诉' &&
    ['新闻热线电话', '微信公众号', '报料小程序'].includes(record.channel)
  ) {
    priorityLevel = 'medium';
    priorityReason = '民生投诉来自高触达渠道,建议排入例行跟进';
  }

  return {
    ...record,
    priorityLevel,
    priorityLabel: PRIORITY_LABELS[priorityLevel],
    priorityReason,
    priorityScore: priorityLevel === 'high' ? 3 : priorityLevel === 'medium' ? 2 : 1,
    ageMinutes
  };
}
```

> 注意:上面的中文标点(逗号)保持与 service 原文一致;若原文用的是中文全角逗号请照抄原文,避免快照类断言变化。

- [ ] **Step 2: 修改 `service.ts`** —— 删除其中的 `EMERGENCY_RISK_TAGS`(第 257 行)、`minutesSince`(678-680)、`derivePriority`(682-720)三段定义,在文件顶部 import 区加入:

```ts
import { derivePriority } from '../lib/priority';
```

保留 `enrichRecords`(它调用 `derivePriority`),现在调用的是导入版本。

- [ ] **Step 3: 运行回归测试验证行为不变**

Run: `bun test src/features/news-tips/api/service.test.ts`
Expected: PASS(与重构前一致)

- [ ] **Step 4: 类型检查**

Run: `bunx tsc --noEmit`
Expected: 无新增错误

- [ ] **Step 5: Commit**

```bash
git add src/features/news-tips/lib/priority.ts src/features/news-tips/api/service.ts
git commit -m "refactor(news-tips): 抽出共享 derivePriority 到 lib/priority

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: 导出处理人常量 + 流转规则 `constants/transitions.ts`

**Files:**
- Modify: `src/features/news-tips/constants/options.ts`(新增导出 `NEWS_TIP_ASSIGNEES`)
- Modify: `src/features/news-tips/api/service.ts`(改用导入的 `ASSIGNEES`)
- Create: `src/features/news-tips/constants/transitions.ts`
- Test: `src/features/news-tips/constants/transitions.test.ts`

**Interfaces:**
- Produces:
  - `NEWS_TIP_ASSIGNEES: string[]`
  - `ALLOWED_TRANSITIONS: Record<NewsTipStatus, NewsTipStatus[]>`
  - `canTransition(from: NewsTipStatus, to: NewsTipStatus): boolean`
  - `requiresReason(to: NewsTipStatus): boolean`
  - `TERMINAL_STATUSES: NewsTipStatus[]`

- [ ] **Step 1: 在 `constants/options.ts` 末尾新增**(把 service 里的 12 人列表迁来):

```ts
export const NEWS_TIP_ASSIGNEES: string[] = [
  '陈晓敏',
  '林嘉豪',
  '黄志强',
  '李文静',
  '张伟明',
  '王雨桐',
  '刘家乐',
  '吴思远',
  '赵梓涵',
  '周敏仪',
  '郑亦然',
  '郭子航'
];
```

- [ ] **Step 2: 修改 `service.ts`** —— 删除其中本地的 `const ASSIGNEES = [...]`(38-51 行),改从 options 导入并起别名保持原用法:

```ts
import { NEWS_TIP_ASSIGNEES as ASSIGNEES } from '../constants/options';
```

（`options.ts` 已有其它常量从此路径导入,追加即可。）

- [ ] **Step 3: 写失败测试 `transitions.test.ts`**

```ts
import { describe, expect, test } from 'bun:test';

import { canTransition, requiresReason, TERMINAL_STATUSES } from './transitions';

describe('canTransition', () => {
  test('待审核可到跟进中和不予采用', () => {
    expect(canTransition('待审核', '跟进中')).toBe(true);
    expect(canTransition('待审核', '不予采用')).toBe(true);
  });
  test('待审核不能直接到已采用', () => {
    expect(canTransition('待审核', '已采用')).toBe(false);
  });
  test('跟进中可到已采用/不予采用/退回待审核', () => {
    expect(canTransition('跟进中', '已采用')).toBe(true);
    expect(canTransition('跟进中', '不予采用')).toBe(true);
    expect(canTransition('跟进中', '待审核')).toBe(true);
  });
  test('终态不能拖出', () => {
    expect(canTransition('已采用', '跟进中')).toBe(false);
    expect(canTransition('不予采用', '待审核')).toBe(false);
  });
  test('同列不算流转', () => {
    expect(canTransition('待审核', '待审核')).toBe(false);
  });
});

describe('requiresReason', () => {
  test('落到不予采用需要理由', () => {
    expect(requiresReason('不予采用')).toBe(true);
    expect(requiresReason('跟进中')).toBe(false);
  });
});

describe('TERMINAL_STATUSES', () => {
  test('含已采用与不予采用', () => {
    expect(TERMINAL_STATUSES).toContain('已采用');
    expect(TERMINAL_STATUSES).toContain('不予采用');
  });
});
```

- [ ] **Step 4: 运行验证失败**

Run: `bun test src/features/news-tips/constants/transitions.test.ts`
Expected: FAIL(模块不存在)

- [ ] **Step 5: 实现 `constants/transitions.ts`**

```ts
import type { NewsTipStatus } from '../api/types';

export const ALLOWED_TRANSITIONS: Record<NewsTipStatus, NewsTipStatus[]> = {
  待审核: ['跟进中', '不予采用'],
  跟进中: ['已采用', '不予采用', '待审核'],
  已采用: [],
  不予采用: []
};

export const TERMINAL_STATUSES: NewsTipStatus[] = ['已采用', '不予采用'];

export function canTransition(from: NewsTipStatus, to: NewsTipStatus): boolean {
  if (from === to) return false;
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export function requiresReason(to: NewsTipStatus): boolean {
  return to === '不予采用';
}
```

- [ ] **Step 6: 运行验证通过**

Run: `bun test src/features/news-tips/constants/transitions.test.ts`
Expected: PASS

- [ ] **Step 7: 回归 + 类型检查**

Run: `bun test src/features/news-tips/api/service.test.ts && bunx tsc --noEmit`
Expected: PASS,无类型错误

- [ ] **Step 8: Commit**

```bash
git add src/features/news-tips/constants/options.ts src/features/news-tips/constants/transitions.ts src/features/news-tips/constants/transitions.test.ts src/features/news-tips/api/service.ts
git commit -m "feat(news-tips): 新增流转规则与处理人常量导出

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: 覆盖层与操作类型 `api/types.ts`

**Files:**
- Modify: `src/features/news-tips/api/types.ts`(在文件末尾追加)

**Interfaces:**
- Produces: `NewsTipOverride`、`FlowOperationKind`、`FlowOperation`、`OverridesMap`

- [ ] **Step 1: 在 `api/types.ts` 末尾追加**

```ts
export interface NewsTipOverride {
  id: string;
  status?: NewsTipStatus;
  assignee?: string;
  /** 被拒前的来源状态,供撤回不予采用时回退 */
  rejectedFrom?: NewsTipStatus;
  timelineAppends: TimelineEntry[];
  updatedAt: string;
}

export type OverridesMap = Record<string, NewsTipOverride>;

export type FlowOperationKind = 'move' | 'reassign' | 'note' | 'revert';

export interface FlowOperation {
  id: string;
  recordId: string;
  kind: FlowOperationKind;
  /** 操作前该条的 override 快照(不存在则为 null),撤销时整体回滚 */
  prevOverride: NewsTipOverride | null;
  label: string;
}
```

- [ ] **Step 2: 类型检查**

Run: `bunx tsc --noEmit`
Expected: 无错误

- [ ] **Step 3: Commit**

```bash
git add src/features/news-tips/api/types.ts
git commit -m "feat(news-tips): 新增覆盖层与流转操作类型

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 4: 纯函数合并覆盖层 `utils/apply-overrides.ts`

**Files:**
- Create: `src/features/news-tips/utils/apply-overrides.ts`
- Test: `src/features/news-tips/utils/apply-overrides.test.ts`

**Interfaces:**
- Consumes: `derivePriority`(Task 1)、`NewsTipOverride`/`OverridesMap`(Task 3)
- Produces: `applyOverrides(records: NewsTipRecordWithPriority[], overrides: OverridesMap, now: Date): NewsTipRecordWithPriority[]`

- [ ] **Step 1: 写失败测试 `apply-overrides.test.ts`**

```ts
import { describe, expect, test } from 'bun:test';

import type { NewsTipRecordWithPriority, TimelineEntry } from '../api/types';
import { applyOverrides } from './apply-overrides';

const NOW = new Date('2026-07-04T08:00:00.000Z');

function baseRecord(): NewsTipRecordWithPriority {
  return {
    id: 'SZ-BL-20260704-001',
    title: 't',
    description: 'd',
    category: '民生投诉',
    sourcePlatform: '深圳新闻网',
    sourceUrl: null,
    referenceTopic: 'x',
    channel: '报料小程序',
    status: '待审核',
    district: '南山区',
    street: null,
    locationName: null,
    reporter: '陈先生',
    assignee: '林嘉豪',
    department: null,
    createdAt: '2026-07-04T07:00:00.000Z',
    firstResponseAt: null,
    responseMinutes: null,
    riskTags: [],
    timeline: [
      { time: '2026-07-04T07:00:00.000Z', action: '线索提交', operator: '陈先生', note: 'n' }
    ],
    priorityLevel: 'low',
    priorityLabel: '常规',
    priorityReason: 'r',
    priorityScore: 1,
    ageMinutes: 60
  };
}

const append: TimelineEntry = {
  time: '2026-07-04T07:30:00.000Z',
  action: '首次审核',
  operator: '当前编辑',
  note: '审核通过'
};

describe('applyOverrides', () => {
  test('无 override 原样返回', () => {
    const records = [baseRecord()];
    expect(applyOverrides(records, {}, NOW)).toEqual(records);
  });

  test('覆盖状态并重算优先级', () => {
    const result = applyOverrides(
      [baseRecord()],
      { 'SZ-BL-20260704-001': { id: 'SZ-BL-20260704-001', status: '跟进中', timelineAppends: [], updatedAt: '' } },
      NOW
    );
    expect(result[0].status).toBe('跟进中');
    // 状态变化后 priority 由 derivePriority 重新推导,字段存在
    expect(result[0].priorityLabel).toBeDefined();
  });

  test('覆盖 assignee', () => {
    const result = applyOverrides(
      [baseRecord()],
      { 'SZ-BL-20260704-001': { id: 'SZ-BL-20260704-001', assignee: '周敏仪', timelineAppends: [], updatedAt: '' } },
      NOW
    );
    expect(result[0].assignee).toBe('周敏仪');
  });

  test('合并并按时间排序 timeline', () => {
    const result = applyOverrides(
      [baseRecord()],
      { 'SZ-BL-20260704-001': { id: 'SZ-BL-20260704-001', timelineAppends: [append], updatedAt: '' } },
      NOW
    );
    expect(result[0].timeline).toHaveLength(2);
    expect(result[0].timeline[1]).toEqual(append);
  });
});
```

- [ ] **Step 2: 运行验证失败**

Run: `bun test src/features/news-tips/utils/apply-overrides.test.ts`
Expected: FAIL(模块不存在)

- [ ] **Step 3: 实现 `apply-overrides.ts`**

```ts
import { derivePriority } from '../lib/priority';
import type { NewsTipRecordWithPriority, OverridesMap } from '../api/types';

export function applyOverrides(
  records: NewsTipRecordWithPriority[],
  overrides: OverridesMap,
  now: Date
): NewsTipRecordWithPriority[] {
  if (Object.keys(overrides).length === 0) return records;

  return records.map((record) => {
    const override = overrides[record.id];
    if (!override) return record;

    const timeline =
      override.timelineAppends.length === 0
        ? record.timeline
        : [...record.timeline, ...override.timelineAppends].toSorted(
            (a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()
          );

    const next = {
      ...record,
      status: override.status ?? record.status,
      assignee: override.assignee ?? record.assignee,
      timeline
    };

    // 状态可能变化,用共享逻辑重算优先级;derivePriority 接收基础字段即可
    return derivePriority(next, now);
  });
}
```

- [ ] **Step 4: 运行验证通过**

Run: `bun test src/features/news-tips/utils/apply-overrides.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/news-tips/utils/apply-overrides.ts src/features/news-tips/utils/apply-overrides.test.ts
git commit -m "feat(news-tips): 新增覆盖层合并纯函数 applyOverrides

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 5: localStorage 外部 store `lib/overrides-store.ts`

框架无关的 vanilla store,供 `useSyncExternalStore` 使用。SSR 安全(无 window 时降级为内存)。

**Files:**
- Create: `src/features/news-tips/lib/overrides-store.ts`
- Test: `src/features/news-tips/lib/overrides-store.test.ts`

**Interfaces:**
- Consumes: `OverridesMap`/`NewsTipOverride`(Task 3)
- Produces:
  - `overridesStore.subscribe(cb: () => void): () => void`
  - `overridesStore.getSnapshot(): OverridesMap`
  - `overridesStore.getServerSnapshot(): OverridesMap`(恒返回空对象引用)
  - `overridesStore.setOverride(id: string, override: NewsTipOverride): void`
  - `overridesStore.removeOverride(id: string): void`
  - `overridesStore.resetAll(): void`

- [ ] **Step 1: 写失败测试 `overrides-store.test.ts`**(用内存桩替换 localStorage)

```ts
import { afterEach, beforeEach, describe, expect, test } from 'bun:test';

import type { NewsTipOverride } from '../api/types';
import { overridesStore } from './overrides-store';

function memoryStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k)
  } as Storage;
}

const ov: NewsTipOverride = { id: 'a', status: '跟进中', timelineAppends: [], updatedAt: 'now' };

beforeEach(() => {
  (globalThis as unknown as { localStorage: Storage }).localStorage = memoryStorage();
  overridesStore.resetAll();
});

afterEach(() => {
  overridesStore.resetAll();
});

describe('overridesStore', () => {
  test('setOverride 后 getSnapshot 可读', () => {
    overridesStore.setOverride('a', ov);
    expect(overridesStore.getSnapshot()['a'].status).toBe('跟进中');
  });

  test('快照引用在变更后改变(供 useSyncExternalStore 判等)', () => {
    const before = overridesStore.getSnapshot();
    overridesStore.setOverride('a', ov);
    expect(overridesStore.getSnapshot()).not.toBe(before);
  });

  test('subscribe 在变更时被调用', () => {
    let calls = 0;
    const unsub = overridesStore.subscribe(() => (calls += 1));
    overridesStore.setOverride('a', ov);
    expect(calls).toBe(1);
    unsub();
    overridesStore.setOverride('a', ov);
    expect(calls).toBe(1);
  });

  test('removeOverride 删除条目', () => {
    overridesStore.setOverride('a', ov);
    overridesStore.removeOverride('a');
    expect(overridesStore.getSnapshot()['a']).toBeUndefined();
  });

  test('getServerSnapshot 恒为稳定空对象', () => {
    expect(overridesStore.getServerSnapshot()).toEqual({});
    expect(overridesStore.getServerSnapshot()).toBe(overridesStore.getServerSnapshot());
  });
});
```

- [ ] **Step 2: 运行验证失败**

Run: `bun test src/features/news-tips/lib/overrides-store.test.ts`
Expected: FAIL(模块不存在)

- [ ] **Step 3: 实现 `overrides-store.ts`**

```ts
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
    // 隐私模式/超额:降级为仅内存,静默
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
  subscribe(cb: () => void): () => void {
    listeners.add(cb);
    return () => listeners.delete(cb);
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
```

- [ ] **Step 4: 运行验证通过**

Run: `bun test src/features/news-tips/lib/overrides-store.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/news-tips/lib/overrides-store.ts src/features/news-tips/lib/overrides-store.test.ts
git commit -m "feat(news-tips): 新增 localStorage 覆盖层外部 store

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 6: 纯函数构建操作 `lib/flow-operations.ts`

把「一次操作产生的新 override + 操作快照」的逻辑做成纯函数,便于测试;hook 只负责调用 store 与 toast。

**Files:**
- Create: `src/features/news-tips/lib/flow-operations.ts`
- Test: `src/features/news-tips/lib/flow-operations.test.ts`

**Interfaces:**
- Consumes: `NewsTipOverride`/`FlowOperation`/`TimelineEntry`/`NewsTipStatus`(Task 3), `NewsTipRecordWithPriority`
- Produces(全部为纯函数,`now: number` = `Date.now()` 由调用方传入):
  - `buildMove(record, to, reason, prev, now): { override: NewsTipOverride; operation: FlowOperation }`
  - `buildReassign(record, assignee, prev, now): { override; operation }`
  - `buildNote(record, text, prev, now): { override; operation }`
  - `buildRevert(record, prev, now): { override: NewsTipOverride | null; operation; to: NewsTipStatus }`
  - `OPERATOR = '当前编辑'`

- [ ] **Step 1: 写失败测试 `flow-operations.test.ts`**

```ts
import { describe, expect, test } from 'bun:test';

import type { NewsTipRecordWithPriority } from '../api/types';
import { buildMove, buildNote, buildReassign, buildRevert, OPERATOR } from './flow-operations';

const NOW = 1751616000000; // 固定时间戳

function rec(status: NewsTipRecordWithPriority['status'] = '待审核'): NewsTipRecordWithPriority {
  return {
    id: 'r1',
    status,
    assignee: '林嘉豪',
    department: '街道办事处',
    timeline: [{ time: '2026-07-04T07:00:00.000Z', action: '线索提交', operator: '陈先生', note: 'n' }]
  } as NewsTipRecordWithPriority;
}

describe('buildMove', () => {
  test('待审核→跟进中 追加首次审核轨迹', () => {
    const { override, operation } = buildMove(rec('待审核'), '跟进中', undefined, null, NOW);
    expect(override.status).toBe('跟进中');
    expect(override.timelineAppends.at(-1)?.action).toBe('首次审核');
    expect(operation.kind).toBe('move');
    expect(operation.prevOverride).toBeNull();
  });

  test('→不予采用 记录 rejectedFrom 与理由', () => {
    const { override } = buildMove(rec('跟进中'), '不予采用', '信息不实', null, NOW);
    expect(override.status).toBe('不予采用');
    expect(override.rejectedFrom).toBe('跟进中');
    expect(override.timelineAppends.at(-1)?.note).toContain('信息不实');
    expect(override.timelineAppends.at(-1)?.operator).toBe(OPERATOR);
  });

  test('→已采用 追加采用发布', () => {
    const { override } = buildMove(rec('跟进中'), '已采用', undefined, null, NOW);
    expect(override.timelineAppends.at(-1)?.action).toBe('采用发布');
  });
});

describe('buildReassign', () => {
  test('改 assignee 并追加编辑分拨', () => {
    const { override } = buildReassign(rec(), '周敏仪', null, NOW);
    expect(override.assignee).toBe('周敏仪');
    expect(override.timelineAppends.at(-1)?.action).toBe('编辑分拨');
  });
});

describe('buildNote', () => {
  test('仅追加记者跟进备注,不改状态', () => {
    const { override } = buildNote(rec('跟进中'), '已联系街道核实', null, NOW);
    expect(override.status).toBeUndefined();
    expect(override.timelineAppends.at(-1)?.action).toBe('记者跟进');
    expect(override.timelineAppends.at(-1)?.note).toBe('已联系街道核实');
  });
});

describe('buildRevert', () => {
  test('已采用撤回到跟进中', () => {
    const prev = { id: 'r1', status: '已采用' as const, timelineAppends: [], updatedAt: '' };
    const { to } = buildRevert(rec('已采用'), prev, NOW);
    expect(to).toBe('跟进中');
  });

  test('不予采用撤回到 rejectedFrom', () => {
    const prev = { id: 'r1', status: '不予采用' as const, rejectedFrom: '待审核' as const, timelineAppends: [], updatedAt: '' };
    const { to } = buildRevert(rec('不予采用'), prev, NOW);
    expect(to).toBe('待审核');
  });
});
```

- [ ] **Step 2: 运行验证失败**

Run: `bun test src/features/news-tips/lib/flow-operations.test.ts`
Expected: FAIL(模块不存在)

- [ ] **Step 3: 实现 `flow-operations.ts`**

```ts
import type {
  FlowOperation,
  NewsTipOverride,
  NewsTipRecordWithPriority,
  NewsTipStatus,
  TimelineEntry
} from '../api/types';

export const OPERATOR = '当前编辑';

function opId(recordId: string, now: number): string {
  return `${recordId}-${now}`;
}

function withAppend(prev: NewsTipOverride | null, id: string, entry: TimelineEntry): NewsTipOverride {
  const base: NewsTipOverride = prev ?? { id, timelineAppends: [], updatedAt: '' };
  return { ...base, timelineAppends: [...base.timelineAppends, entry], updatedAt: new Date().toISOString() };
}

function moveEntry(to: NewsTipStatus, reason: string | undefined, iso: string): TimelineEntry {
  if (to === '跟进中') return { time: iso, action: '首次审核', operator: OPERATOR, note: '审核通过,进入跟进' };
  if (to === '已采用') return { time: iso, action: '采用发布', operator: OPERATOR, note: '线索已采用并进入发布记录' };
  if (to === '不予采用')
    return { time: iso, action: '不予采用', operator: OPERATOR, note: `不予采用:${reason ?? '未填写理由'}` };
  return { time: iso, action: '编辑分拨', operator: OPERATOR, note: '退回待审核' };
}

export function buildMove(
  record: NewsTipRecordWithPriority,
  to: NewsTipStatus,
  reason: string | undefined,
  prev: NewsTipOverride | null,
  now: number
): { override: NewsTipOverride; operation: FlowOperation } {
  const iso = new Date(now).toISOString();
  let override = withAppend(prev, record.id, moveEntry(to, reason, iso));
  override = { ...override, status: to };
  if (to === '不予采用') override = { ...override, rejectedFrom: record.status };
  const operation: FlowOperation = {
    id: opId(record.id, now),
    recordId: record.id,
    kind: 'move',
    prevOverride: prev,
    label: `已流转到${to}`
  };
  return { override, operation };
}

export function buildReassign(
  record: NewsTipRecordWithPriority,
  assignee: string,
  prev: NewsTipOverride | null,
  now: number
): { override: NewsTipOverride; operation: FlowOperation } {
  const iso = new Date(now).toISOString();
  const entry: TimelineEntry = { time: iso, action: '编辑分拨', operator: OPERATOR, note: `转派给${assignee}` };
  const override = { ...withAppend(prev, record.id, entry), assignee };
  const operation: FlowOperation = {
    id: opId(record.id, now),
    recordId: record.id,
    kind: 'reassign',
    prevOverride: prev,
    label: `已转派给${assignee}`
  };
  return { override, operation };
}

export function buildNote(
  record: NewsTipRecordWithPriority,
  text: string,
  prev: NewsTipOverride | null,
  now: number
): { override: NewsTipOverride; operation: FlowOperation } {
  const iso = new Date(now).toISOString();
  const entry: TimelineEntry = { time: iso, action: '记者跟进', operator: OPERATOR, note: text };
  const override = withAppend(prev, record.id, entry);
  const operation: FlowOperation = {
    id: opId(record.id, now),
    recordId: record.id,
    kind: 'note',
    prevOverride: prev,
    label: '已追加备注'
  };
  return { override, operation };
}

export function buildRevert(
  record: NewsTipRecordWithPriority,
  prev: NewsTipOverride | null,
  now: number
): { override: NewsTipOverride | null; operation: FlowOperation; to: NewsTipStatus } {
  const to: NewsTipStatus = record.status === '不予采用' ? prev?.rejectedFrom ?? '跟进中' : '跟进中';
  const iso = new Date(now).toISOString();
  const entry: TimelineEntry = { time: iso, action: '编辑分拨', operator: OPERATOR, note: `撤回到${to}` };
  const base = withAppend(prev, record.id, entry);
  const override: NewsTipOverride = { ...base, status: to, rejectedFrom: undefined };
  const operation: FlowOperation = {
    id: opId(record.id, now),
    recordId: record.id,
    kind: 'revert',
    prevOverride: prev,
    label: `已撤回到${to}`
  };
  return { override, operation, to };
}
```

- [ ] **Step 4: 运行验证通过**

Run: `bun test src/features/news-tips/lib/flow-operations.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/news-tips/lib/flow-operations.ts src/features/news-tips/lib/flow-operations.test.ts
git commit -m "feat(news-tips): 新增流转操作构建纯函数

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 7: 订阅 hook `use-overrides` + 合并 hook `use-records-with-overrides`

**Files:**
- Create: `src/features/news-tips/hooks/use-overrides.ts`
- Create: `src/features/news-tips/hooks/use-records-with-overrides.ts`

**Interfaces:**
- Consumes: `overridesStore`(Task 5), `applyOverrides`(Task 4), `recordsQueryOptions`(现有), `NewsTipFilters`
- Produces:
  - `useOverrides(): OverridesMap`
  - `useRecordsWithOverrides(filters: NewsTipFilters): { items: NewsTipRecordWithPriority[]; rangeTotalItems: number; totalItems: number; allItems: number }`

- [ ] **Step 1: 实现 `use-overrides.ts`**

```ts
'use client';

import { useSyncExternalStore } from 'react';

import { overridesStore } from '../lib/overrides-store';
import type { OverridesMap } from '../api/types';

export function useOverrides(): OverridesMap {
  return useSyncExternalStore(
    overridesStore.subscribe,
    overridesStore.getSnapshot,
    overridesStore.getServerSnapshot
  );
}
```

- [ ] **Step 2: 实现 `use-records-with-overrides.ts`**

```ts
'use client';

import { useMemo } from 'react';
import { useSuspenseQuery } from '@tanstack/react-query';

import { recordsQueryOptions } from '../api/queries';
import { applyOverrides } from '../utils/apply-overrides';
import type { NewsTipFilters } from '../api/types';
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
```

> 说明:`new Date()` 用于优先级时效计算;每次渲染新建可接受(纯展示,非确定性快照场景)。

- [ ] **Step 3: 类型检查**

Run: `bunx tsc --noEmit`
Expected: 无错误

- [ ] **Step 4: Commit**

```bash
git add src/features/news-tips/hooks/use-overrides.ts src/features/news-tips/hooks/use-records-with-overrides.ts
git commit -m "feat(news-tips): 新增覆盖层订阅与合并 hooks

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 8: 动作编排 hook `use-flow-actions`

把纯函数 + store + toast/undo 串起来,给 UI 一组稳定回调。

**Files:**
- Create: `src/features/news-tips/hooks/use-flow-actions.ts`

**Interfaces:**
- Consumes: `overridesStore`(Task 5), `buildMove/buildReassign/buildNote/buildRevert`(Task 6), `useOverrides`(Task 7), `toast`(sonner)
- Produces `useFlowActions()` 返回:
  - `moveStatus(record: NewsTipRecordWithPriority, to: NewsTipStatus, reason?: string): void`
  - `reassign(record: NewsTipRecordWithPriority, assignee: string): void`
  - `addNote(record: NewsTipRecordWithPriority, text: string): void`
  - `revert(record: NewsTipRecordWithPriority): void`

- [ ] **Step 1: 实现 `use-flow-actions.ts`**

```ts
'use client';

import { useCallback } from 'react';
import { toast } from 'sonner';

import { overridesStore } from '../lib/overrides-store';
import {
  buildMove,
  buildNote,
  buildReassign,
  buildRevert
} from '../lib/flow-operations';
import type {
  FlowOperation,
  NewsTipOverride,
  NewsTipRecordWithPriority,
  NewsTipStatus
} from '../api/types';
import { useOverrides } from './use-overrides';

export function useFlowActions() {
  const overrides = useOverrides();

  const commit = useCallback(
    (recordId: string, override: NewsTipOverride | null, operation: FlowOperation) => {
      if (override === null) overridesStore.removeOverride(recordId);
      else overridesStore.setOverride(recordId, override);

      toast(operation.label, {
        action: {
          label: '撤销',
          onClick: () => {
            if (operation.prevOverride) overridesStore.setOverride(recordId, operation.prevOverride);
            else overridesStore.removeOverride(recordId);
          }
        }
      });
    },
    []
  );

  const moveStatus = useCallback(
    (record: NewsTipRecordWithPriority, to: NewsTipStatus, reason?: string) => {
      const prev = overrides[record.id] ?? null;
      const { override, operation } = buildMove(record, to, reason, prev, Date.now());
      commit(record.id, override, operation);
    },
    [overrides, commit]
  );

  const reassign = useCallback(
    (record: NewsTipRecordWithPriority, assignee: string) => {
      const prev = overrides[record.id] ?? null;
      const { override, operation } = buildReassign(record, assignee, prev, Date.now());
      commit(record.id, override, operation);
    },
    [overrides, commit]
  );

  const addNote = useCallback(
    (record: NewsTipRecordWithPriority, text: string) => {
      const prev = overrides[record.id] ?? null;
      const { override, operation } = buildNote(record, text, prev, Date.now());
      commit(record.id, override, operation);
    },
    [overrides, commit]
  );

  const revert = useCallback(
    (record: NewsTipRecordWithPriority) => {
      const prev = overrides[record.id] ?? null;
      const { override, operation } = buildRevert(record, prev, Date.now());
      commit(record.id, override, operation);
    },
    [overrides, commit]
  );

  return { moveStatus, reassign, addNote, revert };
}
```

- [ ] **Step 2: 类型检查**

Run: `bunx tsc --noEmit`
Expected: 无错误

- [ ] **Step 3: Commit**

```bash
git add src/features/news-tips/hooks/use-flow-actions.ts
git commit -m "feat(news-tips): 新增流转动作编排 hook(含 toast 撤销)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 9: 弹窗组件 `components/flow-dialogs.tsx`

理由 / 转派 / 备注 / 详情四个受控弹窗,由 board 用一个 `dialog` 状态驱动。

**Files:**
- Create: `src/features/news-tips/components/flow-dialogs.tsx`

**Interfaces:**
- Consumes: shadcn `Dialog`、`Textarea`、`Button`、`Badge`、`NEWS_TIP_ASSIGNEES`(Task 2)
- Produces(受控,均以 `open`/`onOpenChange` 控制):
  - `RejectDialog({ open, onOpenChange, onConfirm }: { open; onOpenChange; onConfirm: (reason: string) => void })`
  - `ReassignDialog({ open, onOpenChange, current, onConfirm }: { ...; current: string; onConfirm: (assignee: string) => void })`
  - `NoteDialog({ open, onOpenChange, onConfirm }: { ...; onConfirm: (text: string) => void })`
  - `DetailDialog({ open, onOpenChange, record }: { ...; record: NewsTipRecordWithPriority | null })`

- [ ] **Step 1: 实现 `flow-dialogs.tsx`**

```tsx
'use client';

import { useEffect, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { NEWS_TIP_ASSIGNEES } from '@/features/news-tips/constants/options';
import type { NewsTipRecordWithPriority } from '@/features/news-tips/api/types';

const REJECT_PRESETS = ['信息不实', '重复线索', '不属实/无法核实', '不具备采用价值'];

type OpenProps = { open: boolean; onOpenChange: (open: boolean) => void };

export function RejectDialog({
  open,
  onOpenChange,
  onConfirm
}: OpenProps & { onConfirm: (reason: string) => void }) {
  const [reason, setReason] = useState('');
  useEffect(() => {
    if (open) setReason('');
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>不予采用</DialogTitle>
          <DialogDescription>请填写不予采用的理由,将记入处理轨迹。</DialogDescription>
        </DialogHeader>
        <div className='flex flex-wrap gap-2'>
          {REJECT_PRESETS.map((preset) => (
            <Badge
              key={preset}
              variant='outline'
              className='cursor-pointer'
              onClick={() => setReason(preset)}
            >
              {preset}
            </Badge>
          ))}
        </div>
        <Textarea
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder='填写理由…'
          rows={3}
        />
        <DialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            disabled={reason.trim().length === 0}
            onClick={() => {
              onConfirm(reason.trim());
              onOpenChange(false);
            }}
          >
            确认不予采用
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ReassignDialog({
  open,
  onOpenChange,
  current,
  onConfirm
}: OpenProps & { current: string; onConfirm: (assignee: string) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>转派处理人</DialogTitle>
          <DialogDescription>当前处理人:{current}</DialogDescription>
        </DialogHeader>
        <div className='grid grid-cols-2 gap-2'>
          {NEWS_TIP_ASSIGNEES.filter((name) => name !== current).map((name) => (
            <Button
              key={name}
              variant='outline'
              onClick={() => {
                onConfirm(name);
                onOpenChange(false);
              }}
            >
              {name}
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function NoteDialog({
  open,
  onOpenChange,
  onConfirm
}: OpenProps & { onConfirm: (text: string) => void }) {
  const [text, setText] = useState('');
  useEffect(() => {
    if (open) setText('');
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>追加处理备注</DialogTitle>
          <DialogDescription>备注将作为「记者跟进」记入处理轨迹。</DialogDescription>
        </DialogHeader>
        <Textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder='填写处理进展…'
          rows={3}
        />
        <DialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            disabled={text.trim().length === 0}
            onClick={() => {
              onConfirm(text.trim());
              onOpenChange(false);
            }}
          >
            追加备注
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function DetailDialog({
  open,
  onOpenChange,
  record
}: OpenProps & { record: NewsTipRecordWithPriority | null }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-h-[80vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle>{record?.title}</DialogTitle>
          <DialogDescription>
            {record ? `${record.district} · ${record.category} · ${record.assignee}` : ''}
          </DialogDescription>
        </DialogHeader>
        {record ? (
          <div className='grid gap-3 text-sm'>
            <p className='text-muted-foreground'>{record.description}</p>
            <div className='grid gap-2'>
              {record.timeline.map((entry, index) => (
                <div key={index} className='grid gap-0.5 border-l-2 pl-3'>
                  <span className='font-medium'>{entry.action}</span>
                  <span className='text-muted-foreground text-xs'>
                    {new Date(entry.time).toLocaleString('zh-CN')} · {entry.operator}
                  </span>
                  <span className='text-xs'>{entry.note}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: 类型检查**

Run: `bunx tsc --noEmit`
Expected: 无错误

- [ ] **Step 3: Commit**

```bash
git add src/features/news-tips/components/flow-dialogs.tsx
git commit -m "feat(news-tips): 新增流转操作弹窗(理由/转派/备注/详情)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 10: 安装 `@dnd-kit/core` + 可拖拽卡片 `components/flow-card.tsx`

**Files:**
- Modify: `package.json`(新增依赖)
- Create: `src/features/news-tips/components/flow-card.tsx`

**Interfaces:**
- Consumes: `@dnd-kit/core` `useDraggable`, shadcn `DropdownMenu`, `Badge`, Icons, `TERMINAL_STATUSES`(Task 2)
- Produces:
  - `FlowCard({ record, onDetail, onReassign, onNote, onRevert }: { record: NewsTipRecordWithPriority; onDetail: () => void; onReassign: () => void; onNote: () => void; onRevert: () => void })`

- [ ] **Step 1: 安装依赖**

Run: `bun add @dnd-kit/core`
Expected: `package.json` 出现 `@dnd-kit/core`

- [ ] **Step 2: 确认 Icons 注册表有所需图标**

Run: `grep -nE "dots|dotsVertical|IconDots" src/components/icons.tsx`
Expected: 找到竖排点菜单图标(如 `IconDotsVertical`)。若无,在 `src/components/icons.tsx` 的注册对象中补充:`import { IconDotsVertical } from '@tabler/icons-react'` 并加入导出映射(遵循该文件既有写法)。

- [ ] **Step 3: 实现 `flow-card.tsx`**

```tsx
'use client';

import { useDraggable } from '@dnd-kit/core';

import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Icons } from '@/components/icons';
import { TERMINAL_STATUSES } from '@/features/news-tips/constants/transitions';
import type { NewsTipRecordWithPriority } from '@/features/news-tips/api/types';
import { cn } from '@/lib/utils';

interface FlowCardProps {
  record: NewsTipRecordWithPriority;
  onDetail: () => void;
  onReassign: () => void;
  onNote: () => void;
  onRevert: () => void;
}

export function FlowCard({ record, onDetail, onReassign, onNote, onRevert }: FlowCardProps) {
  const isTerminal = TERMINAL_STATUSES.includes(record.status);
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: record.id,
    disabled: isTerminal,
    data: { status: record.status }
  });

  const MoreIcon = Icons.dotsVertical ?? Icons.ellipsis;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'bg-card grid gap-1 rounded-lg border p-3',
        isTerminal ? 'cursor-default' : 'cursor-grab active:cursor-grabbing',
        isDragging && 'opacity-50 shadow-lg'
      )}
    >
      <div className='flex items-start justify-between gap-2'>
        <span
          className='truncate text-sm font-medium'
          {...(isTerminal ? {} : { ...attributes, ...listeners })}
        >
          {record.title}
        </span>
        <DropdownMenu>
          <DropdownMenuTrigger className='text-muted-foreground shrink-0'>
            {MoreIcon ? <MoreIcon className='size-4' /> : '⋯'}
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end'>
            <DropdownMenuItem onSelect={onDetail}>查看详情</DropdownMenuItem>
            <DropdownMenuItem onSelect={onReassign}>转派处理人</DropdownMenuItem>
            <DropdownMenuItem onSelect={onNote}>追加备注</DropdownMenuItem>
            {isTerminal ? <DropdownMenuItem onSelect={onRevert}>撤回</DropdownMenuItem> : null}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <span className='text-muted-foreground text-xs'>
        {record.district} · {record.category}
      </span>
      <div className='flex items-center justify-between text-xs'>
        <Badge variant='outline'>{record.priorityLabel}</Badge>
        <span className='text-muted-foreground tabular-nums'>{record.assignee}</span>
      </div>
    </div>
  );
}
```

> `Icons.dotsVertical ?? Icons.ellipsis`:用现有注册表里可用的名字;Step 2 已确认具体名称,按实际存在的键调整这两处引用。

- [ ] **Step 4: 类型检查**

Run: `bunx tsc --noEmit`
Expected: 无错误

- [ ] **Step 5: Commit**

```bash
git add package.json bun.lock src/features/news-tips/components/flow-card.tsx src/components/icons.tsx
git commit -m "feat(news-tips): 新增可拖拽流转卡片与 dnd-kit 依赖

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 11: 看板拖拽化 `flow-board.tsx`

组装:DnD 上下文 + 列 droppable + 卡片 + 弹窗 + 动作。

**Files:**
- Modify: `src/features/news-tips/components/flow-board.tsx`(整体重写)

**Interfaces:**
- Consumes: `useRecordsWithOverrides`(Task 7)、`useFlowActions`(Task 8)、`FlowCard`(Task 10)、`flow-dialogs`(Task 9)、`canTransition`/`requiresReason`(Task 2)、`@dnd-kit/core` `DndContext`/`useDroppable`

- [ ] **Step 1: 重写 `flow-board.tsx`**

```tsx
'use client';

import { useState } from 'react';
import { DndContext, useDroppable, type DragEndEvent } from '@dnd-kit/core';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { WorkbenchNav } from '@/features/news-tips/components/section-nav';
import { FlowCard } from '@/features/news-tips/components/flow-card';
import {
  DetailDialog,
  NoteDialog,
  ReassignDialog,
  RejectDialog
} from '@/features/news-tips/components/flow-dialogs';
import { canTransition, requiresReason } from '@/features/news-tips/constants/transitions';
import { useNewsTipParams } from '@/features/news-tips/hooks/use-news-tip-params';
import { useRecordsWithOverrides } from '@/features/news-tips/hooks/use-records-with-overrides';
import { useFlowActions } from '@/features/news-tips/hooks/use-flow-actions';
import { groupRecordsByStatus } from '@/features/news-tips/utils/analytics';
import type { NewsTipRecordWithPriority, NewsTipStatus } from '@/features/news-tips/api/types';
import { cn } from '@/lib/utils';

type DialogState =
  | { kind: 'reject'; record: NewsTipRecordWithPriority; to: NewsTipStatus }
  | { kind: 'reassign'; record: NewsTipRecordWithPriority }
  | { kind: 'note'; record: NewsTipRecordWithPriority }
  | { kind: 'detail'; record: NewsTipRecordWithPriority }
  | null;

function Column({
  status,
  count,
  activeFrom,
  children
}: {
  status: NewsTipStatus;
  count: number;
  activeFrom: NewsTipStatus | null;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const legal = activeFrom !== null && canTransition(activeFrom, status);
  const illegal = activeFrom !== null && activeFrom !== status && !legal;

  return (
    <Card className='flex flex-col'>
      <CardHeader className='flex flex-row items-center justify-between pb-2'>
        <CardTitle className='text-sm font-medium'>{status}</CardTitle>
        <Badge variant='secondary'>{count}</Badge>
      </CardHeader>
      <CardContent
        ref={setNodeRef}
        className={cn(
          'grid max-h-[70vh] gap-2 overflow-y-auto rounded-md transition-colors',
          legal && isOver && 'ring-primary bg-primary/5 ring-2',
          legal && !isOver && 'ring-primary/40 ring-1',
          illegal && 'opacity-50'
        )}
      >
        {children}
      </CardContent>
    </Card>
  );
}

export function FlowBoard() {
  const { filters } = useNewsTipParams();
  const { items } = useRecordsWithOverrides(filters);
  const groups = groupRecordsByStatus(items);
  const { moveStatus, reassign, addNote, revert } = useFlowActions();

  const [activeFrom, setActiveFrom] = useState<NewsTipStatus | null>(null);
  const [dialog, setDialog] = useState<DialogState>(null);

  function handleDragEnd(event: DragEndEvent) {
    setActiveFrom(null);
    const to = event.over?.id as NewsTipStatus | undefined;
    const record = items.find((item) => item.id === event.active.id);
    if (!to || !record || !canTransition(record.status, to)) return;

    if (requiresReason(to)) {
      setDialog({ kind: 'reject', record, to });
      return;
    }
    moveStatus(record, to);
  }

  return (
    <div className='grid gap-4'>
      <WorkbenchNav />
      <DndContext
        onDragStart={(event) =>
          setActiveFrom((event.active.data.current?.status as NewsTipStatus) ?? null)
        }
        onDragCancel={() => setActiveFrom(null)}
        onDragEnd={handleDragEnd}
      >
        <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
          {groups.map((group) => (
            <Column
              key={group.status}
              status={group.status}
              count={group.items.length}
              activeFrom={activeFrom}
            >
              {group.items.length === 0 ? (
                <p className='text-muted-foreground py-6 text-center text-xs'>暂无线索</p>
              ) : (
                group.items.map((record) => (
                  <FlowCard
                    key={record.id}
                    record={record}
                    onDetail={() => setDialog({ kind: 'detail', record })}
                    onReassign={() => setDialog({ kind: 'reassign', record })}
                    onNote={() => setDialog({ kind: 'note', record })}
                    onRevert={() => revert(record)}
                  />
                ))
              )}
            </Column>
          ))}
        </div>
      </DndContext>

      <RejectDialog
        open={dialog?.kind === 'reject'}
        onOpenChange={(open) => !open && setDialog(null)}
        onConfirm={(reason) => {
          if (dialog?.kind === 'reject') moveStatus(dialog.record, dialog.to, reason);
        }}
      />
      <ReassignDialog
        open={dialog?.kind === 'reassign'}
        onOpenChange={(open) => !open && setDialog(null)}
        current={dialog?.kind === 'reassign' ? dialog.record.assignee : ''}
        onConfirm={(assignee) => {
          if (dialog?.kind === 'reassign') reassign(dialog.record, assignee);
        }}
      />
      <NoteDialog
        open={dialog?.kind === 'note'}
        onOpenChange={(open) => !open && setDialog(null)}
        onConfirm={(text) => {
          if (dialog?.kind === 'note') addNote(dialog.record, text);
        }}
      />
      <DetailDialog
        open={dialog?.kind === 'detail'}
        onOpenChange={(open) => !open && setDialog(null)}
        record={dialog?.kind === 'detail' ? dialog.record : null}
      />
    </div>
  );
}
```

- [ ] **Step 2: 类型检查**

Run: `bunx tsc --noEmit`
Expected: 无错误

- [ ] **Step 3: 启动并手动验证**

Run: `bun run dev`,打开处理流转看板:
- 待审核卡片拖到「跟进中」→ 落列成功 + Toast「已流转到跟进中·撤销」;点撤销回弹
- 拖到「不予采用」→ 弹理由框,不填禁用确认,填后落列
- 拖动时非法列变暗、合法列高亮;终态卡片不可拖
- ⋯ 菜单:详情/转派/备注可用,终态卡片额外有「撤回」
- 刷新页面,改动仍在

- [ ] **Step 4: Commit**

```bash
git add src/features/news-tips/components/flow-board.tsx
git commit -m "feat(news-tips): 处理流转看板支持拖拽流转与卡片操作

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 12: 线索明细表接入覆盖层(一致性)

让明细表与看板读同一 store,操作后刷新一致。

**Files:**
- Modify: `src/features/news-tips/components/records-workbench.tsx`

**Interfaces:**
- Consumes: `useRecordsWithOverrides`(Task 7)

- [ ] **Step 1: 修改 `records-workbench.tsx`** —— 用合并 hook 替换 records 的直接查询。删除 `recordsQueryOptions` 的 `useSuspenseQuery`(24 行),新增:

```tsx
import { useRecordsWithOverrides } from '@/features/news-tips/hooks/use-records-with-overrides';
// …保留 dashboardQueryOptions 的 useSuspenseQuery(KPI/图表仍走原路)
const records = useRecordsWithOverrides(queryFilters);
```

然后把原来引用 `recordsResponse.items` / `recordsResponse.rangeTotalItems` 的地方(52、53、59、60 行)改为 `records.items` / `records.rangeTotalItems`。若 `recordsQueryOptions` 已无其它引用,移除该 import。

- [ ] **Step 2: 类型检查**

Run: `bunx tsc --noEmit`
Expected: 无错误

- [ ] **Step 3: 手动验证一致性**

Run: `bun run dev`
- 在看板把某条从「待审核」拖到「跟进中」→ 切到线索明细台,该条状态同步为「跟进中」,处理轨迹多一条「首次审核」

- [ ] **Step 4: Commit**

```bash
git add src/features/news-tips/components/records-workbench.tsx
git commit -m "feat(news-tips): 线索明细表接入覆盖层与看板保持一致

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 13: 全量回归与静态导出验收

**Files:** 无(验收)

- [ ] **Step 1: 跑全部单测**

Run: `bun test src/features/news-tips`
Expected: 全 PASS(service / analytics / transitions / apply-overrides / overrides-store / flow-operations)

- [ ] **Step 2: 生产构建**

Run: `bun run build`
Expected: 零错误

- [ ] **Step 3: 静态导出验收**

Run: `NEXT_PUBLIC_SENTRY_DISABLED=true NEXT_STATIC_EXPORT=true bun run build`
Expected: 可生成纯静态产物,无因新增交互导致的 SSR/导出报错

- [ ] **Step 4: 最终提交(若前面各任务已提交,此处仅在有残余改动时)**

```bash
git add -A
git commit -m "chore(news-tips): 处理流转交互全量回归与静态导出验收

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Self-Review 结论

- **Spec 覆盖**:拖拽流转(T11)、理由框(T9/T11)、转派/备注/撤回(T6/T8/T9/T10/T11)、Toast+撤销(T8)、localStorage 持久化(T5)、看板+明细表一致(T7/T12)、共享优先级(T1)、流转规则(T2)、纯前端+静态导出(T13)——均有对应任务。
- **KPI/图表不叠加覆盖层**:已在设计文档明确为本期范围外,计划一致未纳入,非遗漏。
- **类型一致性**:`buildMove/buildReassign/buildNote/buildRevert` 返回 `{ override, operation }`,`use-flow-actions` 按此消费;`useRecordsWithOverrides` 返回 `items/rangeTotalItems/...` 与 T11/T12 消费一致;store 方法名 `setOverride/removeOverride/resetAll/getSnapshot/getServerSnapshot/subscribe` 各处一致。
- **占位符**:无 TBD/TODO;各步含完整代码或确切命令。
