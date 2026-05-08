import { clickhouse } from "@/lib/clickhouse";
import { ensureCampaignCommentKeywordsTable, getCampaignCommentKeywords } from "@/lib/campaignKeywords";
import { ensureCampaignReelsTable } from "@/lib/campaignReels";

type CampaignRow = {
  campaign_id: string;
  company_id: string;
  company_name: string;
  campaign_name: string;
  reward_pool: number | string;
  duration_days: number | string;
  invitation_deadline: string;
  start_date: string;
  end_date: string;
  target_gender: string;
  target_age_group: string;
  moderation_k: number | string;
  comment_keywords_ref: string;
};

type BrandRow = { company_id: string };
type InfluencerRow = { influencer_id: string };

type ParticipantStatsRow = {
  total_participants: number | string;
  invited_count: number | string;
  accepted_count: number | string;
  rejected_count: number | string;
  expired_count: number | string;
};

type PerformanceRow = {
  influencer_id: string;
  influencer_name: string;
  instagram_handle: string;
  status: string;
  reel_count: number | string;
  reel_urls: string;
};

export type CampaignReportInfluencer = {
  influencer_id: string;
  influencer_name: string;
  instagram_handle: string;
  status: string;
  reels_involved: number;
  ipi_score: number;
  rewards_earned: number;
  wallet_address: string;
  reel_urls: string[];
  top_performer: boolean;
};

export type CampaignReportData = {
  ready: boolean;
  role: "brand" | "influencer";
  campaign: {
    campaign_id: string;
    campaign_name: string;
    company_name: string;
    status: string;
    reward_pool: number;
    duration_days: number;
    invitation_deadline: string;
    start_date: string;
    end_date: string;
    target_gender: string;
    target_age_group: string;
    moderation_k: number;
  };
  metrics: {
    total_participants: number;
    invited_count: number;
    accepted_count: number;
    rejected_count: number;
    expired_count: number;
    total_reels_published: number;
    total_reach: number;
    total_engagement_rate: number;
    total_comments: number;
    total_reward_distributed: number;
    reward_per_accepted_influencer: number;
  };
  influencers: CampaignReportInfluencer[];
  insights: {
    top_keywords: string;
    summary: string;
  };
  comment_keywords: string[];
  generated_at: string;
};

export type CampaignReportResult = {
  success: boolean;
  message?: string;
  report?: CampaignReportData;
};

function splitReelUrls(raw: string): string[] {
  return raw
    .split(/\r?\n|\|/g)
    .map((item) => item.trim())
    .filter(Boolean);
}

function computeCampaignStatus(
  invitationDeadline: string,
  startDate: string,
  endDate: string
): string {
  const now = new Date();
  const invitation = new Date(invitationDeadline.replace(" ", "T") + "Z");
  const start = new Date(startDate.replace(" ", "T") + "Z");
  const end = new Date(endDate.replace(" ", "T") + "Z");

  if (Number.isNaN(invitation.getTime()) || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return "inviting";
  }

  if (now <= invitation) return "inviting";
  if (now >= start && now < end) return "active";
  if (now >= end) return "closed";
  return "inviting";
}

async function resolveWalletRole(campaignId: string, campaignCompanyId: string, wallet: string) {
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

  if (brandCompanyId && brandCompanyId === campaignCompanyId) {
    return "brand" as const;
  }

  if (influencerId) {
    const accessResult = await clickhouse.query({
      query: `
        SELECT count() as count
        FROM campaign_participants
        WHERE campaign_id = {campaignId:UUID}
          AND influencer_id = {influencerId:UUID}
          AND status IN ('invited', 'accepted')
      `,
      query_params: { campaignId, influencerId },
    });

    const accessData = await accessResult.json<{ count: number | string }>();
    if (Number(accessData.data[0]?.count ?? 0) > 0) {
      return "influencer" as const;
    }
  }

  return null;
}

