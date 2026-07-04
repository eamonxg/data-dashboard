# 深圳报料驾驶舱 · IA 重构实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把现有「总览 / 数据仪表盘 / 线索明细台」三平行页，重构为 PRD v0.3 的「驾驶舱首页 + 工作台（线索明细 / 处理流转）」两级结构，并补齐处理流转看板、待办预览、今日待办快捷视图和图表下钻跳转。

**Architecture:** 数据层（`api/service.ts`）、筛选（nuqs + `use-news-tip-*`）、图表组件、CSV 导出均已完成且深圳本地化，本次**不改数据层**。改动集中在页面组合（`app/dashboard/news-tips/**`）、容器组件（`cockpit.tsx` / 新增 `flow-board.tsx`）、导航（`nav-config.ts` / `section-nav.tsx`）和少量可测试的纯函数工具。驾驶舱首页只做「看」，图表点击通过 URL 跳转到「线索明细」下钻；工作台承载「操作」。

**Tech Stack:** Next.js 16 App Router · React Query（`queryOptions` + `useSuspenseQuery` + prefetch/HydrationBoundary）· nuqs（URL 筛选参数）· shadcn/ui · Tailwind · 测试 `bun:test` · lint `oxlint`。

## Global Constraints

- 页面头部只用 `PageContainer` 的 `pageTitle` / `pageDescription` / `pageHeaderAction`，不手动引入 `<Heading>`。
- 图标只从 `@/components/icons` 的 `Icons` 引入，不直接用 `@tabler/icons-react`。
- 数据访问只走 `api/types.ts → api/service.ts → api/queries.ts`；组件从 `queries` 和 `service` 导入，不直接碰 mock。
- React Query：服务端 `void queryClient.prefetchQuery()`，客户端 `useSuspenseQuery`，`HydrationBoundary` + `dehydrate`，`<Suspense fallback>`。
- URL 状态用 nuqs（`useNewsTipParams` / `newsTipSearchParams`）；className 合并用 `cn()`。
- 纯前端 mock：不新增后端接口、Route Handler、Server Action、数据库。
- 代码风格：单引号、JSX 单引号、无尾逗号、2 空格缩进。
- 区划只用深圳；代码中不得出现广州区划（`service.test.ts` 已有守卫测试，必须保持通过）。
- 最终产物需支持 `NEXT_STATIC_EXPORT=true` 纯静态导出。

## 目标信息架构

| 路由 | 角色 | 组件 | 动作 |
| --- | --- | --- | --- |
| `/dashboard/news-tips` | 驾驶舱首页（只看） | `Cockpit` | 保留，重构为整合概览 + 下钻跳转 |
| `/dashboard/news-tips/records` | 工作台 / 线索明细 | `RecordsWorkbench` | 保留，加「今日待办」快捷视图 + 工作台 Tab |
| `/dashboard/news-tips/flow` | 工作台 / 处理流转 | `FlowBoard` | 新增看板页 |
| ~~`/dashboard/news-tips/analytics`~~ | — | — | 删除，内容并入驾驶舱首页 |

驾驶舱首页板块顺序：态势总览（InsightStrip）→ KPI（KpiCards）→ 处理进度（StatusProgress 新增）→ 热点分布（ChannelPie + CategoryBar + DistrictHeatGrid）→ 趋势走向（TrendChart）→ 待办预览（TodoPreview 新增）。

## 实施方式说明（TDD 边界）

- **纯函数工具（Task 1 / 2）** 用 `bun:test` 严格 TDD：先写失败测试 → 跑红 → 实现 → 跑绿。
- **UI 组合任务（Task 3–8）** 无法有意义地单测（属于组件搬迁/组合），验证方式为 `bun run lint` + `bun run build` 通过、既有 `bun test` 全绿、以及浏览器手动核对。每个 UI 任务末尾列出明确的人工验收点。

---

### Task 1: 下钻跳转工具 `records-href`

驾驶舱首页图表和态势条点击后，需要携带当前时间范围 + 目标筛选跳到「线索明细」。这是纯字符串构造，先做成可测工具。

**Files:**
- Create: `src/features/news-tips/utils/records-href.ts`
- Test: `src/features/news-tips/utils/records-href.test.ts`

**Interfaces:**
- Consumes: `InsightItem`（来自 `../api/types`）。
- Produces:
  - `RECORDS_PATH = '/dashboard/news-tips/records'`
  - `type RecordsHrefBase = { range: string; dateFrom?: string | null; dateTo?: string | null }`
  - `type RecordsHrefPatch = Partial<Record<'status' | 'category' | 'sourcePlatform' | 'channel' | 'district' | 'priority' | 'sort', string>>`
  - `buildRecordsHref(base: RecordsHrefBase, patch: RecordsHrefPatch): string`
  - `insightToPatch(insight: InsightItem): RecordsHrefPatch`

