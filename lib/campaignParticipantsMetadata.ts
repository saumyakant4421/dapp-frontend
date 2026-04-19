import { clickhouse } from "@/lib/clickhouse";

export async function ensureCampaignParticipantsTokenColumns() {
  await clickhouse.command({
    query: `
      ALTER TABLE campaign_participants
      ADD COLUMN IF NOT EXISTS token_status String
      DEFAULT 'missing'
    `,
  });

  await clickhouse.command({
    query: `
      ALTER TABLE campaign_participants
      ADD COLUMN IF NOT EXISTS oauth_platform String
      DEFAULT ''
    `,
  });

  await clickhouse.command({
    query: `
      ALTER TABLE campaign_participants
      ADD COLUMN IF NOT EXISTS token_updated_at DateTime
      DEFAULT now()
    `,
  });

  await clickhouse.command({
    query: `
      ALTER TABLE campaign_participants
      ADD COLUMN IF NOT EXISTS responded_at DateTime
      DEFAULT now()
    `,
  });

  await clickhouse.command({
    query: `
      ALTER TABLE campaign_participants
      ADD COLUMN IF NOT EXISTS decision String
      DEFAULT ''
    `,
  });
}

export async function backfillCampaignParticipantsResponseData() {
  await clickhouse.command({
    query: `
      ALTER TABLE campaign_participants
      UPDATE
        decision = if(decision = '', status, decision),
        responded_at = if(
          responded_at = toDateTime(0) AND status IN ('accepted', 'rejected', 'expired'),
          if(token_updated_at > toDateTime(0), token_updated_at, invited_at),
          responded_at
        ),
        token_status = if(token_status = '', 'missing', token_status)
      WHERE status IN ('accepted', 'rejected', 'expired')
         OR decision = ''
         OR responded_at = toDateTime(0)
         OR token_status = ''
    `,
  });
}

export async function cleanupLegacyCampaignParticipantColumns() {
  await clickhouse.command({
    query: `
      ALTER TABLE campaign_participants
      DROP COLUMN IF EXISTS vault_path
    `,
  });

  await clickhouse.command({
    query: `
      ALTER TABLE campaign_participants
      DROP COLUMN IF EXISTS reel_url
    `,
  });

  await clickhouse.command({
    query: `
      ALTER TABLE campaign_participants
      DROP COLUMN IF EXISTS reel_updated_at
    `,
  });
}
