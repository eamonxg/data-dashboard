'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { SidebarTrigger } from '../ui/sidebar';
import { Separator } from '../ui/separator';
import { Breadcrumbs } from '../breadcrumbs';
import { ThemeModeToggle } from '../themes/theme-mode-toggle';
import { cn } from '@/lib/utils';

export default function Header() {
  const pathname = usePathname();
  const hasMobileTabBar = pathname?.startsWith('/dashboard/news-tips');

  return (
    <header className='bg-background/60 sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between gap-2 backdrop-blur-md md:h-14'>
      <div className={cn('flex items-center gap-2 px-4', hasMobileTabBar && 'hidden md:flex')}>
        <SidebarTrigger className='-ml-1' />
        <Separator orientation='vertical' className='mr-2 h-4' />
        <Breadcrumbs />
      </div>

      <div className='ml-auto flex items-center gap-2 px-4'>
        <ThemeModeToggle />
      </div>
    </header>
  );
}
