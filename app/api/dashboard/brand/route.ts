import { clickhouse } from "@/lib/clickhouse";

type WalletCompanyRow = {
  company_id: string;
  company_name: string;
};

type CampaignStatsRow = {
  total_campaigns: number | string;
  active_campaigns: number | string;
  total_reward_pool: number | string;
};

type CampaignRow = {
  campaign_id: string;
  campaign_name: string;
  reward_pool: number | string;
  duration_days: number | string;
  status: string;
  created_at: string;
};

type ParticipantCountRow = {
  campaign_id: string;
  participants: number | string;
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

    const companyResult = await clickhouse.query({
      query: `
        SELECT
          wb.entity_id as company_id,
          cvr.company_name as company_name
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

    const companyData = await companyResult.json<WalletCompanyRow>();
    const company = companyData.data[0];

    if (!company?.company_id) {
      return Response.json(
        { success: false, message: "No verified company linked to this wallet." },
        { status: 404 }
      );
    }

    const statsResult = await clickhouse.query({
      query: `
        SELECT
          count() as total_campaigns,
          countIf(now('UTC') >= start_date AND now('UTC') < end_date) as active_campaigns,
          toFloat64(sumOrNull(reward_pool)) as total_reward_pool
        FROM campaigns
        WHERE company_id = {companyId:UUID}
      `,
      query_params: { companyId: company.company_id },
    });

    const statsData = await statsResult.json<CampaignStatsRow>();
    const stats = statsData.data[0] ?? {
      total_campaigns: 0,
      active_campaigns: 0,
      total_reward_pool: 0,
    };

    const campaignsResult = await clickhouse.query({
      query: `
        SELECT
          campaign_id,
          campaign_name,
          reward_pool,
          duration_days,
          multiIf(
            now('UTC') <= invitation_deadline, 'inviting',
            now('UTC') >= start_date AND now('UTC') < end_date, 'active',
            now('UTC') >= end_date, 'closed',
            'inviting'
          ) as status,
          toString(created_at) as created_at
        FROM campaigns
        WHERE company_id = {companyId:UUID}
        ORDER BY created_at DESC
        LIMIT 20
      `,
      query_params: { companyId: company.company_id },
    });

    const campaignsData = await campaignsResult.json<CampaignRow>();

    const participantCountsResult = await clickhouse.query({
      query: `
        SELECT
          campaign_id,
          count() as participants
        FROM campaign_participants
        WHERE campaign_id IN (
          SELECT campaign_id
          FROM campaigns
          WHERE company_id = {companyId:UUID}
          ORDER BY created_at DESC
          LIMIT 20
        )
        GROUP BY campaign_id
      `,
      query_params: { companyId: company.company_id },
    });

    const participantCountsData = await participantCountsResult.json<ParticipantCountRow>();

    const participantMap = new Map<string, number>(
      participantCountsData.data.map((row) => [row.campaign_id, Number(row.participants ?? 0)])
    );

    const campaigns = campaignsData.data.map((campaign) => ({
      campaign_id: campaign.campaign_id,
      campaign_name: campaign.campaign_name,
      reward_pool: Number(campaign.reward_pool ?? 0),
      duration_days: Number(campaign.duration_days ?? 0),
      status: campaign.status,
      created_at: campaign.created_at,
      participants: participantMap.get(campaign.campaign_id) ?? 0,
    }));

    return Response.json({
      success: true,
      company: {
        company_id: company.company_id,
        company_name: company.company_name,
      },
      stats: {
        total_campaigns: Number(stats.total_campaigns ?? 0),
        active_campaigns: Number(stats.active_campaigns ?? 0),
        total_reward_pool: Number(stats.total_reward_pool ?? 0),
      },
      campaigns,
    });
  } catch (error) {
    console.error("/api/dashboard/brand error", error);
    return Response.json(
      { success: false, message: "Failed to load dashboard." },
      { status: 500 }
    );
  }
}
