import { clickhouse } from "@/lib/clickhouse";
import { ensureCampaignReelsTable } from "@/lib/campaignReels";
import { ensureCampaignTimelinesTable } from "@/lib/campaignTimeline";

type InfluencerRow = {
  influencer_id: string;
};

type ActiveCampaignRow = {
  participant_id: string;
  campaign_id: string;
  campaign_name: string;
  reward_pool: number | string;
  duration_days: number | string;
  start_date: string;
  reel_url: string;
};

function splitReelUrls(raw: string): string[] {
  return raw
    .split(/\r?\n|\|/g)
    .map((item) => item.trim())
    .filter(Boolean);
}

export async function GET(req: Request) {
  try {
    const wallet = req.url
      ? new URL(req.url).searchParams.get("wallet")?.trim().toLowerCase()
      : null;

    if (!wallet) {
      return Response.json(
        { success: false, message: "Wallet address is required." },
        { status: 400 }
      );
    }

    const influencerResult = await clickhouse.query({
      query: `
        SELECT influencer_id
        FROM influencers
        WHERE lower(wallet_address) = {wallet:String}
        LIMIT 1
      `,
      query_params: { wallet },
    });

    const influencerData = await influencerResult.json<InfluencerRow>();
    const influencer_id = influencerData.data[0]?.influencer_id;

    if (!influencer_id) {
      return Response.json(
        { success: false, needsOnboarding: true, campaigns: [] },
        { status: 404 }
      );
    }

    await ensureCampaignTimelinesTable();
    await ensureCampaignReelsTable();

    const result = await clickhouse.query({
      query: `
        SELECT
          cp.id as participant_id,
          c.campaign_id as campaign_id,
          c.campaign_name as campaign_name,
          c.reward_pool as reward_pool,
          c.duration_days as duration_days,
          toString(ct.start_date) as start_date,
          ifNull(cr.reel_url, '') as reel_url
        FROM campaign_participants cp
        INNER JOIN campaigns c ON cp.campaign_id = c.campaign_id
        INNER JOIN campaign_timelines ct ON c.campaign_id = ct.campaign_id
        LEFT JOIN (
          SELECT
            campaign_id,
            influencer_id,
            arrayStringConcat(groupArray(reel_url), '\n') as reel_url
          FROM campaign_reels
          GROUP BY campaign_id, influencer_id
        ) cr
          ON cr.campaign_id = cp.campaign_id
         AND cr.influencer_id = cp.influencer_id
        WHERE cp.influencer_id = {influencerId:UUID}
          AND cp.status = 'accepted'
          AND now() >= c.start_date AND now() < c.end_date
          AND now() >= ct.start_date
          AND now() < ct.start_date + toIntervalDay(c.duration_days)
        ORDER BY ct.start_date DESC
      `,
      query_params: { influencerId: influencer_id },
    });

    const data = await result.json<ActiveCampaignRow>();

    return Response.json({
      success: true,
      campaigns: data.data.map((row) => ({
        participant_id: row.participant_id,
        campaign_id: row.campaign_id,
        campaign_name: row.campaign_name,
        reward_pool: Number(row.reward_pool ?? 0),
        duration_days: Number(row.duration_days ?? 0),
        start_date: row.start_date,
        reel_urls: splitReelUrls(row.reel_url || ""),
        reel_url: splitReelUrls(row.reel_url || "")[0] || "",
      })),
    });
  } catch (error) {
    console.error("/api/influencer/active-campaigns error", error);
    return Response.json(
      { success: false, message: "Failed to load active campaigns." },
      { status: 500 }
    );
  }
}
