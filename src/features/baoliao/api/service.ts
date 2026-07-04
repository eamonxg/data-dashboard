// ============================================================
// Baoliao (报料线索) Service — Data Access Layer
// ============================================================
// Mock data source for the 8-hour cockpit challenge. Replace the
// generator/aggregation bodies below with real API/ORM calls when
// wiring up a backend; queries.ts and components never change.
// ============================================================

import type {
  BaoliaoCategory,
  BaoliaoChannel,
  BaoliaoFilters,
  BaoliaoRecord,
  BaoliaoStatus,
  CategoryBar,
  ChannelSlice,
  DashboardData,
  Granularity,
  KpiData,
  TimeRange,
  TimelineEntry,
  TrendPoint
} from './types';

// ------------------------------------------------------------
// Seeded PRNG (mulberry32) — stable within a session
// ------------------------------------------------------------
const SEED = 20260704;

function mulberry32(seed: number) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ------------------------------------------------------------
// Reference pools
// ------------------------------------------------------------
const DISTRICTS = [
  '天河区',
  '越秀区',
  '海珠区',
  '荔湾区',
  '白云区',
  '黄埔区',
  '番禺区',
  '南沙区',
  '花都区',
  '增城区'
];

const CHANNELS: BaoliaoChannel[] = [
  '新闻客户端APP',
  '微信公众号',
  '新闻热线电话',
  '微博',
  '短视频平台',
  '现场投递'
];

const ASSIGNEES = [
  '陈晓敏',
  '林嘉豪',
  '黄志强',
  '李文静',
  '张伟明',
  '王雨桐',
  '刘家乐',
  '吴思远',
  '赵梓涵',
  '周敏仪'
];

const REPORTER_SURNAMES = ['陈', '李', '黄', '张', '林', '王', '刘', '吴', '赵', '周', '梁', '何'];
const REPORTER_SUFFIXES = ['先生', '女士', '**', '师傅', '阿姨'];

interface CategoryTemplate {
  title: string; // may contain {district}
  description: string;
}

