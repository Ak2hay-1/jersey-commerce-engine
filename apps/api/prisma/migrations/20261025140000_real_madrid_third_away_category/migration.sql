-- The third-away kit was left on an archived per-product category, so its
-- breadcrumb and structured data pointed at a category page that 404s.
UPDATE "products" AS product
SET
  "category_id" = target."id",
  "updated_at" = CURRENT_TIMESTAMP
FROM "categories" AS target
WHERE target."slug" = 'player-versions'
  AND product."slug" = 'real-madrid-26-27-third-away-player-version'
  AND product."category_id" IS DISTINCT FROM target."id";
