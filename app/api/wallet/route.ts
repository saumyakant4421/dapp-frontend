import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  { params }: { params: { wallet: string } }
) {

  const { wallet } = params;

  // TEMP MOCK
  // later this will query database

  const influencers = [
    "0x123",
    "0x456"
  ];

  const exists = influencers.includes(wallet.toLowerCase());

  return NextResponse.json({
    exists
  });
}