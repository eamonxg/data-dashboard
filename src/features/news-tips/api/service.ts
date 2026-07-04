import {
  NEWS_TIP_CATEGORIES,
  NEWS_TIP_CHANNELS,
  NEWS_TIP_DISTRICTS,
  NEWS_TIP_ASSIGNEES as ASSIGNEES,
  NEWS_TIP_SOURCE_PLATFORMS,
  NEWS_TIP_STATUSES,
  SHENZHEN_LOCATIONS,
  SHENZHEN_STREETS
} from '../constants/options';
import { derivePriority } from '../lib/priority';
import type {
  CategoryBar,
  ChannelSlice,
  DashboardData,
  DistrictStat,
  Granularity,
  InsightItem,
  KpiData,
  NewsTipCategory,
  NewsTipChannel,
  NewsTipFilters,
  NewsTipListResponse,
  NewsTipRecord,
  NewsTipRecordWithPriority,
  NewsTipSourcePlatform,
  NewsTipStatus,
  SourcePlatformSlice,
  StatusStat,
  TimelineEntry,
  TrendPoint
} from './types';

const SEED = 20260704;
const TOTAL_DAYS = 180;
const DAY_MS = 24 * 60 * 60 * 1000;

const REPORTER_SURNAMES = ['陈', '李', '黄', '张', '林', '王', '刘', '吴', '赵', '周', '梁', '何'];
const REPORTER_SUFFIXES = ['先生', '女士', '**', '师傅', '阿姨'];

const SOURCE_DETAILS: Record<
  NewsTipSourcePlatform,
  { topic: string; baseUrl: string; channelBias: NewsTipChannel[] }
> = {
  深圳新闻网: {
    topic: '龙岗布吉排水',
    baseUrl: 'https://www.sznews.com/news/content',
    channelBias: ['报料小程序', '微信公众号', '客户端爆料']
  },
  问政深圳: {
    topic: '民生投诉/热线',
    baseUrl: 'https://wenzheng.sznews.com/thread',
    channelBias: ['新闻热线电话', '微信公众号', '报料小程序']
  },
  读特客户端: {
    topic: '医院商圈出租车占道',
    baseUrl: 'https://www.dutenews.com/shenzhen/p',
    channelBias: ['客户端爆料', '短视频平台', '微博']
  },
  深圳特区报: {
    topic: '暴雨红色预警',
    baseUrl: 'https://sztqb.sznews.com/PC/content',
    channelBias: ['新闻热线电话', '微信公众号', '现场投递']
  },
  读创: {
    topic: '商圈消费',
    baseUrl: 'https://duchuang.sznews.com/content',
    channelBias: ['客户端爆料', '微博', '微信公众号']
  },
  晶报APP: {
    topic: '城市生活',
    baseUrl: 'https://jb.sznews.com/news/content',
    channelBias: ['客户端爆料', '报料小程序', '短视频平台']
  },
  壹深圳: {
    topic: '视频/突发',
    baseUrl: 'https://www.sztv.com.cn/ysz/zx',
    channelBias: ['短视频平台', '微博', '客户端爆料']
  },
  '南方+深圳': {
    topic: '区域民生',
    baseUrl: 'https://static.nfapp.southcn.com/content',
    channelBias: ['微信公众号', '新闻热线电话', '现场投递']
  }
};

const DEPARTMENTS: Record<NewsTipCategory, string[]> = {
  突发事件: ['深圳市应急管理局', '深圳交警', '深圳消防救援支队', '区应急管理局'],
  民生投诉: ['区住房建设局', '街道办事处', '区民政局', '物业监管科'],
  交通出行: ['深圳交警', '深圳地铁集团', '市交通运输局', '区交通运输局'],
  文体活动: ['区文化广电旅游体育局', '街道公共服务办', '区城市管理局'],
  环境城建: ['深圳市生态环境局', '区城市管理局', '区水务局', '区住房建设局'],
  消费维权: ['深圳市市场监督管理局', '消费者委员会', '区市场监管局'],
  其他: ['属地街道办', '社区工作站', '热线转办组']
};

const RISK_TAGS: Record<NewsTipCategory, string[]> = {
  突发事件: ['公共安全', '消防风险', '交通事故', '暴雨积水', '舆情升温'],
  民生投诉: ['民生高频', '物业纠纷', '供水供电', '社区治理'],
  交通出行: ['交通拥堵', '出行安全', '占道候客', '设施损坏'],
  文体活动: ['大客流', '活动秩序', '噪声扰民', '公共服务'],
  环境城建: ['内涝风险', '施工扰民', '环境异味', '城市更新'],
  消费维权: ['退款争议', '预付费风险', '价格投诉', '食品安全'],
  其他: ['线索待核', '暖新闻', '公共服务', '网络关注']
};

