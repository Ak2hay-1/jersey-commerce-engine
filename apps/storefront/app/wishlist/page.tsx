import type { Metadata } from 'next';
import { WishlistPageView } from '../../components/account/wishlist-page-view';
import { pageShare } from '../../lib/page-meta';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = pageShare({
  title: 'Wishlist',
  description: 'Jerseys you saved on Jerzyfy.',
  path: '/wishlist',
  noIndex: true,
});

export default function WishlistPage(): React.JSX.Element {
  return <WishlistPageView />;
}
