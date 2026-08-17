import { BadRequestException } from '@nestjs/common';
import { Prisma } from '../prisma/client';
import { assertValidPrices, parseMoney } from './money';

describe('catalog money', () => {
  it('parses decimal strings without floating point arithmetic', () => {
    const amount = parseMoney('899.50', 'sellingPrice');
    expect(amount instanceof Prisma.Decimal).toBe(true);
    expect(amount.toFixed(2)).toBe('899.50');
  });

  it('rejects negative and over-precise values', () => {
    expect(() => parseMoney('-1', 'costPrice')).toThrow(BadRequestException);
    expect(() => parseMoney('10.999', 'costPrice')).toThrow(BadRequestException);
  });

  it('requires compare-at price to be greater than selling price', () => {
    expect(() =>
      assertValidPrices({
        costPrice: parseMoney('450', 'costPrice'),
        sellingPrice: parseMoney('899', 'sellingPrice'),
        compareAtPrice: parseMoney('899', 'compareAtPrice'),
      }),
    ).toThrow(BadRequestException);
  });
});
