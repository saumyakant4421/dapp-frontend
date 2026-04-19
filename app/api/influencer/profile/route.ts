import { clickhouse } from "@/lib/clickhouse";

type InfluencerRow = {
  influencer_id: string;
  name: string;
  instagram_handle: string;
  instagram_id: string;
  category: string;
};

export async function GET(req: Request) {
  try {
    const wallet = req.url
      ? new URL(req.url).searchParams.get("wallet")?.trim().toLowerCase()
      : null;

    if (!wallet) {
      return Response.json({ exists: false }, { status: 400 });
    }

    await clickhouse.command({
      query: `
        ALTER TABLE influencers
        ADD COLUMN IF NOT EXISTS instagram_id String
        DEFAULT ''
      `,
    });

    const result = await clickhouse.query({
      query: `
        SELECT influencer_id, name, instagram_handle, instagram_id, category
        FROM influencers
        WHERE lower(wallet_address) = {wallet:String}
        LIMIT 1
      `,
      query_params: { wallet },
    });

    const data = await result.json<InfluencerRow>();
    const influencer = data.data[0];

    if (!influencer) {
      return Response.json({ exists: false }, { status: 404 });
    }

    return Response.json({
      exists: true,
      influencer,
    });
  } catch (error) {
    console.error("/api/influencer/profile error", error);
    return Response.json({ exists: false }, { status: 500 });
  }
}
