import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { storeApi } from '../../../lib/api';
import { serverStoreOptions } from '../../../lib/server-options';
import { StoreApiError } from '../../../lib/errors';
import { CustomOrderStatusView } from './status-view';
import { pageShare } from '../../../lib/page-meta';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ publicId: string }>;
}): Promise<Metadata> {
  const { publicId } = await params;
  return pageShare({
    title: 'Custom order',
    description: 'Track your Jerzyfy custom jersey enquiry.',
    path: `/custom-orders/${publicId}`,
  });
}

export default async function CustomOrderPublicPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}): Promise<React.JSX.Element> {
  const { publicId } = await params;
  const options = await serverStoreOptions();
  try {
    const [order, store] = await Promise.all([
      storeApi.getCustomOrder(publicId, options),
      storeApi.bootstrap(options),
    ]);
    return <CustomOrderStatusView initial={order} currency={store.tenant.currency} />;
  } catch (error) {
    if (error instanceof StoreApiError && error.status === 404) {
      notFound();
    }
    throw error;
  }
}
