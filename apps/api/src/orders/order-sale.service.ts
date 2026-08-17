import { Injectable } from '@nestjs/common';
import { InventoryMovementType } from '../prisma/client';
import { InventoryService } from '../inventory/inventory.service';
import type { InventoryActor } from '../inventory/inventory.service';

/**
 * Boundary between a fulfilled ecommerce order and financial sale recognition.
 * Phase 9 consumes reserved stock here. Creating a Sale row is deferred so the
 * POS sales engine is not duplicated.
 */
@Injectable()
export class OrderSaleRecognitionService {
  constructor(private readonly inventory: InventoryService) {}

  async consumeReservedForOrder(
    tx: object,
    input: {
      tenantId: string;
      orderId: string;
      orderNumber: string;
      items: Array<{ productVariantId: string; quantity: number }>;
      actor?: InventoryActor;
    },
  ): Promise<void> {
    for (const item of input.items) {
      await this.inventory.consumeReservedStock(
        {
          tenantId: input.tenantId,
          productVariantId: item.productVariantId,
          quantity: item.quantity,
          type: InventoryMovementType.ONLINE_ORDER,
          referenceType: 'ORDER',
          referenceId: input.orderId,
          reason: input.orderNumber,
          createdBy: input.actor?.userId,
          actor: input.actor,
        },
        tx,
      );
    }
  }
}
