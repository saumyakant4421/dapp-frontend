import { clickhouse } from "@/lib/clickhouse";

type WalletBindingRow = {
  company_id: string;
  company_name: string;
};

type CompanyApprovedCountRow = {
  count: number | string;
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

    const bindingResult = await clickhouse.query({
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

    const bindingData = await bindingResult.json<WalletBindingRow>();
    const company_name = bindingData.data[0]?.company_name?.toLowerCase();

    if (!company_name) {
      return Response.json(
        { success: false, message: "No company linked to this wallet." },
        { status: 404 }
      );
    }

    const verifyResult = await clickhouse.query({
      query: `
        SELECT count() as count
        FROM company_verification_requests
        WHERE company_name = {name:String}
          AND status = 'approved'
      `,
      query_params: { name: company_name },
    });

    const verifyData = await verifyResult.json<CompanyApprovedCountRow>();
    const isApproved = Number(verifyData.data[0]?.count ?? 0) > 0;

    if (!isApproved) {
      return Response.json(
        { success: false, message: "Linked company is not approved." },
        { status: 403 }
      );
    }

    return Response.json({ success: true, company_name });
  } catch (error) {
    console.error("/api/company/me error", error);
    return Response.json(
      { success: false, message: "Failed to resolve linked company." },
      { status: 500 }
    );
  }
}
