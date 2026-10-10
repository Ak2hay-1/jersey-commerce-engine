import { storeApi } from './api';
import { loadRazorpayCheckout } from './razorpay';

export type RazorpayPaymentRequest = {
  keyId: string;
  razorpayOrderId: string;
  amountPaise: number;
  currency: string;
  storeName: string;
  orderNumber: string;
  themeColor?: string;
  prefill?: { name?: string; email?: string; contact?: string };
};

export class PaymentDismissedError extends Error {
  constructor() {
    super('Payment was not completed. Your order is reserved — you can retry payment from the order page.');
    this.name = 'PaymentDismissedError';
  }
}

const POLL_ATTEMPTS = 6;
const POLL_INTERVAL_MS = 2_500;

/**
 * If the verify call fails after Razorpay captured the money (e.g. a network blip), the server-side webhook
 * still confirms the order. Poll the order before telling the shopper anything went wrong.
 */
export async function waitForOrderPaid(orderNumber: string): Promise<boolean> {
  for (let attempt = 0; attempt < POLL_ATTEMPTS; attempt += 1) {
    try {
      const order = await storeApi.order(orderNumber, { cache: 'no-store' });
      if (order.paymentStatus === 'COMPLETED') {
        return true;
      }
    } catch {
      // keep polling
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
  return false;
}

/** Opens Razorpay Checkout and resolves once the payment is verified server-side. */
export async function payWithRazorpay(request: RazorpayPaymentRequest): Promise<void> {
  const Razorpay = await loadRazorpayCheckout();
  await new Promise<void>((resolve, reject) => {
    let settled = false;
    const finish = (error?: Error) => {
      if (settled) {
        return;
      }
      settled = true;
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    };
    const rzp = new Razorpay({
      key: request.keyId,
      amount: request.amountPaise,
      currency: request.currency || 'INR',
      name: request.storeName,
      description: `Order ${request.orderNumber}`,
      order_id: request.razorpayOrderId,
      prefill: request.prefill,
      theme: { color: request.themeColor || '#111111' },
      modal: {
        ondismiss: () => finish(new PaymentDismissedError()),
      },
      handler: async (response) => {
        try {
          await storeApi.verifyRazorpayPayment({
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          });
          finish();
        } catch {
          const paid = await waitForOrderPaid(request.orderNumber);
          finish(
            paid
              ? undefined
              : new Error(
                  'We could not confirm your payment yet. If money was debited, it will be confirmed automatically within a few minutes — please do not pay again.',
                ),
          );
        }
      },
    });
    rzp.on('payment.failed', (response) => {
      // Razorpay keeps the modal open for another attempt; only report the reason.
      console.warn('Razorpay payment attempt failed', response.error.reason ?? response.error.description);
    });
    rzp.open();
  });
}
