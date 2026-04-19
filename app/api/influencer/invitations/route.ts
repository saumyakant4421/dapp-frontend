import { clickhouse } from "@/lib/clickhouse";
import { ensureCampaignTimelinesTable } from "@/lib/campaignTimeline";

type InfluencerRow = {
  influencer_id: string;
};

type InvitationRow = {
  campaign_id: string;
  campaign_name: string;
  reward_pool: number | string;
  status: string;
  invitation_deadline: string;
  start_date: string;
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
        { success: false, needsOnboarding: true, invitations: [] },
        { status: 404 }
      );
    }

    await ensureCampaignTimelinesTable();

    const invitationsResult = await clickhouse.query({
      query: `
        SELECT
          c.campaign_id as campaign_id,
          c.campaign_name as campaign_name,
          c.reward_pool as reward_pool,
          cp.status as status,
          toString(ct.invitation_deadline) as invitation_deadline,
          toString(ct.start_date) as start_date
        FROM campaign_participants cp
        INNER JOIN campaigns c ON cp.campaign_id = c.campaign_id
        INNER JOIN campaign_timelines ct ON c.campaign_id = ct.campaign_id
        WHERE cp.influencer_id = {influencerId:UUID}
          AND cp.status IN ('invited', 'accepted', 'rejected', 'expired')
        ORDER BY ct.invitation_deadline ASC
      `,
      query_params: { influencerId: influencer_id },
    });

    const invitationsData = await invitationsResult.json<InvitationRow>();
    const now = new Date();

    const invitations = invitationsData.data.map((row) => {
      const deadline = new Date(row.invitation_deadline.replace(" ", "T"));
      const expired = now.getTime() > deadline.getTime();
      const computedStatus = row.status === "invited" && expired ? "expired" : row.status;

      return {
        campaign_id: row.campaign_id,
        campaign_name: row.campaign_name,
        reward_pool: Number(row.reward_pool ?? 0),
        invitation_deadline: row.invitation_deadline,
        start_date: row.start_date,
        status: computedStatus,
      };
    });

    return Response.json({ success: true, invitations });
  } catch (error) {
    console.error("/api/influencer/invitations error", error);
    return Response.json(
      { success: false, message: "Failed to load invitations." },
      { status: 500 }
    );
  }
}
