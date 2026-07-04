# 新闻报料线索驾驶舱 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
> 验收口径（spec §10）：本项目无测试套件，每个任务以 `bun run build`（零错误）+ 手动交互检查代替测试步骤。

**Goal:** 8 小时内交付广电媒体「新闻报料线索驾驶舱」单页数据看板，部署 Vercel。

**Architecture:** 沿用本仓库 Next.js 16 + shadcn 模板。新增 `src/features/baoliao/` feature 模块（types → service → queries 三件套），mock 数据由确定性种子生成器产出约 200 条线索，所有 KPI/图表在 service 层聚合。页面为 `/dashboard/baoliao` 单页，根路径重定向直达。移除 Clerk 鉴权与无关示例功能。

**Tech Stack:** Next.js 16 / React 19 / TypeScript / Tailwind v4 / shadcn/ui / Recharts / TanStack Query + Table / nuqs

## Global Constraints

- 遵循 CLAUDE.md 全部规范：Icons 只从 `@/components/icons` 导入；页头用 `PageContainer` props；单引号、无尾逗号、2 空格
- 数据层三件套：`api/types.ts → api/service.ts → api/queries.ts`，组件不得直连 mock
- 禁用 `Date.now()` 之外的非确定性 mock（种子随机，刷新形态稳定）
- 中文文案统一新闻编辑室口径：线索/采用/渠道/跟进
- 每任务结束 `bun run build` 通过后 git commit

---

### Task 1: 模板清理与去鉴权

**Files:**
- Run: `node scripts/cleanup.js clerk kanban chat notifications`
- Modify: `src/app/page.tsx`（根路径重定向）
- Modify: `src/config/nav-config.ts`（导航精简）
- Modify: `src/proxy.ts`（若 cleanup 未处理，去掉 `auth.protect`）

**Steps:**

- [ ] **1.1** 运行 `node scripts/cleanup.js clerk kanban chat notifications`，按提示确认
- [ ] **1.2** `src/app/page.tsx` 改为：

```tsx
import { redirect } from 'next/navigation';

export default function Page() {
  redirect('/dashboard/baoliao');
}
```

- [ ] **1.3** `nav-config.ts` 重写为两组：「驾驶舱」→ `/dashboard/baoliao`（icon: `dashboard`, shortcut `['d','d']`）；「设计规范」→ `/dashboard/design`（icon: `palette`）。删除其余全部条目（product/users/forms/react-query/icons/profile 等入口，页面文件可暂留不删）
- [ ] **1.4** `bun run build`，修复 cleanup 残留引用（重点检查 `src/components/layout/user-nav.tsx`、`app-sidebar.tsx`、`providers.tsx`、`src/app/dashboard/page.tsx` 中的 Clerk 引用；user-nav 若依赖 Clerk 直接删除该组件及其引用）
- [ ] **1.5** `bun run dev` 打开 `http://localhost:3000` 确认无登录墙直达 dashboard；commit `chore: 清理模板，去鉴权，导航精简`

### Task 2: 数据层（types + mock 生成器 + 聚合 + queries）

**Files:**
- Create: `src/features/baoliao/api/types.ts`
- Create: `src/features/baoliao/api/service.ts`
- Create: `src/features/baoliao/api/queries.ts`

**Interfaces（Produces，后续任务全部依赖）：**

`types.ts` 完整内容：