interface CategoryTemplate {
  title: string;
  description: string;
}

const CATEGORY_TEMPLATES: Record<NewsTipCategory, CategoryTemplate[]> = {
  突发事件: [
    {
      title: '{district}{street}片区暴雨后道路积水影响通行',
      description: '{location}周边短时雨量较大，市民反映部分低洼路段车辆通行缓慢。'
    },
    {
      title: '{district}{street}一处电动自行车充电点冒烟',
      description: '消防人员已到场排查，街道同步提醒周边居民留意安全。'
    },
    {
      title: '{district}{street}路口两车轻微碰撞造成拥堵',
      description: '早高峰车流叠加事故处理，交警已在现场疏导。'
    },
    {
      title: '{district}{street}工地围挡被强风吹倒',
      description: '现场临时封控后已安排抢修，周边行人通行受影响。'
    }
  ],
  民生投诉: [
    {
      title: '{district}{street}小区电梯频繁停运居民盼维修',
      description: '{location}附近居民称故障持续多日，老人和通勤住户出行不便。'
    },
    {
      title: '{district}{street}夜间施工噪声反复扰民',
      description: '多名居民通过热线反映，希望明确施工时段和整改期限。'
    },
    {
      title: '{district}{street}片区供水水压不稳',
      description: '居民称晚高峰用水受到影响，已向物业和水务单位反馈。'
    },
    {
      title: '{district}{street}社区停车秩序引发投诉',
      description: '道路两侧临停车辆较多，居民希望增设引导和巡查。'
    }
  ],
  交通出行: [
    {
      title: '{district}{street}地铁站口网约车聚集占道',
      description: '{location}周边晚高峰接驳需求集中，市民建议优化上落客区。'
    },
    {
      title: '{district}{street}公交站候车空间不足',
      description: '雨天乘客排队外溢至人行道，存在一定通行隐患。'
    },
    {
      title: '{district}{street}路口信号灯配时被指不合理',
      description: '行人等待时间较长，附近写字楼通勤人群反映强烈。'
    },
    {
      title: '{district}{street}共享单车堆放影响人行通道',
      description: '运营企业已收到转办，街道拟联合清理重点点位。'
    }
  ],
  文体活动: [
    {
      title: '{district}{street}社区文化活动引来周边居民参与',
      description: '{location}设置展演和互动摊位，现场人流较平日明显增加。'
    },
    {
      title: '{district}{street}体育场馆预约名额紧张',
      description: '市民反映热门时段一位难求，希望公开余量和退订规则。'
    },
    {
      title: '{district}{street}公园夜间活动音量偏大',
      description: '周边住户希望活动组织方降低音响音量并提前公示安排。'
    },
    {
      title: '{district}{street}青少年赛事周末开赛',
      description: '赛事组织方提醒观众错峰到场，附近道路将进行临时疏导。'
    }
  ],
  环境城建: [
    {
      title: '{district}{street}河道异味问题收到多名市民反映',
      description: '{location}附近居民称天气闷热时气味明显，希望加快巡查治理。'
    },
    {
      title: '{district}{street}道路反复开挖影响商户经营',
      description: '商户希望施工单位明确工期，并优化围挡和夜间照明。'
    },
    {
      title: '{district}{street}建筑垃圾临时堆放点扬尘明显',
      description: '街道已通知施工方覆盖并增加洒水频次。'
    },
    {
      title: '{district}{street}行道树遮挡路灯影响夜间通行',
      description: '居民建议尽快修剪，提升人行道夜间安全感。'
    }
  ],
  消费维权: [
    {
      title: '{district}{street}商圈预付卡退款纠纷集中出现',
      description: '{location}周边多名消费者反映门店闭店后沟通困难。'
    },
    {
      title: '{district}{street}餐饮店团购核销规则引发争议',
      description: '消费者称平台展示信息不清，市场监管部门已介入了解。'
    },
    {
      title: '{district}{street}培训机构课程延期未退费',
      description: '家长希望明确退费进度和后续课程安排。'
    },
    {
      title: '{district}{street}商户被投诉价格标示不清',
      description: '执法人员已提醒商家完善明码标价和售后说明。'
    }
  ],
  其他: [
    {
      title: '{district}{street}居民反映公共服务窗口排队较久',
      description: '{location}附近办事群众建议增加高峰时段引导人员。'
    },
    {
      title: '{district}{street}社区志愿服务活动获市民关注',
      description: '街道组织便民服务摊位，收集到多项后续办理诉求。'
    },
    {
      title: '{district}{street}快递柜收费规则被市民咨询',
      description: '居民希望平台明确免费保管时长和提醒机制。'
    },
    {
      title: '{district}{street}老旧楼栋公共照明待维护',
      description: '社区工作站已登记点位，后续将协调物业安排维修。'
    }
  ]
};

