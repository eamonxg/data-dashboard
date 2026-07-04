'use client';

import { usePathname } from 'next/navigation';
import { useMemo } from 'react';

type BreadcrumbItem = {
  title: string;
  link: string;
};

// This allows to add custom title as well
const routeMapping: Record<string, BreadcrumbItem[]> = {
  '/dashboard': [{ title: '工作台', link: '/dashboard' }],
  '/dashboard/news-tips': [
    { title: '工作台', link: '/dashboard' },
    { title: '报料驾驶舱', link: '/dashboard/news-tips' }
  ],
  '/dashboard/news-tips/records': [
    { title: '工作台', link: '/dashboard' },
    { title: '报料驾驶舱', link: '/dashboard/news-tips' },
    { title: '线索明细', link: '/dashboard/news-tips/records' }
  ],
  '/dashboard/news-tips/flow': [
    { title: '工作台', link: '/dashboard' },
    { title: '报料驾驶舱', link: '/dashboard/news-tips' },
    { title: '处理流转', link: '/dashboard/news-tips/flow' }
  ],
  '/dashboard/employee': [
    { title: '工作台', link: '/dashboard' },
    { title: '员工', link: '/dashboard/employee' }
  ],
  '/dashboard/product': [
    { title: '工作台', link: '/dashboard' },
    { title: '产品', link: '/dashboard/product' }
  ]
  // Add more custom mappings as needed
};

export function useBreadcrumbs() {
  const pathname = usePathname();

  const breadcrumbs = useMemo(() => {
    // Check if we have a custom mapping for this exact path
    if (routeMapping[pathname]) {
      return routeMapping[pathname];
    }

    // If no exact match, fall back to generating breadcrumbs from the path
    const segments = pathname.split('/').filter(Boolean);
    return segments.map((segment, index) => {
      const path = `/${segments.slice(0, index + 1).join('/')}`;
      return {
        title: segment.charAt(0).toUpperCase() + segment.slice(1),
        link: path
      };
    });
  }, [pathname]);

  return breadcrumbs;
}
