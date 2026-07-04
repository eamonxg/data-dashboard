'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { KpiCards } from '@/features/baoliao/components/kpi-cards';

function PlaceholderCard({
  title,
  className,
  height = 'h-40'
}: {
  title: string;
  className?: string;
  height?: string;
}) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className='text-sm font-medium'>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className={`bg-muted w-full rounded-md ${height}`} />
      </CardContent>
    </Card>
  );
}

export function Cockpit() {
  return (
    <div className='grid gap-4'>
      {/* KPI 行 */}
      <KpiCards />

      {/* 概览行：渠道分布(环形) + 分类采用情况(条形) */}
      <div className='grid gap-4 xl:grid-cols-5'>
        <PlaceholderCard title='渠道分布' className='xl:col-span-2' />
        <PlaceholderCard title='分类采用情况' className='xl:col-span-3' />
      </div>

      {/* 趋势整行 */}
      <PlaceholderCard title='线索量与采用率趋势' height='h-72' />

      {/* 表格整行 */}
      <PlaceholderCard title='线索明细' height='h-96' />
    </div>
  );
}
