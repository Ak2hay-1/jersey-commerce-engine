import { BadRequestException } from '@nestjs/common';
import type { CustomOrderItemMode } from '@jersey-commerce/types';
import { Prisma } from '../prisma/client';
import { parseMoney } from '../catalog/money';
import { money, roundMoney } from '../pos/pos-money';

export interface CustomOrderItemInput {
  productVariantId?: string;
  lineType: CustomOrderItemMode;
  playerName?: string;
  jerseyNumber?: string;
  size?: string;
  colour?: string;
  quantity: number;
  unitPrice?: string | number;
  customizationFee?: string | number;
  notes?: string;
}

export interface NormalizedCustomOrderItem {
  productVariantId: string | null;
  lineType: CustomOrderItemMode;
  playerName: string | null;
  jerseyNumber: string | null;
  size: string | null;
  colour: string | null;
  quantity: number;
  unitPrice: Prisma.Decimal;
  customizationFee: Prisma.Decimal;
  total: Prisma.Decimal;
  notes: string | null;
}

export function normalizeCustomOrderItems(items: CustomOrderItemInput[]): NormalizedCustomOrderItem[] {
  if (items.length === 0) {
    return [];
  }
  return items.map((item, index) => {
    if (!Number.isInteger(item.quantity) || item.quantity < 1) {
      throw new BadRequestException(`items[${index}].quantity must be a positive integer.`);
    }
    if (item.lineType === 'PLAYER_LIST' && !item.playerName?.trim()) {
      throw new BadRequestException(`items[${index}].playerName is required for player list lines.`);
    }
    if (item.lineType === 'SIZE_QUANTITY' && !item.size?.trim()) {
      throw new BadRequestException(`items[${index}].size is required for size quantity lines.`);
    }
    const unitPrice = item.unitPrice == null || item.unitPrice === '' ? money(0) : parseMoney(item.unitPrice, 'unitPrice');
    const customizationFee =
      item.customizationFee == null || item.customizationFee === ''
        ? money(0)
        : parseMoney(item.customizationFee, 'customizationFee');
    const total = roundMoney(unitPrice.mul(item.quantity).add(customizationFee.mul(item.quantity)));
    return {
      productVariantId: item.productVariantId?.trim() || null,
      lineType: item.lineType,
      playerName: item.playerName?.trim() || null,
      jerseyNumber: item.jerseyNumber?.trim() || null,
      size: item.size?.trim() || null,
      colour: item.colour?.trim() || null,
      quantity: item.quantity,
      unitPrice,
      customizationFee,
      total,
      notes: item.notes?.trim() || null,
    };
  });
}

export function totalItemQuantity(items: Array<{ quantity: number }>): number {
  return items.reduce((sum, item) => sum + item.quantity, 0);
}

export function deriveOrderingMode(items: Array<{ lineType: CustomOrderItemMode }>): CustomOrderItemMode | null {
  if (items.length === 0) {
    return null;
  }
  const first = items[0]?.lineType;
  return items.every((item) => item.lineType === first) ? (first ?? null) : null;
}
