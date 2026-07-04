# 报料数据驾驶舱 H5 需求文档

版本：0.1  
日期：2026-07-04  
项目：Next.js Admin Dashboard Starter  
赛题：8 小时单人全栈 AI 挑战赛 · 题目 1「报料数据驾驶舱 H5」

## 1. 背景

公司报料业务会从新闻客户端、微信公众号、热线电话、微博、短视频平台、现场投递等渠道收到大量新闻线索。当前报料记录分散在不同入口，运营人员需要在多个维度之间来回查看，难以及时判断今日新增、处理进度、热点分布和趋势变化。

本项目建设一个单页 H5 数据驾驶舱，将报料明细聚合为可视化看板。页面面向新闻运营、编辑室负责人和管理人员，用于快速掌握线索态势、定位异常高发类型、筛选下钻明细，并导出当前筛选结果。

## 2. 目标

1. 在一个页面内完成 KPI、概览、趋势、明细四层数据表达。
2. 至少提供 3 种不同图表形式，并保证图表有清晰标注和基础交互。
3. 使用前端模拟数据支撑完整分析链路，数据不少于 30 条。
4. 提供至少 3 项可操作功能：时间范围切换、筛选、排序、分页、行展开、刷新、导出等。
5. 保持专业数据产品风格，适配桌面宽屏和移动端 H5 访问。

### 2.1 CEO Review 结论

当前方案已经覆盖赛题基础分，但“图表 + 表格”的表达仍偏常规。为了在 8 小时内拉开差距，本期选择“选择性扩展”策略：不做复杂后端、不引入重地图依赖，而是把现有数据变成更像成熟运营产品的判断工具。

优先补充 4 个低成本创新点：

| 创新点 | 用户价值 | 开发成本 | 推荐结论 |
| --- | --- | --- | --- |
| 运营态势摘要 | 进入页面 5 秒内知道今天哪里异常、该先处理什么 | S | 纳入 P0 |
| 线索优先级预警 | 把表格从“记录列表”升级为“待办分诊台” | S | 纳入 P0 |
| 图表联动筛选 | 点击图表即可下钻明细，显著提升交互评分 | M | 纳入 P1，优先做渠道/类型联动 |
| 区域热区矩阵 | 用轻量热力格替代真实 GIS，满足区域分布表达 | S | 纳入 P1 |

不推荐本期做真实 GIS 地图、AI 接口总结、多用户协作、工作流审批。这些会拉高复杂度，但对本赛题评分的边际收益不如上述 4 项。

## 3. 交付范围

### 3.1 MVP 范围

- 页面路由：`/dashboard/baoliao`，根路径 `/` 重定向到该页面。
- 顶栏工具区：时间范围快捷选择、刷新、主题切换。
- KPI 指标卡：今日新增、本周总量、平均响应时长、线索采用率。
- 运营态势摘要：自动生成 3 条今日重点判断，包含待审核压力、热点类型、异常区域或渠道。
- 概览图表：来源渠道占比、线索类型分布。
- 趋势图表：线索量与采用率双轴趋势，支持日/周/月粒度切换。
- 明细列表：筛选、排序、分页、行 hover、行展开详情。
- 线索优先级预警：按待审核超时、突发事件、响应时长过长等规则生成高/中/低优先级。
- 数据导出：导出当前筛选结果为 CSV。
- 空状态：筛选无结果、图表无数据、导出无数据时有明确提示。

### 3.2 加分范围

- 区域热区矩阵，模拟不同区域报料密度，不依赖真实 GIS。
- 图表联动筛选，例如点击渠道环形图扇区后联动明细表，并在页面顶部展示筛选条件 chip。
- 一键查看重点线索，例如“查看待审核超时”“查看突发事件”“查看今日热线高发”。
- 导出附带筛选摘要和导出时间，让 CSV 更像正式业务报表。
- 设计规范页 `/dashboard/design`，展示色板、字体、卡片、徽标、图表样式。

### 3.3 不在本期范围

- 真实后端接口、数据库、权限体系。
- 真实地图 GIS 数据。
- 多用户协同处理、消息通知、工作流审批后台。
- Clerk 登录墙和组织权限，本赛题交付以可直接访问的 H5 页面为准。

## 4. 用户与使用场景

| 用户角色 | 主要诉求 | 典型动作 |
| --- | --- | --- |
| 新闻运营人员 | 监控每天线索总量和处理状态 | 看 KPI、筛选状态、导出报表 |
| 编辑室负责人 | 判断热点类型和渠道来源 | 查看类型分布、渠道占比、趋势变化 |
| 记者/编辑 | 找到需要跟进的具体线索 | 筛选跟进中线索、展开处理轨迹 |
| 管理人员 | 快速了解业务效率 | 查看响应时长、采用率、环比变化 |

