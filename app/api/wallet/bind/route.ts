import { clickhouse } from "@/lib/clickhouse";
import { ensureIdentityTables } from "@/lib/identityTables";

type CountRow = {
  count: number | string;
};

type ApprovedCompanyRow = {
  company_id: string;
};

type WalletBindingRow = {
  company_id: string;
};

type InfluencerWalletRow = {
  influencer_id: string;
};

// /api/wallet/bind
export async function POST(req: Request) {
  try {
    await ensureIdentityTables();

    const body = await req.json();

    const company_name = body.company_name?.trim().toLowerCase();
    const wallet_address = body.wallet_address?.trim().toLowerCase();

    if (!company_name || !wallet_address) {
      return Response.json({ success: false }, { status: 400 });
    }

    const influencerWalletResult = await clickhouse.query({
      query: `
        SELECT influencer_id
        FROM influencers
        WHERE lower(wallet_address) = {wallet:String}
        LIMIT 1
      `,
      query_params: { wallet: wallet_address },
    });

    const influencerWalletData = await influencerWalletResult.json<InfluencerWalletRow>();
    if (influencerWalletData.data[0]?.influencer_id) {
      return Response.json(
        {
          success: false,
          message: "This wallet is already registered as an influencer and cannot be used for brand login.",
        },
        { status: 409 }
      );
    }

    // 1. Resolve approved company UUID
    const approvedCompanyResult = await clickhouse.query({
      query: `
        SELECT request_id as company_id
        FROM company_verification_requests
        WHERE company_name = {name:String}
          AND status = 'approved'
        ORDER BY created_at DESC
        LIMIT 1
      `,
      query_params: { name: company_name },
    });

    const approvedCompany = await approvedCompanyResult.json<ApprovedCompanyRow>();
    const approved_company_id = approvedCompany.data[0]?.company_id;

    if (!approved_company_id) {
      return Response.json({
        success: false,
        message: "Company is not verified",
      });
    }

    // 2. Check if company is approved (safety)
    const result = await clickhouse.query({
      query: `
        SELECT count() as count
        FROM company_verification_requests
        WHERE request_id = {companyId:UUID}
          AND status = 'approved'
      `,
      query_params: { companyId: approved_company_id },
    });

    const data = await result.json<CountRow>();

    const isApproved = Number(data.data[0]?.count ?? 0) > 0;

    if (!isApproved) {
      return Response.json({ success: false, message: "Company is not verified" });
    }

    // 3. Check existing binding for wallet
    const existingBindingResult = await clickhouse.query({
      query: `
        SELECT entity_id as company_id
        FROM wallet_bindings
        WHERE wallet_address = {wallet:String}
          AND entity_type = 'brand'
        LIMIT 1
      `,
      query_params: { wallet: wallet_address },
    });

    const existingBinding = await existingBindingResult.json<WalletBindingRow>();
    const existingCompanyId = existingBinding.data[0]?.company_id;

    if (existingCompanyId) {
      if (existingCompanyId === approved_company_id) {
        return Response.json({
          success: true,
          message: "Wallet already linked to this company.",
        });
      }

      return Response.json(
        {
          success: false,
          message: "Wallet is already linked to another company.",
        },
        { status: 409 }
      );
    }

    // 4. Insert wallet binding
    await clickhouse.insert({
      table: "wallet_bindings",
      values: [
        {
          wallet_address,
          entity_type: "brand",
          entity_id: approved_company_id,
        },
      ],
      format: "JSONEachRow",
    });

    return Response.json({ success: true });

  } catch (error) {
    console.error("/api/wallet/bind error", error);
    return Response.json({ success: false }, { status: 500 });
  }
}