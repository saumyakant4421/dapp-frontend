// import { clickhouse } from "@/lib/clickhouse";

// export async function POST(req: Request) {
//   const { company_name } = await req.json();

//   const result = await clickhouse.query({
//     query: `
//       SELECT * FROM companies
//       WHERE company_name = {company:String}
//       AND verified = true
//       LIMIT 1
//     `,
//     query_params: { company: company_name },
//     format: "JSONEachRow"
//   });

//   const data = await result.json();

//   if (data.length === 0) {
//     return NextResponse.json({ success: false });
//   }

//   return NextResponse.json({ success: true });
// }