## 5. 业务流程

```text
市民报料
  -> 线索入库
  -> 编辑审核
    -> 待审核
    -> 不予采用
    -> 跟进中
      -> 记者跟进
      -> 已采用
```

业务状态说明：

| 状态 | 含义 | 后续动作 |
| --- | --- | --- |
| 待审核 | 线索已提交，编辑尚未判断价值 | 编辑审核 |
| 跟进中 | 审核通过，已分配记者或编辑 | 补充采访、核实事实 |
| 已采用 | 线索已成稿、播出或发布 | 进入采用统计 |
| 不予采用 | 线索价值不足、重复或无法核实 | 归档 |

## 6. 信息架构

页面按“先总览，再分析，最后下钻”的顺序组织。

```text
PageContainer
  顶栏工具区
  KPI 指标卡
  运营态势摘要
  概览分析
    来源渠道占比
    线索类型分布
    区域热区矩阵
  趋势分析
    线索量
    采用率
  明细下钻
    筛选条件 chips
    表格
    展开详情
    CSV 导出
```

信息层级必须对应评分要求：

1. KPI：回答“现在整体怎么样”。
2. 态势摘要：回答“今天最该先看哪 3 件事”。
3. 概览：回答“来自哪里、集中在哪些类型和区域”。
4. 趋势：回答“最近变化方向是什么”。
5. 明细：回答“具体是哪几条线索，需要怎么处理”。

## 7. 功能需求

### 7.1 顶栏工具区

| 功能 | 优先级 | 说明 |
| --- | --- | --- |
| 时间范围快捷选择 | P0 | 支持今天、本周、本月、全部；联动 KPI 之外的图表和明细 |
| 刷新按钮 | P0 | 触发 `baoliaoKeys.all` 查询失效，按钮展示 loading |
| 主题切换 | P1 | 复用项目主题系统，支持深色/浅色 |
| 自定义日期范围 | P2 | 赛题提到自定义，本期可作为加分项 |

### 7.2 KPI 指标卡

每张卡包含指标名称、主数值、环比箭头、环比文案、迷你趋势 sparkline。

| 指标 | 口径 | 环比 |
| --- | --- | --- |
| 今日新增线索 | 今日 00:00 至当前的线索数量 | 较昨日 |
| 本周线索总量 | 本周一至当前的线索数量 | 较上周同期 |
| 平均响应时长 | 近 30 日非待审核线索的平均响应分钟数 | 较前 30 日，下降为正向 |
| 线索采用率 | 已采用 / (已采用 + 不予采用) | 较前 30 日 |

### 7.2.1 运营态势摘要

态势摘要位于 KPI 下方，用 3 条短句把数据转成运营判断。它是本项目的主要创新点之一：不调用 AI 服务，全部由前端聚合规则生成，开发成本低，但能显著提升成熟产品感。

| 摘要类型 | 触发规则 | 展示文案示例 | 点击动作 |
| --- | --- | --- | --- |
| 待审核压力 | 今日待审核占比高于 40%，或待审核数量为状态最高项 | `今日待审核压力较高，建议优先分诊突发和民生类线索` | 设置状态筛选为待审核 |
| 热点类型 | 某类型在当前时间范围占比最高且数量大于 0 | `民生投诉为当前最高发类型，占比 32%` | 设置类型筛选 |
| 区域高发 | 某区域线索数量为当前最高 | `天河区线索集中，建议关注区域处置资源` | 设置区域筛选或滚动到热区矩阵 |
| 响应异常 | 平均响应时长较前 30 日上升超过 10% | `响应时长上升，跟进中线索可能积压` | 按响应时长降序排序 |

验收要求：

- 至少展示 2 条摘要，有数据时优先展示 3 条。
- 每条摘要必须包含“发现了什么”和“建议看哪里”。
- 摘要可点击时必须改变筛选或排序，并展示选中态。
- 无可用摘要时展示“当前态势平稳，暂无明显异常”，不留空白。

### 7.3 概览图表

| 图表 | 类型 | 数据 | 交互 |
| --- | --- | --- | --- |
| 来源渠道占比 | 环形图 | 各渠道线索数量和占比 | hover tooltip，legend 展示百分比 |
| 线索类型分布 | 条形图 | 各类型线索总量和已采用量 | hover tooltip，区分总量和采用量 |
| 区域热区矩阵 | 热力格 / 紧凑榜单 | 各行政区线索数量、待审核数量、采用率 | hover tooltip，点击区域联动明细 |

