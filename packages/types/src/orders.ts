import type {
  CartStatus,
  FulfillmentMethod,
  OrderInventoryState,
  OrderPaymentState,
  OrderSource,
  OrderStatus,
  OrderTrackingStepKey,
  PaymentMethod,
  PaymentStatus,
} from './enums';
import type { MoneyString } from './catalog';
import type { AppliedPromoCode } from './promo-codes';

export interface OrderShippingAddressDto {
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface OrderItemDto {
  id: string;
  productVariantId: string;
  productName: string;
  sku: string;
  size: string | null;
  color: string | null;
  quantity: number;
  unitPrice: MoneyString;
  discount: MoneyString;
  tax: MoneyString;
  total: MoneyString;
}

export interface OrderPaymentDto {
  id: string;
  amount: MoneyString;
  method: PaymentMethod;
  status: PaymentStatus;
  paymentState: OrderPaymentState;
  provider: string | null;
  reference: string | null;
  createdAt: string;
}

export interface OrderTrackingStep {
  key: OrderTrackingStepKey;
  label: string;
  done: boolean;
  current: boolean;
  skipped: boolean;
}

export interface OrderSummary {
  id: string;
  orderNumber: string;
  source: OrderSource;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentState: OrderPaymentState;
  fulfillmentMethod: FulfillmentMethod;
  inventoryState: OrderInventoryState;
  subtotal: MoneyString;
  discount: MoneyString;
  tax: MoneyString;
  shippingAmount: MoneyString;
  total: MoneyString;
  currency: string;
  customerId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OrderShipmentDto {
  id: string;
  provider: 'DELHIVERY';
  warehouseId?: string | null;
  waybill: string | null;
  trackingUrl: string | null;
  labelUrl: string | null;
  packageWeightKg: string | null;
  carrierShippingAmount: string | null;
  codAmount: string | null;
  providerStatus: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OrderDetail extends OrderSummary {
  notes: string | null;
  cancelReason: string | null;
  cancelledAt: string | null;
  confirmedAt: string | null;
  shippedAt: string | null;
  completedAt: string | null;
  customer: { id: string; name: string; phone: string | null; email: string | null } | null;
  shippingAddress: OrderShippingAddressDto | null;
  items: OrderItemDto[];
  payments: OrderPaymentDto[];
  tracking: OrderTrackingStep[];
  /** @deprecated Prefer `shipments`; first shipment for backward compatibility. */
  shipment?: OrderShipmentDto | null;
  shipments?: OrderShipmentDto[];
  paymentIntent?: {
    paymentId: string;
    status: PaymentStatus;
    paymentState: OrderPaymentState;
    amount: MoneyString;
    currency: string;
    provider: string | null;
    nextAction: 'AWAIT_GATEWAY' | 'NONE';
    /** Razorpay Standard Checkout fields (KEY_ID only — never the secret). */
    razorpayOrderId?: string | null;
    razorpayKeyId?: string | null;
    amountPaise?: number | null;
  };
}

export interface CartItemDto {
  id: string;
  productVariantId: string;
  productName: string;
  productSlug: string;
  sku: string;
  size: string | null;
  color: string | null;
  quantity: number;
  unitPrice: MoneyString;
  currentUnitPrice: MoneyString;
  lineTotal: MoneyString;
  availableQuantity: number;
  imageUrl: string | null;
  imageAlt: string | null;
  priceChanged: boolean;
}

export interface CartTotalsDto {
  subtotal: MoneyString;
  discount: MoneyString;
  tax: MoneyString;
  shippingAmount: MoneyString;
  total: MoneyString;
  currency: string;
}

export interface CartDto {
  id: string;
  status: CartStatus;
  itemCount: number;
  items: CartItemDto[];
  totals: CartTotalsDto;
  promoCode: AppliedPromoCode | null;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
  cartToken?: string;
}

export interface CheckoutResult {
  order: OrderDetail;
  cart: { id: string; status: CartStatus };
  customerAccessToken?: string;
  /** Opaque token for guest order receipt access (hashed server-side). */
  orderAccessToken?: string;
}
