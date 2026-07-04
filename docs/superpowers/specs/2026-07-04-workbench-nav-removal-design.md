# 工作台内页伪 Tab 导航移除设计

## 背景

`/dashboard/news-tips/records`（线索明细）和 `/dashboard/news-tips/flow`（处理流转）已经是两个独立路由，可通过左侧边栏"工作台"子项（`src/config/nav-config.ts`）和移动端底部 `NewsTipsMobileTabBar`（`< md` 断点）互相跳转。

但桌面端两个页面内容区顶部还各自渲染了 `WorkbenchNav`（`src/features/news-tips/components/section-nav.tsx`）——用 shadcn `Tabs`/`TabsList`/`TabsTrigger` 包裹两个 `Link`，视觉上是"切换 Tab"，实际是两个独立页面间的导航，与侧边栏、移动端 Tab 栏功能重复，且未加 `md:hidden`，在移动端也会重复显示。

## 目标

去掉这个页面内的伪 Tab 导航，两页面之间的切换完全交给侧边栏（桌面）和底部 Tab 栏（移动端），不在页面内容区保留任何跳转入口。

## 改动内容

### 1. 删除 `WorkbenchNav`

- 删除文件 `src/features/news-tips/components/section-nav.tsx`。
- `src/features/news-tips/components/flow-board.tsx`：移除 `WorkbenchNav` 的 import 与渲染（第 22、107 行），无替代内容——`flow/page.tsx` 的 `PageContainer` 已提供标题"处理流转" + 描述 + `pageHeaderAction`（`CockpitToolbar`），页头信息完整。
- `src/features/news-tips/components/records-workbench.tsx`：移除 `WorkbenchNav` 的 import 与渲染。

### 2. "今日待办"按钮迁移

`records-workbench.tsx` 中原本与 `WorkbenchNav` 同一行的"今日待办"按钮，其点击逻辑（写入 `status: ['待审核']`、`range: 'today'` 等筛选参数到 URL）依赖 `useNewsTipParams`（nuqs URL 状态），不依赖 `RecordsWorkbench` 组件内部 state，因此可拆分为独立组件：

- 新增 `src/features/news-tips/components/today-todo-button.tsx`：一个独立的 client 组件，内部直接调用 `useNewsTipParams` 的 `setParams`，渲染"今日待办"按钮（图标 `Icons.clock` + 文案），点击逻辑与现状一致。
- `src/app/dashboard/news-tips/records/page.tsx`：`pageHeaderAction` 由单独的 `<CockpitToolbar />` 改为 `<CockpitToolbar />` 与 `<TodayTodoButton />` 并排（复用 `CockpitToolbar` 外层 `flex flex-wrap items-center gap-2` 的布局方式包一层，或直接放在同一个 flex 容器内）。
- `records-workbench.tsx` 内容区不再渲染顶部导航/按钮行，直接从 `ActiveFilters` 开始。

### 3. 不涉及的部分

- `src/config/nav-config.ts` 侧边栏结构不变。
- 移动端 `NewsTipsMobileTabBar`（`src/features/news-tips/components/mobile-tab-bar.tsx`）不变。
- `flow/page.tsx` 的 `PageContainer` 配置不变。
- 不涉及 API、类型层、状态管理改动，纯展示层调整。

## 测试

- 手动验证：桌面端访问 `/dashboard/news-tips/records` 与 `/dashboard/news-tips/flow`，确认页面内容区顶部不再出现 Tab 样式导航；"今日待办"按钮在页头右侧可正常点击、筛选生效。
- 移动端（`< 768px`）验证内容区无重复导航，底部 Tab 栏功能不受影响。
- 现有单测（如涉及 `RecordsWorkbench`/`FlowBoard` 渲染的测试，如有）需确认无 `WorkbenchNav` 相关断言残留。