const HOUR_WEIGHTS = [1, 1, 1, 1, 1, 2, 3, 5, 8, 9, 9, 8, 6, 6, 8, 9, 9, 9, 8, 7, 5, 4, 3, 2];
interface MockClock {
  now: Date;
  todayStart: Date;
  todayKey: string;
}

let cachedRecords: { todayKey: string; records: NewsTipRecord[] } | null = null;

function mulberry32(seed: number) {
  let a = seed;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rng: () => number, items: T[]): T {
  return items[Math.floor(rng() * items.length)];
}

function weightedPick<T>(rng: () => number, items: T[], weights: number[]): T {
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  let cursor = rng() * total;

  for (let index = 0; index < items.length; index++) {
    cursor -= weights[index];
    if (cursor <= 0) return items[index];
  }

  return items[items.length - 1];
}

function utcStartOfLocalDay(date: Date): Date {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0));
}

function createMockClock(now = new Date()): MockClock {
  const todayStart = utcStartOfLocalDay(now);
  return {
    now,
    todayStart,
    todayKey: todayStart.toISOString().slice(0, 10)
  };
}

function utcEndOfDateString(value: string | undefined): Date | null {
  const start = utcStartOfDateString(value);
  if (!start) return null;
  return new Date(start.getTime() + DAY_MS - 1);
}

function utcStartOfDateString(value: string | undefined): Date | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const [, year, month, day] = match;
  return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), 0, 0, 0, 0));
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

function startOfISOWeek(date: Date): Date {
  const start = utcStartOfLocalDay(date);
  const day = start.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  return addDays(start, diff);
}

function startOfMonth(date: Date): Date {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0));
}

function isoWeekNumber(date: Date): number {
  const target = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNr = (target.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - dayNr + 3);
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  const firstDayNr = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayNr + 3);
  return 1 + Math.round((target.getTime() - firstThursday.getTime()) / (7 * DAY_MS));
}

function formatDateKey(date: Date): string {
  return date.toISOString().slice(0, 10).replaceAll('-', '');
}

function formatSourceUrl(
  sourcePlatform: NewsTipSourcePlatform,
  dateKey: string,
  sequence: number,
  includeUrl: boolean
) {
  if (!includeUrl) return null;
  return `${SOURCE_DETAILS[sourcePlatform].baseUrl}/${dateKey}-${String(sequence).padStart(3, '0')}.html`;
}

function dailyCountFor(offset: number, rng: () => number): number {
  if (offset === 0) return 12 + Math.floor(rng() * 5);
  return 3 + (offset % 4 === 0 ? 2 : offset % 2 === 0 ? 1 : 0) + (rng() < 0.18 ? 1 : 0);
}

function statusForRecord(
  offset: number,
  category: NewsTipCategory,
  rng: () => number
): NewsTipStatus {
  const roll = rng();

  if (offset === 0) {
    if (category === '突发事件' && roll < 0.58) return '待审核';
    if (roll < 0.42) return '待审核';
    if (roll < 0.72) return '跟进中';
    if (roll < 0.9) return '已采用';
    return '不予采用';
  }

  if (roll < 0.4) return '已采用';
  if (roll < 0.58) return '跟进中';
  if (roll < 0.78) return '待审核';
  return '不予采用';
}

function responseMinutesFor(status: NewsTipStatus, rng: () => number): number | null {
  if (status === '待审核') return null;
  const base = status === '跟进中' ? 30 : 12;
  const longTail = rng() * rng() * 420;
  return Math.round(base + longTail + rng() * 45);
}

function applyTemplate(
  template: string,
  values: Record<'district' | 'street' | 'location', string>
) {
  return template
    .replaceAll('{district}', values.district)
    .replaceAll('{street}', values.street)
    .replaceAll('{location}', values.location);
}

function riskTagsFor(
  category: NewsTipCategory,
  status: NewsTipStatus,
  rng: () => number
): string[] {
  const pool = RISK_TAGS[category];
  const tags = [pick(rng, pool)];

  if (category === '突发事件' || status === '待审核') {
    tags.push(pick(rng, pool));
  }

  if (category === '民生投诉' && rng() < 0.35) {
    tags.push('舆情升温');
  }

  return Array.from(new Set(tags));
}

