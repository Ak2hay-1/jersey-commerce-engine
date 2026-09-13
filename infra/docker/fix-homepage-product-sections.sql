-- Ensure Jerzyfy homepage CMS includes product rails (featured + new arrivals).
-- Idempotent: skips if those section types already exist.
--
-- docker compose -f infra/docker/docker-compose.api.yml -f infra/docker/docker-compose.cohost.yml \
--   --env-file infra/docker/.env.production exec -T postgres \
--   psql -U jersey -d jersey_commerce -f - < infra/docker/fix-homepage-product-sections.sql

UPDATE website_settings AS w
SET homepage_config = jsonb_set(
  COALESCE(w.homepage_config, '{}'::jsonb),
  '{sections}',
  COALESCE(w.homepage_config->'sections', '[]'::jsonb)
    || CASE
      WHEN NOT EXISTS (
        SELECT 1
        FROM jsonb_array_elements(COALESCE(w.homepage_config->'sections', '[]'::jsonb)) s
        WHERE s->>'type' = 'featured-products'
      )
      THEN jsonb_build_array(
        jsonb_build_object('type', 'featured-products', 'enabled', true, 'heading', 'Featured jerseys', 'productSlugs', '[]'::jsonb)
      )
      ELSE '[]'::jsonb
    END
    || CASE
      WHEN NOT EXISTS (
        SELECT 1
        FROM jsonb_array_elements(COALESCE(w.homepage_config->'sections', '[]'::jsonb)) s
        WHERE s->>'type' = 'new-arrivals'
      )
      THEN jsonb_build_array(
        jsonb_build_object('type', 'new-arrivals', 'enabled', true, 'heading', 'Latest kits', 'productSlugs', '[]'::jsonb)
      )
      ELSE '[]'::jsonb
    END
),
updated_at = NOW()
FROM tenants t
WHERE w.tenant_id = t.id
  AND t.slug = 'jerzyfy';

SELECT t.slug, jsonb_agg(s->>'type' ORDER BY ordinality) AS section_types
FROM website_settings w
JOIN tenants t ON t.id = w.tenant_id
CROSS JOIN LATERAL jsonb_array_elements(w.homepage_config->'sections') WITH ORDINALITY AS s(s, ordinality)
WHERE t.slug = 'jerzyfy'
GROUP BY t.slug;