区域热区矩阵不使用真实地图。用 10 个行政区卡片按线索量排序，颜色深浅表达密度，卡片内展示总量和待审核数。这样能满足“区域热力”表达，又不会引入地图包、地图坐标和移动端适配风险。

### 7.4 趋势分析

趋势图用于展示报料量和处理质量的变化。

| 功能 | 优先级 | 说明 |
| --- | --- | --- |
| 时间粒度切换 | P0 | 支持日、周、月 |
| 双轴对比 | P0 | 左轴线索量，右轴采用率 |
| 近 7 日 / 近 30 日表现 | P0 | 由全局时间范围和粒度共同决定 |
| tooltip | P0 | 同时展示线索量和采用率 |

### 7.5 报料详情列表

表格字段：

| 字段 | 展示方式 | 说明 |
| --- | --- | --- |
| 编号 | 文本 | 如 `BL-20260704-001` |
| 标题 | 文本截断 + tooltip | 报料标题 |
| 类型 | Badge | 突发事件、民生投诉等 |
| 来源 | Badge 或文本 | 新闻客户端 APP、微信公众号等 |
| 区域 | 文本 | 行政区 |
| 状态 | Badge 分色 | 待审核、跟进中、已采用、不予采用 |
| 优先级 | Badge + 图标 | 高 / 中 / 低，由规则计算，不作为真实后端字段 |
| 报料时间 | 日期时间 | `createdAt` |
| 响应时长 | 文本 | 待审核显示 `-` |
| 跟进人 | 文本 | 记者或编辑 |

表格能力：

| 功能 | 优先级 | 说明 |
| --- | --- | --- |
| 状态筛选 | P0 | 多选 |
| 类型筛选 | P0 | 多选 |
| 来源筛选 | P0 | 多选 |
| 区域筛选 | P1 | 与区域热区矩阵联动 |
| 优先级筛选 | P1 | 支持高优先级线索一键查看 |
| 日期范围筛选 | P1 | 赛题要求，MVP 可先由全局时间范围覆盖 |
| 排序 | P0 | 支持时间、响应时长等列 |
| 分页 | P0 | 前端分页即可 |
| 行 hover | P0 | hover 高亮 |
| 行展开 | P0 | 展示描述和处理轨迹 |
| 空状态 | P0 | 筛选无结果时显示友好提示和清空入口 |

### 7.6 CSV 导出

导出当前筛选后的表格结果。

要求：

- 文件格式：CSV。
- 编码：UTF-8 with BOM，避免中文在 Excel 中乱码。
- 文件名：`报料线索_YYYYMMDD.csv`。
- 导出字段包含表格核心字段和描述。
- 当前筛选结果为 0 条时禁用导出按钮或提示无可导出数据。

### 7.7 线索优先级与预警

优先级不需要真实后台模型，本期在前端根据现有字段派生。规则必须透明，避免看起来像黑盒。

| 优先级 | 规则 | 展示 |
| --- | --- | --- |
| 高 | `category=突发事件` 且状态不是已采用；或待审核超过 60 分钟；或响应时长超过 240 分钟 | 红色 Badge，文案为“需优先处理” |
| 中 | 跟进中超过 180 分钟；或民生投诉/环境城建且来自热线电话、新闻客户端 APP | 橙色 Badge，文案为“持续跟进” |
| 低 | 已采用、不予采用，或无异常规则命中 | 灰色 Badge，文案为“常规” |

验收要求：

- 表格默认按优先级和报料时间综合排序，高优先级线索靠前。
- 行展开详情中说明命中原因，例如“待审核 72 分钟”。
- 高优先级数量在态势摘要中可被引用。
- 该规则只用于演示分诊，不声称替代编辑判断。

### 7.8 图表联动与筛选条件 chips

为了争取交互与加分项，图表不只展示数据，也承担筛选入口。

| 交互 | 优先级 | 行为 |
| --- | --- | --- |
| 点击渠道环形图扇区 | P1 | 设置 `channel` 筛选，明细列表只显示对应来源 |
| 点击类型条形图 | P1 | 设置 `category` 筛选，明细列表只显示对应类型 |
| 点击区域热区矩阵 | P1 | 设置 `district` 筛选，明细列表只显示对应区域 |
| 点击态势摘要 | P1 | 按摘要建议设置筛选或排序 |
| 清空筛选 chip | P0 | 移除单个筛选条件，不影响其他条件 |
| 一键清空全部 | P0 | 恢复当前时间范围下的全量数据 |

筛选条件展示规则：

- 顶栏下方展示 chips，例如 `来源：微博`、`类型：突发事件`、`区域：天河区`、`优先级：高`。
- 每个 chip 有关闭按钮。
- 筛选后 KPI 是否联动保持固定业务口径；概览、趋势、表格联动当前筛选。
- URL 状态优先保存 `range` 和 `granularity`；多选筛选可以先保存在组件状态，时间充足再接入 nuqs。

