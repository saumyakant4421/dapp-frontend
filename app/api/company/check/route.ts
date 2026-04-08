
import { NextResponse } from "next/server";

const verifiedCompanies = [
  "Nike Pvt Ltd",
  "Adidas India",
  "Puma Global"
];

export async function POST(req: Request) {
  const { company_name } = await req.json();

  const isVerified = verifiedCompanies.includes(company_name);

  return NextResponse.json({ success: isVerified });
}