export async function loadCampaignReport(campaignId: string, wallet: string): Promise<CampaignReportResult> {
  try {
    if (!wallet) {
      return {
        success: false,
        message: "Wallet address is required.",
      };
    }

    await ensureCampaignReelsTable();
    await ensureCampaignCommentKeywordsTable();

    const campaignResult = await clickhouse.query({
      query: `
        SELECT
          c.campaign_id as campaign_id,
          c.company_id as company_id,
          c.campaign_name as campaign_name,
          c.reward_pool as reward_pool,
          c.duration_days as duration_days,
          toString(c.invitation_deadline) as invitation_deadline,
          toString(c.start_date) as start_date,
          toString(c.end_date) as end_date,
          c.target_gender,
          c.target_age_group,
          c.moderation_k,
          c.comment_keywords_ref,
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
          c.moderation_k,
          c.comment_keywords_ref
        LIMIT 1
      `,
      query_params: { campaignId },
    });

    const campaignData = await campaignResult.json<CampaignRow>();
    const campaign = campaignData.data[0];

    if (!campaign) {
      return {
        success: false,
        message: "Campaign not found.",
      };
    }

    const role = await resolveWalletRole(campaignId, campaign.company_id, wallet);
    if (!role) {
      return {
        success: false,
        message: "You are not part of this campaign.",
      };
    }

    const campaignStatus = computeCampaignStatus(
      campaign.invitation_deadline,
      campaign.start_date,
      campaign.end_date
    );

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
      query_params: { campaignId },
    });

    const statsData = await statsResult.json<ParticipantStatsRow>();
    const stats = statsData.data[0] ?? {
      total_participants: 0,
      invited_count: 0,
      accepted_count: 0,
      rejected_count: 0,
      expired_count: 0,
    };

    // Fetch reel metrics (reach, engagement, comments)
    const metricsResult = await clickhouse.query({
      query: `
        SELECT
          sum(ifNull(reach, 0)) as total_reach,
          sum(ifNull(reach, 0)) / nullIf(sum(ifNull(views, 0)), 0) as engagement_rate,
          sum(ifNull(comments, 0)) as total_comments
        FROM scoring.reel_metrics
        WHERE campaign_id = toString({campaignId:UUID})
      `,
      query_params: { campaignId },
    });

    const metricsData = await metricsResult.json<{
      total_reach: number | string;
      engagement_rate: number | string;
      total_comments: number | string;
    }>();
    const reelMetrics = metricsData.data[0] ?? {
      total_reach: 0,
      engagement_rate: 0,
      total_comments: 0,
    };

    const performanceResult = await clickhouse.query({
      query: `
        SELECT
          cp.influencer_id,
          ifNull(nullIf(i.name, ''), ifNull(nullIf(i.instagram_handle, ''), 'Unknown')) as influencer_name,
          ifNull(i.instagram_handle, '') as instagram_handle,
          ifNull(i.wallet_address, '') as wallet_address,
          cp.status,
          ifNull(cr.reel_count, 0) as reel_count,
          ifNull(cr.reel_urls, '') as reel_urls,
          if(
            greatest(ifNull(si_uuid.final_index, 0), ifNull(si_ig.final_index, 0)) > 0,
            greatest(ifNull(si_uuid.final_index, 0), ifNull(si_ig.final_index, 0)),
            300
          ) as ipi_score,
          ifNull(pd.total_payout, 0) as amount_in_go
        FROM campaign_participants cp
        LEFT JOIN influencers i
          ON cp.influencer_id = i.influencer_id
        LEFT JOIN (
          SELECT
            campaign_id,
            influencer_id,
            count() as reel_count,
            arrayStringConcat(groupArray(reel_url), '\n') as reel_urls
          FROM campaign_reels
          GROUP BY campaign_id, influencer_id
        ) cr
          ON cr.campaign_id = cp.campaign_id
         AND cr.influencer_id = cp.influencer_id
        LEFT JOIN (
          SELECT
            replaceAll(lower(influencer_id), '-', '') as influencer_key,
            replaceAll(lower(campaign_id), '-', '') as campaign_key,
            max(final_index) as final_index
          FROM scoring.influencer_index
          GROUP BY influencer_key, campaign_key
        ) si_uuid
          ON si_uuid.influencer_key = replaceAll(lower(toString(cp.influencer_id)), '-', '')
         AND si_uuid.campaign_key = replaceAll(lower(toString(cp.campaign_id)), '-', '')
        LEFT JOIN (
          SELECT
            replaceAll(lower(influencer_id), '-', '') as influencer_key,
            replaceAll(lower(campaign_id), '-', '') as campaign_key,
            max(final_index) as final_index
          FROM scoring.influencer_index
          GROUP BY influencer_key, campaign_key
        ) si_ig
          ON si_ig.influencer_key = replaceAll(lower(ifNull(i.instagram_id, '')), '-', '')
         AND si_ig.campaign_key = replaceAll(lower(toString(cp.campaign_id)), '-', '')
        LEFT JOIN distribution.payout pd
          ON cp.campaign_id = pd.campaign_id
         AND cp.influencer_id = pd.influencer_id
        WHERE cp.campaign_id = {campaignId:UUID}
        ORDER BY cp.joined_at ASC
      `,
      query_params: { campaignId },
    });

    const performanceData = await performanceResult.json<PerformanceRow & { wallet_address: string; ipi_score: number; amount_in_go: number }>();
    const acceptedCount = Number(stats.accepted_count ?? 0);
    const totalRewardDistributed = Number(campaign.reward_pool ?? 0);
    const rewardPerAcceptedInfluencer = acceptedCount > 0 ? totalRewardDistributed / acceptedCount : 0;

    const commentKeywords = campaign.comment_keywords_ref
      ? await getCampaignCommentKeywords(campaign.comment_keywords_ref)
      : [];

    const influencers = performanceData.data.map((row) => ({
      influencer_id: row.influencer_id,
      influencer_name: row.influencer_name || "Unknown",
      instagram_handle: row.instagram_handle || "",
      wallet_address: row.wallet_address || "",
      status: row.status,
      reels_involved: Number(row.reel_count ?? 0),
      ipi_score: Number(row.ipi_score ?? 300),
      rewards_earned: row.status === "accepted" ? Number(row.amount_in_go ?? 0) || Number(rewardPerAcceptedInfluencer.toFixed(4)) : 0,
      reel_urls: splitReelUrls(row.reel_urls || ""),
      top_performer: false,
    }));

    const topInfluencerIpi = influencers.reduce((max, row) => Math.max(max, row.ipi_score), 0);
    const topInfluencerIndex = influencers.findIndex((row) => row.ipi_score === topInfluencerIpi);

    const normalizedInfluencers = influencers.map((row, index) => ({
      ...row,
      top_performer: index === topInfluencerIndex && topInfluencerIndex >= 0,
    }));

    const totalReelsPublished = normalizedInfluencers.reduce(
      (sum, row) => sum + row.reels_involved,
      0
    );

    const topKeywords = commentKeywords.length ? commentKeywords.slice(0, 3).join(" • ") : "No keywords added";
    const summary = commentKeywords.length
      ? `${campaign.campaign_name} finished with consistent creator output across ${commentKeywords.slice(0, 3).join(", ")} content themes.`
      : `${campaign.campaign_name} finished with stable creator participation and clean audience alignment.`;

    return {
      success: true,
      report: {
        ready: campaignStatus === "closed",
        role,
        campaign: {
          campaign_id: campaign.campaign_id,
          campaign_name: campaign.campaign_name,
          company_name: campaign.company_name || "Unknown",
          status: campaignStatus,
          reward_pool: totalRewardDistributed,
          duration_days: Number(campaign.duration_days ?? 0),
          invitation_deadline: campaign.invitation_deadline,
          start_date: campaign.start_date,
          end_date: campaign.end_date,
          target_gender: campaign.target_gender || "",
          target_age_group: campaign.target_age_group || "",
          moderation_k: Number(campaign.moderation_k ?? 0),
        },
        metrics: {
          total_participants: Number(stats.total_participants ?? 0),
          invited_count: Number(stats.invited_count ?? 0),
          accepted_count: Number(stats.accepted_count ?? 0),
          rejected_count: Number(stats.rejected_count ?? 0),
          expired_count: Number(stats.expired_count ?? 0),
          total_reels_published: totalReelsPublished,
          total_reach: Number(reelMetrics.total_reach ?? 0),
          total_engagement_rate: Number((Number(reelMetrics.engagement_rate ?? 0) * 100).toFixed(2)),
          total_comments: Number(reelMetrics.total_comments ?? 0),
          total_reward_distributed: totalRewardDistributed,
          reward_per_accepted_influencer: Number(rewardPerAcceptedInfluencer.toFixed(4)),
        },
        influencers: normalizedInfluencers,
        insights: {
          top_keywords: topKeywords,
          summary,
        },
        comment_keywords: commentKeywords,
        generated_at: new Date().toISOString(),
      },
    };
  } catch (error) {
    console.error("loadCampaignReport error", error);
    return {
      success: false,
      message: "Failed to load campaign report.",
    };
  }
}
