import { canTransitionCustomOrderStatus, canTransitionProductionStatus, isCancellableCustomOrderStatus } from './custom-order-state-machine';

describe('custom order state machine', () => {
  it('allows the enquiry-to-completion path', () => {
    expect(canTransitionCustomOrderStatus('INQUIRY', 'QUOTATION')).toBe(true);
    expect(canTransitionCustomOrderStatus('QUOTATION', 'QUOTE_SENT')).toBe(true);
    expect(canTransitionCustomOrderStatus('QUOTE_SENT', 'DEPOSIT_PENDING')).toBe(true);
    expect(canTransitionCustomOrderStatus('DEPOSIT_PENDING', 'CONFIRMED')).toBe(true);
    expect(canTransitionCustomOrderStatus('CONFIRMED', 'DESIGN_PENDING')).toBe(true);
    expect(canTransitionCustomOrderStatus('DESIGN_PENDING', 'DESIGN_APPROVAL')).toBe(true);
    expect(canTransitionCustomOrderStatus('DESIGN_APPROVAL', 'PRODUCTION')).toBe(true);
    expect(canTransitionCustomOrderStatus('PRODUCTION', 'READY')).toBe(true);
    expect(canTransitionCustomOrderStatus('READY', 'COMPLETED')).toBe(true);
  });

  it('rejects arbitrary jumps', () => {
    expect(canTransitionCustomOrderStatus('INQUIRY', 'PRODUCTION')).toBe(false);
    expect(canTransitionCustomOrderStatus('COMPLETED', 'CONFIRMED')).toBe(false);
    expect(canTransitionCustomOrderStatus('CANCELLED', 'QUOTATION')).toBe(false);
  });

  it('treats in-progress statuses as cancellable', () => {
    expect(isCancellableCustomOrderStatus('INQUIRY')).toBe(true);
    expect(isCancellableCustomOrderStatus('PRODUCTION')).toBe(true);
    expect(isCancellableCustomOrderStatus('COMPLETED')).toBe(false);
  });

  it('enforces production sub-status transitions', () => {
    expect(canTransitionProductionStatus('MATERIAL_PENDING', 'PRODUCTION')).toBe(true);
    expect(canTransitionProductionStatus('PRODUCTION', 'QUALITY_CHECK')).toBe(true);
    expect(canTransitionProductionStatus('QUALITY_CHECK', 'READY')).toBe(true);
    expect(canTransitionProductionStatus('READY', 'PRODUCTION')).toBe(false);
  });
});
