import { NextResponse } from "next/server";

type Influencer = {
  wallet: string;
  name?: string;
  instagram_handle: string;
  category?: string;
};

const influencers: Influencer[] = []; // temporary memory storage

export async function POST(req: Request) {

  const body = await req.json();

  const { wallet, name, instagram_handle, category } = body;

  if (!wallet || !instagram_handle) {
    return NextResponse.json(
      { error: "Missing fields" },
      { status: 400 }
    );
  }

  influencers.push({
    wallet,
    name,
    instagram_handle,
    category
  });

  return NextResponse.json({
    success: true
  });
}