- [ ] **Step 1: 写失败测试**

```ts
// src/features/news-tips/utils/records-href.test.ts
import { describe, expect, test } from 'bun:test';

import type { InsightItem } from '../api/types';
import { RECORDS_PATH, buildRecordsHref, insightToPatch } from './records-href';

describe('buildRecordsHref', () => {
  test('保留时间范围并写入单个筛选', () => {
    const href = buildRecordsHref({ range: 'week' }, { district: '福田区' });
    const url = new URL(href, 'http://x');
    expect(url.pathname).toBe(RECORDS_PATH);
    expect(url.searchParams.get('range')).toBe('week');
    expect(url.searchParams.get('district')).toBe('福田区');
  });

  test('自定义范围带上起止日期', () => {
    const href = buildRecordsHref(
      { range: 'custom', dateFrom: '2026-06-01', dateTo: '2026-06-30' },
      { status: '待审核' }
    );
    const url = new URL(href, 'http://x');
    expect(url.searchParams.get('dateFrom')).toBe('2026-06-01');
    expect(url.searchParams.get('dateTo')).toBe('2026-06-30');
    expect(url.searchParams.get('status')).toBe('待审核');
  });

  test('忽略空值', () => {
    const href = buildRecordsHref({ range: 'month', dateFrom: null }, {});
    const url = new URL(href, 'http://x');
    expect(url.searchParams.has('dateFrom')).toBe(false);
    expect(url.searchParams.get('range')).toBe('month');
  });
});

describe('insightToPatch', () => {
  test('filter-district 映射到 district', () => {
    const insight = { action: { type: 'filter-district', value: '龙岗区' } } as InsightItem;
    expect(insightToPatch(insight)).toEqual({ district: '龙岗区' });
  });

  test('sort 映射到 sort', () => {
    const insight = { action: { type: 'sort', value: 'responseMinutes' } } as InsightItem;
    expect(insightToPatch(insight)).toEqual({ sort: 'responseMinutes' });
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `bun test src/features/news-tips/utils/records-href.test.ts`
Expected: FAIL（`Cannot find module './records-href'`）

- [ ] **Step 3: 实现工具**

```ts
// src/features/news-tips/utils/records-href.ts
import type { InsightItem } from '../api/types';

export const RECORDS_PATH = '/dashboard/news-tips/records';

export type RecordsHrefBase = {
  range: string;
  dateFrom?: string | null;
  dateTo?: string | null;
};

export type RecordsHrefPatch = Partial<
  Record<'status' | 'category' | 'sourcePlatform' | 'channel' | 'district' | 'priority' | 'sort', string>
>;

export function buildRecordsHref(base: RecordsHrefBase, patch: RecordsHrefPatch): string {
  const search = new URLSearchParams();

  if (base.range) search.set('range', base.range);
  if (base.dateFrom) search.set('dateFrom', base.dateFrom);
  if (base.dateTo) search.set('dateTo', base.dateTo);

  for (const [key, value] of Object.entries(patch)) {
    if (value != null && value !== '') search.set(key, value);
  }

  const qs = search.toString();
  return qs ? `${RECORDS_PATH}?${qs}` : RECORDS_PATH;
}

