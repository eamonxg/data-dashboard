import KBar from '@/components/kbar';
import AppSidebar from '@/components/layout/app-sidebar';
import Header from '@/components/layout/header';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { getSidebarDefaultOpen } from '@/lib/sidebar-state';
import type { Metadata } from 'next';
import { cookies } from 'next/headers';

export const metadata: Metadata = {
  title: '深圳报料数据驾驶舱',
  description: '深圳本地媒体报料分诊与处理效率看板',
  robots: {
    index: false,
    follow: false
  }
};

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Persisting the sidebar state in the cookie.
  const isStaticExport = process.env.NEXT_STATIC_EXPORT === 'true';
  const sidebarCookieValue = isStaticExport
    ? undefined
    : (await cookies()).get('sidebar_state')?.value;
  const defaultOpen = getSidebarDefaultOpen(sidebarCookieValue);
  return (
    <KBar>
      <SidebarProvider defaultOpen={defaultOpen}>
        <AppSidebar />
        <SidebarInset>
          <Header />
          {children}
        </SidebarInset>
      </SidebarProvider>
    </KBar>
  );
}
