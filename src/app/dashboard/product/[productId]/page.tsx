import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/query-client';
import { productByIdOptions } from '@/features/products/api/queries';
import PageContainer from '@/components/layout/page-container';
import ProductViewPage from '@/features/products/components/product-view-page';
import { fakeProducts } from '@/constants/mock-api';

export const metadata = {
  title: 'Dashboard : Product View'
};

type PageProps = { params: Promise<{ productId: string }> };

export function generateStaticParams() {
  return [
    { productId: 'new' },
    ...fakeProducts.records.map((product) => ({
      productId: String(product.id)
    }))
  ];
}

export default async function Page(props: PageProps) {
  const params = await props.params;
  const queryClient = getQueryClient();

  if (params.productId !== 'new') {
    void queryClient.prefetchQuery(productByIdOptions(Number(params.productId)));
  }

  return (
    <PageContainer>
      <div className='flex-1 space-y-4'>
        <HydrationBoundary state={dehydrate(queryClient)}>
          <ProductViewPage productId={params.productId} />
        </HydrationBoundary>
      </div>
    </PageContainer>
  );
}
