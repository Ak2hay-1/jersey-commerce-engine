-- Map Jerzyfy custom domains to tenant slug "jerzyfy".
-- Run on production Postgres after domains are live:
--   docker compose -f infra/docker/docker-compose.api.yml --env-file infra/docker/.env.production exec -T postgres \
--     psql -U jersey -d jersey_commerce -f - < infra/docker/prod-tenant-hosts.sql

INSERT INTO tenant_hosts (id, tenant_id, host, kind, created_at, updated_at)
SELECT gen_random_uuid(), t.id, h.host, 'DOMAIN', NOW(), NOW()
FROM tenants t
CROSS JOIN (VALUES ('www.jerzyfy.in'), ('jerzyfy.in')) AS h(host)
WHERE t.slug = 'jerzyfy'
ON CONFLICT (host) DO NOTHING;