const CATEGORY_TEMPLATES: Record<BaoliaoCategory, CategoryTemplate[]> = {
  突发事件: [
    {
      title: '{district}某路口今晨发生三车追尾事故',
      description: '现场车辆受损严重，交警已到场处理，暂无人员伤亡报告。'
    },
    {
      title: '{district}一小区凌晨突发火情，消防紧急出动',
      description: '起火原因初步怀疑为电动车违规充电，现场浓烟一度封锁楼道。'
    },
    {
      title: '{district}某工地脚手架突然坍塌',
      description: '事发时工地正在施工，具体伤亡情况有待核实。'
    },
    {
      title: '{district}一居民楼疑似燃气泄漏，多户紧急疏散',
      description: '消防和燃气公司已赶赴现场排查，附近路段临时管制。'
    },
    {
      title: '{district}暴雨致多处内涝，部分路段车辆被困',
      description: '市政排水部门已启动应急预案，提醒市民绕行。'
    },
    {
      title: '{district}一仓库凌晨起火，浓烟数公里外可见',
      description: '起火仓库存放大量货物，具体损失尚在统计。'
    },
    {
      title: '{district}高空坠物砸中路过车辆',
      description: '事发路段已拉起警戒线，物业方面回应正在调查。'
    },
    {
      title: '{district}一化工厂疑似发生异味泄漏',
      description: '环保部门已派员到场监测空气质量，附近居民反映刺鼻气味。'
    },
    {
      title: '{district}一在建桥梁工地发生局部坍塌',
      description: '现场施工人员紧急撤离，具体原因仍在排查中。'
    }
  ],
  民生投诉: [
    {
      title: '{district}某小区电梯停运一周无人维修',
      description: '多位业主反映物业推诿，老人上下楼困难。'
    },
    {
      title: '{district}一菜市场污水横流，环境脏乱多月无改善',
      description: '商户与居民多次投诉未见整改。'
    },
    {
      title: '{district}小区楼道堆积杂物存在消防隐患',
      description: '居民担心一旦发生火情后果不堪设想。'
    },
    {
      title: '{district}某小区物业费上涨引发业主不满',
      description: '业主质疑收费标准不透明，要求公开账目。'
    },
    {
      title: '{district}居民楼外墙瓷砖脱落砸伤路人',
      description: '居民反映外墙年久失修，担心再次发生脱落。'
    },
    {
      title: '{district}小区停车位一位难求，业主车辆常被剐蹭',
      description: '多位车主要求物业增设停车位。'
    },
    {
      title: '{district}某老旧小区无电梯，老人爬楼苦不堪言',
      description: '居民呼吁尽快启动加装电梯计划。'
    },
    { title: '{district}小区噪音扰民问题持续无解', description: '居民反映深夜施工噪音影响休息。' },
    {
      title: '{district}一小区供水异常，居民用水浑浊发黄',
      description: '自来水公司回应正在排查管网问题。'
    },
    {
      title: '{district}小区宠物随地便溺无人管理',
      description: '居民呼吁加强物业管理和文明养宠宣传。'
    }
  ],
  交通出行: [
    { title: '{district}早高峰某主干道严重拥堵', description: '交警部门称正协调优化信号灯配时。' },
    {
      title: '{district}公交站台缺失遮阳棚，市民雨天候车受苦',
      description: '市民建议相关部门尽快增设候车设施。'
    },
    {
      title: '{district}某路口斑马线信号灯损坏多日未修',
      description: '行人过街存在安全隐患，市民呼吁尽快维修。'
    },
    {
      title: '{district}地铁站出入口施工围挡长期占道',
      description: '周边居民出行绕行不便，希望尽快完工。'
    },
    {
      title: '{district}共享单车乱停乱放堵塞人行道',
      description: '市民反映投诉多次仍未见明显改善。'
    },
    { title: '{district}道路坑洼不平车辆频繁托底', description: '市民呼吁市政部门尽快修复路面。' },
    { title: '{district}某桥梁限高杆频繁被撞损坏', description: '相关部门表示将增设警示标识。' },
    { title: '{district}网约车聚集占用应急车道', description: '周边居民反映高峰时段交通秩序混乱。' }
  ],
  文体娱乐: [
    {
      title: '{district}举办社区邻里文化节吸引众多市民参与',
      description: '活动现场设有传统手工艺展示和亲子游戏环节。'
    },
    {
      title: '{district}一公园广场舞噪音引发周边居民投诉',
      description: '居民与舞蹈团体因音量问题多次产生争执。'
    },
    {
      title: '{district}某体育馆将举办青少年篮球邀请赛',
      description: '赛事组委会呼吁市民前往观赛助威。'
    },
    {
      title: '{district}老旧影院翻新重开引市民怀旧打卡',
      description: '不少街坊表示儿时记忆又回来了。'
    },
    { title: '{district}社区图书馆举办读书分享会', description: '活动吸引众多亲子家庭到场参与。' },
    {
      title: '{district}一街头艺人表演引围观获市民点赞',
      description: '不少市民表示为城市增添了艺术气息。'
    },
    {
      title: '{district}某公园夜间灯光音乐节人气火爆',
      description: '现场人流量较大，安保部门加强了秩序维护。'
    },
    {
      title: '{district}非遗文化展演走进社区',
      description: '老手艺人现场展示传统技艺，吸引不少年轻人围观。'
    }
  ],
  环境城建: [
    {
      title: '{district}一河涌黑臭多年治理效果不佳',
      description: '居民反映夏季异味明显，呼吁加快整治进度。'
    },
    { title: '{district}某地块违规堆放建筑垃圾', description: '附近居民担心扬尘污染影响健康。' },
    {
      title: '{district}行道树长期未修剪遮挡路灯',
      description: '夜间道路照明不足，市民出行存在安全隐患。'
    },
    {
      title: '{district}老旧小区加装电梯工程进展缓慢',
      description: '居民多次询问施工进度，希望尽快完工。'
    },
    { title: '{district}某工地夜间施工噪音扰民', description: '附近居民反映投诉多次仍未见改善。' },
    { title: '{district}公共绿地被违规占用种菜', description: '城管部门表示将开展专项整治行动。' },
    {
      title: '{district}道路扬尘污染严重，居民要求洒水降尘',
      description: '市政部门回应将加派洒水车作业。'
    },
    {
      title: '{district}老旧管网破损导致路面反复开挖',
      description: '居民反映道路施工频繁影响出行。'
    },
    {
      title: '{district}垃圾分类投放点设置不合理',
      description: '居民反映投放点距离过远，使用不便。'
    }
  ],
  其他: [
    {
      title: '{district}市民偶遇走失老人热心相助',
      description: '经多方联系已帮助老人与家属团聚。'
    },
    {
      title: '{district}一宠物走失求助引发街坊接力寻找',
      description: '失主发帖后短时间内获得大量转发。'
    },
    { title: '{district}市民捡到钱包主动归还失主', description: '失主对拾金不昧行为表示感谢。' },
    {
      title: '{district}某单位组织志愿服务活动获点赞',
      description: '参与市民表示希望这样的活动能常态化。'
    },
    { title: '{district}网友爆料某商家涉嫌虚假宣传', description: '市场监管部门表示将介入核实。' },
    {
      title: '{district}一街坊偶然发现流浪动物聚集点',
      description: '呼吁相关部门和爱心人士关注救助。'
    },
    { title: '{district}市民反映快递柜收费不合理', description: '多位居民对新收费标准表示不解。' },
    {
      title: '{district}社区义诊活动获居民好评',
      description: '现场医护人员为居民提供免费体检服务。'
    }
  ]
};

