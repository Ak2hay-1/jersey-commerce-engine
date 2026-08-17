import { BadRequestException } from '@nestjs/common';
import { Prisma } from '../prisma/client';
import { money, roundMoney } from '../pos/pos-money';

export function parseTaxRate(
  value: Prisma.Decimal | string | number | null | undefined,
  field = 'taxRate',
): Prisma.Decimal {
  if (value == null || value === '') {
    return money(0);
  }
  const parsed = money(value);
  if (parsed.isNegative() || parsed.gt(100)) {
    throw new BadRequestException(`${field} must be between 0 and 100.`);
  }
  return parsed;
}

export function allocateProportional(weights: Prisma.Decimal[], total: Prisma.Decimal): Prisma.Decimal[] {
  const roundedTotal = roundMoney(total);
  if (weights.length === 0 || roundedTotal.isZero()) {
    return weights.map(() => money(0));
  }
  const sumWeights = weights.reduce((acc, weight) => acc.add(weight), money(0));
  if (sumWeights.isZero()) {
    return weights.map(() => money(0));
  }
  const shares: Prisma.Decimal[] = [];
  let remaining = roundedTotal;
  for (let index = 0; index < weights.length; index += 1) {
    if (index === weights.length - 1) {
      shares.push(remaining);
      break;
    }
    const share = roundMoney(roundedTotal.mul(weights[index] ?? money(0)).div(sumWeights));
    shares.push(share);
    remaining = remaining.sub(share);
  }
  return shares;
}

export function splitTax(
  amount: Prisma.Decimal,
  rate: Prisma.Decimal,
  inclusive: boolean,
): { tax: Prisma.Decimal; pretax: Prisma.Decimal; total: Prisma.Decimal } {
  const net = roundMoney(amount);
  const taxRate = parseTaxRate(rate);
  if (net.isNegative()) {
    throw new BadRequestException('Taxable amount cannot be negative.');
  }
  if (taxRate.lte(0) || net.isZero()) {
    return { tax: money(0), pretax: net, total: net };
  }
  if (inclusive) {
    const tax = roundMoney(net.mul(taxRate).div(taxRate.add(100)));
    return { tax, pretax: roundMoney(net.sub(tax)), total: net };
  }
  const tax = roundMoney(net.mul(taxRate).div(100));
  return { tax, pretax: net, total: roundMoney(net.add(tax)) };
}

export function unitShare(lineTotal: Prisma.Decimal, quantity: number, refundQuantity: number): Prisma.Decimal {
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new BadRequestException('Original quantity must be a positive integer.');
  }
  if (!Number.isInteger(refundQuantity) || refundQuantity <= 0) {
    throw new BadRequestException('Refund quantity must be a positive integer.');
  }
  if (refundQuantity > quantity) {
    throw new BadRequestException('Refund quantity cannot exceed the original quantity.');
  }
  if (refundQuantity === quantity) {
    return roundMoney(lineTotal);
  }
  return roundMoney(lineTotal.mul(refundQuantity).div(quantity));
}
