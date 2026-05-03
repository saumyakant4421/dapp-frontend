import { clickhouse } from "@/lib/clickhouse";
import {
  ensureCampaignTimelinesTable,
  parseCampaignInputAsUTC,
  toClickHouseDateTime,
} from "@/lib/campaignTimeline";

type WalletBindingRow = {
  company_id: string;
  company_name: string;
};

type CountRow = {
  count: number | string;
};

async function ensureCampaignOnchainColumns() {
  await clickhouse.command({
    query: `
      ALTER TABLE campaigns
      ADD COLUMN IF NOT EXISTS onchain_tx_hash String
      DEFAULT ''
    `,
  });

  await clickhouse.command({
    query: `
      ALTER TABLE campaigns
      ADD COLUMN IF NOT EXISTS onchain_reward_eth Float64
      DEFAULT 0
    `,
  });

  await clickhouse.command({
    query: `
      ALTER TABLE campaigns
      ADD COLUMN IF NOT EXISTS onchain_contract_address String
      DEFAULT ''
    `,
  });

  await clickhouse.command({
    query: `
      ALTER TABLE campaigns
      ADD COLUMN IF NOT EXISTS keywords_ref String
      DEFAULT ''
    `,
  });
}

async function ensureCampaignCommentKeywordsTable() {
  await clickhouse.command({
    query: `
      CREATE TABLE IF NOT EXISTS campaign_comment_keywords (
        id UUID DEFAULT generateUUIDv4(),
        campaign_id UUID,
        keyword String,
        created_at DateTime DEFAULT now()
      ) ENGINE = MergeTree()
      ORDER BY (campaign_id, id)
      PARTITION BY toYYYYMM(created_at)
    `,
  });
}

