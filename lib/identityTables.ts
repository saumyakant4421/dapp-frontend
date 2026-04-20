import { clickhouse } from "@/lib/clickhouse";

export async function ensureIdentityTables() {
  await clickhouse.command({
    query: `
      CREATE TABLE IF NOT EXISTS company_verification_requests (
        request_id UUID,
        company_name String,
        official_email String,
        website String,
        linkedin String,
        proof_url String,
        status String,
        created_at DateTime DEFAULT now()
      )
      ENGINE = MergeTree
      ORDER BY (company_name, created_at, request_id)
    `,
  });

  await clickhouse.command({
    query: `
      CREATE TABLE IF NOT EXISTS wallet_bindings (
        wallet_address String,
        entity_type String,
        entity_id UUID,
        created_at DateTime DEFAULT now()
      )
      ENGINE = MergeTree
      ORDER BY (wallet_address, entity_type, created_at)
    `,
  });

  await clickhouse.command({
    query: `
      CREATE TABLE IF NOT EXISTS influencers (
        influencer_id UUID,
        wallet_address String,
        name String,
        instagram_handle String,
        instagram_id String DEFAULT '',
        category String DEFAULT 'unassigned',
        created_at DateTime DEFAULT now()
      )
      ENGINE = MergeTree
      ORDER BY (influencer_id, created_at)
    `,
  });

  await clickhouse.command({
    query: `
      ALTER TABLE influencers
      ADD COLUMN IF NOT EXISTS instagram_id String
      DEFAULT ''
    `,
  });

  await clickhouse.command({
    query: `
      ALTER TABLE wallet_bindings
      ADD COLUMN IF NOT EXISTS created_at DateTime
      DEFAULT now()
    `,
  });

  await clickhouse.command({
    query: `
      ALTER TABLE influencers
      ADD COLUMN IF NOT EXISTS created_at DateTime
      DEFAULT now()
    `,
  });

  await clickhouse.command({
    query: `
      ALTER TABLE wallet_bindings
      MODIFY COLUMN created_at DateTime DEFAULT now()
    `,
  });

  await clickhouse.command({
    query: `
      ALTER TABLE influencers
      MODIFY COLUMN created_at DateTime DEFAULT now()
    `,
  });
}
