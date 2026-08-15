-- CreateIndex
CREATE INDEX "categories_tenant_id_name_idx" ON "categories"("tenant_id", "name");

-- CreateIndex
CREATE INDEX "products_tenant_id_name_idx" ON "products"("tenant_id", "name");

-- CreateIndex
CREATE INDEX "product_variants_tenant_id_size_idx" ON "product_variants"("tenant_id", "size");

-- CreateIndex
CREATE INDEX "product_variants_tenant_id_color_idx" ON "product_variants"("tenant_id", "color");
