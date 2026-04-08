import { NextResponse } from "next/server";
// import { clickhouse } from "@/lib/clickhouse";

export async function POST(req: Request) {
  const { company_name, wallet_address } = await req.json();

//   await clickhouse.insert({
//     table: "company_wallets",
//     values: [
//       {
//         company_name,
//         wallet_address,
//         created_at: new Date().toISOString()
//       }
//     ],
//     format: "JSONEachRow"
//   });

    console.log("Binding wallet:", {
    company_name,
    wallet_address,
  });

  return NextResponse.json({ success: true });
}