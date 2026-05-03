import { clickhouse } from "@/lib/clickhouse";

export async function ensureCampaignKeywordsTable() {
  await clickhouse.command({
    query: `
      CREATE TABLE IF NOT EXISTS campaign_keywords (
        id UUID DEFAULT generateUUIDv4(),
        campaign_id UUID,
        keyword String
      )
      ENGINE = MergeTree
      ORDER BY (campaign_id, id)
    `,
  });
}

/**
 * Insert keywords for a campaign
 * @param campaignId - Campaign UUID
 * @param keywords - Array of keyword strings (1-4 max)
 */
export async function insertCampaignKeywords(
  campaignId: string,
  keywords: string[]
): Promise<void> {
  if (!keywords || keywords.length === 0) return;

  const validKeywords = keywords
    .slice(0, 4)
    .map((k) => String(k || "").trim())
    .filter(Boolean);

  if (validKeywords.length === 0) return;

  await ensureCampaignKeywordsTable();

  const values = validKeywords.map((keyword) => ({
    campaign_id: campaignId,
    keyword,
  }));

  await clickhouse.insert({
    table: "campaign_keywords",
    values,
    format: "JSONEachRow",
  });
}

/**
 * Fetch keywords for a campaign
 */
export async function getCampaignKeywords(campaignId: string): Promise<string[]> {
  await ensureCampaignKeywordsTable();

  const result = await clickhouse.query({
    query: `
      SELECT keyword
      FROM campaign_keywords
      WHERE campaign_id = {campaignId:UUID}
      ORDER BY id ASC
      LIMIT 4
    `,
    query_params: { campaignId },
  });

  const data = await result.json<{ keyword: string }>();
  return data.data.map((row) => row.keyword);
}