### 7.9 数据可信度与演示辅助

成熟数据产品需要让用户相信数字。

| 功能 | 优先级 | 说明 |
| --- | --- | --- |
| 最后更新时间 | P0 | 在工具栏或摘要区展示当前数据生成/刷新时间 |
| 口径说明 | P1 | KPI 卡片 tooltip 说明计算口径 |
| 筛选结果统计 | P0 | 表格标题显示“当前筛选 N 条 / 全量 M 条” |
| 演示高亮 | P1 | 刷新后可短暂高亮变化区域，帮助评委看懂反馈 |
| 导出摘要 | P1 | CSV 文件前几行写入导出时间、筛选条件、记录数 |

## 8. 数据需求

当前项目已建立 `src/features/baoliao/api/types.ts`，数据模型以 `BaoliaoRecord` 为核心。

### 8.1 枚举

| 类型 | 可选值 |
| --- | --- |
| `BaoliaoCategory` | 突发事件、民生投诉、交通出行、文体娱乐、环境城建、其他 |
| `BaoliaoChannel` | 新闻客户端 APP、微信公众号、新闻热线电话、微博、短视频平台、现场投递 |
| `BaoliaoStatus` | 待审核、跟进中、已采用、不予采用 |
| `TimeRange` | today、week、month、all |
| `Granularity` | day、week、month |
| `PriorityLevel` | high、medium、low |

### 8.2 线索记录字段

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | string | 是 | 线索编号 |
| `title` | string | 是 | 线索标题 |
| `description` | string | 是 | 线索详情 |
| `category` | BaoliaoCategory | 是 | 线索类型 |
| `channel` | BaoliaoChannel | 是 | 来源渠道 |
| `status` | BaoliaoStatus | 是 | 处理状态 |
| `district` | string | 是 | 行政区 |
| `reporter` | string | 是 | 脱敏报料人 |
| `assignee` | string | 是 | 跟进记者/编辑 |
| `createdAt` | string | 是 | ISO 时间 |
| `responseMinutes` | number \| null | 否 | 待审核为空 |
| `timeline` | TimelineEntry[] | 是 | 处理轨迹 |

### 8.3 处理轨迹字段

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `time` | string | ISO 时间 |
| `action` | string | 线索提交、编辑审核通过、记者跟进、成稿播出等 |
| `operator` | string | 操作人 |

### 8.4 模拟数据规则

- 前端生成模拟数据，不依赖后端。
- 数据覆盖近 180 天，保证日/周/月趋势都有可读形态。
- 今日数据保证有足够记录，便于展示今日新增和待审核压力。
- 工作日线索数量高于周末，白天时段权重高于凌晨。
- 今日线索中待审核比例更高，符合业务真实感。
- KPI、图表和表格都从同一份明细数据聚合，避免数字不一致。

### 8.5 派生数据

以下数据不一定写入 `BaoliaoRecord`，可以在 service 或组件层由明细计算，避免扩散数据模型。

| 数据 | 类型 | 来源 | 用途 |
| --- | --- | --- | --- |
| `priorityLevel` | `high | medium | low` | `status`、`category`、`createdAt`、`responseMinutes` | 表格优先级、态势摘要 |
| `priorityReason` | string | 优先级命中规则 | 行展开说明 |
| `districtStats` | DistrictStat[] | 按 `district` 聚合 | 区域热区矩阵 |
| `insightItems` | InsightItem[] | KPI、状态、类型、渠道、区域聚合 | 运营态势摘要 |
| `filteredCount` | number | 表格筛选结果 | 筛选统计、导出 |

建议类型：

```typescript
export interface DistrictStat {
  district: string;
  count: number;
  pendingCount: number;
  adoptionRate: number;
}

export interface InsightItem {
  id: string;
  tone: 'critical' | 'warning' | 'neutral' | 'positive';
  title: string;
  description: string;
  actionLabel: string;
  action:
    | { type: 'filter-status'; value: BaoliaoStatus }
    | { type: 'filter-category'; value: BaoliaoCategory }
    | { type: 'filter-channel'; value: BaoliaoChannel }
    | { type: 'filter-district'; value: string }
    | { type: 'sort'; value: 'responseMinutes' | 'createdAt' };
}
```

## 9. 技术落地方案

本项目不是纯原生 HTML 文件结构，而是基于现有 Next.js 16 + shadcn dashboard 模板交付 H5 页面。最终交付仍是可直接访问的单页 H5 体验，并可打包源码。

### 9.1 路由

