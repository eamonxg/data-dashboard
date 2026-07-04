'use client';

import { useSuspenseQuery } from '@tanstack/react-query';
import { Area, AreaChart } from 'recharts';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent
} from '@/components/ui/chart';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';
import { dashboardQueryOptions } from '@/features/baoliao/api/queries';
import { useBaoliaoParams } from '@/features/baoliao/hooks/use-baoliao-params';

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------

function formatResponseMinutes(minutes: number) {
  if (minutes < 60) return `${Math.round(minutes)}分钟`;
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return mins > 0 ? `${hours}小时${mins}分` : `${hours}小时`;
}

function formatDelta(delta: number) {
  const sign = delta > 0 ? '+' : '';
  return `${sign}${delta.toFixed(1)}%`;
}

/**
 * Determines the visual sentiment (good/bad/neutral) of a delta.
 * For most metrics a rise is good; for average response time a
 * *drop* is good (faster response), so the semantics are inverted.
 */
function deltaSentiment(delta: number, invert: boolean): 'up' | 'down' | 'flat' {
  if (delta === 0) return 'flat';
  const isRise = delta > 0;
  const isGood = invert ? !isRise : isRise;
  return isGood ? 'up' : 'down';
}

function DeltaBadge({
  delta,
  invert = false,
  compareLabel
}: {
  delta: number;
  invert?: boolean;
  compareLabel: string;
}) {
  const sentiment = deltaSentiment(delta, invert);
  const Icon =
    sentiment === 'flat' ? Icons.minus : sentiment === 'up' ? Icons.trendingUp : Icons.trendingDown;

  return (
    <div
      className={cn(
        'flex items-center gap-1 text-xs font-medium tabular-nums',
        sentiment === 'up' && 'text-green-600 dark:text-green-500',
        sentiment === 'down' && 'text-red-600 dark:text-red-500',
        sentiment === 'flat' && 'text-muted-foreground'
      )}
    >
      <Icon className='size-3.5' />
      <span>
        {compareLabel} {formatDelta(delta)}
      </span>
    </div>
  );
}

const sparklineConfig = {
  value: {
    label: '数值',
    color: 'var(--primary)'
  }
} satisfies ChartConfig;

function Sparkline({
  data,
  valueFormatter,
  gradientId
}: {
  data: number[];
  valueFormatter: (v: number) => string;
  gradientId: string;
}) {
  const chartData = data.map((value, index) => ({ index, value }));

  return (
    <ChartContainer config={sparklineConfig} className='aspect-auto h-10 w-full'>
      <AreaChart data={chartData} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1='0' y1='0' x2='0' y2='1'>
            <stop offset='5%' stopColor='var(--primary)' stopOpacity={0.4} />
            <stop offset='95%' stopColor='var(--primary)' stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              hideLabel
              indicator='dot'
              formatter={(value) => valueFormatter(value as number)}
            />
          }
        />
        <Area
          dataKey='value'
          type='monotone'
          fill={`url(#${gradientId})`}
          stroke='var(--primary)'
          strokeWidth={1.5}
          isAnimationActive={false}
        />
      </AreaChart>
    </ChartContainer>
  );
}

function KpiCard({
  title,
  value,
  delta,
  invert,
  compareLabel,
  sparklineData,
  sparklineFormatter,
  gradientId,
  delayMs
}: {
  title: string;
  value: string;
  delta: number;
  invert?: boolean;
  compareLabel: string;
  sparklineData: number[];
  sparklineFormatter: (v: number) => string;
  gradientId: string;
  delayMs: number;
}) {
  return (
    <Card
      className='animate-in fade-in slide-in-from-bottom-2 fill-mode-backwards duration-500'
      style={{ animationDelay: `${delayMs}ms` }}
    >
      <CardHeader className='pb-2'>
        <CardTitle className='text-muted-foreground text-sm font-medium'>{title}</CardTitle>
      </CardHeader>
      <CardContent className='space-y-2'>
        <div className='flex items-baseline justify-between gap-2'>
          <span className='text-2xl font-semibold tabular-nums'>{value}</span>
          <DeltaBadge delta={delta} invert={invert} compareLabel={compareLabel} />
        </div>
        <Sparkline
          data={sparklineData}
          valueFormatter={sparklineFormatter}
          gradientId={gradientId}
        />
      </CardContent>
    </Card>
  );
}

export function KpiCards() {
  const { range } = useBaoliaoParams();
  const { data } = useSuspenseQuery(dashboardQueryOptions(range));
  const { kpi } = data;

  return (
    <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
      <KpiCard
        title='今日新增线索'
        value={`${kpi.todayCount}`}
        delta={kpi.todayDelta}
        compareLabel='较昨日'
        sparklineData={kpi.sparklines.daily}
        sparklineFormatter={(v) => `${v} 条`}
        gradientId='kpi-daily-gradient'
        delayMs={0}
      />
      <KpiCard
        title='本周线索总量'
        value={`${kpi.weekCount}`}
        delta={kpi.weekDelta}
        compareLabel='较上周'
        sparklineData={kpi.sparklines.weekly}
        sparklineFormatter={(v) => `${v} 条`}
        gradientId='kpi-weekly-gradient'
        delayMs={75}
      />
      <KpiCard
        title='平均响应时长'
        value={formatResponseMinutes(kpi.avgResponseMinutes)}
        delta={kpi.avgResponseDelta}
        invert
        compareLabel='较前30日'
        sparklineData={kpi.sparklines.response}
        sparklineFormatter={(v) => formatResponseMinutes(v)}
        gradientId='kpi-response-gradient'
        delayMs={150}
      />
      <KpiCard
        title='线索采用率'
        value={`${kpi.adoptionRate.toFixed(1)}%`}
        delta={kpi.adoptionDelta}
        compareLabel='较前30日'
        sparklineData={kpi.sparklines.adoption}
        sparklineFormatter={(v) => `${v.toFixed(1)}%`}
        gradientId='kpi-adoption-gradient'
        delayMs={225}
      />
    </div>
  );
}
