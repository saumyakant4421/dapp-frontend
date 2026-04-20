import { clickhouse } from "@/lib/clickhouse";

export const CAMPAIGN_STATUS_CASE_SQL = `
  multiIf(
    now() <= invitation_deadline, 'inviting',
    now() >= start_date AND now() < end_date, 'active',
    now() >= end_date, 'closed',
    'inviting'
  )
`;

function isCannotUpdateKeyColumnError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;

  const maybeError = error as { code?: string; type?: string; message?: string };
  const message = String(maybeError.message || "");

  return (
    maybeError.code === "420" ||
    maybeError.type === "CANNOT_UPDATE_COLUMN" ||
    message.includes("Cannot UPDATE key column")
  );
}

export async function syncCampaignStatuses() {
  try {
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
  } catch (error) {
    if (isCannotUpdateKeyColumnError(error)) {
      console.warn(
        "syncCampaignStatuses skipped: campaigns.status appears to be a key column in ClickHouse."
      );
      return;
    }

    throw error;
  }
}
