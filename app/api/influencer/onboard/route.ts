// /api/influencer/onboard
import { clickhouse } from "@/lib/clickhouse";
import { ensureIdentityTables } from "@/lib/identityTables";

type ExistingInfluencerRow = {
  influencer_id: string;
  wallet_address: string;
};

type ExistingBrandBindingRow = {
  entity_id: string;
};

function normalizeHandle(raw: string): string {
  return raw.trim().toLowerCase().replace(/^@+/, "");
}

function normalizeInstagramId(raw: string): string {
  return raw.trim();
}

export async function POST(req: Request) {
  try {
    await ensureIdentityTables();

    const { wallet, name, instagram_handle, instagram_id, category } = await req.json();

    const wallet_address = String(wallet || "").trim().toLowerCase();
    const handle = normalizeHandle(String(instagram_handle || ""));
    const realInstagramId = normalizeInstagramId(String(instagram_id || ""));
    const profile_name = String(name || "").trim();
    const profile_category = String(category || "unassigned").trim();

    if (!wallet_address || !profile_name || !handle || !realInstagramId) {
      return Response.json(
        { success: false, message: "Wallet, name, Instagram handle, and Instagram ID are required." },
        { status: 400 }
      );
    }

    const brandBindingResult = await clickhouse.query({
      query: `
        SELECT entity_id
        FROM wallet_bindings
        WHERE wallet_address = {wallet:String}
          AND entity_type = 'brand'
        LIMIT 1
      `,
      query_params: { wallet: wallet_address },
    });

    const brandBindingData = await brandBindingResult.json<ExistingBrandBindingRow>();
    if (brandBindingData.data[0]?.entity_id) {
      return Response.json(
        {
          success: false,
          message: "This wallet is already registered as a brand and cannot be used for influencer onboarding.",
        },
        { status: 409 }
      );
    }

    await clickhouse.command({
      query: `
        ALTER TABLE influencers
        ADD COLUMN IF NOT EXISTS instagram_id String
        DEFAULT ''
      `,
    });

    // 1) If wallet already has a profile, update details in place
    const walletResult = await clickhouse.query({
      query: `
        SELECT influencer_id, wallet_address
        FROM influencers
        WHERE lower(wallet_address) = {wallet:String}
        LIMIT 1
      `,
      query_params: { wallet: wallet_address },
    });

    const walletData = await walletResult.json<ExistingInfluencerRow>();
    const walletInfluencer = walletData.data[0];

    if (walletInfluencer?.influencer_id) {
      await clickhouse.command({
        query: `
          ALTER TABLE influencers
          UPDATE
            name = {name:String},
            instagram_handle = {handle:String},
            instagram_id = {instagramId:String},
            category = {category:String}
          WHERE influencer_id = {influencerId:UUID}
        `,
        query_params: {
          name: profile_name,
          handle,
          instagramId: realInstagramId,
          category: profile_category,
          influencerId: walletInfluencer.influencer_id,
        },
      });

      return Response.json({ success: true, influencer_id: walletInfluencer.influencer_id });
    }

    // 2) Soft-invite linking: claim invited placeholder by handle
    const handleResult = await clickhouse.query({
      query: `
        SELECT influencer_id, wallet_address
        FROM influencers
        WHERE lower(instagram_handle) = {handle:String}
        LIMIT 1
      `,
      query_params: { handle },
    });

    const handleData = await handleResult.json<ExistingInfluencerRow>();
    const handleInfluencer = handleData.data[0];

    if (handleInfluencer?.influencer_id) {
      const existingWallet = (handleInfluencer.wallet_address || "").trim().toLowerCase();

      // If handle already belongs to another wallet, block takeover
      if (existingWallet && existingWallet !== wallet_address) {
        return Response.json(
          { success: false, message: "This Instagram handle is already linked to another wallet." },
          { status: 409 }
        );
      }

      await clickhouse.command({
        query: `
          ALTER TABLE influencers
          UPDATE
            wallet_address = {wallet:String},
            name = {name:String},
            instagram_handle = {handle:String},
            instagram_id = {instagramId:String},
            category = {category:String}
          WHERE influencer_id = {influencerId:UUID}
        `,
        query_params: {
          wallet: wallet_address,
          name: profile_name,
          handle,
          instagramId: realInstagramId,
          category: profile_category,
          influencerId: handleInfluencer.influencer_id,
        },
      });

      return Response.json({ success: true, influencer_id: handleInfluencer.influencer_id });
    }

    // 3) No existing invite/profile found: create fresh influencer profile
    const influencer_id = crypto.randomUUID();
    const created_at = new Date().toISOString().slice(0, 19).replace("T", " ");

    await clickhouse.insert({
      table: "influencers",
      values: [
        {
          influencer_id,
          wallet_address,
          name: profile_name,
          instagram_handle: handle,
          instagram_id: realInstagramId,
          category: profile_category,
          created_at,
        },
      ],
      format: "JSONEachRow",
    });

    return Response.json({ success: true, influencer_id });
  } catch (error) {
    console.error("/api/influencer/onboard error", error);
    return Response.json(
      { success: false, message: "Failed to onboard influencer." },
      { status: 500 }
    );
  }
}