// /api/campaign/create
export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      wallet_address,
      campaign_id: campaign_id_from_client,
      campaign_name,
      reward_pool,
      duration_days,
      target_gender,
      target_age_group,
      moderation_k,
      invitation_deadline,
      start_date,
      tx_hash,
      reward_eth,
      contract_address,
      comment_keywords,
    } = body;

    const isOnchainHandoffOnly =
      !wallet_address && !campaign_name && !reward_pool && campaign_id_from_client && tx_hash;

    if (isOnchainHandoffOnly) {
      await ensureCampaignOnchainColumns();

      await clickhouse.command({
        query: `
          ALTER TABLE campaigns
          UPDATE
            onchain_tx_hash = {txHash:String},
            onchain_reward_eth = {rewardEth:Float64},
            onchain_contract_address = {contractAddress:String}
          WHERE campaign_id = {campaignId:UUID}
        `,
        query_params: {
          txHash: String(tx_hash),
          rewardEth: Number(reward_eth ?? 0),
          contractAddress: String(contract_address || ""),
          campaignId: String(campaign_id_from_client),
        },
        clickhouse_settings: {
          mutations_sync: "1",
        },
      });

      return Response.json({ success: true, updated: true });
    }

    if (!wallet_address || !campaign_name || !reward_pool || !invitation_deadline || !start_date) {
      return Response.json(
        {
          success: false,
          message:
            "Wallet, campaign name, reward pool, invitation deadline, and start date are required.",
        },
        { status: 400 }
      );
    }

    let invitationDeadlineDate: Date;
    let startDate: Date;

    try {
      invitationDeadlineDate = parseCampaignInputAsUTC(String(invitation_deadline));
      startDate = parseCampaignInputAsUTC(String(start_date));
    } catch {
      return Response.json(
        { success: false, message: "Invalid invitation deadline or start date." },
        { status: 400 }
      );
    }

    if (Number.isNaN(invitationDeadlineDate.getTime()) || Number.isNaN(startDate.getTime())) {
      return Response.json(
        { success: false, message: "Invalid invitation deadline or start date." },
        { status: 400 }
      );
    }

    if (startDate.getTime() <= invitationDeadlineDate.getTime()) {
      return Response.json(
        { success: false, message: "Start date must be later than invitation deadline." },
        { status: 400 }
      );
    }

    const normalizedWallet = String(wallet_address).trim().toLowerCase();

    // resolve wallet -> company from DB
    const walletResult = await clickhouse.query({
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
      query_params: { wallet: normalizedWallet },
    });

    const walletData = await walletResult.json<WalletBindingRow>();
    const company_id = walletData.data[0]?.company_id;
    const company_name = walletData.data[0]?.company_name?.toLowerCase();

    if (!company_id || !company_name) {
      return Response.json(
        { success: false, message: "No verified company is linked to this wallet." },
        { status: 403 }
      );
    }

    // 🔐 Verify company is approved
    const result = await clickhouse.query({
      query: `
        SELECT count() as count
        FROM company_verification_requests
        WHERE company_name = {name:String}
        AND status = 'approved'
      `,
      query_params: { name: company_name.toLowerCase() },
    });

    const data = await result.json<CountRow>();
    const isApproved = Number(data.data[0]?.count ?? 0) > 0;

    if (!isApproved) {
      return Response.json({
        success: false,
        message: "Company not verified",
      });
    }

    const durationDays = Number(duration_days);

    if (!Number.isFinite(durationDays) || durationDays <= 0) {
      return Response.json(
        { success: false, message: "Campaign duration must be a valid positive number of days." },
        { status: 400 }
      );
    }

    const endDate = new Date(startDate.getTime() + durationDays * 24 * 60 * 60 * 1000);
    const minGapMs = 24 * 60 * 60 * 1000;

    if (invitationDeadlineDate.getTime() > endDate.getTime() - minGapMs) {
      return Response.json(
        {
          success: false,
          message: "Invitation deadline must be at least 24 hours before campaign end date.",
        },
        { status: 400 }
      );
    }

    await ensureCampaignOnchainColumns();

    const campaign_id = campaign_id_from_client || crypto.randomUUID();
    const created_at = toClickHouseDateTime(new Date());
    const invitation_deadline_ch = toClickHouseDateTime(invitationDeadlineDate);
    const start_date_ch = toClickHouseDateTime(startDate);
    const end_date_ch = toClickHouseDateTime(endDate);

    await clickhouse.insert({
      table: "campaigns",
      values: [
        {
          campaign_id,
          company_id,
          campaign_name,
          reward_pool: Number(reward_pool),
          duration_days: durationDays,
          target_gender,
          target_age_group,
          moderation_k,
          status: "INVITING",
          onchain_tx_hash: String(tx_hash || ""),
          onchain_reward_eth: Number(reward_eth ?? reward_pool ?? 0),
          onchain_contract_address: String(contract_address || ""),
          created_at,
          invitation_deadline: invitation_deadline_ch,
          start_date: start_date_ch,
          end_date: end_date_ch,
          keywords_ref: "",
        },
      ],
      format: "JSONEachRow",
    });

    // Insert comment keywords if provided
    if (Array.isArray(comment_keywords) && comment_keywords.length > 0) {
      await ensureCampaignCommentKeywordsTable();
      
      const keywordRecords = comment_keywords.map((kw: string) => ({
        campaign_id,
        keyword: String(kw).trim(),
        created_at: toClickHouseDateTime(new Date()),
      }));

      await clickhouse.insert({
        table: "campaign_comment_keywords",
        values: keywordRecords,
        format: "JSONEachRow",
      });
    }

    await ensureCampaignTimelinesTable();

    await clickhouse.insert({
      table: "campaign_timelines",
      values: [
        {
          campaign_id,
          invitation_deadline: invitation_deadline_ch,
          start_date: start_date_ch,
        },
      ],
      format: "JSONEachRow",
    });

    return Response.json({
      success: true,
      campaign_id,
    });

  } catch (err) {
    console.error("/api/campaign/create error", err);
    return Response.json({ success: false }, { status: 500 });
  }
}