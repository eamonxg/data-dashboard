import PageContainer from '@/components/layout/page-container';
import UserListingPage from '@/features/users/components/user-listing';
import { searchParamsCache } from '@/lib/searchparams';
import type { SearchParams } from 'nuqs/server';
import { usersInfoContent } from '@/features/users/info-content';
import { UserFormSheetTrigger } from '@/features/users/components/user-form-sheet';
import { Suspense } from 'react';

export const metadata = {
  title: 'Dashboard: Users'
};

type PageProps = {
  searchParams: Promise<SearchParams>;
};

export default async function UsersPage(props: PageProps) {
  const isStaticExport = process.env.NEXT_STATIC_EXPORT === 'true';
  const searchParams = isStaticExport ? {} : await props.searchParams;
  searchParamsCache.parse(searchParams);

  return (
    <PageContainer
      pageTitle='Users'
      pageDescription='Manage users (React Query + nuqs table pattern.)'
      infoContent={usersInfoContent}
      pageHeaderAction={<UserFormSheetTrigger />}
    >
      <Suspense fallback={null}>
        <UserListingPage />
      </Suspense>
    </PageContainer>
  );
}
