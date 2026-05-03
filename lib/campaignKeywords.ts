import { clickhouse } from "@/lib/clickhouse";

export async function ensureCampaignCommentKeywordsTable() {
  await clickhouse.command({
    query: `
      CREATE TABLE IF NOT EXISTS campaign_comment_keywords (
        id UUID DEFAULT generateUUIDv4(),
        comment_keywords_ref UUID,
        keyword String
      )
      ENGINE = MergeTree
      ORDER BY (comment_keywords_ref, id)
    `,
  });
}

/**
 * Insert preferred comment keywords for a campaign
 * @param commentKeywordsRef - Campaign-level reference UUID
 * @param keywords - Array of keyword strings (1-4 max)
 */
export async function insertCampaignCommentKeywords(
  commentKeywordsRef: string,
  keywords: string[]
): Promise<void> {
  if (!keywords || keywords.length === 0) return;

  const validKeywords = keywords
    .slice(0, 4)
    .map((k) => String(k || "").trim())
    .filter(Boolean);

  if (validKeywords.length === 0) return;

  await ensureCampaignCommentKeywordsTable();

  const values = validKeywords.map((keyword) => ({
    comment_keywords_ref: commentKeywordsRef,
    keyword,
  }));

  await clickhouse.insert({
    table: "campaign_comment_keywords",
    values,
    format: "JSONEachRow",
  });
}

/**
 * Fetch preferred comment keywords for a campaign
 */
export async function getCampaignCommentKeywords(commentKeywordsRef: string): Promise<string[]> {
  await ensureCampaignCommentKeywordsTable();

  const result = await clickhouse.query({
    query: `
      SELECT keyword
      FROM campaign_comment_keywords
      WHERE comment_keywords_ref = {commentKeywordsRef:UUID}
      ORDER BY id ASC
      LIMIT 4
    `,
    query_params: { commentKeywordsRef },
  });

  const data = await result.json<{ keyword: string }>();
  return data.data.map((row) => row.keyword);
}
