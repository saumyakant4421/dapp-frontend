import { clickhouse } from "@/lib/clickhouse";

type WalletCompanyRow = {
  company_id: string;
};

type InfluencerRow = {
  influencer_id: string;
  name: string;
  instagram_handle: string;
  instagram_id: string;
  category: string;
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

    const companyData = await companyResult.json<WalletCompanyRow>();
    if (!companyData.data[0]?.company_id) {
      return Response.json(
        { success: false, message: "No verified company linked to this wallet." },
        { status: 403 }
      );
    }

    const influencersResult = await clickhouse.query({
      query: `
        SELECT
          influencer_id,
          name,
          instagram_handle,
          ifNull(instagram_id, '') as instagram_id,
          ifNull(category, '') as category
        FROM influencers
        WHERE wallet_address != ''
          AND instagram_handle != ''
        ORDER BY name ASC, instagram_handle ASC
        LIMIT 500
      `,
    });

    const influencersData = await influencersResult.json<InfluencerRow>();

    return Response.json({
      success: true,
      influencers: influencersData.data.map((row) => ({
        influencer_id: row.influencer_id,
        name: row.name || row.instagram_handle,
        handle: row.instagram_handle,
        instagram_id: row.instagram_id || "",
        category: row.category || "",
      })),
    });
  } catch (error) {
    console.error("/api/influencer/registered error", error);
    return Response.json(
      { success: false, message: "Failed to load registered influencers." },
      { status: 500 }
    );
  }
}
