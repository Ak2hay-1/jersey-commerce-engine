import type { MoneyString } from './catalog';
import type { PromoCodeStatus, PromoDiscountType } from './enums';
import type { PaginationMeta } from './api';

export interface PromoCodeDto {
  id: string;
  code: string;
  name: string;
  description: string | null;
  discountType: PromoDiscountType;
  discountValue: MoneyString;
  minSubtotal: MoneyString | null;
  maxDiscount: MoneyString | null;
  usageLimit: number | null;
  usageCount: number;
  startsAt: string | null;
  endsAt: string | null;
  status: PromoCodeStatus;
  createdAt: string;
  updatedAt: string;
}

export interface PromoCodeListResult {
  items: PromoCodeDto[];
  meta: PaginationMeta;
}

export interface AppliedPromoCode {
  id: string;
  code: string;
  name: string;
  discountType: PromoDiscountType;
  discountValue: MoneyString;
}
