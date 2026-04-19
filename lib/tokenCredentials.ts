import { clickhouse } from "@/lib/clickhouse";
import { toClickHouseDateTime } from "@/lib/notifications";

type CampaignAccessTokenRow = {
  influencer_id: string;
  handle_name: string;
  campaign_id: string;
  access_token: string;
  created_at: string;
  updated_at: string;
};

function getTokenDatabaseName(): string {
  return (process.env.CLICKHOUSE_TOKEN_DATABASE || "secure_tokens").trim();
}

export async function ensureTokenCredentialsStore() {
  const db = getTokenDatabaseName();

  await clickhouse.command({
    query: `CREATE DATABASE IF NOT EXISTS ${db}`,
  });

  await clickhouse.command({
    query: `
      CREATE TABLE IF NOT EXISTS ${db}.influencer_token_credentials (
        influencer_id UUID,
        handle_name String,
        campaign_id UUID,
        access_token String,
        created_at DateTime DEFAULT now(),
        updated_at DateTime DEFAULT now()
      )
      ENGINE = ReplacingMergeTree(updated_at)
      ORDER BY (influencer_id, campaign_id)
    `,
  });
}

export async function upsertCampaignAccessToken(params: {
  influencerId: string;
  handleName: string;
  campaignId: string;
  accessToken: string;
}) {
  await ensureTokenCredentialsStore();

  const db = getTokenDatabaseName();
  const now = toClickHouseDateTime(new Date());

  await clickhouse.insert({
    table: `${db}.influencer_token_credentials`,
    values: [
      {
        influencer_id: params.influencerId,
        handle_name: params.handleName,
        campaign_id: params.campaignId,
        access_token: params.accessToken,
        created_at: now,
        updated_at: now,
      },
    ],
    format: "JSONEachRow",
  });
}

export async function getParticipantTokenCredential(participantId: string) {
  await ensureTokenCredentialsStore();

  const db = getTokenDatabaseName();

  const participantResult = await clickhouse.query({
    query: `
      SELECT influencer_id, campaign_id
      FROM campaign_participants
      WHERE id = {participantId:UUID}
      LIMIT 1
    `,
    query_params: { participantId },
  });

  const participantData = await participantResult.json<{
    influencer_id: string;
    campaign_id: string;
  }>();

  const participant = participantData.data[0];
  if (!participant) return null;

  const result = await clickhouse.query({
    query: `
      SELECT
        influencer_id,
        handle_name,
        campaign_id,
        access_token,
        toString(created_at) as created_at,
        toString(updated_at) as updated_at
      FROM ${db}.influencer_token_credentials
      WHERE influencer_id = {influencerId:UUID}
        AND campaign_id = {campaignId:UUID}
      ORDER BY updated_at DESC
      LIMIT 1
    `,
    query_params: {
      influencerId: participant.influencer_id,
      campaignId: participant.campaign_id,
    },
  });

  const data = await result.json<CampaignAccessTokenRow>();
  return data.data[0] || null;
}
