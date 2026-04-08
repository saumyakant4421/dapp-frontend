import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const wallet = req.url ? new URL(req.url).searchParams.get("wallet") : null;

  if (!wallet) {
    return NextResponse.json({ exists: false }, { status: 400 });
  }

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