| 路由 | 文件 | 说明 |
| --- | --- | --- |
| `/` | `src/app/page.tsx` | 重定向到驾驶舱 |
| `/dashboard/baoliao` | `src/app/dashboard/baoliao/page.tsx` | 报料驾驶舱主页面 |
| `/dashboard/design` | `src/app/dashboard/design/page.tsx` | P2 设计规范页 |

### 9.2 Feature 模块

```text
src/features/baoliao/
  api/
    types.ts
    service.ts
    queries.ts
  components/
    cockpit.tsx
    toolbar.tsx
    kpi-cards.tsx
    insight-strip.tsx
    channel-pie.tsx
    category-bar.tsx
    district-heat-grid.tsx
    trend-chart.tsx
    active-filters.tsx
    records-table/
      index.tsx
      columns.tsx
  hooks/
    use-baoliao-params.ts
  lib/
    search-params.ts
  utils/
    export-csv.ts
```

当前已存在：

- `api/types.ts`
- `api/service.ts`
- `api/queries.ts`
- `components/cockpit.tsx`
- `components/toolbar.tsx`
- `components/kpi-cards.tsx`
- `hooks/use-baoliao-params.ts`
- `lib/search-params.ts`

后续需要补齐：

- `components/channel-pie.tsx`
- `components/category-bar.tsx`
- `components/insight-strip.tsx`
- `components/district-heat-grid.tsx`
- `components/active-filters.tsx`
- `components/trend-chart.tsx`
- `components/records-table/`
- `utils/export-csv.ts`
- `src/app/dashboard/design/page.tsx`

### 9.3 项目约束

- 页面头部必须使用 `PageContainer` 的 `pageTitle`、`pageDescription`、`pageHeaderAction`。
- 图标只能通过 `import { Icons } from '@/components/icons'` 使用。
- 数据访问必须走 `api/types.ts -> api/service.ts -> api/queries.ts`。
- React Query 使用 `queryOptions`，服务端预取使用 `void queryClient.prefetchQuery()`。
- URL 状态使用 nuqs，当前已有 `range` 和 `granularity`。
- shadcn/ui 基础组件不直接改源码，业务组件在 `src/features/baoliao/components/` 扩展。
- className 合并使用 `cn()`，避免手写字符串拼接。

## 10. 交互逻辑

### 10.1 时间范围切换

1. 用户点击今天、本周、本月、全部。
2. `useBaoliaoParams()` 将 `range` 写入 URL。
3. React Query 使用新的 query key 请求数据。
4. 概览图、趋势图、明细表联动刷新。
5. KPI 中“今日新增”和“本周总量”保持固定业务口径，不随 `range` 改变。

### 10.2 刷新

1. 用户点击刷新按钮。
2. 调用 `queryClient.invalidateQueries({ queryKey: baoliaoKeys.all })`。
3. 按钮展示 loading。
4. 数据重新读取后恢复。

### 10.3 趋势粒度切换

1. 用户在趋势卡片中选择日、周、月。
2. `granularity` 写入 URL。
3. `trendQueryOptions(granularity, range)` 重新取数。
4. 图表 x 轴和 tooltip 跟随粒度变化。

### 10.4 表格筛选

1. 用户选择状态、类型、来源筛选项。
2. 表格基于当前记录做前端筛选。
3. 图表是否联动筛选为 P2，加分项。
4. 筛选无结果时展示空状态和清空筛选按钮。

### 10.5 行展开

1. 用户点击表格行或展开按钮。
2. 当前行下方展开详情区域。
3. 展示 `description` 和 `timeline`。
4. 再次点击收起。

### 10.6 导出

1. 用户点击导出。
2. 获取 `table.getFilteredRowModel().rows`。
3. 转换为 CSV。
4. 在 CSV 顶部写入导出时间、筛选条件、记录数。
5. 通过 Blob 触发浏览器下载。
6. 结果为空时禁用按钮。

### 10.7 运营态势摘要点击

1. 页面根据当前时间范围和明细聚合生成 `insightItems`。
2. 用户点击某条摘要。
3. 根据摘要 `action` 设置筛选或排序。
4. Active filters 区域展示新增 chip。
5. 明细表和相关图表刷新到对应视图。

### 10.8 图表联动筛选

1. 用户 hover 图表时展示 tooltip，说明数量和占比。
2. 用户点击图表元素。
3. 页面设置对应筛选条件。
4. 图表元素保持选中态，其余元素降低透明度。
5. 用户点击 chip 关闭或点击“清空筛选”恢复全量。

### 10.9 区域热区矩阵

1. 系统按 `district` 聚合线索总量、待审核数量和采用率。
2. 区域卡片按总量从高到低排序。
3. 颜色深浅表达线索密度，高待审核区域显示小红点。
4. 点击区域卡片后筛选明细。

