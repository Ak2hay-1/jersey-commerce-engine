import type { CheckoutIssue } from '@jersey-commerce/types';

export function blockingCheckoutIssues(issues: CheckoutIssue[]): CheckoutIssue[] {
  return issues.filter((issue) => issue.code !== 'PRICE_CHANGED');
}

export function canPlaceOrder(issues: CheckoutIssue[]): boolean {
  return blockingCheckoutIssues(issues).length === 0;
}
