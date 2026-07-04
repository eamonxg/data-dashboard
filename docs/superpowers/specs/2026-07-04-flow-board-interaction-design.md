# 处理流转看板 · 操作交互设计文档

> 报料驾驶舱 · 「处理流转」看板从只读升级为可操作
> 日期：2026-07-04 ｜ 关联 PRD：`docs/superpowers/specs/2026-07-04-news-tips-cockpit-design.md`

## 1. 背景与问题

当前 `flow-board.tsx` 把线索按状态分成 4 个只读列(待审核 / 跟进中 / 已采用 / 不予采用),卡片仅展示标题、区·类别、优先级、处理人,不可点击、无任何操作。数据来自确定性 mock 生成器 `service.ts`,以固定种子生成并缓存在内存,**当前没有任何写入路径**。

每条线索已自带完整 `timeline`(线索提交 → 平台接收 → 编辑分拨 → 首次审核 → 记者跟进 → 部门回应 → 采用发布/不予采用)、`assignee`、`department`、`riskTags`,只是从未被写过。

**目标**:让操作员能在看板上真正流转线索——拖拽改状态、转派、追加备注、撤回,操作被持久记住,且全模块数据一致。

## 2. 关键决策(已与需求方确认)

| 决策点 | 结论 |
| --- | --- |
| 主交互 | **拖拽为主**:在列间拖动卡片改状态 |
| 需补信息的流转 | **拖拽 + 轻量确认**:落到「不予采用」弹理由框;转派/备注走卡片 ⋯ 菜单 |
| 持久化 | **localStorage 覆盖层**(`news-tips:overrides:v1`),刷新保留,清缓存重置,无后端 |
| 流转规则 | **按流水线约束**:合法落点可接收、非法落点禁止;终态锁定,仅「撤回」可退回 |
| 覆盖范围 | **看板 + 线索明细表一致**:覆盖层挂在 `records` query 的 `select` 上,两者共享数据源。KPI/图表走独立的 `dashboard` query(服务端全量聚合),暂保持基础值——让 KPI 随操作变化需把全量数据搬到客户端重算,成本远高,本期不做 |
| 反馈 | **Toast + 撤销(Undo)** + 卡片乐观更新 |
| 卡片 ⋯ 菜单 | 转派 / 追加备注 / 查看详情(时间线)/ 撤回(仅终态) |
| 拖拽库 | 新增 `@dnd-kit/core`(React 19 主流方案) |

**纯前端约束延续**(对齐 PRD 第 4 节):不引入 Server Action / route handler / 后端接口,覆盖层纯客户端,`output: 'export'` 静态导出仍成立。

## 3. 整体架构

```
服务端(不变)               客户端覆盖层(新增)                    UI(改造)
─────────────              ──────────────────                   ──────────────
service.ts    ──基础数据──▶  overrides-store (localStorage)      flow-board 拖拽化
(mock 生成)                  apply-overrides (纯函数 merge)       + 卡片 ⋯ 菜单
lib/priority  ◀──共享──────  use-flow-actions (变更 + 乐观更新)   + 理由/转派/备注/详情弹窗
(derivePriority)                                                 + Toast/Undo(sonner)
```