### 10.10 优先级预警

1. 每条线索根据规则计算 `priorityLevel` 和 `priorityReason`。
2. 表格默认先按高、中、低优先级排序，再按报料时间倒序。
3. 高优先级行展示更醒目的 Badge，但不使用整行高饱和底色。
4. 行展开时展示命中原因和处理轨迹。

## 11. UI 与响应式要求

### 11.1 视觉风格

- 整体偏专业数据产品。
- 默认建议深色数据大屏风，但需兼容浅色主题。
- 使用现有 CSS 变量和 shadcn 主题色，图表色优先使用 `--chart-1` 到 `--chart-5`。
- 卡片边距、字号、圆角保持项目已有风格。

### 11.2 布局

| 视口 | 布局要求 |
| --- | --- |
| 桌面宽屏 | KPI 四列，概览左右布局，趋势和表格整行 |
| 平板 | KPI 两列，图表纵向或两列自适应 |
| 手机 H5 | 单列纵向滚动，表格横向滚动 |

### 11.3 状态反馈

- hover：表格行和可点击卡片有明确反馈。
- loading：刷新按钮、查询区域展示加载状态。
- empty：无数据时有说明文案，不留空白卡片。
- disabled：无数据导出按钮禁用。
- selected：被点击的图表元素、区域卡片、筛选 chip 有稳定选中态。
- warning：高优先级线索使用克制的红色/橙色提示，不制造告警噪音。
- tooltip：KPI 口径、图表数值、优先级原因都能被用户解释。

### 11.4 成熟产品细节

| 细节 | 要求 |
| --- | --- |
| 信息密度 | 首屏优先展示 KPI、态势摘要和概览，不使用营销式大 Hero |
| 数字格式 | 数值使用 tabular-nums，百分比保留 1 位小数 |
| 文案风格 | 使用业务判断句，避免“暂无数据啦”这类娱乐化文案 |
| 动效 | 只用于进入、刷新、高亮变化，不做大面积装饰动画 |
| 移动端 | 摘要卡片纵向堆叠，图表高度固定，表格横向滚动 |
| 可访问性 | 可点击图表和热区卡片提供 `aria-label`，按钮有明确名称 |

## 12. 验收标准

| 评分项 | 赛题分值 | 验收口径 |
| --- | --- | --- |
| 信息架构与数据层次 | 30 | KPI -> 态势摘要 -> 概览 -> 趋势 -> 明细结构完整，数字口径自洽 |
| 可视化图表品质 | 20 | 至少 4 种图表，本项目目标为 sparkline、环形图、条形图、双轴趋势图、区域热区矩阵 |
| 交互操作体验 | 20 | 至少 3 项操作，本项目目标为时间切换、粒度切换、筛选、排序、分页、展开、导出、刷新、图表联动 |
| 数据丰富度与真实感 | 15 | 至少 30 条模拟数据，多状态、多类型、多来源、多区域覆盖 |
| UI 设计与排版品质 | 15 | 风格统一、层次清晰、移动端无明显错位 |
| 附加加分项 | +5 | 4 种以上图表均有 hover、tooltip 或点击联动，至少 2 类图表可驱动明细筛选 |

构建验收：

- `bun run build` 无错误。
- `/dashboard/baoliao` 可直接访问。
- 根路径 `/` 可进入驾驶舱。
- 刷新、时间范围切换、主题切换无报错。
- 态势摘要至少展示 2 条，且点击后能改变筛选或排序。
- 高优先级线索能够在表格中靠前展示，并能看到命中原因。
- 点击渠道/类型/区域图表后，明细表跟随筛选并出现 chip。
- CSV 导出包含筛选结果，不出现中文乱码，并能说明导出条件。
- 图表和表格在 375px、768px、1440px 视口下不互相遮挡。

## 13. 实施优先级

| 阶段 | 内容 | 优先级 |
| --- | --- | --- |
| 1 | 数据层、路由、页面骨架、顶部工具栏 | P0 |
| 2 | KPI 指标卡和 sparkline | P0 |
| 3 | 运营态势摘要、优先级规则、Active filters | P0 |
| 4 | 环形图、条形图、趋势图 | P0 |
| 5 | 明细表格、筛选、排序、分页、展开 | P0 |
| 6 | CSV 导出、空状态、移动端适配 | P0 |
| 7 | 区域热区矩阵、图表联动筛选 | P1 |
| 8 | 视觉打磨、默认深色、细节动效 | P1 |
| 9 | 设计规范页、导出摘要增强 | P2 |

## 14. 风险与处理

