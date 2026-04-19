import { clickhouse } from "@/lib/clickhouse";

export function toClickHouseDateTime(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  return date.toISOString().slice(0, 19).replace("T", " ");
}

export async function ensureCampaignNotificationsTable() {
  await clickhouse.command({
    query: `
      CREATE TABLE IF NOT EXISTS campaign_notifications (
        id UUID,
        influencer_id UUID,
        participant_id UUID,
        campaign_id UUID,
        notification_type String,
        title String,
        message String,
        is_read UInt8 DEFAULT 0,
        created_at DateTime DEFAULT now()
      )
      ENGINE = MergeTree
      ORDER BY (influencer_id, created_at)
    `,
  });
}
