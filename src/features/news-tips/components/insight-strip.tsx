'use client';

import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';
import type { InsightItem } from '../api/types';

interface InsightStripProps {
  insights: InsightItem[];
  activeInsightId: string | null;
  onApply: (insight: InsightItem) => void;
}

const toneStyles: Record<InsightItem['tone'], string> = {
  critical: 'border-red-500/30 bg-red-500/10 text-red-950 dark:text-red-100',
  warning: 'border-amber-500/30 bg-amber-500/10 text-amber-950 dark:text-amber-100',
  neutral: 'border-primary/20 bg-primary/10 text-foreground',
  positive: 'border-green-500/30 bg-green-500/10 text-green-950 dark:text-green-100'
};

const toneIcon: Record<InsightItem['tone'], keyof typeof Icons> = {
  critical: 'warning',
  warning: 'info',
  neutral: 'sparkles',
  positive: 'trendingUp'
};

export function InsightStrip({ insights, activeInsightId, onApply }: InsightStripProps) {
  return (
    <section
      className='flex min-w-0 snap-x snap-mandatory gap-3 overflow-x-auto pb-1 md:grid md:grid-cols-3 md:overflow-visible md:pb-0'
      aria-label='运营态势摘要'
    >
      {insights.map((insight, index) => {
        const Icon = Icons[toneIcon[insight.tone]];
        const isActive = activeInsightId === insight.id;

        return (
          <button
            key={insight.id}
            type='button'
            className={cn(
              'group animate-in fade-in slide-in-from-bottom-2 flex min-h-32 shrink-0 snap-start text-left fill-mode-backwards duration-500',
              'w-[85%] rounded-lg border p-4 transition-all hover:-translate-y-0.5 hover:shadow-md md:w-auto',
              toneStyles[insight.tone],
              isActive && 'ring-primary/40 ring-2'
            )}
            style={{ animationDelay: `${index * 80}ms` }}
            onClick={() => onApply(insight)}
            aria-label={`${insight.title}，${insight.actionLabel}`}
          >
            <div className='flex w-full flex-col justify-between gap-4'>
              <div className='space-y-2'>
                <div className='flex items-center gap-2'>
                  <span className='bg-background/70 rounded-md p-1.5 shadow-xs'>
                    <Icon className='size-4' />
                  </span>
                  <span className='text-xs font-medium tracking-wide text-current/70'>
                    态势判断 {index + 1}
                  </span>
                </div>
                <div>
                  <h3 className='text-sm font-semibold'>{insight.title}</h3>
                  <p className='mt-1 text-sm leading-5 text-current/70'>{insight.description}</p>
                </div>
              </div>
              <div className='flex items-center gap-1 text-xs font-medium'>
                <span>{insight.actionLabel}</span>
                <Icons.arrowRight className='size-3 transition-transform group-hover:translate-x-0.5' />
              </div>
            </div>
          </button>
        );
      })}
    </section>
  );
}
