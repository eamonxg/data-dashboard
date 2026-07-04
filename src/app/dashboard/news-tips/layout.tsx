import { NewsTipsMobileTabBar } from '@/features/news-tips/components/mobile-tab-bar';

export default function NewsTipsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className='flex flex-1 flex-col pb-16 md:pb-0'>
      {children}
      <NewsTipsMobileTabBar />
    </div>
  );
}