```ts
export type BaoliaoCategory =
  | '突发事件'
  | '民生投诉'
  | '交通出行'
  | '文体娱乐'
  | '环境城建'
  | '其他';

export type BaoliaoChannel =
  | '新闻客户端APP'
  | '微信公众号'
  | '新闻热线电话'
  | '微博'
  | '短视频平台'
  | '现场投递';

export type BaoliaoStatus = '待审核' | '跟进中' | '已采用' | '不予采用';

export interface TimelineEntry {
  time: string; // ISO
  action: string; // 如 '线索提交' | '编辑审核通过' | '记者跟进' | '成稿播出'
  operator: string;
}

export interface BaoliaoRecord {
  id: string; // BL-20260704-001
  title: string;
  description: string;
  category: BaoliaoCategory;
  channel: BaoliaoChannel;
  status: BaoliaoStatus;
  district: string;
  reporter: string; // 脱敏昵称
  assignee: string; // 跟进记者/编辑
  createdAt: string; // ISO
  responseMinutes: number | null; // 待审核为 null
  timeline: TimelineEntry[];
}

export type TimeRange = 'today' | 'week' | 'month' | 'all';
export type Granularity = 'day' | 'week' | 'month';

export interface BaoliaoFilters {
  range: TimeRange;
  status?: BaoliaoStatus[];
  category?: BaoliaoCategory[];
  channel?: BaoliaoChannel[];
}

export interface KpiData {
  todayCount: number;
  todayDelta: number; // 环比昨日，百分比
  weekCount: number;
  weekDelta: number;
  avgResponseMinutes: number;
  avgResponseDelta: number;
  adoptionRate: number; // 0-100
  adoptionDelta: number;
  sparklines: {
    daily: number[]; // 近14日每日线索数
    weekly: number[]; // 近8周每周线索数
    response: number[]; // 近14日平均响应
    adoption: number[]; // 近14日采用率
  };
}

export interface ChannelSlice {
  channel: BaoliaoChannel;
  count: number;
}

export interface CategoryBar {
  category: BaoliaoCategory;
  count: number;
  adopted: number;
}

export interface TrendPoint {
  label: string; // '07-01' / '第26周' / '6月'
  count: number;
  adoptionRate: number; // 0-100
}

export interface DashboardData {
  kpi: KpiData;
  channels: ChannelSlice[];
  categories: CategoryBar[];
}
```

`service.ts` 导出（同步纯函数包一层 async 以贴合 React Query 模式）：

```ts
export async function getDashboardData(range: TimeRange): Promise<DashboardData>;
export async function getTrend(granularity: Granularity, range: TimeRange): Promise<TrendPoint[]>;
export async function getRecords(filters: BaoliaoFilters): Promise<BaoliaoRecord[]>; // 表格自身用 TanStack Table 前端分页排序，service 只做 range/维度过滤
```

`queries.ts`：仿 `src/features/products/api/queries.ts`：

```ts
export const baoliaoKeys = {
  all: ['baoliao'] as const,
  dashboard: (range: TimeRange) => [...baoliaoKeys.all, 'dashboard', range] as const,
  trend: (g: Granularity, range: TimeRange) => [...baoliaoKeys.all, 'trend', g, range] as const,
  records: (filters: BaoliaoFilters) => [...baoliaoKeys.all, 'records', filters] as const
};
export const dashboardQueryOptions = (range: TimeRange) => queryOptions({...});
export const trendQueryOptions = (g: Granularity, range: TimeRange) => queryOptions({...});
export const recordsQueryOptions = (filters: BaoliaoFilters) => queryOptions({...});
```

**Steps:**

- [ ] **2.1** 写 `types.ts`（上方全文）
- [ ] **2.2** 写 `service.ts`：
  - mulberry32 种子随机器（seed 固定 20260704）
  - `generateRecords()`：模块级缓存单例，生成 200 条，`createdAt` 分布近 30 天（工作日权重 1.4×，白天时段权重高），今天保证 ≥12 条；标题从 6 类各 8-10 个真实感中文模板池抽取（如「XX路口今晨发生三车追尾」「XX小区电梯停运一周无人维修」）；status 按 已采用45% / 跟进中20% / 待审核20% / 不予采用15%，但今天的记录待审核比例提高到 50%（真实感：新线索还没处理完）；responseMinutes 15~480 偏态分布；timeline 按 status 生成 1-4 条
  - 聚合函数：KPI 环比 = 与上一同长周期比较；采用率 = 已采用 / (已采用+不予采用)
  - 30 天窗口内的 `week` 粒度按 ISO 周聚合，`month` 粒度扩展生成近 6 个月背景数据（生成器直接覆盖近 180 天，30 天窗口只是默认筛选）——**修正：生成器生成近 180 天共约 600 条，`range` 过滤后表格/KPI 默认只看月内，数据量仍满足 30+ 要求且月粒度趋势有 6 个点**
- [ ] **2.3** 写 `queries.ts`
- [ ] **2.4** `bun run build` 通过；写一个临时 `console.log` 手动 spot-check 聚合数字自洽后删除；commit `feat: 报料线索数据层`

### Task 3: 页面骨架 + 全局时间范围 + 顶栏工具

