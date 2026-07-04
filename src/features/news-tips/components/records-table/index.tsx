'use client';

import { Fragment, useEffect, useMemo, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';
import {
  NEWS_TIP_CATEGORIES,
  NEWS_TIP_CHANNELS,
  NEWS_TIP_DISTRICTS,
  NEWS_TIP_SOURCE_PLATFORMS,
  NEWS_TIP_STATUSES,
  PRIORITY_LABELS,
  PRIORITY_LEVELS
} from '../../constants/options';
import { exportNewsTipsCsv } from '../../utils/export-csv';
import type {
  NewsTipCategory,
  NewsTipChannel,
  NewsTipRecordWithPriority,
  NewsTipSourcePlatform,
  NewsTipStatus,
  PriorityLevel,
  ShenzhenDistrict
} from '../../api/types';
import type {
  NewsTipFilterKind,
  NewsTipFilterState,
  NewsTipFilterValue,
  NewsTipSortMode
} from '../../utils/analytics';

interface RecordsTableProps {
  records: NewsTipRecordWithPriority[];
  totalCount: number;
  filters: NewsTipFilterState;
  sortMode: NewsTipSortMode;
  onToggleFilter: (kind: NewsTipFilterKind, value: NewsTipFilterValue) => void;
  onClearFilters: () => void;
  onSortChange: (sortMode: NewsTipSortMode) => void;
}

const PAGE_SIZE = 8;

const statusClassName: Record<NewsTipStatus, string> = {
  待审核: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  跟进中: 'border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300',
  已采用: 'border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-300',
  不予采用: 'border-muted-foreground/25 bg-muted text-muted-foreground'
};

const priorityClassName: Record<PriorityLevel, string> = {
  high: 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300',
  medium: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  low: 'border-muted-foreground/25 bg-muted text-muted-foreground'
};

function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(iso));
}

