import { clickhouse } from "@/lib/clickhouse";

export async function ensureCampaignReelsTable() {
  await clickhouse.command({
    query: `
      CREATE TABLE IF NOT EXISTS campaign_reels (
        id UUID,
        campaign_id UUID,
        influencer_id UUID,
        reel_url String,
        reel_updated_at DateTime DEFAULT now(),
        reel_processed UInt8 DEFAULT 0,
        created_at DateTime DEFAULT now()
      )
      ENGINE = MergeTree
      ORDER BY (campaign_id, influencer_id, reel_updated_at, id)
    `,
  });

  await clickhouse.command({
    query: `
      ALTER TABLE campaign_reels
      ADD COLUMN IF NOT EXISTS reel_updated_at DateTime
      DEFAULT now()
    `,
  });

  await clickhouse.command({
    query: `
      ALTER TABLE campaign_reels
      ADD COLUMN IF NOT EXISTS reel_processed UInt8
      DEFAULT 0
    `,
  });
}
