import { clickhouse } from "@/lib/clickhouse";

export function toClickHouseDateTime(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  return date.toISOString().slice(0, 19).replace("T", " ");
}

export async function ensureCampaignTimelinesTable() {
  await clickhouse.command({
    query: `
      CREATE TABLE IF NOT EXISTS campaign_timelines (
        campaign_id UUID,
        invitation_deadline DateTime,
        start_date DateTime
      )
      ENGINE = MergeTree
      ORDER BY (campaign_id)
    `,
  });
}