**Files:**
- Create: `src/app/dashboard/baoliao/page.tsx`（服务端：searchParamsCache 读 range + prefetch + HydrationBoundary + Suspense）
- Create: `src/features/baoliao/components/cockpit.tsx`（客户端容器：布局网格，各区块占位）
- Create: `src/features/baoliao/components/toolbar.tsx`（时间范围 Tabs：今天/本周/本月/全部 + 刷新按钮 + 主题切换复用模板现有 ModeToggle）
- Create: `src/features/baoliao/hooks/use-baoliao-params.ts`（nuqs `useQueryStates`：`range`、`granularity`，`shallow: true`）

**Interfaces:**
- Produces: `useBaoliaoParams()` 返回 `{ range, granularity, setParams }`，Task 4-7 所有组件用它读全局状态
- 刷新按钮：`queryClient.invalidateQueries({ queryKey: baoliaoKeys.all })` + 按钮 `isLoading`

**Steps:**

- [ ] **3.1** 写 nuqs hook（`parseAsStringLiteral(['today','week','month','all']).withDefault('month')`）
- [ ] **3.2** 写 page.tsx：`PageContainer` props `pageTitle='新闻报料线索驾驶舱'`、`pageDescription='全渠道线索汇聚 · 审核跟进 · 采用转化一屏总览'`、`pageHeaderAction={<Toolbar/>}`；prefetch dashboard/trend/records 三个 query
- [ ] **3.3** 写 cockpit.tsx 网格骨架：`grid gap-4`，KPI 行 `md:grid-cols-2 xl:grid-cols-4`，概览行 `xl:grid-cols-5`（环形 2 + 条形 3），趋势整行，表格整行；各区块先放 `<Card>` 占位
- [ ] **3.4** `bun run dev` 确认 range 切换写入 URL；build + commit `feat: 驾驶舱页面骨架与全局时间筛选`

### Task 4: KPI 指标卡（图表①sparkline）

**Files:**
- Create: `src/features/baoliao/components/kpi-cards.tsx`

**Steps:**

- [ ] **4.1** `useSuspenseQuery(dashboardQueryOptions(range))`；4 张卡：数值 + 环比箭头（`Icons.trendingUp/trendingDown`，涨绿跌红——注意「平均响应时长」语义反转：下降是好事显绿）+ Recharts 迷你 `AreaChart`（高 40px，无轴，`fill` 用 `var(--primary)` 渐变），参考 `src/features/overview/components/area-graph.tsx` 的 ChartContainer 用法
- [ ] **4.2** 数字动效：挂载时 CSS `animate-in`；tooltip 显示 sparkline 各点数值
- [ ] **4.3** build + 手动核对 4 卡数字与表格明细一致；commit `feat: KPI 指标卡`

### Task 5: 概览行（图表②环形图 + ③条形图）

**Files:**
- Create: `src/features/baoliao/components/channel-pie.tsx`（来源渠道占比，donut，中心显示总量，legend 带百分比，hover tooltip）
- Create: `src/features/baoliao/components/category-bar.tsx`(线索类型分布，横向条形，双 series：总量 + 已采用叠加，hover tooltip)

**Steps:**

- [ ] **5.1** 参考 `src/features/overview/components/pie-graph.tsx` / `bar-graph.tsx` 写两图，色板用 `--chart-1..5` CSS 变量
- [ ] **5.2** build + commit `feat: 渠道环形图与类型条形图`

### Task 6: 趋势行（图表④双轴折线）

**Files:**
- Create: `src/features/baoliao/components/trend-chart.tsx`

**Steps:**

- [ ] **6.1** `ComposedChart`：左轴线索量（Area+Line），右轴采用率（Line，虚线，域 0-100）；卡片头部 `Tabs` 切换粒度（日/周/月，写入 nuqs granularity）；tooltip 同时展示两指标
- [ ] **6.2** build + 三种粒度手动切换验证；commit `feat: 双轴趋势图`

### Task 7: 明细表格（筛选/排序/分页/展开/导出）

**Files:**
- Create: `src/features/baoliao/components/records-table/columns.tsx`
- Create: `src/features/baoliao/components/records-table/index.tsx`
- Create: `src/features/baoliao/utils/export-csv.ts`

