'use client';

import { cn } from '@/lib/utils';
import type { DistrictStat, ShenzhenDistrict } from '../api/types';

interface DistrictRankingListProps {
  data: DistrictStat[];
  activeDistricts: ShenzhenDistrict[];
  onSelect: (district: ShenzhenDistrict) => void;
}

export function DistrictRankingList({ data, activeDistricts, onSelect }: DistrictRankingListProps) {
  const sorted = data.toSorted((a, b) => b.count - a.count);
  const maxCount = Math.max(...sorted.map((item) => item.count), 1);

  if (sorted.length === 0) {
    return (
      <div className='bg-muted/40 text-muted-foreground flex h-24 items-center justify-center rounded-lg text-sm'>
        当前筛选暂无区划数据
      </div>
    );
  }

  return (
    <div className='grid gap-1'>
      {sorted.map((item) => {
        const active = activeDistricts.includes(item.district);
        const width = (item.count / maxCount) * 100;

        return (
          <button
            key={item.district}
            type='button'
            onClick={() => onSelect(item.district)}
            className={cn(
              'hover:bg-muted/70 grid grid-cols-[3.5rem_1fr_3rem] items-center gap-3 rounded-md px-2 py-2 text-left transition-colors',
              active && 'bg-primary/10 text-primary'
            )}
            aria-label={`筛选区域 ${item.district}，线索数 ${item.count}`}
          >
            <span className='truncate text-sm font-medium'>{item.district}</span>
            <span className='bg-muted h-2 overflow-hidden rounded-full'>
              <span
                className='bg-primary block h-full rounded-full'
                style={{ width: `${width}%` }}
              />
            </span>
            <span className='text-muted-foreground text-right text-xs tabular-nums'>
              {item.count} 条
            </span>
          </button>
        );
      })}
    </div>
  );
}
