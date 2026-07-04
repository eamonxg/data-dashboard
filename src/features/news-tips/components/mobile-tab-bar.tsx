'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';

const TABS = [
  { href: '/dashboard/news-tips', label: '驾驶舱', icon: Icons.dashboard },
  { href: '/dashboard/news-tips/records', label: '线索明细', icon: Icons.forms },
  { href: '/dashboard/news-tips/flow', label: '处理流转', icon: Icons.kanban }
] as const;

export function NewsTipsMobileTabBar() {
  const pathname = usePathname();

  return (
    <nav
      className='bg-background/95 fixed inset-x-0 bottom-0 z-30 flex items-stretch border-t backdrop-blur-md md:hidden'
      aria-label='报料驾驶舱导航'
    >
      {TABS.map((tab) => {
        const active =
          tab.href === '/dashboard/news-tips'
            ? pathname === tab.href
            : pathname?.startsWith(tab.href);
        const Icon = tab.icon;

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              'flex flex-1 flex-col items-center gap-1 py-2 text-xs transition-colors',
              active ? 'text-primary font-medium' : 'text-muted-foreground'
            )}
            aria-current={active ? 'page' : undefined}
          >
            <Icon className='size-5' />
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