| 风险 | 影响 | 处理 |
| --- | --- | --- |
| 图表数量不足 | 可视化评分下降 | MVP 至少实现 4 类图表 |
| 数据口径不一致 | 驾驶舱可信度下降 | 所有聚合从同一份 `BaoliaoRecord[]` 计算 |
| 移动端表格过宽 | H5 可用性下降 | 外层横向滚动，核心列优先展示 |
| 时间不足 | 交付不完整 | 先完成 P0，地图热力和设计规范页作为 P2 |
| 中文 CSV 乱码 | 导出体验差 | 使用 UTF-8 BOM |
| 创新点过多 | 核心功能延期 | 态势摘要和优先级规则为 P0，区域热区和图表联动为 P1，真实地图不做 |
| 预警规则像黑盒 | 用户不信任系统判断 | 行展开展示命中原因，口径说明写清楚 |
| 图表联动状态混乱 | 用户不知道当前看的是哪批数据 | 使用筛选 chips 和一键清空，选中图表保持高亮 |

## 15. 当前状态

截至本需求文档整理时：

- 已有报料数据模型、模拟数据生成、聚合 service、React Query options。
- 已有 `/dashboard/baoliao` 页面、时间范围工具栏、刷新按钮、主题切换。
- 已有 KPI 指标卡和 sparkline。
- 概览图、趋势图、明细表、CSV 导出仍需继续实现。
- 新增 PRD 范围中，运营态势摘要、优先级预警、区域热区矩阵、图表联动筛选尚未实现。
- `pnpm-workspace.yaml` 当前为未跟踪文件，本需求文档不处理该文件。

## 16. CEO Review 记录

### 16.1 赛题对齐审查

| 赛题要求 | 当前方案 | CEO Review 判断 |
| --- | --- | --- |
| KPI -> 概览 -> 趋势 -> 明细 | 已覆盖 | 结构正确，但应加入态势摘要，让页面先给判断再给数据 |
| 3+ 图表 | 已规划 4 类 | 建议做到 5 类：sparkline、环形、条形、双轴趋势、区域热区矩阵 |
| 3+ 可操作功能 | 已规划 8 项 | 图表联动和摘要点击会让交互更像成熟数据产品 |
| 30+ 模拟数据 | 已规划 180 天数据 | 数据真实感强，需补优先级和区域聚合增强业务味道 |
| 专业产品感 | 已规划深色大屏风 | 需要口径说明、最后更新时间、筛选 chips、空状态、导出摘要来建立可信度 |

### 16.2 实现路径对比

| 路径 | 说明 | 完整度 | 风险 | 结论 |
| --- | --- | --- | --- | --- |
| A. 原 PRD 收口 | 只完成 KPI、图表、表格、导出 | 7/10 | 低 | 能过基础分，但创新性不足 |
| B. 选择性扩展 | 在原 PRD 上加入态势摘要、优先级、区域热区、图表联动 | 9/10 | 中低 | 推荐，投入小，评分回报高 |
| C. 平台化大屏 | 加真实地图、后端接口、审批流、AI 总结 | 10/10 | 高 | 不适合 8 小时单人赛，容易拖垮主线 |

最终选择 B。理由：它复用现有数据层和组件体系，不增加后端依赖，同时明显提升信息架构、交互操作和专业设计评分。

### 16.3 Scope Decisions

| # | 提案 | 优先级 | 决策 | 原因 |
| --- | --- | --- | --- | --- |
| 1 | 运营态势摘要 | P0 | 接受 | 低成本把数据转成判断，是最像成熟产品的增量 |
| 2 | 线索优先级预警 | P0 | 接受 | 表格从“查看记录”变成“指导处理”，业务价值明确 |
| 3 | 图表联动筛选 | P1 | 接受 | 直接命中附加加分项，交互效果明显 |
| 4 | 区域热区矩阵 | P1 | 接受 | 替代真实地图，风险低，满足区域分布表达 |
| 5 | 真实 GIS 地图 | P2 | 延后 | 坐标、地图包、移动端适配成本高，本期不划算 |
| 6 | AI 接口自动总结 | P2 | 延后 | 需要密钥、错误处理和提示词评估，本期用规则摘要更稳 |

### 16.4 NOT in Scope

- 真实后端接口和数据库：赛题允许前端模拟数据，当前重点是可运行 H5。
- 真实 GIS 地图：用区域热区矩阵表达报料密度，避免地图依赖和坐标数据风险。
- AI 大模型总结：本期用规则生成摘要，避免空响应、格式错误、密钥配置等不可控问题。
- 多用户协作和审批后台：超出单页驾驶舱范围，会稀释评分主线。
- Clerk 权限体系：本赛题要求可直接打开页面，登录墙会降低评委体验。

### 16.5 Error & Rescue Registry