function buildTimeline({
  createdAt,
  status,
  channel,
  reporter,
  assignee,
  department,
  firstResponseAt,
  rng
}: {
  createdAt: Date;
  status: NewsTipStatus;
  channel: NewsTipChannel;
  reporter: string;
  assignee: string;
  department: string | null;
  firstResponseAt: string | null;
  rng: () => number;
}): TimelineEntry[] {
  const entries: TimelineEntry[] = [
    {
      time: createdAt.toISOString(),
      action: '线索提交',
      operator: reporter,
      note: `市民通过${channel}提交线索`
    }
  ];

  if (status === '待审核') {
    if (rng() < 0.45) {
      entries.push({
        time: new Date(createdAt.getTime() + 5 * 60 * 1000).toISOString(),
        action: '平台接收',
        operator: '线索分诊台',
        note: '平台已接收，等待编辑审核'
      });
    }
    return entries;
  }

  const acceptedAt = new Date(createdAt.getTime() + 4 * 60 * 1000);
  const assignedAt = new Date(createdAt.getTime() + 12 * 60 * 1000);
  const reviewedAt = firstResponseAt ? new Date(firstResponseAt) : assignedAt;

  entries.push({
    time: acceptedAt.toISOString(),
    action: '平台接收',
    operator: '线索分诊台',
    note: '已完成来源校验并进入分拨池'
  });
  entries.push({
    time: assignedAt.toISOString(),
    action: '编辑分拨',
    operator: assignee,
    note: department ? `转交${department}核实` : '分拨给值班编辑核实'
  });

  if (status === '不予采用') {
    entries.push({
      time: reviewedAt.toISOString(),
      action: '不予采用',
      operator: assignee,
      note: '经核实暂不具备采用条件，保留线索记录'
    });
    return entries;
  }

  entries.push({
    time: reviewedAt.toISOString(),
    action: '首次审核',
    operator: assignee,
    note: '完成首次审核，进入后续跟进'
  });

  if (status === '跟进中') {
    entries.push({
      time: new Date(reviewedAt.getTime() + 45 * 60 * 1000).toISOString(),
      action: '记者跟进',
      operator: assignee,
      note: '记者正在联系属地单位和报料人补充细节'
    });
    return entries;
  }

  entries.push({
    time: new Date(reviewedAt.getTime() + 70 * 60 * 1000).toISOString(),
    action: '部门回应',
    operator: department ?? '属地部门',
    note: '已收到初步回应并补充处置进展'
  });
  entries.push({
    time: new Date(reviewedAt.getTime() + 150 * 60 * 1000).toISOString(),
    action: '采用发布',
    operator: assignee,
    note: '线索已采用并进入发布记录'
  });

  return entries;
}

function createRecord({
  dayStart,
  sequence,
  globalIndex,
  offset,
  now,
  rng
}: {
  dayStart: Date;
  sequence: number;
  globalIndex: number;
  offset: number;
  now: Date;
  rng: () => number;
}): NewsTipRecord {
  const dateKey = formatDateKey(dayStart);
  const category = NEWS_TIP_CATEGORIES[globalIndex % NEWS_TIP_CATEGORIES.length];
  const sourcePlatform = NEWS_TIP_SOURCE_PLATFORMS[globalIndex % NEWS_TIP_SOURCE_PLATFORMS.length];
  const district = NEWS_TIP_DISTRICTS[globalIndex % NEWS_TIP_DISTRICTS.length];
  const streets = SHENZHEN_STREETS[district];
  const locations = SHENZHEN_LOCATIONS[district];
  const street = pick(rng, streets);
  const locationName = rng() < 0.9 ? pick(rng, locations) : null;
  const location = locationName ?? `${street}片区`;
  const template = pick(rng, CATEGORY_TEMPLATES[category]);
  const sourceDetail = SOURCE_DETAILS[sourcePlatform];
  const biasedChannels = sourceDetail.channelBias;
  const channel = rng() < 0.68 ? pick(rng, biasedChannels) : pick(rng, NEWS_TIP_CHANNELS);
  const status = statusForRecord(offset, category, rng);
  const responseMinutes = responseMinutesFor(status, rng);
  const assignee = pick(rng, ASSIGNEES);
  const reporter = `${pick(rng, REPORTER_SURNAMES)}${pick(rng, REPORTER_SUFFIXES)}`;
  const department = status === '待审核' && rng() < 0.35 ? null : pick(rng, DEPARTMENTS[category]);
  const elapsedTodayMs = Math.max(0, now.getTime() - dayStart.getTime());
  const createdAt =
    offset === 0
      ? new Date(dayStart.getTime() + Math.floor(rng() * (elapsedTodayMs + 1)))
      : new Date(
          Date.UTC(
            dayStart.getUTCFullYear(),
            dayStart.getUTCMonth(),
            dayStart.getUTCDate(),
            weightedPick(
              rng,
              Array.from({ length: 24 }, (_, index) => index),
              HOUR_WEIGHTS
            ),
            Math.floor(rng() * 60),
            Math.floor(rng() * 60)
          )
        );

  const firstResponseAt =
    responseMinutes === null
      ? null
      : new Date(createdAt.getTime() + responseMinutes * 60 * 1000).toISOString();

  return {
    id: `SZ-BL-${dateKey}-${String(sequence).padStart(3, '0')}`,
    title: applyTemplate(template.title, { district, street, location }),
    description: applyTemplate(template.description, { district, street, location }),
    category,
    sourcePlatform,
    sourceUrl: formatSourceUrl(sourcePlatform, dateKey, sequence, rng() < 0.72),
    referenceTopic: sourceDetail.topic,
    channel,
    status,
    district,
    street,
    locationName,
    reporter,
    assignee,
    department,
    createdAt: createdAt.toISOString(),
    firstResponseAt,
    responseMinutes,
    riskTags: riskTagsFor(category, status, rng),
    timeline: buildTimeline({
      createdAt,
      status,
      channel,
      reporter,
      assignee,
      department,
      firstResponseAt,
      rng
    })
  };
}

