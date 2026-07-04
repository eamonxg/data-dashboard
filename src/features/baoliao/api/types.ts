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