- 服务端照常生成基础 mock 并 SSR 首屏,读取路径不变。
- 客户端持有 overrides 覆盖层(localStorage),记录每条线索的改动。
- 纯函数 `applyOverrides(records, overrides, now)` 把覆盖层 merge 进查询结果,并**重新推导优先级**。
- 为避免优先级逻辑在两端分叉,把 `derivePriority` 及其依赖从 `service.ts` 抽到共享的纯模块 `lib/priority.ts`,服务端与客户端覆盖层复用同一份实现。
- overrides 存在一个**外部 store**(`overrides-store.ts`,包装 localStorage,提供 `subscribe`/`getSnapshot`/mutators),组件通过 `useSyncExternalStore` 订阅。
- 看板和线索明细表不直接用 `useSuspenseQuery` 的原始数据,而是通过共享 hook `useRecordsWithOverrides(filters)`:内部 `useSuspenseQuery(recordsQueryOptions(filters))` 拿基础数据,再在 `useMemo` 里用当前 overrides 快照跑 `applyOverrides` 合并。两者读同一 store,因此天然一致。
- **无需 `setQueryData`**:mutation 只改 store(写 localStorage + 通知订阅者),`useMemo` 因 overrides 变化重算 —— 乐观更新与撤销都由 store 状态变化驱动,天然一致、易回滚。
- KPI/图表读独立的 `dashboard` query,在服务端基于全部 180 天记录聚合;客户端仅持有筛选后的记录,无法完整重算 KPI(如今日新增、平均响应),故本期不叠加覆盖层,保持基础值。

### SSR 一致性

服务端不感知 localStorage,首屏渲染基础值;客户端挂载后 `useSyncExternalStore` 读取 overrides 并在 `useMemo` 中 merge。`getServerSnapshot` 返回空覆盖,保证 SSR/首帧与服务端一致、无 hydration 不匹配;挂载后若有持久化 overrides 会重渲染一次(极短暂原始值闪现,已与需求方确认可接受)。

## 4. 数据模型(新增)

```ts
// 单条线索的覆盖记录
interface NewsTipOverride {
  id: string;
  status?: NewsTipStatus;            // 改过状态才有
  assignee?: string;                 // 转派过才有
  timelineAppends: TimelineEntry[];  // 审核/采用/退回/备注 追加的轨迹
  updatedAt: string;
}

// localStorage 结构:Record<recordId, NewsTipOverride>,key 版本化

// 一次可撤销的操作(供 Undo 使用)
interface FlowOperation {
  id: string;                        // 操作唯一 id
  recordId: string;
  kind: 'move' | 'reassign' | 'note' | 'revert';
  prevOverride: NewsTipOverride | null; // 撤销时回滚到该快照
  label: string;                     // 如 "已流转到跟进中"
}
```

- **Undo 采用快照回滚**:存操作前的 override 快照,撤销时整体还原,而非计算反向操作,避免出错。
- 操作员标识:starter 无登录态,统一记为 `'当前编辑'`;时间用 `Date.now()`。

## 5. 覆盖层合并规则(`applyOverrides`)

对每条 `NewsTipRecordWithPriority`:

1. 若存在 override:
   - `status` 覆盖(若有);
   - `assignee` 覆盖(若有);
   - `timeline` = 原始 timeline + `timelineAppends`(按时间排序);
   - 依据新 `status` 用共享 `derivePriority` **重新推导** `priorityLevel/priorityLabel/priorityReason/priorityScore/ageMinutes`。
2. 无 override:原样返回。

合并是纯函数、无副作用,便于单测。

## 6. 变更动作(`use-flow-actions`)

| 动作 | 触发 | 效果 | 追加轨迹 |
| --- | --- | --- | --- |
| `moveStatus(id, to, reason?)` | 拖拽落列 | 校验流转合法 → 改 status | `首次审核` / `采用发布` / `不予采用`(带 reason) |
| `reassign(id, assignee)` | ⋯→转派 | 改 assignee | `编辑分拨` |
| `addNote(id, text)` | ⋯→追加备注 | 仅加轨迹 | `记者跟进`(备注内容) |
| `revert(id)` | ⋯→撤回(终态) | 退回上一步状态 | `编辑分拨`(注明撤回) |
| `undo(opId)` | Toast 撤销 | 快照回滚 | 移除对应追加 |

每个动作统一:改 overrides store(写 localStorage + 通知订阅者,订阅方 `useMemo` 重算即乐观更新)+ 弹 Toast(可撤销)。不使用 `setQueryData`。

## 7. 流转规则

