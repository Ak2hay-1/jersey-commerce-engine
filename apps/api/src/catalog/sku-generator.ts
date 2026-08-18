import { ConflictException, Injectable } from '@nestjs/common';
import { slugify } from '@jersey-commerce/utils';

export interface SkuGeneratorInput {
  productSlug: string;
  size?: string | null;
  colour?: string | null;
  occupied: Set<string>;
}

@Injectable()
export class SkuGenerator {
  generate(input: SkuGeneratorInput): string {
    const parts = [input.productSlug, input.size, input.colour]
      .map((part) => (part ? slugify(part).replace(/-/g, '').toUpperCase() : ''))
      .filter((part) => part.length > 0);
    const base = (parts.join('-') || 'SKU').slice(0, 48);
    return this.allocate(base, input.occupied);
  }

  resolve(provided: string | undefined, input: SkuGeneratorInput): string {
    if (provided && provided.trim().length > 0) {
      const sku = provided.trim().toUpperCase();
      if (input.occupied.has(sku)) {
        throw new ConflictException('A variant with this SKU already exists in this store.');
      }
      return sku;
    }
    return this.generate(input);
  }

  allocate(base: string, occupied: Set<string>): string {
    if (!occupied.has(base)) {
      occupied.add(base);
      return base;
    }
    let suffix = 2;
    let candidate = `${base}-${suffix}`;
    while (occupied.has(candidate)) {
      suffix += 1;
      candidate = `${base}-${suffix}`;
    }
    occupied.add(candidate);
    return candidate;
  }
}
