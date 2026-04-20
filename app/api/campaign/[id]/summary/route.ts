import { clickhouse } from "@/lib/clickhouse";
import { ensureCampaignReelsTable } from "@/lib/campaignReels";

type CampaignRow = {
  campaign_id: string;
  company_id: string;
  company_name: string;
  campaign_name: string;
  reward_pool: number | string;
  duration_days: number | string;
  status: string;
  invitation_deadline: string;
  start_date: string;
  end_date: string;
  target_gender: string;
  target_age_group: string;
  moderation_k: number | string;
};

type BrandRow = { company_id: string };
type InfluencerRow = { influencer_id: string };
type CountRow = { count: number | string };

type ParticipantStatsRow = {
  total_participants: number | string;
  invited_count: number | string;
  accepted_count: number | string;
  rejected_count: number | string;
  expired_count: number | string;
};

type ParticipantRow = {
  influencer_id: string;
  handle_name: string;
  status: string;
  reel_url: string;
};

function splitReelUrls(raw: string): string[] {
  return raw
    .split(/\r?\n|\|/g)
    .map((item) => item.trim())
    .filter(Boolean);
}

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const wallet = req.url
      ? new URL(req.url).searchParams.get("wallet")?.trim().toLowerCase()
      : null;

    if (!wallet) {
      return Response.json(
        { success: false, message: "Wallet address is required." },
        { status: 400 }
      );
    }

    await ensureCampaignReelsTable();

    const campaignResult = await clickhouse.query({
      query: `
        SELECT
          c.campaign_id as campaign_id,
          c.company_id as company_id,
          c.campaign_name as campaign_name,
          c.reward_pool as reward_pool,
          c.duration_days as duration_days,
          multiIf(
            now() <= c.invitation_deadline, 'inviting',
            now() >= c.start_date AND now() < c.end_date, 'active',
            now() >= c.end_date, 'closed',
            'inviting'
          ) as status,
          toString(c.invitation_deadline) as invitation_deadline,
          toString(c.start_date) as start_date,
          toString(c.end_date) as end_date,
          c.target_gender,
          c.target_age_group,
          c.moderation_k,
          ifNull(any(cvr.company_name), '') as company_name
        FROM campaigns c
        LEFT JOIN company_verification_requests cvr
          ON c.company_id = cvr.request_id
        WHERE c.campaign_id = {campaignId:UUID}
        GROUP BY
          c.campaign_id,
          c.company_id,
          c.campaign_name,
          c.reward_pool,
          c.duration_days,
          c.invitation_deadline,
          c.start_date,
          c.end_date,
          c.target_gender,
          c.target_age_group,
          c.moderation_k
        LIMIT 1
      `,
      query_params: { campaignId: id },
    });

    const campaignData = await campaignResult.json<CampaignRow>();
    const campaign = campaignData.data[0];

    if (!campaign) {
      return Response.json(
        { success: false, message: "Campaign not found." },
        { status: 404 }
      );
    }

    const brandResult = await clickhouse.query({
      query: `
        SELECT wb.entity_id as company_id
        FROM wallet_bindings wb
        INNER JOIN company_verification_requests cvr
          ON wb.entity_id = cvr.request_id
        WHERE wb.wallet_address = {wallet:String}
          AND wb.entity_type = 'brand'
          AND cvr.status = 'approved'
        ORDER BY cvr.created_at DESC
        LIMIT 1
      `,
      query_params: { wallet },
    });

    const brandData = await brandResult.json<BrandRow>();
    const brandCompanyId = brandData.data[0]?.company_id;

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
    const influencerId = influencerData.data[0]?.influencer_id;

    let role: "brand" | "influencer" | null = null;

    if (brandCompanyId && brandCompanyId === campaign.company_id) {
      role = "brand";
    }

    if (!role && influencerId) {
      const accessResult = await clickhouse.query({
        query: `
          SELECT count() as count
          FROM campaign_participants
          WHERE campaign_id = {campaignId:UUID}
            AND influencer_id = {influencerId:UUID}
            AND status IN ('invited', 'accepted')
        `,
        query_params: { campaignId: id, influencerId },
      });

      const accessData = await accessResult.json<CountRow>();
      if (Number(accessData.data[0]?.count ?? 0) > 0) {
        role = "influencer";
      }
    }

    if (!role) {
      return Response.json(
        { success: false, message: "You are not part of this campaign." },
        { status: 403 }
      );
    }

    const statsResult = await clickhouse.query({
      query: `
        SELECT
          count() as total_participants,
          countIf(status = 'invited') as invited_count,
          countIf(status = 'accepted') as accepted_count,
          countIf(status = 'rejected') as rejected_count,
          countIf(status = 'expired') as expired_count
        FROM campaign_participants
        WHERE campaign_id = {campaignId:UUID}
      `,
      query_params: { campaignId: id },
    });

    const statsData = await statsResult.json<ParticipantStatsRow>();
    const participantStats = statsData.data[0] ?? {
      total_participants: 0,
      invited_count: 0,
      accepted_count: 0,
      rejected_count: 0,
      expired_count: 0,
    };

    const participantsResult = await clickhouse.query({
      query: `
        SELECT
          cp.influencer_id,
          if(i.instagram_handle != '', i.instagram_handle, i.name) as handle_name,
          cp.status,
          ifNull(cr.reel_url, '') as reel_url
        FROM campaign_participants cp
        LEFT JOIN influencers i ON cp.influencer_id = i.influencer_id
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
        WHERE cp.campaign_id = {campaignId:UUID}
        ORDER BY cp.joined_at DESC
        LIMIT 12
      `,
      query_params: { campaignId: id },
    });

    const participantsData = await participantsResult.json<ParticipantRow>();

    return Response.json({
      success: true,
      role,
      campaign: {
        campaign_id: campaign.campaign_id,
        campaign_name: campaign.campaign_name,
        company_name: campaign.company_name,
        status: campaign.status,
        reward_pool: Number(campaign.reward_pool ?? 0),
        duration_days: Number(campaign.duration_days ?? 0),
        invitation_deadline: campaign.invitation_deadline,
        start_date: campaign.start_date,
        end_date: campaign.end_date,
        target_gender: campaign.target_gender || "",
        target_age_group: campaign.target_age_group || "",
        moderation_k: Number(campaign.moderation_k ?? 0),
      },
      participant_stats: {
        total_participants: Number(participantStats.total_participants ?? 0),
        invited_count: Number(participantStats.invited_count ?? 0),
        accepted_count: Number(participantStats.accepted_count ?? 0),
        rejected_count: Number(participantStats.rejected_count ?? 0),
        expired_count: Number(participantStats.expired_count ?? 0),
      },
      involved_influencers: participantsData.data.map((p) => ({
        influencer_id: p.influencer_id,
        handle_name: p.handle_name || "unknown",
        status: p.status,
        reel_url: p.reel_url || "",
        reel_urls: splitReelUrls(p.reel_url || ""),
      })),
    });
  } catch (error) {
    console.error("/api/campaign/[id]/summary error", error);
    return Response.json(
      { success: false, message: "Failed to load campaign summary." },
      { status: 500 }
    );
  }
}