export function insightToPatch(insight: InsightItem): RecordsHrefPatch {
  const action = insight.action;

  switch (action.type) {
    case 'sort':
      return { sort: action.value };
    case 'filter-status':
      return { status: action.value };
    case 'filter-category':
      return { category: action.value };
    case 'filter-sourcePlatform':
      return { sourcePlatform: action.value };
    case 'filter-channel':
      return { channel: action.value };
    case 'filter-district':
      return { district: action.value };
    case 'filter-priority':
      return { priority: action.value };
  }
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `bun test src/features/news-tips/utils/records-href.test.ts`
Expected: PASS（5 tests）

- [ ] **Step 5: 提交**

```bash
git add src/features/news-tips/utils/records-href.ts src/features/news-tips/utils/records-href.test.ts
git commit -m "feat(news-tips): 下钻跳转 URL 构造工具"
```

---

### Task 2: 待办与流转分组工具

驾驶舱「待办预览」取高优先级 Top N；处理流转看板按状态分列。两者都是纯函数，加到既有 `utils/analytics.ts`。

**Files:**
- Modify: `src/features/news-tips/utils/analytics.ts`（追加导出，勿改动现有函数）
- Test: `src/features/news-tips/utils/analytics.test.ts`（新建）

**Interfaces:**
- Consumes: `NewsTipRecordWithPriority`, `NewsTipStatus`（来自 `../api/types`）；`NEWS_TIP_STATUSES`（来自 `../constants/options`，`analytics.ts` 已引入）。
- Produces:
  - `selectTodoItems(records: NewsTipRecordWithPriority[], limit: number): NewsTipRecordWithPriority[]`（high 优先，其次 medium，保持原顺序，截断到 limit）
  - `interface StatusGroup { status: NewsTipStatus; items: NewsTipRecordWithPriority[] }`
  - `groupRecordsByStatus(records: NewsTipRecordWithPriority[]): StatusGroup[]`（按 `NEWS_TIP_STATUSES` 顺序分组）

- [ ] **Step 1: 写失败测试**

```ts
// src/features/news-tips/utils/analytics.test.ts
import { describe, expect, test } from 'bun:test';

import type { NewsTipRecordWithPriority } from '../api/types';
import { groupRecordsByStatus, selectTodoItems } from './analytics';

function record(
  id: string,
  priorityLevel: NewsTipRecordWithPriority['priorityLevel'],
  status: NewsTipRecordWithPriority['status']
): NewsTipRecordWithPriority {
  return { id, priorityLevel, status } as NewsTipRecordWithPriority;
}

describe('selectTodoItems', () => {
  test('高优先级优先，其次中优先级，截断到 limit', () => {
    const records = [
      record('a', 'low', '已采用'),
      record('b', 'high', '待审核'),
      record('c', 'medium', '跟进中'),
      record('d', 'high', '跟进中')
    ];
    const todo = selectTodoItems(records, 2);
    expect(todo.map((r) => r.id)).toEqual(['b', 'd']);
  });

  test('高优先不足时用中优先补足', () => {
    const records = [record('a', 'medium', '跟进中'), record('b', 'high', '待审核')];
    expect(selectTodoItems(records, 5).map((r) => r.id)).toEqual(['b', 'a']);
  });
});

describe('groupRecordsByStatus', () => {
  test('按待审核/跟进中/已采用/不予采用四列分组', () => {
    const records = [
      record('a', 'high', '待审核'),
      record('b', 'low', '已采用'),
      record('c', 'medium', '待审核')
    ];
    const groups = groupRecordsByStatus(records);
    expect(groups.map((g) => g.status)).toEqual(['待审核', '跟进中', '已采用', '不予采用']);
    expect(groups[0].items.map((r) => r.id)).toEqual(['a', 'c']);
    expect(groups[1].items).toEqual([]);
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `bun test src/features/news-tips/utils/analytics.test.ts`
Expected: FAIL（`selectTodoItems is not a function` / import 失败）

- [ ] **Step 3: 追加实现到 `analytics.ts` 末尾**

```ts
// 追加到 src/features/news-tips/utils/analytics.ts 文件末尾
export function selectTodoItems(
  records: NewsTipRecordWithPriority[],
  limit: number
): NewsTipRecordWithPriority[] {
  const high = records.filter((record) => record.priorityLevel === 'high');
  const medium = records.filter((record) => record.priorityLevel === 'medium');
  return [...high, ...medium].slice(0, limit);
}

export interface StatusGroup {
  status: NewsTipStatus;
  items: NewsTipRecordWithPriority[];
}

export function groupRecordsByStatus(records: NewsTipRecordWithPriority[]): StatusGroup[] {
  return NEWS_TIP_STATUSES.map((status) => ({
    status,
    items: records.filter((record) => record.status === status)
  }));
}
```

（`NewsTipRecordWithPriority`、`NewsTipStatus`、`NEWS_TIP_STATUSES` 在 `analytics.ts` 顶部已 import，无需新增。）

- [ ] **Step 4: 跑测试确认通过**

Run: `bun test src/features/news-tips/utils/analytics.test.ts`
Expected: PASS（3 tests）

- [ ] **Step 5: 提交**

```bash
git add src/features/news-tips/utils/analytics.ts src/features/news-tips/utils/analytics.test.ts
git commit -m "feat(news-tips): 待办 Top N 与状态分组工具"
```

---

### Task 3: 导航重构（侧边栏 + 工作台 Tab）

把导航从三平行页改为「报料驾驶舱（单项）+ 工作台（线索明细 / 处理流转）」，页内 Tab 只服务工作台两模块。

**Files:**
- Modify: `src/config/nav-config.ts`
- Modify: `src/features/news-tips/components/section-nav.tsx`（改导出为 `WorkbenchNav`，两个 Tab）

**Interfaces:**
- Produces: `WorkbenchNav`（具名导出，供 `RecordsWorkbench` 和 `FlowBoard` 使用）。

- [ ] **Step 1: 改侧边栏配置**

把 `src/config/nav-config.ts` 里 `navGroups[0].items` 替换为：

```ts
    items: [
      {
        title: '报料驾驶舱',
        url: '/dashboard/news-tips',
        icon: 'dashboard',
        isActive: true,
        shortcut: ['d', 'd'],
        items: []
      },
      {
        title: '工作台',
        url: '/dashboard/news-tips/records',
        icon: 'kanban',
        isActive: false,
        items: [
          {
            title: '线索明细',
            url: '/dashboard/news-tips/records'
          },
          {
            title: '处理流转',
            url: '/dashboard/news-tips/flow'
          }
        ]
      },
      {
        title: '设计规范',
        url: '/dashboard/design',
        icon: 'palette',
        isActive: false,
        items: []
      }
    ]
```

- [ ] **Step 2: 改页内 Tab 组件**

把 `src/features/news-tips/components/section-nav.tsx` 整个替换为：

```tsx
'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Icons } from '@/components/icons';

const sections = [
  {
    title: '线索明细',
    href: '/dashboard/news-tips/records',
    icon: Icons.post
  },
  {
    title: '处理流转',
    href: '/dashboard/news-tips/flow',
    icon: Icons.kanban
  }
];

export function WorkbenchNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = searchParams.toString();
  const activeSection = sections.find((section) => section.href === pathname) ?? sections[0];

  return (
    <Tabs value={activeSection.href} className='w-full'>
      <TabsList className='grid h-auto w-full grid-cols-2 p-1 md:w-fit'>
        {sections.map((section) => {
          const Icon = section.icon;
          const href = query ? `${section.href}?${query}` : section.href;

          return (
            <TabsTrigger key={section.href} value={section.href} asChild className='h-9 px-3'>
              <Link href={href}>
                <Icon className='size-4' />
                <span>{section.title}</span>
              </Link>
            </TabsTrigger>
          );
        })}
      </TabsList>
    </Tabs>
  );
}
```

- [ ] **Step 3: 校验（此时 records-workbench 仍引用旧名，先不 build，等 Task 7 修复引用后统一 build）**

Run: `bun run lint`
Expected: lint 通过（`WorkbenchNav` 暂未被引用不影响 oxlint）。

- [ ] **Step 4: 提交**

```bash
git add src/config/nav-config.ts src/features/news-tips/components/section-nav.tsx
git commit -m "feat(news-tips): 导航重构为驾驶舱+工作台两级结构"
```

---

### Task 4: 新增「处理进度」与「待办预览」组件

驾驶舱首页要用的两个新板块。都是纯展示 + 点击回调/链接，不含数据请求（数据由 `Cockpit` 传入）。

**Files:**
- Create: `src/features/news-tips/components/status-progress.tsx`
- Create: `src/features/news-tips/components/todo-preview.tsx`

**Interfaces:**
- Consumes: `StatusStat`, `NewsTipStatus`, `NewsTipRecordWithPriority`（`../api/types`）；`selectTodoItems`（Task 2）。
- Produces:
  - `StatusProgress({ data, onSelect }: { data: StatusStat[]; onSelect: (status: NewsTipStatus) => void })`
  - `TodoPreview({ records }: { records: NewsTipRecordWithPriority[] })`

- [ ] **Step 1: 处理进度组件**

```tsx
// src/features/news-tips/components/status-progress.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { NewsTipStatus, StatusStat } from '@/features/news-tips/api/types';

