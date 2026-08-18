-- Phase 4 inventory engine: on-hand/reserved/available quantities, movement cost snapshots,
-- TRANSFER_IN/TRANSFER_OUT, and lookup indexes. Historical movements are retained.

ALTER TABLE "inventories" RENAME COLUMN "quantity_on_hand" TO "quantity";
ALTER TABLE "inventories" RENAME COLUMN "quantity_reserved" TO "reserved_quantity";

ALTER TABLE "inventories"
  ADD COLUMN "available_quantity" INTEGER NOT NULL DEFAULT 0;

UPDATE "inventories"
SET "available_quantity" = "quantity" - "reserved_quantity";

ALTER TABLE "inventories"
  ADD CONSTRAINT "inventories_quantity_non_negative" CHECK ("quantity" >= 0);

ALTER TABLE "inventories"
  ADD CONSTRAINT "inventories_reserved_non_negative" CHECK ("reserved_quantity" >= 0);

ALTER TABLE "inventories"
  ADD CONSTRAINT "inventories_reserved_within_quantity" CHECK ("reserved_quantity" <= "quantity");

ALTER TABLE "inventories"
  ADD CONSTRAINT "inventories_available_matches_quantity" CHECK ("available_quantity" = ("quantity" - "reserved_quantity"));

ALTER TABLE "inventories"
  ADD CONSTRAINT "inventories_available_non_negative" CHECK ("available_quantity" >= 0);

CREATE INDEX "inventories_tenant_id_product_variant_id_idx" ON "inventories"("tenant_id", "product_variant_id");
CREATE INDEX "inventories_tenant_id_quantity_idx" ON "inventories"("tenant_id", "quantity");
CREATE INDEX "inventories_tenant_out_of_stock_idx" ON "inventories"("tenant_id") WHERE "quantity" = 0;
CREATE INDEX "inventories_tenant_low_stock_idx" ON "inventories"("tenant_id") WHERE "reorder_level" > 0 AND "quantity" > 0 AND "quantity" <= "reorder_level";

ALTER TABLE "inventory_movements"
  ADD COLUMN "unit_cost" DECIMAL(14,2);

UPDATE "inventory_movements" AS movement
SET "unit_cost" = variant."cost_price"
FROM "product_variants" AS variant
WHERE movement."product_variant_id" = variant."id"
  AND movement."unit_cost" IS NULL;

CREATE TYPE "InventoryMovementType_new" AS ENUM (
  'OPENING_STOCK',
  'PURCHASE',
  'SALE',
  'ONLINE_ORDER',
  'RETURN',
  'EXCHANGE',
  'DAMAGE',
  'ADJUSTMENT',
  'TRANSFER_IN',
  'TRANSFER_OUT',
  'CANCELLED_ORDER'
);

ALTER TABLE "inventory_movements"
  ALTER COLUMN "type" TYPE "InventoryMovementType_new"
  USING (
    CASE
      WHEN "type"::text = 'TRANSFER' THEN 'TRANSFER_IN'::"InventoryMovementType_new"
      ELSE "type"::text::"InventoryMovementType_new"
    END
  );

DROP TYPE "InventoryMovementType";
ALTER TYPE "InventoryMovementType_new" RENAME TO "InventoryMovementType";

CREATE INDEX "inventory_movements_tenant_id_product_variant_id_created_at_idx" ON "inventory_movements"("tenant_id", "product_variant_id", "created_at");
CREATE INDEX "inventory_movements_reference_id_idx" ON "inventory_movements"("reference_id");
