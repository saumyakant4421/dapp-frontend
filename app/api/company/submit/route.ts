import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json();

  console.log("Company submitted:", body);

  // Simulate successful submission
  return NextResponse.json({ success: true });
}