```ts
const ALLOWED_TRANSITIONS: Record<NewsTipStatus, NewsTipStatus[]> = {
  待审核:   ['跟进中', '不予采用'],
  跟进中:   ['已采用', '不予采用', '待审核'],
  已采用:   [],   // 终态,仅 revert 可退回跟进中
  不予采用: []    // 终态,仅 revert 可退回来源状态
};
// 落到「不予采用」→ 必须弹理由框;其余合法流转直接落列生效。
```

- 拖拽开始时,合法落点列高亮为可接收,非法列显示禁止态、不接收、松手回弹。
- 终态卡片不可拖动;退回只能经 ⋯→撤回。`revert` 的目标状态:已采用→跟进中;不予采用→退回其被拒前的来源状态(存于 override,若无则默认「跟进中」)。

## 8. UI 组成

- **`flow-board.tsx` 拖拽化**:用 `@dnd-kit/core` 的 `DndContext` 包裹;列为 droppable,卡片为 draggable。`onDragEnd` 校验流转 → 合法且无需补信息则直接 `moveStatus`;落到「不予采用」则打开理由弹窗,确认后再 `moveStatus`,取消则回弹。
- **卡片 ⋯ 菜单**(`DropdownMenu`):转派 / 追加备注 / 查看详情 / 撤回(终态才显示)。
- **弹窗**(复用模板 Dialog + tanstack-form 规范):
  - 不予采用理由(必填,可给几个预设理由 chips + 自定义);
  - 转派处理人(从 `ASSIGNEES` 选);
  - 追加备注(文本域);
  - 查看详情(展示完整 description + timeline,只读)。
- **反馈**:sonner Toast,`action` 为「撤销」,数秒内可回退。
- **拖拽态**:卡片抓起时半透明 + 阴影;拖动中禁用列显示禁止光标。

## 9. 错误与边界

- localStorage 不可用(隐私模式/超额):降级为会话内存,操作仍生效但刷新丢失,首次静默 `console.warn`。
- override 指向的 id 在当前 mock 中不存在(理论上不会,种子固定):合并时跳过。
- 版本化 key:结构变更时 bump `v1→v2`,旧 key 忽略即可,不做迁移。
- 拖到非法列/同列:无操作,不产生 override、不弹 Toast。
- 空理由提交:弹窗校验拦截,按钮禁用。

## 10. 测试策略

- **纯函数单测**(vitest,沿用 `service.test.ts`/`analytics.test.ts` 风格):
  - `applyOverrides`:状态覆盖、assignee 覆盖、timeline 合并排序、优先级重算;
  - 流转校验:合法/非法转移矩阵;
  - `revert` 目标状态推导;
  - Undo 快照回滚。
- **构建验收**:`bun run build` 零错误;`NEXT_PUBLIC_SENTRY_DISABLED=true NEXT_STATIC_EXPORT=true bun run build` 仍可静态导出。
- **手动**:拖拽 4 类合法流转 + 1 类非法回弹;不予采用理由必填;转派/备注/撤回;刷新后保留;明细表/KPI 与看板一致。

## 11. 影响的文件

新增:
- `src/features/news-tips/lib/priority.ts`(从 service 抽出的共享优先级逻辑)
- `src/features/news-tips/lib/overrides-store.ts`(localStorage 读写)
- `src/features/news-tips/utils/apply-overrides.ts`(纯函数 merge)+ 测试
- `src/features/news-tips/constants/transitions.ts`(流转规则)
- `src/features/news-tips/hooks/use-flow-actions.ts`(变更 + 乐观更新)
- 看板卡片子组件、理由/转派/备注/详情弹窗组件

改造:
- `src/features/news-tips/api/service.ts`(改用共享 `derivePriority`)
- `src/features/news-tips/api/queries.ts`(client 读取叠加覆盖层)
- `src/features/news-tips/components/flow-board.tsx`(拖拽化)
- `package.json`(新增 `@dnd-kit/core`)
