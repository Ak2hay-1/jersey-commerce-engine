-- Feature Barcelona Home/Away + Madrid Home on Jerzyfy, and clean homepage CMS copy.
-- Idempotent.
--
-- Cohost apply:
--   docker compose -f infra/docker/docker-compose.api.yml -f infra/docker/docker-compose.cohost.yml \
--     --env-file infra/docker/.env.production exec -T postgres \
--     psql -U jersey -d jersey_commerce -f - < infra/docker/fix-homepage-featured-kits.sql

-- 1) Mark the three kits featured (and leave other featured flags untouched).
UPDATE products AS p
SET
  featured = TRUE,
  updated_at = NOW()
FROM tenants t
WHERE p.tenant_id = t.id
  AND t.slug = 'jerzyfy'
  AND p.slug IN (
    'barcelona-home-jersey-2026-27-player-version',
    'barcelona-away-jersey-2026-27-player-version',
    'real-madrid-home-jersey-2026-27-player-version'
  );

-- 2) Homepage hero + statement headings, CTA/promo copy, and featured product slugs.
WITH target AS (
  SELECT w.id
  FROM website_settings w
  JOIN tenants t ON t.id = w.tenant_id
  WHERE t.slug = 'jerzyfy'
),
rewritten AS (
  SELECT
    w.id,
    COALESCE(
      (
        SELECT jsonb_agg(
          CASE
            WHEN s->>'type' = 'hero' THEN
              s || jsonb_build_object(
                'heading', 'Football Jerseys 2026/27',
                'subheading', 'Streetwear cut for the stands. Kits cut for the street.',
                'enabled', true
              )
            WHEN s->>'type' = 'statement' THEN
              s || jsonb_build_object(
                'heading', 'Football Jerseys 2026/27',
                'subheading', 'Cut for the stands. Lived on the street.',
                'enabled', true
              )
            WHEN s->>'type' = 'promo-banner' THEN
              s || jsonb_build_object(
                'heading', 'Premium',
                'subheading', 'Replica-inspired football jerseys with durable knits and match-day fit.',
                'enabled', true
              )
            WHEN s->>'type' = 'featured-products' THEN
              s || jsonb_build_object(
                'enabled', true,
                'heading', 'Featured jerseys',
                'productSlugs', jsonb_build_array(
                  'barcelona-home-jersey-2026-27-player-version',
                  'barcelona-away-jersey-2026-27-player-version',
                  'real-madrid-home-jersey-2026-27-player-version',
                  'argentina-messi-10-farewell-jersey-player-version'
                )
              )
            WHEN s->>'type' = 'cta' THEN
              s || jsonb_build_object(
                'heading', 'Find your kit',
                'subheading', 'Browse club kits, national colours, and custom pieces.',
                'enabled', true
              )
            ELSE s
          END
          ORDER BY ordinality
        )
        FROM jsonb_array_elements(COALESCE(w.homepage_config->'sections', '[]'::jsonb))
          WITH ORDINALITY AS arr(s, ordinality)
      ),
      '[]'::jsonb
    ) AS sections
  FROM website_settings w
  JOIN target ON target.id = w.id
)
UPDATE website_settings AS w
SET
  homepage_config = jsonb_set(
    COALESCE(w.homepage_config, '{}'::jsonb),
    '{sections}',
    rewritten.sections
  ),
  footer_config = COALESCE(w.footer_config, '{}'::jsonb) || jsonb_build_object(
    'materials', jsonb_build_array(
      'Breathable knits for replica-inspired match kits.',
      'Durable prints built for match day and everyday wear.',
      'Low-impact dyes and non-toxic prints wherever possible.',
      'Pieces built to be worn hard, washed often, and kept.'
    ),
    'aboutBody', COALESCE(
      NULLIF(w.footer_config->>'aboutBody', ''),
      'Welcome to Jerzyfy. We focus on football jerseys only: replica-inspired club and national kits, and blank customs ready for name and number.'
    ),
    'body', COALESCE(
      NULLIF(w.footer_config->>'body', ''),
      'Jerzyfy is a football jersey store — club kits, national colours, and custom prints built to last beyond a season.'
    )
  ),
  updated_at = NOW()
FROM rewritten
WHERE w.id = rewritten.id;

-- 3) Verify
SELECT p.slug, p.featured, p.name
FROM products p
JOIN tenants t ON t.id = p.tenant_id
WHERE t.slug = 'jerzyfy'
  AND p.slug IN (
    'barcelona-home-jersey-2026-27-player-version',
    'barcelona-away-jersey-2026-27-player-version',
    'real-madrid-home-jersey-2026-27-player-version',
    'argentina-messi-10-farewell-jersey-player-version'
  )
ORDER BY p.slug;

SELECT s->>'type' AS type, s->>'heading' AS heading, s->'productSlugs' AS product_slugs
FROM website_settings w
JOIN tenants t ON t.id = w.tenant_id
CROSS JOIN LATERAL jsonb_array_elements(w.homepage_config->'sections') AS s
WHERE t.slug = 'jerzyfy'
  AND s->>'type' IN ('hero', 'statement', 'featured-products', 'cta', 'promo-banner')
ORDER BY s->>'type';
