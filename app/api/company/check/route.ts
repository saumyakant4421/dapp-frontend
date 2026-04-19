import { clickhouse } from "@/lib/clickhouse";

// type CompanyCountQueryResult = {
//   count: number | string;
// };

// /api/company/check
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const company_name = body.company_name?.trim().toLowerCase();

    if (!company_name) {
      return Response.json({ success: false }, { status: 400 });
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

   const verified = Number(data.data[0]?.verified ?? 0) > 0;
   const pending = Number(data.data[0]?.pending ?? 0) > 0;

    return Response.json({
      success: verified,
      verified,
      pending,
      exists: verified || pending,
    });

  } catch (error) {
    console.error(error);
    return Response.json({ success: false }, { status: 500 });
  }
}