function formatResponse(minutes: number | null) {
  if (minutes === null) return '-';
  if (minutes < 60) return `${minutes} 分钟`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} 小时` : `${hours} 小时 ${rest} 分`;
}

function FilterMenu<T extends string>({
  title,
  kind,
  options,
  selected,
  getLabel,
  onToggle
}: {
  title: string;
  kind: NewsTipFilterKind;
  options: T[];
  selected: T[];
  getLabel?: (value: T) => string;
  onToggle: (kind: NewsTipFilterKind, value: T) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant='outline' size='sm' className='border-dashed'>
          {title}
          {selected.length > 0 && (
            <Badge variant='secondary' className='ml-1 px-1.5 py-0 text-[10px]'>
              {selected.length}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='start' className='w-48'>
        <DropdownMenuLabel>{title}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {options.map((option) => (
          <DropdownMenuCheckboxItem
            key={option}
            checked={selected.includes(option)}
            onCheckedChange={() => onToggle(kind, option)}
          >
            {getLabel ? getLabel(option) : option}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function RecordBadges({ record }: { record: NewsTipRecordWithPriority }) {
  return (
    <div className='flex flex-wrap gap-1.5'>
      <Badge variant='outline' className={cn('font-normal', statusClassName[record.status])}>
        {record.status}
      </Badge>
      <Badge
        variant='outline'
        className={cn('font-normal', priorityClassName[record.priorityLevel])}
      >
        {record.priorityLabel}
      </Badge>
    </div>
  );
}

function ExpandedRow({ record }: { record: NewsTipRecordWithPriority }) {
  return (
    <div className='grid gap-4 py-2 lg:grid-cols-[minmax(0,1fr)_300px]'>
      <div className='space-y-2'>
        <div className='text-sm font-medium'>线索描述</div>
        <p className='text-muted-foreground text-sm leading-6'>{record.description}</p>
        <div className='rounded-md border border-red-500/20 bg-red-500/5 p-3 text-sm'>
          <span className='font-medium'>优先级规则：</span>
          <span className='text-muted-foreground'>{record.priorityReason}</span>
        </div>
      </div>
      <div className='space-y-3'>
        <div className='text-sm font-medium'>处理轨迹</div>
        <div className='space-y-3'>
          {record.timeline.map((entry) => (
            <div key={`${entry.time}-${entry.action}`} className='flex gap-3'>
              <div className='mt-1 size-2 rounded-full bg-primary' />
              <div className='min-w-0'>
                <div className='text-sm'>{entry.action}</div>
                <div className='text-muted-foreground text-xs tabular-nums'>
                  {formatDateTime(entry.time)} · {entry.operator}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function RecordsTable({
  records,
  totalCount,
  filters,
  sortMode,
  onToggleFilter,
  onClearFilters,
  onSortChange
}: RecordsTableProps) {
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const pageCount = Math.max(1, Math.ceil(records.length / PAGE_SIZE));

  useEffect(() => {
    setPage(1);
  }, [records.length, filters, sortMode]);

  const currentPage = Math.min(page, pageCount);
  const pageRows = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return records.slice(start, start + PAGE_SIZE);
  }, [currentPage, records]);

  return (
    <section className='rounded-lg border bg-card shadow-xs'>
      <div className='flex flex-col gap-3 border-b p-4 lg:flex-row lg:items-center lg:justify-between'>
        <div>
          <h2 className='text-sm font-semibold'>线索明细</h2>
          <p className='text-muted-foreground mt-1 text-sm tabular-nums'>
            当前筛选 {records.length} 条 / 全量 {totalCount} 条
          </p>
        </div>
        <div className='flex flex-wrap items-center gap-2'>
          <FilterMenu<NewsTipStatus>
            title='状态'
            kind='status'
            options={NEWS_TIP_STATUSES}
            selected={filters.status}
            onToggle={onToggleFilter}
          />
          <FilterMenu<NewsTipCategory>
            title='类型'
            kind='category'
            options={NEWS_TIP_CATEGORIES}
            selected={filters.category}
            onToggle={onToggleFilter}
          />
          <FilterMenu<NewsTipChannel>
            title='渠道'
            kind='channel'
            options={NEWS_TIP_CHANNELS}
            selected={filters.channel}
            onToggle={onToggleFilter}
          />
          <FilterMenu<NewsTipSourcePlatform>
            title='平台'
            kind='sourcePlatform'
            options={NEWS_TIP_SOURCE_PLATFORMS}
            selected={filters.sourcePlatform}
            onToggle={onToggleFilter}
          />
          <FilterMenu<ShenzhenDistrict>
            title='区域'
            kind='district'
            options={NEWS_TIP_DISTRICTS}
            selected={filters.district}
            onToggle={onToggleFilter}
          />
          <FilterMenu<PriorityLevel>
            title='优先级'
            kind='priority'
            options={PRIORITY_LEVELS}
            selected={filters.priority}
            getLabel={(value) => PRIORITY_LABELS[value]}
            onToggle={onToggleFilter}
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant='outline' size='sm'>
                排序
                <Icons.chevronDown className='size-3.5' />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end'>
              <DropdownMenuLabel>排序方式</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuRadioGroup
                value={sortMode}
                onValueChange={(value) => onSortChange(value as NewsTipSortMode)}
              >
                <DropdownMenuRadioItem value='priority'>优先级优先</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value='createdAt'>最新报料优先</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value='responseMinutes'>响应时长降序</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant='outline'
            size='sm'
            disabled={records.length === 0}
            onClick={() => exportNewsTipsCsv(records, filters)}
          >
            <Icons.fileTypeXls className='size-4' />
            导出 CSV
          </Button>
        </div>
      </div>

      <div className='overflow-x-auto'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className='w-10' />
              <TableHead className='min-w-52'>标题</TableHead>
              <TableHead className='min-w-32'>状态 / 优先级</TableHead>
              <TableHead>类型</TableHead>
              <TableHead>来源</TableHead>
              <TableHead>区域</TableHead>
              <TableHead className='min-w-28'>报料时间</TableHead>
              <TableHead className='min-w-24'>响应</TableHead>
              <TableHead className='min-w-24'>跟进人</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className='h-44 text-center'>
                  <div className='mx-auto grid max-w-sm gap-3'>
                    <div className='text-sm font-medium'>当前筛选无结果</div>
                    <p className='text-muted-foreground text-sm'>
                      可以清空筛选，或切换到更长时间范围查看历史线索。
                    </p>
                    <div>
                      <Button variant='outline' size='sm' onClick={onClearFilters}>
                        清空筛选
                      </Button>
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              pageRows.map((record) => {
                const expanded = expandedId === record.id;
                return (
                  <Fragment key={record.id}>
                    <TableRow
                      className={cn(
                        'hover:bg-muted/50 cursor-pointer',
                        record.priorityLevel === 'high' && 'bg-red-500/[0.03]'
                      )}
                      onClick={() => setExpandedId(expanded ? null : record.id)}
                    >
                      <TableCell>
                        <Button
                          variant='ghost'
                          size='icon'
                          className='size-8'
                          aria-label={expanded ? '收起线索详情' : '展开线索详情'}
                        >
                          <Icons.chevronRight
                            className={cn('size-4 transition-transform', expanded && 'rotate-90')}
                          />
                        </Button>
                      </TableCell>
                      <TableCell>
                        <div className='max-w-72'>
                          <div className='truncate text-sm font-medium' title={record.title}>
                            {record.title}
                          </div>
                          <div className='text-muted-foreground mt-1 text-xs tabular-nums'>
                            {record.id}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <RecordBadges record={record} />
                      </TableCell>
                      <TableCell>
                        <Badge variant='outline' className='font-normal'>
                          {record.category}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className='grid gap-1 text-sm'>
                          <span>{record.sourcePlatform}</span>
                          <span className='text-muted-foreground text-xs'>{record.channel}</span>
                        </div>
                      </TableCell>
                      <TableCell className='text-sm'>{record.district}</TableCell>
                      <TableCell className='text-muted-foreground text-sm tabular-nums'>
                        {formatDateTime(record.createdAt)}
                      </TableCell>
                      <TableCell className='text-sm tabular-nums'>
                        {formatResponse(record.responseMinutes)}
                      </TableCell>
                      <TableCell className='text-sm'>{record.assignee}</TableCell>
                    </TableRow>
                    {expanded && (
                      <TableRow key={`${record.id}-expanded`}>
                        <TableCell colSpan={9} className='bg-muted/25'>
                          <ExpandedRow record={record} />
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <div className='flex flex-col gap-3 border-t p-4 sm:flex-row sm:items-center sm:justify-between'>
        <div className='text-muted-foreground text-sm tabular-nums'>
          第 {currentPage} / {pageCount} 页，每页 {PAGE_SIZE} 条
        </div>
        <div className='flex items-center gap-2'>
          <Button
            variant='outline'
            size='sm'
            disabled={currentPage <= 1}
            onClick={() => setPage((value) => Math.max(1, value - 1))}
          >
            <Icons.chevronLeft className='size-4' />
            上一页
          </Button>
          <Button
            variant='outline'
            size='sm'
            disabled={currentPage >= pageCount}
            onClick={() => setPage((value) => Math.min(pageCount, value + 1))}
          >
            下一页
            <Icons.chevronRight className='size-4' />
          </Button>
        </div>
      </div>
    </section>
  );
}
