'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Icons } from '@/components/icons';

const sections = [
  {
    title: '线索明细',
    href: '/dashboard/news-tips/records',
    icon: Icons.post
  },
  {
    title: '处理流转',
    href: '/dashboard/news-tips/flow',
    icon: Icons.kanban
  }
];

export function WorkbenchNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = searchParams.toString();
  const activeSection = sections.find((section) => section.href === pathname) ?? sections[0];

  return (
    <Tabs value={activeSection.href} className='w-full'>
      <TabsList className='grid h-auto w-full grid-cols-2 p-1 md:w-fit'>
        {sections.map((section) => {
          const Icon = section.icon;
          const href = query ? `${section.href}?${query}` : section.href;

          return (
            <TabsTrigger key={section.href} value={section.href} asChild className='h-9 px-3'>
              <Link href={href}>
                <Icon className='size-4' />
                <span>{section.title}</span>
              </Link>
            </TabsTrigger>
          );
        })}
      </TabsList>
    </Tabs>
  );
}
