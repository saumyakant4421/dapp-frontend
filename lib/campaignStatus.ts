import { clickhouse } from "@/lib/clickhouse";

export const CAMPAIGN_STATUS_CASE_SQL = `
  multiIf(
    now() <= invitation_deadline, 'inviting',
    now() >= start_date AND now() < end_date, 'active',
    now() >= end_date, 'closed',
    'inviting'
  )
`;

export async function syncCampaignStatuses() {
  await clickhouse.command({
    query: `
      ALTER TABLE campaigns
      UPDATE status = ${CAMPAIGN_STATUS_CASE_SQL}
      WHERE status != ${CAMPAIGN_STATUS_CASE_SQL}
    `,
    clickhouse_settings: {
      mutations_sync: "1",
    },
  });
}
