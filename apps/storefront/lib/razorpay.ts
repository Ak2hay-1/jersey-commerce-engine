export type RazorpaySuccessResponse = {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
};

export type RazorpayCheckoutOptions = {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description?: string;
  order_id: string;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  theme?: { color?: string };
  modal?: {
    ondismiss?: () => void;
  };
  handler: (response: RazorpaySuccessResponse) => void | Promise<void>;
};

export type RazorpayInstance = {
  open: () => void;
  on: (event: 'payment.failed', handler: (response: { error: { description?: string; reason?: string } }) => void) => void;
};

export type RazorpayConstructor = new (options: RazorpayCheckoutOptions) => RazorpayInstance;

declare global {
  interface Window {
    Razorpay?: RazorpayConstructor;
  }
}

const SCRIPT_ID = 'razorpay-checkout-js';
const SCRIPT_SRC = 'https://checkout.razorpay.com/v1/checkout.js';

export function loadRazorpayCheckout(): Promise<RazorpayConstructor> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Razorpay can only be loaded in the browser.'));
  }
  if (window.Razorpay) {
    return Promise.resolve(window.Razorpay);
  }
  const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener('load', () => {
        if (window.Razorpay) {
          resolve(window.Razorpay);
        } else {
          reject(new Error('Razorpay failed to load.'));
        }
      });
      existing.addEventListener('error', () => reject(new Error('Razorpay failed to load.')));
    });
  }
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.src = SCRIPT_SRC;
    script.async = true;
    script.onload = () => {
      if (window.Razorpay) {
        resolve(window.Razorpay);
      } else {
        reject(new Error('Razorpay failed to load.'));
      }
    };
    script.onerror = () => reject(new Error('Razorpay failed to load.'));
    document.body.appendChild(script);
  });
}
