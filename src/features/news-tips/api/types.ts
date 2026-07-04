export type NewsTipCategory =
  | '突发事件'
  | '民生投诉'
  | '交通出行'
  | '文体活动'
  | '环境城建'
  | '消费维权'
  | '其他';

export type NewsTipSourcePlatform =
  | '深圳新闻网'
  | '问政深圳'
  | '读特客户端'
  | '深圳特区报'
  | '读创'
  | '晶报APP'
  | '壹深圳'
  | '南方+深圳';

export type NewsTipChannel =
  | '报料小程序'
  | '新闻热线电话'
  | '微信公众号'
  | '客户端爆料'
  | '微博'
  | '短视频平台'
  | '现场投递';

export type NewsTipStatus = '待审核' | '跟进中' | '已采用' | '不予采用';
export type PriorityLevel = 'high' | 'medium' | 'low';
export type TimeRange = 'today' | 'week' | 'month' | 'custom';
export type Granularity = 'day' | 'week' | 'month';

export type ShenzhenDistrict =
  | '福田区'
  | '罗湖区'
  | '盐田区'
  | '南山区'
  | '宝安区'
  | '龙岗区'
  | '龙华区'
  | '坪山区'
  | '光明区'
  | '大鹏新区'
  | '深汕特别合作区';

export interface TimelineEntry {
  time: string;
  action:
    | '线索提交'
    | '平台接收'
    | '编辑分拨'
    | '首次审核'
    | '记者跟进'
    | '部门回应'
    | '采用发布'
    | '不予采用';
  operator: string;
  note: string;
}

export interface NewsTipRecord {
  id: string;
  title: string;
  description: string;
  category: NewsTipCategory;
  sourcePlatform: NewsTipSourcePlatform;
  sourceUrl: string | null;
  referenceTopic: string;
  channel: NewsTipChannel;
  status: NewsTipStatus;
  district: ShenzhenDistrict;
  street: string | null;
  locationName: string | null;
  reporter: string;
  assignee: string;
  department: string | null;
  createdAt: string;
  firstResponseAt: string | null;
  responseMinutes: number | null;
  riskTags: string[];
  timeline: TimelineEntry[];
}

export interface NewsTipRecordWithPriority extends NewsTipRecord {
  priorityLevel: PriorityLevel;
  priorityLabel: string;
  priorityReason: string;
  priorityScore: number;
  ageMinutes: number;
}

export interface NewsTipFilters {
  range: TimeRange;
  dateFrom?: string;
  dateTo?: string;
  status?: NewsTipStatus[];
  category?: NewsTipCategory[];
  sourcePlatform?: NewsTipSourcePlatform[];
  channel?: NewsTipChannel[];
  district?: ShenzhenDistrict[];
  priority?: PriorityLevel[];
  sort?: 'priority' | 'createdAt' | 'responseMinutes';
}

export interface NewsTipListResponse {
  items: NewsTipRecordWithPriority[];
  totalItems: number;
  rangeTotalItems: number;
  allItems: number;
}

export interface KpiData {
  todayCount: number;
  todayDelta: number;
  weekCount: number;
  weekDelta: number;
  avgResponseMinutes: number;
  avgResponseDelta: number;
  completionRate: number;
  completionDelta: number;
  adoptionRate: number;
  adoptionDelta: number;
  sparklines: {
    today: number[];
    week: number[];
    response: number[];
    completion: number[];
  };
}

export interface SourcePlatformSlice {
  sourcePlatform: NewsTipSourcePlatform;
  count: number;
}
export interface ChannelSlice {
  channel: NewsTipChannel;
  count: number;
}
export interface CategoryBar {
  category: NewsTipCategory;
  count: number;
  adopted: number;
}
export interface DistrictStat {
  district: ShenzhenDistrict;
  count: number;
  pendingCount: number;
  adoptionRate: number;
  share: number;
}
export interface StatusStat {
  status: NewsTipStatus;
  count: number;
  completionShare: number;
}
export interface TrendPoint {
  label: string;
  count: number;
  completionRate: number;
  adoptionRate: number;
}

export interface InsightItem {
  id: string;
  tone: 'critical' | 'warning' | 'neutral' | 'positive';
  title: string;
  description: string;
  actionLabel: string;
  action:
    | { type: 'filter-status'; value: NewsTipStatus }
    | { type: 'filter-category'; value: NewsTipCategory }
    | { type: 'filter-sourcePlatform'; value: NewsTipSourcePlatform }
    | { type: 'filter-channel'; value: NewsTipChannel }
    | { type: 'filter-district'; value: ShenzhenDistrict }
    | { type: 'filter-priority'; value: PriorityLevel }
    | { type: 'sort'; value: 'priority' | 'createdAt' | 'responseMinutes' };
}

export interface DashboardData {
  kpi: KpiData;
  sources: SourcePlatformSlice[];
  channels: ChannelSlice[];
  categories: CategoryBar[];
  districts: DistrictStat[];
  statuses: StatusStat[];
  insights: InsightItem[];
  totalCount: number;
  rangeTotalCount: number;
  filteredCount: number;
  highPriorityCount: number;
  updatedAt: string;
}

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
