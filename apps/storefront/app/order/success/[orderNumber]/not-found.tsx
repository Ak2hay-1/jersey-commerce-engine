import { EmptyState } from '../../../../components/ui/empty-state';

export default function OrderNotFound(): React.JSX.Element {
  return (
    <EmptyState
      title="Order not found"
      description="We could not find this order for the signed-in customer."
      actionHref="/account/orders"
      actionLabel="View orders"
    />
  );
}