**Interfaces:**
- `exportCsv(rows: BaoliaoRecord[], filename: string): void` — `﻿` BOM + UTF-8，Blob 下载
- 列：编号、标题（截断 tooltip）、类型（Badge）、来源、区域、状态（Badge 分色：待审核amber/跟进中blue/已采用green/不予采用muted）、报料时间、响应时长、跟进人

**Steps:**

- [ ] **7.1** 写 columns + 表格组件：数据 `useSuspenseQuery(recordsQueryOptions(filters))` 一次拉全量，TanStack Table 前端 `getFilteredRowModel/getSortedRowModel/getPaginationRowModel`；工具行放 faceted filter（状态/类型/来源，复用 `src/components/ui/table/data-table-faceted-filter.tsx`）+ 导出按钮
- [ ] **7.2** 行展开：`getExpandedRowModel`，展开区显示 description + timeline 竖向步骤条
- [ ] **7.3** `exportCsv` 导出当前筛选后行（`table.getFilteredRowModel().rows`），文件名 `报料线索_YYYYMMDD.csv`，零行时按钮 disabled
- [ ] **7.4** 空状态：筛选无结果显示 `Icons.search` + 「没有符合条件的线索」+ 清空筛选按钮
- [ ] **7.5** build + 手动过筛选/排序/分页/展开/导出五项；commit `feat: 线索明细表格`

### Task 8: 视觉打磨（深色默认 + 响应式 + 细节）

**Files:**
- Modify: `src/components/layout/providers.tsx` 或 root layout（`next-themes` defaultTheme 改 `dark`）
- Modify: 各组件微调

**Steps:**

- [ ] **8.1** 默认深色；检查两套主题下图表色、Badge 色、边框对比度
- [ ] **8.2** 375px 视口过一遍：KPI 两列、图表纵排、表格横滚（外层 `overflow-x-auto`）
- [ ] **8.3** 细节：卡片 hover 微光、页面标题区加「实时更新于 HH:mm」小字、数字 `tabular-nums`
- [ ] **8.4** build + commit `polish: 主题与响应式打磨`

### Task 9: 交付物页面与文档

**Files:**
- Create: `src/app/dashboard/design/page.tsx` + `src/features/baoliao/components/design-spec.tsx`（色板/字体/组件规范一览 = 视觉设计稿）
- Create: `docs/prd.md`（需求文档：业务场景、用户与流程、功能模块、数据字段、操作逻辑——从 spec 扩写）
- Create: `docs/collaboration.md`（协作思考说明：关键提示词 + 5 个人工决策点）

**Steps:**

- [ ] **9.1** /design 页：主题色板网格（读 CSS 变量渲染色块）、字号层级、Badge/Button/Card 样式陈列、图表缩样
- [ ] **9.2** 写 prd.md 与 collaboration.md
- [ ] **9.3** build + commit `docs: 交付物文档与设计规范页`

### Task 10: 部署与打包

**Steps:**

- [ ] **10.1** `bun run build` 最终验证 → `vercel --prod`（或用户手动连 Vercel）
- [ ] **10.2** 线上链接过一遍 8 项交互清单（spec §5）
- [ ] **10.3** 打包 zip：源码（不含 node_modules/.next）+ prd + collaboration + 链接说明 README；提醒用户导出 AI 对话记录、按「姓名-部门-报料数据驾驶舱」命名发邮箱

### Task 11（余时加分项，可跳过）: 地图热力 / 图表联动

- [ ] **11.1** 环形图扇区 click → 设置表格 channel 筛选并滚动到表格（联动）
- [ ] **11.2** `echarts` + 省级 GeoJSON 区域热力图替换/并列条形图

---

## Self-Review 结果

- Spec 覆盖：§3 页面结构 → Task 3-7；§4 数据模型 → Task 2；§5 交互 8 项 → Task 3(范围切换/刷新/主题)、6(粒度)、7(筛选/排序/分页/展开/导出)；§6 模板改造 → Task 1；§7 边界 → Task 7.4/8.2；§8 交付物 → Task 9/10；加分项 → Task 11 ✓
- 类型一致性：`TimeRange`/`Granularity`/`BaoliaoFilters` 在 Task 2 定义，Task 3-7 引用一致 ✓
- 无 TBD/占位符 ✓（组件 JSX 未全文给出，参照文件路径均已指明，执行在本会话内进行，上下文保留）
