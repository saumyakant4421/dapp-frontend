import { clickhouse } from "@/lib/clickhouse";

type InfluencerRow = {
  influencer_id: string;
};

type EarningsRow = {
  campaign_id: string;
  campaign_name: string;
  estimated_earning: number | string;
  end_date: string;
};

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
        {
          success: false,
          needsOnboarding: true,
          summary: {
            total_estimated_earned: 0,
            completed_campaigns: 0,
          },
          rows: [],
        },
        { status: 404 }
      );
    }

    const earningsResult = await clickhouse.query({
      query: `
        WITH accepted_counts AS (
          SELECT campaign_id, count() as accepted_count
          FROM campaign_participants
          WHERE status = 'accepted'
          GROUP BY campaign_id
        )
        SELECT
          c.campaign_id as campaign_id,
          c.campaign_name as campaign_name,
          toString(c.end_date) as end_date,
          round(
            toFloat64(c.reward_pool) / greatest(toFloat64(ifNull(ac.accepted_count, 1)), 1),
            4
          ) as estimated_earning
        FROM campaign_participants cp
        INNER JOIN campaigns c ON cp.campaign_id = c.campaign_id
        LEFT JOIN accepted_counts ac ON c.campaign_id = ac.campaign_id
        WHERE cp.influencer_id = {influencerId:UUID}
          AND cp.status = 'accepted'
          AND now() >= c.end_date
        ORDER BY c.end_date DESC
        LIMIT 50
      `,
      query_params: { influencerId: influencer_id },
    });

    const earningsData = await earningsResult.json<EarningsRow>();
    const rows = earningsData.data.map((row) => ({
      campaign_id: row.campaign_id,
      campaign_name: row.campaign_name,
      end_date: row.end_date,
      estimated_earning: Number(row.estimated_earning ?? 0),
    }));

    const totalEstimatedEarned = rows.reduce((sum, row) => sum + row.estimated_earning, 0);

    return Response.json({
      success: true,
      summary: {
        total_estimated_earned: Number(totalEstimatedEarned.toFixed(4)),
        completed_campaigns: rows.length,
      },
      rows,
      note: "Estimated earnings are computed as reward pool divided by accepted participants in each closed campaign.",
    });
  } catch (error) {
    console.error("/api/influencer/earnings error", error);
    return Response.json(
      { success: false, message: "Failed to load earnings." },
      { status: 500 }
    );
  }
}