const CATEGORIES = Object.keys(CATEGORY_TEMPLATES) as BaoliaoCategory[];

// ------------------------------------------------------------
// Time helpers
// ------------------------------------------------------------
const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDay(d: Date): Date {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}

function startOfISOWeek(d: Date): Date {
  const r = startOfDay(d);
  const day = r.getDay(); // 0 (Sun) - 6 (Sat)
  const diff = day === 0 ? -6 : 1 - day; // move to Monday
  r.setDate(r.getDate() + diff);
  return r;
}

function startOfMonth(d: Date): Date {
  const r = startOfDay(d);
  r.setDate(1);
  return r;
}

function isoWeekNumber(d: Date): number {
  const target = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNr = (target.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - dayNr + 3);
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  const firstDayNr = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDayNr + 3);
  return 1 + Math.round((target.getTime() - firstThursday.getTime()) / (7 * DAY_MS));
}

// Hour weights favouring daytime (8-11, 14-19) over the small hours
const HOUR_WEIGHTS = [1, 1, 1, 1, 1, 2, 3, 5, 8, 9, 9, 8, 6, 6, 8, 9, 9, 9, 8, 7, 5, 4, 3, 2];

function weightedPick<T>(rng: () => number, items: T[], weights: number[]): T {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rng() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

function pick<T>(rng: () => number, items: T[]): T {
  return items[Math.floor(rng() * items.length)];
}

function statusForDay(rng: () => number, isToday: boolean): BaoliaoStatus {
  const r = rng();
  if (isToday) {
    // more clues still awaiting review on the day they came in
    if (r < 0.5) return '待审核';
    if (r < 0.7) return '跟进中';
    if (r < 0.9) return '已采用';
    return '不予采用';
  }
  if (r < 0.45) return '已采用';
  if (r < 0.65) return '跟进中';
  if (r < 0.85) return '待审核';
  return '不予采用';
}

function responseMinutesFor(rng: () => number, status: BaoliaoStatus): number | null {
  if (status === '待审核') return null;
  // skewed toward the low end, long tail up to 480
  const skewed = rng() * rng();
  return Math.round(15 + skewed * 465);
}

function buildTimeline(
  rng: () => number,
  status: BaoliaoStatus,
  createdAt: Date,
  assignee: string
): TimelineEntry[] {
  const entries: TimelineEntry[] = [
    { time: createdAt.toISOString(), action: '线索提交', operator: '市民报料' }
  ];
  const addMinutes = (base: Date, minMinutes: number, maxMinutes: number) => {
    const mins = minMinutes + rng() * (maxMinutes - minMinutes);
    return new Date(base.getTime() + mins * 60 * 1000);
  };

  if (status === '待审核') {
    return entries;
  }

  const reviewedAt = addMinutes(createdAt, 5, 60);
  if (status === '不予采用') {
    entries.push({ time: reviewedAt.toISOString(), action: '编辑审核不通过', operator: assignee });
    return entries;
  }

  entries.push({ time: reviewedAt.toISOString(), action: '编辑审核通过', operator: assignee });

  if (status === '跟进中') {
    const followUpAt = addMinutes(reviewedAt, 10, 180);
    entries.push({ time: followUpAt.toISOString(), action: '记者跟进', operator: assignee });
    return entries;
  }

  // 已采用
  const followUpAt = addMinutes(reviewedAt, 10, 180);
  entries.push({ time: followUpAt.toISOString(), action: '记者跟进', operator: assignee });
  const publishedAt = addMinutes(followUpAt, 30, 240);
  entries.push({ time: publishedAt.toISOString(), action: '成稿播出', operator: assignee });
  return entries;
}

// ------------------------------------------------------------
// Generator — module-level cached singleton
// ------------------------------------------------------------
const TOTAL_DAYS = 180;

let cachedRecords: BaoliaoRecord[] | null = null;

function generateRecords(): BaoliaoRecord[] {
  if (cachedRecords) return cachedRecords;

  const rng = mulberry32(SEED);
  const now = new Date();
  const todayStart = startOfDay(now);
  const records: BaoliaoRecord[] = [];

  for (let offset = TOTAL_DAYS - 1; offset >= 0; offset--) {
    const dayStart = new Date(todayStart.getTime() - offset * DAY_MS);
    const isToday = offset === 0;
    const weekday = dayStart.getDay();
    const isWeekday = weekday !== 0 && weekday !== 6;
    const weight = isWeekday ? 1.4 : 0.8;

    let dailyCount: number;
    if (isToday) {
      dailyCount = 12 + Math.floor(rng() * 7); // guaranteed >= 12
    } else {
      dailyCount = Math.max(1, Math.round((1.5 + rng() * 2) * weight));
    }

    const dateKey = `${dayStart.getFullYear()}${String(dayStart.getMonth() + 1).padStart(2, '0')}${String(
      dayStart.getDate()
    ).padStart(2, '0')}`;

    for (let seq = 1; seq <= dailyCount; seq++) {
      const hour = weightedPick(
        rng,
        Array.from({ length: 24 }, (_, h) => h),
        HOUR_WEIGHTS
      );
      const minute = Math.floor(rng() * 60);
      const second = Math.floor(rng() * 60);
      const createdAt = new Date(dayStart);
      createdAt.setHours(hour, minute, second, 0);
      // clamp records that would fall in the future (today only)
      if (createdAt.getTime() > now.getTime()) {
        createdAt.setTime(now.getTime() - Math.floor(rng() * 60) * 60 * 1000);
      }

      const category = pick(rng, CATEGORIES);
      const template = pick(rng, CATEGORY_TEMPLATES[category]);
      const district = pick(rng, DISTRICTS);
      const channel = pick(rng, CHANNELS);
      const assignee = pick(rng, ASSIGNEES);
      const reporter = `${pick(rng, REPORTER_SURNAMES)}${pick(rng, REPORTER_SUFFIXES)}`;
      const status = statusForDay(rng, isToday);
      const responseMinutes = responseMinutesFor(rng, status);
      const timeline = buildTimeline(rng, status, createdAt, assignee);

      records.push({
        id: `BL-${dateKey}-${String(seq).padStart(3, '0')}`,
        title: template.title.replace('{district}', district),
        description: template.description,
        category,
        channel,
        status,
        district,
        reporter,
        assignee,
        createdAt: createdAt.toISOString(),
        responseMinutes,
        timeline
      });
    }
  }

  records.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  cachedRecords = records;
  return records;
}

// ------------------------------------------------------------
// Range windowing
// ------------------------------------------------------------
function rangeStart(range: TimeRange, now: Date): Date | null {
  switch (range) {
    case 'today':
      return startOfDay(now);
    case 'week':
      return startOfISOWeek(now);
    case 'month':
      return startOfMonth(now);
    case 'all':
      return null;
  }
}

function filterByRange(records: BaoliaoRecord[], range: TimeRange, now: Date): BaoliaoRecord[] {
  const start = rangeStart(range, now);
  if (!start) return records;
  const startMs = start.getTime();
  return records.filter((r) => new Date(r.createdAt).getTime() >= startMs);
}

function adoptionRateOf(records: BaoliaoRecord[]): number {
  const adopted = records.filter((r) => r.status === '已采用').length;
  const rejected = records.filter((r) => r.status === '不予采用').length;
  const denom = adopted + rejected;
  return denom === 0 ? 0 : Math.round((adopted / denom) * 1000) / 10;
}

function avgResponseOf(records: BaoliaoRecord[]): number {
  const withResponse = records.filter((r) => r.responseMinutes !== null) as (BaoliaoRecord & {
    responseMinutes: number;
  })[];
  if (withResponse.length === 0) return 0;
  const sum = withResponse.reduce((acc, r) => acc + r.responseMinutes, 0);
  return Math.round(sum / withResponse.length);
}

function pctDelta(current: number, previous: number): number {
  if (previous === 0) return current === 0 ? 0 : 100;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

// ------------------------------------------------------------
// KPI (fixed definition — independent of the `range` filter)
// ------------------------------------------------------------
function computeKpi(all: BaoliaoRecord[], now: Date): KpiData {
  const todayStart = startOfDay(now).getTime();
  const yesterdayStart = todayStart - DAY_MS;
  const todayRecords = all.filter((r) => new Date(r.createdAt).getTime() >= todayStart);
  const yesterdayRecords = all.filter((r) => {
    const t = new Date(r.createdAt).getTime();
    return t >= yesterdayStart && t < todayStart;
  });

  const thisWeekStart = startOfISOWeek(now).getTime();
  const daysElapsedThisWeek = Math.floor((todayStart - thisWeekStart) / DAY_MS) + 1;
  const lastWeekStart = thisWeekStart - 7 * DAY_MS;
  const lastWeekSamePeriodEnd = lastWeekStart + daysElapsedThisWeek * DAY_MS;

  const weekRecords = all.filter((r) => new Date(r.createdAt).getTime() >= thisWeekStart);
  const lastWeekSamePeriodRecords = all.filter((r) => {
    const t = new Date(r.createdAt).getTime();
    return t >= lastWeekStart && t < lastWeekSamePeriodEnd;
  });

  // trailing 30-day window for response time / adoption rate "recent performance"
  const trailing30Start = todayStart - 30 * DAY_MS;
  const prior30Start = todayStart - 60 * DAY_MS;
  const trailing30 = all.filter((r) => new Date(r.createdAt).getTime() >= trailing30Start);
  const prior30 = all.filter((r) => {
    const t = new Date(r.createdAt).getTime();
    return t >= prior30Start && t < trailing30Start;
  });

  const avgResponseMinutes = avgResponseOf(trailing30);
  const avgResponseDelta = pctDelta(avgResponseMinutes, avgResponseOf(prior30));
  const adoptionRate = adoptionRateOf(trailing30);
  const adoptionDelta = pctDelta(adoptionRate, adoptionRateOf(prior30));

  // sparklines
  const daily: number[] = [];
  const response: number[] = [];
  const adoption: number[] = [];
  for (let i = 13; i >= 0; i--) {
    const dayS = todayStart - i * DAY_MS;
    const dayE = dayS + DAY_MS;
    const dayRecords = all.filter((r) => {
      const t = new Date(r.createdAt).getTime();
      return t >= dayS && t < dayE;
    });
    daily.push(dayRecords.length);
    response.push(avgResponseOf(dayRecords));
    adoption.push(adoptionRateOf(dayRecords));
  }

  const weekly: number[] = [];
  for (let i = 7; i >= 0; i--) {
    const wS = thisWeekStart - i * 7 * DAY_MS;
    const wE = wS + 7 * DAY_MS;
    const wRecords = all.filter((r) => {
      const t = new Date(r.createdAt).getTime();
      return t >= wS && t < wE;
    });
    weekly.push(wRecords.length);
  }

  return {
    todayCount: todayRecords.length,
    todayDelta: pctDelta(todayRecords.length, yesterdayRecords.length),
    weekCount: weekRecords.length,
    weekDelta: pctDelta(weekRecords.length, lastWeekSamePeriodRecords.length),
    avgResponseMinutes,
    avgResponseDelta,
    adoptionRate,
    adoptionDelta,
    sparklines: { daily, weekly, response, adoption }
  };
}

// ------------------------------------------------------------
// Public service functions
// ------------------------------------------------------------
export async function getDashboardData(range: TimeRange): Promise<DashboardData> {
  const all = generateRecords();
  const now = new Date();
  const kpi = computeKpi(all, now);

  const windowed = filterByRange(all, range, now);

  const channelCounts = new Map<BaoliaoChannel, number>();
  for (const ch of CHANNELS) channelCounts.set(ch, 0);
  for (const r of windowed) channelCounts.set(r.channel, (channelCounts.get(r.channel) ?? 0) + 1);
  const channels: ChannelSlice[] = CHANNELS.map((channel) => ({
    channel,
    count: channelCounts.get(channel) ?? 0
  }));

  const categories: CategoryBar[] = CATEGORIES.map((category) => {
    const inCategory = windowed.filter((r) => r.category === category);
    return {
      category,
      count: inCategory.length,
      adopted: inCategory.filter((r) => r.status === '已采用').length
    };
  });

  return { kpi, channels, categories };
}

export async function getTrend(granularity: Granularity, range: TimeRange): Promise<TrendPoint[]> {
  const all = generateRecords();
  const now = new Date();
  const windowed = filterByRange(all, range, now);

  const buckets = new Map<string, { label: string; records: BaoliaoRecord[]; order: number }>();

  for (const r of windowed) {
    const d = new Date(r.createdAt);
    let key: string;
    let label: string;
    let order: number;

    if (granularity === 'day') {
      key = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
      label = `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      order = startOfDay(d).getTime();
    } else if (granularity === 'week') {
      const weekStart = startOfISOWeek(d);
      key = `${d.getFullYear()}-W${isoWeekNumber(d)}`;
      label = `第${isoWeekNumber(d)}周`;
      order = weekStart.getTime();
    } else {
      key = `${d.getFullYear()}-${d.getMonth() + 1}`;
      label = `${d.getMonth() + 1}月`;
      order = startOfMonth(d).getTime();
    }

    if (!buckets.has(key)) buckets.set(key, { label, records: [], order });
    buckets.get(key)!.records.push(r);
  }

  return Array.from(buckets.values())
    .toSorted((a, b) => a.order - b.order)
    .map(({ label, records }) => ({
      label,
      count: records.length,
      adoptionRate: adoptionRateOf(records)
    }));
}

export async function getRecords(filters: BaoliaoFilters): Promise<BaoliaoRecord[]> {
  const all = generateRecords();
  const now = new Date();
  let result = filterByRange(all, filters.range, now);

  if (filters.status?.length) {
    const statusSet = new Set(filters.status);
    result = result.filter((r) => statusSet.has(r.status));
  }
  if (filters.category?.length) {
    const categorySet = new Set(filters.category);
    result = result.filter((r) => categorySet.has(r.category));
  }
  if (filters.channel?.length) {
    const channelSet = new Set(filters.channel);
    result = result.filter((r) => channelSet.has(r.channel));
  }

  // already generated sorted desc by createdAt; filtering preserves order
  return result;
}
