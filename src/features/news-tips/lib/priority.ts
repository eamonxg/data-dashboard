import { PRIORITY_LABELS } from '../constants/options';
import type { NewsTipRecord, NewsTipRecordWithPriority, PriorityLevel } from '../api/types';

const EMERGENCY_RISK_TAGS = new Set(['公共安全', '消防风险', '交通事故', '暴雨积水', '食品安全']);

export function minutesSince(iso: string, now: Date): number {
  return Math.max(0, Math.round((now.getTime() - new Date(iso).getTime()) / (60 * 1000)));
}

export function derivePriority(record: NewsTipRecord, now: Date): NewsTipRecordWithPriority {
  const ageMinutes = minutesSince(record.createdAt, now);
  const hasEmergencyRisk = record.riskTags.some((tag) => EMERGENCY_RISK_TAGS.has(tag));
  let priorityLevel: PriorityLevel = 'low';
  let priorityReason = '未命中超时、突发或高触达渠道规则';

  if (
    (record.category === '突发事件' || hasEmergencyRisk) &&
    record.status !== '已采用' &&
    record.status !== '不予采用'
  ) {
    priorityLevel = 'high';
    priorityReason = '突发或公共安全线索尚未完成处置，需要优先核实';
  } else if (record.status === '待审核' && ageMinutes > 60) {
    priorityLevel = 'high';
    priorityReason = `待审核 ${ageMinutes} 分钟，超过 60 分钟分诊线`;
  } else if (record.responseMinutes !== null && record.responseMinutes > 240) {
    priorityLevel = 'high';
    priorityReason = `响应时长 ${record.responseMinutes} 分钟，超过 240 分钟预警线`;
  } else if (record.status === '跟进中' && ageMinutes > 180) {
    priorityLevel = 'medium';
    priorityReason = `跟进中 ${ageMinutes} 分钟，建议持续关注进展`;
  } else if (
    record.category === '民生投诉' &&
    ['新闻热线电话', '微信公众号', '报料小程序'].includes(record.channel)
  ) {
    priorityLevel = 'medium';
    priorityReason = '民生投诉来自高触达渠道，建议排入例行跟进';
  }

  return {
    ...record,
    priorityLevel,
    priorityLabel: PRIORITY_LABELS[priorityLevel],
    priorityReason,
    priorityScore: priorityLevel === 'high' ? 3 : priorityLevel === 'medium' ? 2 : 1,
    ageMinutes
  };
}
