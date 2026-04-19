import { clickhouse } from "@/lib/clickhouse";
import { isCompanyEmail } from "@/lib/validators";
import type { Company } from "@/types/company";

// /api/company/submit
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Company;
    const company_name = body.company_name?.trim().toLowerCase();
    const official_email = body.official_email?.trim().toLowerCase();
    const website = body.website?.trim();
    const linkedin = body.linkedin?.trim() || "";
    const proof_url = body.proof_url?.trim() || "";

    if (!company_name || !official_email || !website) {
      return Response.json(
        {
          success: false,
          message: "Company name, official email, and website are required.",
        },
        { status: 400 }
      );
    }

    if (!isCompanyEmail(official_email)) {
      return Response.json(
        {
          success: false,
          message: "Please provide a company email (avoid public email providers).",
        },
        { status: 400 }
      );
    }

    const result = await clickhouse.query({
      query: `
        SELECT 
          countIf(status = 'approved') as verified,
          countIf(status = 'pending') as pending
        FROM company_verification_requests
        WHERE company_name = {name:String}
      `,
      query_params: { name: company_name },
    });

    const data = await result.json<{ verified: number; pending: number }>();

    const verifiedCount = Number(data.data[0]?.verified ?? 0);
    const pendingCount = Number(data.data[0]?.pending ?? 0);

    if (verifiedCount > 0) {
      return Response.json(
        { success: false, message: "Company is already verified." },
        { status: 409 }
      );
    }

    if (pendingCount > 0) {
      return Response.json(
        { success: false, message: "A verification request is already pending." },
        { status: 409 }
      );
    }

    const request_id = crypto.randomUUID();
    const created_at = new Date().toISOString().slice(0, 19).replace("T", " ");

    await clickhouse.insert({
      table: "company_verification_requests",
      values: [
        {
          request_id,
          company_name,
          official_email,
          website,
          linkedin,
          proof_url,
          status: "pending",
          created_at,
        },
      ],
      format: "JSONEachRow",
    });

    return Response.json(
      {
        success: true,
        request_id,
        message: "Company submitted for verification.",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("/api/company/submit error", error);

    return Response.json(
      { success: false, message: "Failed to submit verification request." },
      { status: 500 }
    );
  }
}