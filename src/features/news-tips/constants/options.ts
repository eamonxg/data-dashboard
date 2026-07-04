import type {
  Granularity,
  NewsTipCategory,
  NewsTipChannel,
  NewsTipSourcePlatform,
  NewsTipStatus,
  PriorityLevel,
  ShenzhenDistrict,
  TimeRange
} from '../api/types';

export const NEWS_TIP_CATEGORIES: NewsTipCategory[] = [
  '突发事件',
  '民生投诉',
  '交通出行',
  '文体活动',
  '环境城建',
  '消费维权',
  '其他'
];

export const NEWS_TIP_SOURCE_PLATFORMS: NewsTipSourcePlatform[] = [
  '深圳新闻网',
  '问政深圳',
  '读特客户端',
  '深圳特区报',
  '读创',
  '晶报APP',
  '壹深圳',
  '南方+深圳'
];

export const NEWS_TIP_CHANNELS: NewsTipChannel[] = [
  '报料小程序',
  '新闻热线电话',
  '微信公众号',
  '客户端爆料',
  '微博',
  '短视频平台',
  '现场投递'
];

export const NEWS_TIP_STATUSES: NewsTipStatus[] = ['待审核', '跟进中', '已采用', '不予采用'];

export const NEWS_TIP_DISTRICTS: ShenzhenDistrict[] = [
  '福田区',
  '罗湖区',
  '盐田区',
  '南山区',
  '宝安区',
  '龙岗区',
  '龙华区',
  '坪山区',
  '光明区',
  '大鹏新区',
  '深汕特别合作区'
];

export const HEAT_GRID_DISTRICTS: ShenzhenDistrict[] = [
  '福田区',
  '罗湖区',
  '盐田区',
  '南山区',
  '宝安区',
  '龙岗区',
  '龙华区',
  '坪山区',
  '光明区',
  '大鹏新区'
];

export const SHENZHEN_STREETS: Record<ShenzhenDistrict, string[]> = {
  福田区: ['福田', '华强北', '香蜜湖', '梅林', '莲花', '福保'],
  罗湖区: ['东门', '黄贝', '翠竹', '笋岗', '莲塘', '清水河'],
  盐田区: ['沙头角', '海山', '盐田', '梅沙'],
  南山区: ['南山', '粤海', '蛇口', '招商', '西丽', '桃源'],
  宝安区: ['新安', '西乡', '福永', '沙井', '松岗', '石岩'],
  龙岗区: ['布吉', '坂田', '龙城', '横岗', '平湖', '南湾'],
  龙华区: ['民治', '龙华', '大浪', '观澜', '观湖', '福城'],
  坪山区: ['坪山', '坑梓', '马峦', '碧岭', '石井', '龙田'],
  光明区: ['公明', '光明', '新湖', '凤凰', '玉塘', '马田'],
  大鹏新区: ['葵涌', '大鹏', '南澳'],
  深汕特别合作区: ['小漠', '鹅埠', '鲘门', '赤石']
};

export const SHENZHEN_LOCATIONS: Record<ShenzhenDistrict, string[]> = {
  福田区: ['市民中心', '莲花山公园', '华强北步行街', '福田口岸', '会展中心', '梅林一村'],
  罗湖区: ['东门老街', '罗湖口岸', '万象城', '洪湖公园', '梧桐山南门', 'IBC水贝珠宝总部'],
  盐田区: ['壹海城', '中英街', '盐田港后方陆域', '大梅沙海滨公园', '海山公园', '沙头角口岸'],
  南山区: [
    '深圳湾科技生态园',
    '后海中心区',
    '蛇口海上世界',
    '南山文体中心',
    '西丽湖',
    '深圳湾口岸'
  ],
  宝安区: ['宝安中心区', '壹方城', '深圳机场T3航站楼', '海上田园', '沙井京基百纳', '石岩湖'],
  龙岗区: ['布吉东站', '龙岗中心城', '坂田天安云谷', '大运中心', '甘坑古镇', '平湖华南城'],
  龙华区: ['深圳北站', '壹方天地', '观澜湖新城', '龙华文化广场', '民治红山片区', '大浪时尚小镇'],
  坪山区: [
    '坪山高铁站',
    '坪山中心公园',
    '坪山创新广场',
    '燕子湖国际会展中心',
    '坑梓影剧院',
    '聚龙山公园'
  ],
  光明区: [
    '光明科学城',
    '虹桥公园',
    '公明广场',
    '光明大仟里',
    '凤凰城地铁站',
    '深圳技术大学光明校区'
  ],
  大鹏新区: ['较场尾', '大鹏所城', '桔钓沙', '杨梅坑', '南澳月亮湾', '葵涌文化广场'],
  深汕特别合作区: [
    '深汕湾科技城',
    '小漠国际物流港',
    '鹅埠片区',
    '鲘门高铁站',
    '赤石河湿地',
    '深汕高中园'
  ]
};

export const PRIORITY_LEVELS: PriorityLevel[] = ['high', 'medium', 'low'];

export const PRIORITY_LABELS: Record<PriorityLevel, string> = {
  high: '需优先处理',
  medium: '持续跟进',
  low: '常规'
};

export const TIME_RANGE_OPTIONS: { value: TimeRange; label: string }[] = [
  { value: 'today', label: '今天' },
  { value: 'week', label: '本周' },
  { value: 'month', label: '本月' },
  { value: 'custom', label: '自定义' }
];

export const GRANULARITY_OPTIONS: { value: Granularity; label: string }[] = [
  { value: 'day', label: '按日' },
  { value: 'week', label: '按周' },
  { value: 'month', label: '按月' }
];

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
