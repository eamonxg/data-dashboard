'use client';

import { useState } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import type { DistrictStat, ShenzhenDistrict } from '../api/types';
import { DistrictHeatMapView } from './district-heat-map';
import { DistrictRankingList } from './district-ranking-list';
import { NationalHeatMap } from './national-heat-map';

interface RegionHeatMapProps {
  data: DistrictStat[];
  activeDistricts: ShenzhenDistrict[];
  onSelect: (district: ShenzhenDistrict) => void;
}

type MapLevel = 'national' | 'district';

export function RegionHeatMap({ data, activeDistricts, onSelect }: RegionHeatMapProps) {
  const [level, setLevel] = useState<MapLevel>('national');
  const totalCount = data.reduce((sum, item) => sum + item.count, 0);

  return (
    <Card>
      <CardHeader className='flex flex-row items-center justify-between gap-2 pb-2'>
        <div className='md:hidden'>
          <CardTitle className='text-sm font-medium'>深圳区划热区</CardTitle>
        </div>
        <div className='hidden md:block'>
          <CardTitle className='text-sm font-medium'>
            {level === 'national' ? '全国报料热力分布图' : '深圳区划热力分布图'}
          </CardTitle>
          <p className='text-muted-foreground text-xs'>
            {level === 'national'
              ? '示意地图，点击广东下钻查看深圳区划明细'
              : '示意地图，颜色深浅表示线索密度'}
          </p>
        </div>
        {level === 'district' && (
          <Button
            variant='outline'
            size='sm'
            className='hidden md:inline-flex'
            onClick={() => setLevel('national')}
          >
            <Icons.chevronLeft className='size-4' />
            返回全国
          </Button>
        )}
      </CardHeader>
      <CardContent className='grid gap-4'>
        <div className='md:hidden'>
          <DistrictRankingList data={data} activeDistricts={activeDistricts} onSelect={onSelect} />
        </div>
        <div className='hidden md:block'>
          {level === 'national' ? (
            <NationalHeatMap totalCount={totalCount} onDrill={() => setLevel('district')} />
          ) : (
            <DistrictHeatMapView
              data={data}
              activeDistricts={activeDistricts}
              onSelect={onSelect}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
