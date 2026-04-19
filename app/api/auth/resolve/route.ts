import { clickhouse } from "@/lib/clickhouse";

type InfluencerRow = {
  influencer_id: string;
  name: string;
  instagram_handle: string;
  instagram_id: string;
  category: string;
};

type BrandRow = {
  company_id: string;
  company_name: string;
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

    await clickhouse.command({
      query: `
        ALTER TABLE influencers
        ADD COLUMN IF NOT EXISTS instagram_id String
        DEFAULT ''
      `,
    });

    const [brandResult, influencerResult] = await Promise.all([
      clickhouse.query({
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
      }),
      clickhouse.query({
        query: `
          SELECT influencer_id, name, instagram_handle, instagram_id, category
          FROM influencers
          WHERE lower(wallet_address) = {wallet:String}
          LIMIT 1
        `,
        query_params: { wallet },
      }),
    ]);

    const brandData = await brandResult.json<BrandRow>();
    const influencerData = await influencerResult.json<InfluencerRow>();

    const brand = brandData.data[0]
      ? {
          company_id: brandData.data[0].company_id,
          company_name: brandData.data[0].company_name,
        }
      : null;

    const influencer = influencerData.data[0]
      ? {
          influencer_id: influencerData.data[0].influencer_id,
          name: influencerData.data[0].name,
          instagram_handle: influencerData.data[0].instagram_handle,
          instagram_id: influencerData.data[0].instagram_id,
          category: influencerData.data[0].category,
        }
      : null;

    return Response.json({
      success: true,
      wallet,
      roles: {
        brand,
        influencer,
      },
      hasMultipleRoles: Boolean(brand && influencer),
    });
  } catch (error) {
    console.error("/api/auth/resolve error", error);
    return Response.json(
      { success: false, message: "Failed to resolve wallet roles." },
      { status: 500 }
    );
  }
}