const STATUS_COLORS: Record<NewsTipStatus, string> = {
  待审核: 'bg-amber-500',
  跟进中: 'bg-sky-500',
  已采用: 'bg-emerald-500',
  不予采用: 'bg-muted-foreground/40'
};

export function StatusProgress({
  data,
  onSelect
}: {
  data: StatusStat[];
  onSelect: (status: NewsTipStatus) => void;
}) {
  const total = data.reduce((sum, item) => sum + item.count, 0);

  return (
    <Card>
      <CardHeader className='pb-2'>
        <CardTitle className='text-sm font-medium'>处理进度</CardTitle>
      </CardHeader>
      <CardContent className='grid gap-3'>
        <div className='bg-muted flex h-3 w-full overflow-hidden rounded-full'>
          {total > 0 &&
            data.map((item) =>
              item.count > 0 ? (
                <button
                  key={item.status}
                  type='button'
                  aria-label={`筛选${item.status}`}
                  onClick={() => onSelect(item.status)}
                  className={cn('h-full transition-opacity hover:opacity-80', STATUS_COLORS[item.status])}
                  style={{ width: `${(item.count / total) * 100}%` }}
                />
              ) : null
            )}
        </div>
        <div className='grid grid-cols-2 gap-2 sm:grid-cols-4'>
          {data.map((item) => (
            <button
              key={item.status}
              type='button'
              onClick={() => onSelect(item.status)}
              className='hover:bg-muted/70 flex items-center justify-between gap-2 rounded-lg border p-2 text-left transition-colors'
            >
              <span className='flex items-center gap-2 text-xs'>
                <span className={cn('size-2 rounded-full', STATUS_COLORS[item.status])} />
                {item.status}
              </span>
              <span className='text-sm font-semibold tabular-nums'>{item.count}</span>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: 待办预览组件**

```tsx
// src/features/news-tips/components/todo-preview.tsx
'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Icons } from '@/components/icons';
import type { NewsTipRecordWithPriority, PriorityLevel } from '@/features/news-tips/api/types';
import { selectTodoItems } from '@/features/news-tips/utils/analytics';

const PRIORITY_BADGE: Record<PriorityLevel, 'destructive' | 'secondary' | 'outline'> = {
  high: 'destructive',
  medium: 'secondary',
  low: 'outline'
};

export function TodoPreview({ records }: { records: NewsTipRecordWithPriority[] }) {
  const items = selectTodoItems(records, 5);

  return (
    <Card>
      <CardHeader className='flex flex-row items-center justify-between pb-2'>
        <CardTitle className='text-sm font-medium'>待办预览 · 高优先级</CardTitle>
        <Button asChild variant='ghost' size='sm'>
          <Link href='/dashboard/news-tips/records?priority=high&sort=priority'>
            查看全部
            <Icons.arrowRight />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className='grid gap-2'>
        {items.length === 0 ? (
          <p className='text-muted-foreground py-6 text-center text-sm'>当前范围暂无高优先级待办</p>
        ) : (
          items.map((record) => (
            <Link
              key={record.id}
              href={`/dashboard/news-tips/records?priority=${record.priorityLevel}`}
              className='hover:bg-muted/70 grid gap-1 rounded-lg border p-3 transition-colors'
            >
              <div className='flex items-center justify-between gap-2'>
                <span className='truncate text-sm font-medium'>{record.title}</span>
                <Badge variant={PRIORITY_BADGE[record.priorityLevel]}>{record.priorityLabel}</Badge>
              </div>
              <span className='text-muted-foreground text-xs'>
                {record.district}
                {record.street ?? ''} · {record.category} · {record.status}
              </span>
            </Link>
          ))
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 3: lint 校验**

Run: `bun run lint`
Expected: 通过。

- [ ] **Step 4: 提交**

```bash
git add src/features/news-tips/components/status-progress.tsx src/features/news-tips/components/todo-preview.tsx
git commit -m "feat(news-tips): 新增处理进度与待办预览板块组件"
```

---

### Task 5: 重构驾驶舱首页 `Cockpit`（整合 + 下钻跳转）

把原总览 + 数据仪表盘的概览内容合并到一张首页，图表/态势点击改为跳转到「线索明细」下钻。首页用「仅时间范围」的筛选，始终展示全局态势，忽略明细页的下钻筛选。

**Files:**
- Modify: `src/features/news-tips/components/cockpit.tsx`（整体替换）

**Interfaces:**
- Consumes: `dashboardQueryOptions`, `recordsQueryOptions`（queries）；`buildRecordsHref`, `insightToPatch`（Task 1）；`StatusProgress`, `TodoPreview`（Task 4）；既有 `KpiCards` / `ChannelPie` / `CategoryBar` / `DistrictHeatGrid` / `InsightStrip` / `TrendChart`；`useNewsTipParams`。
- Produces: `Cockpit`（默认由 `app/dashboard/news-tips/page.tsx` 渲染，签名不变）。

- [ ] **Step 1: 整体替换 `cockpit.tsx`**

```tsx
'use client';

import { useRouter } from 'next/navigation';
import { useSuspenseQuery } from '@tanstack/react-query';

import { dashboardQueryOptions, recordsQueryOptions } from '@/features/news-tips/api/queries';
import type { InsightItem, NewsTipFilters } from '@/features/news-tips/api/types';
import { CategoryBar } from '@/features/news-tips/components/category-bar';
import { ChannelPie } from '@/features/news-tips/components/channel-pie';
import { DistrictHeatGrid } from '@/features/news-tips/components/district-heat-grid';
import { InsightStrip } from '@/features/news-tips/components/insight-strip';
import { KpiCards } from '@/features/news-tips/components/kpi-cards';
import { StatusProgress } from '@/features/news-tips/components/status-progress';
import { TodoPreview } from '@/features/news-tips/components/todo-preview';
import { TrendChart } from '@/features/news-tips/components/trend-chart';
import { useNewsTipParams } from '@/features/news-tips/hooks/use-news-tip-params';
import {
  buildRecordsHref,
  insightToPatch,
  type RecordsHrefPatch
} from '@/features/news-tips/utils/records-href';

export function Cockpit() {
  const router = useRouter();
  const { params } = useNewsTipParams();

  const rangeFilters: NewsTipFilters = {
    range: params.range,
    ...(params.dateFrom ? { dateFrom: params.dateFrom } : {}),
    ...(params.dateTo ? { dateTo: params.dateTo } : {}),
    sort: 'priority'
  };

  const { data: dashboard } = useSuspenseQuery(dashboardQueryOptions(rangeFilters));
  const { data: recordsResponse } = useSuspenseQuery(recordsQueryOptions(rangeFilters));
  const records = recordsResponse.items;

  const drill = (patch: RecordsHrefPatch) => {
    router.push(
      buildRecordsHref(
        { range: params.range, dateFrom: params.dateFrom, dateTo: params.dateTo },
        patch
      )
    );
  };

  const handleInsight = (insight: InsightItem) => {
    drill(insightToPatch(insight));
  };

  return (
    <div className='grid gap-4'>
      <InsightStrip insights={dashboard.insights} activeInsightId={null} onApply={handleInsight} />

      <KpiCards />

      <StatusProgress data={dashboard.statuses} onSelect={(status) => drill({ status })} />

      <div className='grid gap-4 xl:grid-cols-5'>
        <div className='xl:col-span-2'>
          <ChannelPie
            data={dashboard.channels}
            activeChannels={[]}
            onSelect={(channel) => drill({ channel })}
          />
        </div>
        <div className='xl:col-span-3'>
          <CategoryBar
            data={dashboard.categories}
            activeCategories={[]}
            onSelect={(category) => drill({ category })}
          />
        </div>
      </div>

      <DistrictHeatGrid
        data={dashboard.districts}
        activeDistricts={[]}
        onSelect={(district) => drill({ district })}
      />

      <TrendChart records={records} />

      <TodoPreview records={records} />
    </div>
  );
}
```

> 说明：`ChannelPie` / `CategoryBar` / `DistrictHeatGrid` 的 `onSelect` 回调参数分别是 `NewsTipChannel` / `NewsTipCategory` / `ShenzhenDistrict`（均为字符串字面量），可直接作为 `RecordsHrefPatch` 的 string 值传入。`activeChannels` 等传空数组：首页不做选中高亮，因为点击即跳转离开。

- [ ] **Step 2: 校验驾驶舱页面构建**

Run: `bun run build`
Expected: 编译成功（`/dashboard/news-tips` 无类型错误）。若 `InsightStrip` 的 `onApply` 类型不匹配，核对其 props 签名并调整 `handleInsight`。

- [ ] **Step 3: 人工验收**

- 打开 `/dashboard/news-tips`：依次可见 态势条 → KPI → 处理进度 → 渠道环形图 + 类型条形图 → 区域热区 → 趋势图 → 待办预览。
- 点击区域热区某个区 → 跳到 `/dashboard/news-tips/records?...&district=<区>`，明细表已按该区筛选。
- 点击态势条某条建议 → 跳到明细并带上对应筛选/排序。

- [ ] **Step 4: 提交**

```bash
git add src/features/news-tips/components/cockpit.tsx
git commit -m "feat(news-tips): 驾驶舱首页整合概览并支持图表下钻跳转"
```

---

### Task 6: 处理流转看板 `FlowBoard` + 路由

工作台第二个模块：按状态四列展示线索卡片，受当前筛选联动。

**Files:**
- Create: `src/features/news-tips/components/flow-board.tsx`
- Create: `src/app/dashboard/news-tips/flow/page.tsx`

**Interfaces:**
- Consumes: `recordsQueryOptions`（queries）；`groupRecordsByStatus`（Task 2）；`WorkbenchNav`（Task 3）；`useNewsTipParams`。
- Produces: `FlowBoard`（默认由 flow 路由渲染）。

- [ ] **Step 1: 看板组件**

```tsx
// src/features/news-tips/components/flow-board.tsx
'use client';

import { useSuspenseQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { recordsQueryOptions } from '@/features/news-tips/api/queries';
import { WorkbenchNav } from '@/features/news-tips/components/section-nav';
import { useNewsTipParams } from '@/features/news-tips/hooks/use-news-tip-params';
import { groupRecordsByStatus } from '@/features/news-tips/utils/analytics';

export function FlowBoard() {
  const { filters } = useNewsTipParams();
  const { data } = useSuspenseQuery(recordsQueryOptions(filters));
  const groups = groupRecordsByStatus(data.items);

  return (
    <div className='grid gap-4'>
      <WorkbenchNav />
      <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
        {groups.map((group) => (
          <Card key={group.status} className='flex flex-col'>
            <CardHeader className='flex flex-row items-center justify-between pb-2'>
              <CardTitle className='text-sm font-medium'>{group.status}</CardTitle>
              <Badge variant='secondary'>{group.items.length}</Badge>
            </CardHeader>
            <CardContent className='grid max-h-[70vh] gap-2 overflow-y-auto'>
              {group.items.length === 0 ? (
                <p className='text-muted-foreground py-6 text-center text-xs'>暂无线索</p>
              ) : (
                group.items.map((record) => (
                  <div key={record.id} className='grid gap-1 rounded-lg border p-3'>
                    <span className='truncate text-sm font-medium'>{record.title}</span>
                    <span className='text-muted-foreground text-xs'>
                      {record.district} · {record.category}
                    </span>
                    <div className='flex items-center justify-between text-xs'>
                      <Badge variant='outline'>{record.priorityLabel}</Badge>
                      <span className='text-muted-foreground tabular-nums'>{record.assignee}</span>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: flow 路由页**

```tsx
// src/app/dashboard/news-tips/flow/page.tsx
import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { Suspense } from 'react';
import PageContainer from '@/components/layout/page-container';
import { getQueryClient } from '@/lib/query-client';
import { recordsQueryOptions } from '@/features/news-tips/api/queries';
import type { NewsTipFilters } from '@/features/news-tips/api/types';
import { FlowBoard } from '@/features/news-tips/components/flow-board';
import { CockpitToolbar } from '@/features/news-tips/components/toolbar';

export const metadata = {
  title: '深圳报料处理流转'
};

export const dynamic = 'force-static';

const defaultFilters: NewsTipFilters = {
  range: 'month',
  sort: 'priority'
};

export default async function NewsTipFlowPage() {
  const queryClient = getQueryClient();

  void queryClient.prefetchQuery(recordsQueryOptions(defaultFilters));

  return (
    <PageContainer
      pageTitle='处理流转'
      pageDescription='按待审核 / 跟进中 / 已采用 / 不予采用 查看线索流转与积压'
      pageHeaderAction={<CockpitToolbar />}
    >
      <HydrationBoundary state={dehydrate(queryClient)}>
        <Suspense fallback={null}>
          <FlowBoard />
        </Suspense>
      </HydrationBoundary>
    </PageContainer>
  );
}
```

- [ ] **Step 3: 构建校验**

Run: `bun run build`
Expected: 成功，新增路由 `/dashboard/news-tips/flow`。

- [ ] **Step 4: 人工验收**

- 打开 `/dashboard/news-tips/flow`：四列看板，列头显示状态名 + 数量，卡片显示标题/区域/类型/优先级/跟进人。
- 顶部工作台 Tab 可在「线索明细」「处理流转」间切换且保留时间范围查询串。

- [ ] **Step 5: 提交**

```bash
git add src/features/news-tips/components/flow-board.tsx src/app/dashboard/news-tips/flow/page.tsx
git commit -m "feat(news-tips): 新增处理流转看板模块"
```

---

### Task 7: 线索明细增强（工作台 Tab + 今日待办）

`RecordsWorkbench` 接入新的 `WorkbenchNav`，并加「今日待办」快捷视图（一键切到今日 + 待审核）。

**Files:**
- Modify: `src/features/news-tips/components/records-workbench.tsx`

**Interfaces:**
- Consumes: `WorkbenchNav`（Task 3）；`useNewsTipFilterState`（含 `setParams`）；`Button` / `Icons`。

- [ ] **Step 1: 更新 `records-workbench.tsx`**

整体替换为：

```tsx
'use client';

import { useSuspenseQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
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
    setParams,
    toggleFilter,
    removeFilter,
    clearFilters,
    changeSort
  } = useNewsTipFilterState();
  const { data: dashboard } = useSuspenseQuery(dashboardQueryOptions(queryFilters));
  const { data: recordsResponse } = useSuspenseQuery(recordsQueryOptions(queryFilters));

  const showTodayTodo = () => {
    void setParams({
      range: 'today',
      dateFrom: null,
      dateTo: null,
      status: ['待审核'],
      category: [],
      sourcePlatform: [],
      channel: [],
      district: [],
      priority: [],
      sort: 'priority'
    });
  };

  return (
    <div className='grid gap-4'>
      <div className='flex flex-wrap items-center justify-between gap-2'>
        <WorkbenchNav />
        <Button variant='outline' size='sm' onClick={showTodayTodo}>
          <Icons.clock />
          今日待办
        </Button>
      </div>
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
```

- [ ] **Step 2: 构建校验**

Run: `bun run build`
Expected: 成功。

- [ ] **Step 3: 人工验收**

- `/dashboard/news-tips/records` 顶部有工作台 Tab + 右侧「今日待办」按钮。
- 点「今日待办」：时间范围切到今天、状态筛为待审核，表格与 chips 同步更新。
- 从驾驶舱下钻进来时（带 `district=` 等）筛选 chip 正确显示，可单独清除。

- [ ] **Step 4: 提交**

```bash
git add src/features/news-tips/components/records-workbench.tsx
git commit -m "feat(news-tips): 线索明细接入工作台Tab与今日待办快捷视图"
```

---

### Task 8: 清理旧页面并全量验收

删除已并入首页的数据仪表盘页与组件，跑通静态导出。

**Files:**
- Delete: `src/app/dashboard/news-tips/analytics/page.tsx`
- Delete: `src/features/news-tips/components/analytics-dashboard.tsx`

- [ ] **Step 1: 确认无残留引用**

Run: `rg -n "analytics-dashboard|AnalyticsDashboard|NewsTipsSectionNav|news-tips/analytics" src`
Expected: 无结果（`section-nav` 已改名为 `WorkbenchNav`，analytics 已无引用）。若命中，先修复引用再删除。

- [ ] **Step 2: 删除文件**

```bash
git rm src/app/dashboard/news-tips/analytics/page.tsx src/features/news-tips/components/analytics-dashboard.tsx
```

- [ ] **Step 3: 全量测试 + lint + 构建**

Run: `bun test`
Expected: 全绿（含 `service.test.ts` 深圳区划守卫、`records-href.test.ts`、`analytics.test.ts`）。

Run: `bun run lint`
Expected: 无新增错误。

Run: `bun run build`
Expected: 成功，路由含 `/dashboard/news-tips`、`/dashboard/news-tips/records`、`/dashboard/news-tips/flow`，不含 `/analytics`。

- [ ] **Step 4: 静态导出验收**

Run: `NEXT_PUBLIC_SENTRY_DISABLED=true NEXT_STATIC_EXPORT=true bun run build`
Expected: 生成 `out/` 静态产物，无报错。

- [ ] **Step 5: 移动端与空状态人工验收（PRD §8.3）**

- 375px：驾驶舱各板块单列、无文字重叠；明细表横向滚动不撑破页面；看板列纵向堆叠。
- 自定义日期选一个无数据区间：驾驶舱与明细显示空状态，不报错，可重置。
- 控制台无运行时报错。

- [ ] **Step 6: 提交**

```bash
git add -A
git commit -m "chore(news-tips): 移除数据仪表盘旧页并完成 IA 重构验收"
```

---

## Self-Review（对照 PRD v0.3）

| PRD 要求 | 覆盖任务 |
| --- | --- |
| §4 IA：驾驶舱 + 工作台（线索明细/处理流转） | Task 3（导航）、Task 5/6/7（页面） |
| §5.2① 态势总览可点击联动 | Task 5（InsightStrip → drill 跳转） |
| §5.2② 今日新增 KPI | 既有 `KpiCards`，Task 5 保留 |
| §5.2③ 处理进度概览 + 点击下钻 | Task 4（StatusProgress）+ Task 5 |
| §5.2④ 热点分布（渠道/类型/区域）hover+点击 | 既有组件 + Task 5 下钻 |
| §5.2⑤ 趋势走向双轴 + 粒度 | 既有 `TrendChart`，Task 5 接入 |
| §5.2⑥ 待办预览 Top N | Task 2（selectTodoItems）+ Task 4（TodoPreview） |
| §5.3 线索明细（今日待办 + 分诊 + 筛选/导出） | Task 7 + 既有 `RecordsTable` / `export-csv` |
| §5.4 处理流转看板 | Task 2（groupRecordsByStatus）+ Task 6 |
| §5.5 全量筛选/排序/展开/导出 | 既有实现，保留 |
| §5.7 图表下钻 + 筛选 chips | Task 1（buildRecordsHref）+ Task 5 + 既有 `ActiveFilters` |
| §6 深圳本地化 + §7 数据规模 | 既有数据层，`service.test.ts` 守卫 |
| §8.4 构建/静态导出 | Task 8 |

**范围外（本次不改）：** 数据层与 mock 生成、CSV 导出、优先级派生、自定义日期、既有图表组件内部实现——均已完成且符合 PRD。`/dashboard/design` 设计规范页按 PRD 保留。