function generateRecords(clock = createMockClock()): NewsTipRecord[] {
  if (cachedRecords?.todayKey === clock.todayKey) return cachedRecords.records;

  const rng = mulberry32(SEED);
  const records: NewsTipRecord[] = [];
  let globalIndex = 0;

  for (let offset = TOTAL_DAYS - 1; offset >= 0; offset--) {
    const dayStart = addDays(clock.todayStart, -offset);
    const dailyCount = dailyCountFor(offset, rng);

    for (let sequence = 1; sequence <= dailyCount; sequence++) {
      records.push(
        createRecord({
          dayStart,
          sequence,
          globalIndex,
          offset,
          now: clock.now,
          rng
        })
      );
      globalIndex++;
    }
  }

  cachedRecords = {
    todayKey: clock.todayKey,
    records: records.toSorted(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  };
  return cachedRecords.records;
}

function rangeWindow(filters: NewsTipFilters, now: Date): { start: Date | null; end: Date | null } {
  switch (filters.range) {
    case 'today':
      return { start: utcStartOfLocalDay(now), end: null };
    case 'week':
      return { start: startOfISOWeek(now), end: null };
    case 'month':
      return { start: startOfMonth(now), end: null };
    case 'custom':
      return {
        start: utcStartOfDateString(filters.dateFrom),
        end: utcEndOfDateString(filters.dateTo)
      };
  }
}

function filterByRange(
  records: NewsTipRecord[],
  filters: NewsTipFilters,
  now: Date
): NewsTipRecord[] {
  const { start, end } = rangeWindow(filters, now);
  const startMs = start?.getTime() ?? Number.NEGATIVE_INFINITY;
  const endMs = end?.getTime() ?? Number.POSITIVE_INFINITY;

  return records.filter((record) => {
    const createdMs = new Date(record.createdAt).getTime();
    return createdMs >= startMs && createdMs <= endMs;
  });
}

function enrichRecords(records: NewsTipRecord[], now: Date): NewsTipRecordWithPriority[] {
  return records.map((record) => derivePriority(record, now));
}

function applyFilters(
  records: NewsTipRecordWithPriority[],
  filters: NewsTipFilters
): NewsTipRecordWithPriority[] {
  let result = records;

  if (filters.status?.length) {
    const allowed = new Set(filters.status);
    result = result.filter((record) => allowed.has(record.status));
  }

  if (filters.category?.length) {
    const allowed = new Set(filters.category);
    result = result.filter((record) => allowed.has(record.category));
  }

  if (filters.sourcePlatform?.length) {
    const allowed = new Set(filters.sourcePlatform);
    result = result.filter((record) => allowed.has(record.sourcePlatform));
  }

  if (filters.channel?.length) {
    const allowed = new Set(filters.channel);
    result = result.filter((record) => allowed.has(record.channel));
  }

  if (filters.district?.length) {
    const allowed = new Set(filters.district);
    result = result.filter((record) => allowed.has(record.district));
  }

  if (filters.priority?.length) {
    const allowed = new Set(filters.priority);
    result = result.filter((record) => allowed.has(record.priorityLevel));
  }

  return result;
}

function sortRecords(
  records: NewsTipRecordWithPriority[],
  sort: NewsTipFilters['sort'] = 'priority'
): NewsTipRecordWithPriority[] {
  return records.toSorted((a, b) => {
    if (sort === 'createdAt') {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }

    if (sort === 'responseMinutes') {
      return (b.responseMinutes ?? -1) - (a.responseMinutes ?? -1);
    }

    if (b.priorityScore !== a.priorityScore) return b.priorityScore - a.priorityScore;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

function pct(value: number): number {
  return Math.round(value * 1000) / 10;
}

function pctDelta(current: number, previous: number): number {
  if (previous === 0) return current === 0 ? 0 : 100;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

function completionRateOf(records: NewsTipRecord[]): number {
  if (records.length === 0) return 0;
  const completed = records.filter(
    (record) => record.status === '已采用' || record.status === '不予采用'
  ).length;
  return pct(completed / records.length);
}

function adoptionRateOf(records: NewsTipRecord[]): number {
  const completed = records.filter(
    (record) => record.status === '已采用' || record.status === '不予采用'
  );
  if (completed.length === 0) return 0;
  const adopted = completed.filter((record) => record.status === '已采用').length;
  return pct(adopted / completed.length);
}

function avgResponseOf(records: NewsTipRecord[]): number {
  const withResponse = records.filter(
    (record): record is NewsTipRecord & { responseMinutes: number } =>
      record.responseMinutes !== null
  );

  if (withResponse.length === 0) return 0;

  return Math.round(
    withResponse.reduce((sum, record) => sum + record.responseMinutes, 0) / withResponse.length
  );
}

function recordsBetween(records: NewsTipRecord[], startMs: number, endMs: number): NewsTipRecord[] {
  return records.filter((record) => {
    const createdMs = new Date(record.createdAt).getTime();
    return createdMs >= startMs && createdMs < endMs;
  });
}

function computeKpi(all: NewsTipRecord[], now: Date): KpiData {
  const todayStart = utcStartOfLocalDay(now).getTime();
  const yesterdayStart = todayStart - DAY_MS;
  const thisWeekStart = startOfISOWeek(now).getTime();
  const daysElapsedThisWeek = Math.floor((todayStart - thisWeekStart) / DAY_MS) + 1;
  const lastWeekStart = thisWeekStart - 7 * DAY_MS;
  const trailing30Start = todayStart - 30 * DAY_MS;
  const prior30Start = todayStart - 60 * DAY_MS;

  const todayRecords = recordsBetween(all, todayStart, todayStart + DAY_MS);
  const yesterdayRecords = recordsBetween(all, yesterdayStart, todayStart);
  const weekRecords = recordsBetween(all, thisWeekStart, now.getTime() + DAY_MS);
  const lastWeekSamePeriodRecords = recordsBetween(
    all,
    lastWeekStart,
    lastWeekStart + daysElapsedThisWeek * DAY_MS
  );
  const trailing30 = recordsBetween(all, trailing30Start, todayStart + DAY_MS);
  const prior30 = recordsBetween(all, prior30Start, trailing30Start);
  const avgResponseMinutes = avgResponseOf(trailing30);
  const completionRate = completionRateOf(trailing30);
  const adoptionRate = adoptionRateOf(trailing30);
  const todaySparkline: number[] = [];
  const responseSparkline: number[] = [];
  const completionSparkline: number[] = [];

  for (let index = 13; index >= 0; index--) {
    const start = todayStart - index * DAY_MS;
    const dayRecords = recordsBetween(all, start, start + DAY_MS);
    todaySparkline.push(dayRecords.length);
    responseSparkline.push(avgResponseOf(dayRecords));
    completionSparkline.push(completionRateOf(dayRecords));
  }

  const weekSparkline: number[] = [];
  for (let index = 7; index >= 0; index--) {
    const start = thisWeekStart - index * 7 * DAY_MS;
    weekSparkline.push(recordsBetween(all, start, start + 7 * DAY_MS).length);
  }

  return {
    todayCount: todayRecords.length,
    todayDelta: pctDelta(todayRecords.length, yesterdayRecords.length),
    weekCount: weekRecords.length,
    weekDelta: pctDelta(weekRecords.length, lastWeekSamePeriodRecords.length),
    avgResponseMinutes,
    avgResponseDelta: pctDelta(avgResponseMinutes, avgResponseOf(prior30)),
    completionRate,
    completionDelta: pctDelta(completionRate, completionRateOf(prior30)),
    adoptionRate,
    adoptionDelta: pctDelta(adoptionRate, adoptionRateOf(prior30)),
    sparklines: {
      today: todaySparkline,
      week: weekSparkline,
      response: responseSparkline,
      completion: completionSparkline
    }
  };
}

function computeSourceSlices(records: NewsTipRecord[]): SourcePlatformSlice[] {
  return NEWS_TIP_SOURCE_PLATFORMS.map((sourcePlatform) => ({
    sourcePlatform,
    count: records.filter((record) => record.sourcePlatform === sourcePlatform).length
  }));
}

function computeChannelSlices(records: NewsTipRecord[]): ChannelSlice[] {
  return NEWS_TIP_CHANNELS.map((channel) => ({
    channel,
    count: records.filter((record) => record.channel === channel).length
  }));
}

function computeCategoryBars(records: NewsTipRecord[]): CategoryBar[] {
  return NEWS_TIP_CATEGORIES.map((category) => {
    const inCategory = records.filter((record) => record.category === category);
    return {
      category,
      count: inCategory.length,
      adopted: inCategory.filter((record) => record.status === '已采用').length
    };
  });
}

function computeDistrictStats(records: NewsTipRecord[]): DistrictStat[] {
  const total = records.length;

  return NEWS_TIP_DISTRICTS.map((district) => {
    const inDistrict = records.filter((record) => record.district === district);

    return {
      district,
      count: inDistrict.length,
      pendingCount: inDistrict.filter((record) => record.status === '待审核').length,
      adoptionRate: adoptionRateOf(inDistrict),
      share: total === 0 ? 0 : pct(inDistrict.length / total)
    };
  }).toSorted((a, b) => b.count - a.count);
}

function computeStatusStats(records: NewsTipRecord[]): StatusStat[] {
  const total = records.length;

  return NEWS_TIP_STATUSES.map((status) => ({
    status,
    count: records.filter((record) => record.status === status).length,
    completionShare:
      total === 0 ? 0 : pct(records.filter((record) => record.status === status).length / total)
  }));
}

function topCategory(records: NewsTipRecord[]): CategoryBar | null {
  return (
    computeCategoryBars(records)
      .filter((item) => item.count > 0)
      .toSorted((a, b) => b.count - a.count)[0] ?? null
  );
}

function topSource(records: NewsTipRecord[]): SourcePlatformSlice | null {
  return (
    computeSourceSlices(records)
      .filter((item) => item.count > 0)
      .toSorted((a, b) => b.count - a.count)[0] ?? null
  );
}

function generateInsights(records: NewsTipRecordWithPriority[], kpi: KpiData): InsightItem[] {
  if (records.length === 0) {
    return [
      {
        id: 'empty-range',
        tone: 'neutral',
        title: '当前范围暂无可分析线索',
        description: '可切换时间范围或清空筛选查看深圳全市报料态势。',
        actionLabel: '按最新查看',
        action: { type: 'sort', value: 'createdAt' }
      }
    ];
  }

  const insights: InsightItem[] = [];
  const highPriorityCount = records.filter((record) => record.priorityLevel === 'high').length;
  const pendingCount = records.filter((record) => record.status === '待审核').length;
  const pendingShare = pct(pendingCount / records.length);
  const topDistrict = computeDistrictStats(records).find((district) => district.count > 0);
  const category = topCategory(records);
  const source = topSource(records);

  if (highPriorityCount > 0) {
    insights.push({
      id: 'high-priority',
      tone: 'critical',
      title: `${highPriorityCount} 条线索需优先处理`,
      description: '主要命中突发、公共安全、审核超时或响应超时规则。',
      actionLabel: '查看高优先级',
      action: { type: 'filter-priority', value: 'high' }
    });
  }

  if (pendingShare >= 30) {
    insights.push({
      id: 'pending-pressure',
      tone: 'warning',
      title: `待审核占比 ${pendingShare.toFixed(1)}%`,
      description: '当前分诊压力偏高，建议优先处理高触达渠道和突发类线索。',
      actionLabel: '筛选待审核',
      action: { type: 'filter-status', value: '待审核' }
    });
  }

  if (topDistrict) {
    insights.push({
      id: 'top-district',
      tone: topDistrict.pendingCount > 0 ? 'warning' : 'neutral',
      title: `${topDistrict.district}线索最集中`,
      description: `当前 ${topDistrict.count} 条，其中待审核 ${topDistrict.pendingCount} 条。`,
      actionLabel: `查看${topDistrict.district}`,
      action: { type: 'filter-district', value: topDistrict.district }
    });
  }

  if (category && insights.length < 4) {
    insights.push({
      id: 'top-category',
      tone: category.category === '突发事件' ? 'critical' : 'neutral',
      title: `${category.category}为高发类型`,
      description: `当前范围 ${category.count} 条，其中已采用 ${category.adopted} 条。`,
      actionLabel: `查看${category.category}`,
      action: { type: 'filter-category', value: category.category }
    });
  }

  if (source && insights.length < 4) {
    insights.push({
      id: 'top-source',
      tone: 'positive',
      title: `${source.sourcePlatform}贡献线索较多`,
      description: `当前范围 ${source.count} 条来自该来源，可关注入口承接效率。`,
      actionLabel: `筛选${source.sourcePlatform}`,
      action: { type: 'filter-sourcePlatform', value: source.sourcePlatform }
    });
  }

  if (kpi.completionDelta < -10 && insights.length < 4) {
    insights.push({
      id: 'completion-drop',
      tone: 'warning',
      title: '处置完成率下降',
      description: `近 30 日完成率较前期下降 ${Math.abs(kpi.completionDelta).toFixed(1)}%。`,
      actionLabel: '按响应时长排序',
      action: { type: 'sort', value: 'responseMinutes' }
    });
  }

  return insights.slice(0, 4);
}

function aggregateTrend(records: NewsTipRecord[], granularity: Granularity): TrendPoint[] {
  const buckets = new Map<string, { label: string; records: NewsTipRecord[]; order: number }>();

  for (const record of records) {
    const date = new Date(record.createdAt);
    let key: string;
    let label: string;
    let order: number;

    if (granularity === 'day') {
      key = date.toISOString().slice(0, 10);
      label = date.toISOString().slice(5, 10);
      order = utcStartOfLocalDay(date).getTime();
    } else if (granularity === 'week') {
      const weekStart = startOfISOWeek(date);
      key = `${date.getUTCFullYear()}-W${isoWeekNumber(date)}`;
      label = `第${isoWeekNumber(date)}周`;
      order = weekStart.getTime();
    } else {
      key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
      label = `${date.getUTCMonth() + 1}月`;
      order = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1);
    }

    if (!buckets.has(key)) {
      buckets.set(key, { label, records: [], order });
    }

    buckets.get(key)!.records.push(record);
  }

  return Array.from(buckets.values())
    .toSorted((a, b) => a.order - b.order)
    .map(({ label, records }) => ({
      label,
      count: records.length,
      completionRate: completionRateOf(records),
      adoptionRate: adoptionRateOf(records)
    }));
}

function buildRangeAndFilteredRecords(filters: NewsTipFilters, clock: MockClock) {
  const all = generateRecords(clock);
  const rangeRecords = filterByRange(all, filters, clock.now);
  const enrichedRange = enrichRecords(rangeRecords, clock.now);
  const filtered = sortRecords(applyFilters(enrichedRange, filters), filters.sort);

  return {
    all,
    rangeRecords,
    filtered
  };
}

export async function getAllNewsTipRecords(): Promise<NewsTipRecord[]> {
  return generateRecords(createMockClock());
}

export async function getDashboardData(filters: NewsTipFilters): Promise<DashboardData> {
  const clock = createMockClock();
  const { all, rangeRecords, filtered } = buildRangeAndFilteredRecords(filters, clock);
  const kpi = computeKpi(all, clock.now);

  return {
    kpi,
    sources: computeSourceSlices(filtered),
    channels: computeChannelSlices(filtered),
    categories: computeCategoryBars(filtered),
    districts: computeDistrictStats(filtered),
    statuses: computeStatusStats(filtered),
    insights: generateInsights(filtered, kpi),
    totalCount: all.length,
    rangeTotalCount: rangeRecords.length,
    filteredCount: filtered.length,
    highPriorityCount: filtered.filter((record) => record.priorityLevel === 'high').length,
    updatedAt: clock.now.toISOString()
  };
}

export async function getTrend(
  filters: NewsTipFilters,
  granularity: Granularity
): Promise<TrendPoint[]> {
  const clock = createMockClock();
  const { filtered } = buildRangeAndFilteredRecords(filters, clock);
  return aggregateTrend(filtered, granularity);
}

export async function getRecords(filters: NewsTipFilters): Promise<NewsTipListResponse> {
  const clock = createMockClock();
  const { all, rangeRecords, filtered } = buildRangeAndFilteredRecords(filters, clock);

  return {
    items: filtered,
    totalItems: filtered.length,
    rangeTotalItems: rangeRecords.length,
    allItems: all.length
  };
}