| Codepath | 可能失败 | 处理方式 | 用户看到 |
| --- | --- | --- | --- |
| `getDashboardData(range)` | 时间范围无数据 | 返回空数组聚合，图表展示空状态 | “当前范围暂无报料数据” |
| `getTrend(granularity, range)` | 粒度和时间范围组合导致桶为空 | 返回空趋势数组 | 趋势卡片空状态 |
| `getRecords(filters)` | 筛选条件互斥导致 0 条 | 返回空数组 | 空状态 + 清空筛选入口 |
| `exportCsv(rows)` | 当前筛选结果为 0 条 | 禁用导出或 toast 提示 | “暂无可导出数据” |
| `derivePriority(record)` | `responseMinutes` 为 `null` | 按待审核时长和状态判断，不做数字比较 | 优先级仍可解释 |
| `generateInsightItems(data)` | 没有异常或聚合值全 0 | 返回平稳摘要 | “当前态势平稳，暂无明显异常” |

### 16.6 Failure Modes Registry

| Codepath | Failure Mode | Rescued? | Test? | User Sees? | Logged? |
| --- | --- | --- | --- | --- | --- |
| 图表联动筛选 | 点击后用户不知道当前筛选条件 | Y | 手动验收 | chips 和选中态 | N/A |
| 优先级预警 | 高优先级判断像黑盒 | Y | 手动验收 | 行展开命中原因 | N/A |
| 区域热区矩阵 | 手机端卡片拥挤 | Y | 375px 验收 | 单列或双列自适应 | N/A |
| CSV 导出 | 中文乱码 | Y | 手动打开 CSV | UTF-8 BOM 文件 | N/A |
| 空筛选结果 | 页面看起来像坏了 | Y | 手动验收 | 空状态和清空入口 | N/A |

### 16.7 Implementation Tasks

- [ ] **T1 (P0, human: ~45min / CC: ~8min)** - 数据层 - 增加优先级派生和态势摘要聚合
  - Surfaced by: CEO Review - 原 PRD 缺少能直接指导处理的判断层
  - Files: `src/features/baoliao/api/types.ts`, `src/features/baoliao/api/service.ts`
  - Verify: 页面能展示 2-3 条摘要，高优先级线索可解释
- [ ] **T2 (P0, human: ~45min / CC: ~8min)** - UI - 实现 `insight-strip.tsx` 和 active filters
  - Surfaced by: CEO Review - 需要让用户从摘要直接下钻
  - Files: `src/features/baoliao/components/insight-strip.tsx`, `src/features/baoliao/components/active-filters.tsx`
  - Verify: 点击摘要后筛选或排序变化，chip 可清除
- [ ] **T3 (P1, human: ~60min / CC: ~12min)** - 图表 - 实现环形图、条形图、趋势图和点击联动
  - Surfaced by: 赛题附加加分项 - 4+ 图表且均含交互
  - Files: `channel-pie.tsx`, `category-bar.tsx`, `trend-chart.tsx`
  - Verify: hover tooltip 正常，至少渠道/类型点击能联动表格
- [ ] **T4 (P1, human: ~35min / CC: ~8min)** - 区域分析 - 实现区域热区矩阵
  - Surfaced by: 挑战要求 - 地图热力或来源图可作为概览表达
  - Files: `district-heat-grid.tsx`, `service.ts`
  - Verify: 区域按数量排序，点击区域可筛选明细
- [ ] **T5 (P0, human: ~60min / CC: ~12min)** - 表格/导出 - 完成明细表、展开、空状态和 CSV 摘要
  - Surfaced by: 交互评分 - 筛选、排序、分页、展开、导出必须闭环
  - Files: `records-table/`, `utils/export-csv.ts`
  - Verify: 空结果可恢复，导出文件中文不乱码

## GSTACK REVIEW REPORT

| Review | Trigger | Why | Runs | Status | Findings |
| --- | --- | --- | --- | --- | --- |
| CEO Review | `/plan-ceo-review` | Scope & strategy | 1 | CLEAR | 6 proposals, 4 accepted, 2 deferred |
| Codex Review | `/codex review` | Independent 2nd opinion | 0 | NOT RUN | Not requested for this PRD edit |
| Eng Review | `/plan-eng-review` | Architecture & tests (required) | 0 | NOT RUN | Required before implementation ship |
| Design Review | `/plan-design-review` | UI/UX gaps | 0 | NOT RUN | Recommended after UI is implemented |
| DX Review | `/plan-devex-review` | Developer experience gaps | 0 | NOT RUN | Not needed for current PRD edit |

- **UNRESOLVED:** 0
- **VERDICT:** CEO scope review cleared for implementation planning; eng review still required before shipping code.
