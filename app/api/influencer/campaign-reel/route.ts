import { clickhouse } from "@/lib/clickhouse";
import { ensureCampaignReelsTable } from "@/lib/campaignReels";
import { ensureCampaignTimelinesTable } from "@/lib/campaignTimeline";

type InfluencerRow = {
  influencer_id: string;
};

type ParticipantRow = {
  campaign_id: string;
  status: string;
};

type ReelRow = {
  reel_url: string;
};

function isUuidLike(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function normalizeUrl(raw: string): string {
  return raw.trim();
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      wallet?: string;
      participant_id?: string;
      reel_url?: string;
    };

    const wallet = body.wallet?.trim().toLowerCase();
    const participantId = body.participant_id?.trim();
    const reelUrl = normalizeUrl(body.reel_url || "");

    if (!wallet || !participantId || !reelUrl) {
      return Response.json(
        { success: false, message: "Wallet, participant_id, and reel_url are required." },
        { status: 400 }
      );
    }

    if (!/^https?:\/\//i.test(reelUrl)) {
      return Response.json(
        { success: false, message: "Reel URL must start with http:// or https://" },
        { status: 400 }
      );
    }

    await ensureCampaignTimelinesTable();
    await ensureCampaignReelsTable();

    const influencerResult = await clickhouse.query({
      query: `
        SELECT influencer_id
        FROM influencers
        WHERE lower(wallet_address) = {wallet:String}
        LIMIT 1
      `,
      query_params: { wallet },
    });

    const influencerData = await influencerResult.json<InfluencerRow>();
    const influencerId = influencerData.data[0]?.influencer_id;

    if (!influencerId) {
      return Response.json(
        { success: false, message: "Influencer profile not found." },
        { status: 404 }
      );
    }

    const participantResult = await clickhouse.query({
      query: `
        SELECT
          toString(cp.campaign_id) as campaign_id,
          cp.status
        FROM campaign_participants cp
        INNER JOIN campaigns c ON cp.campaign_id = c.campaign_id
        INNER JOIN campaign_timelines ct ON cp.campaign_id = ct.campaign_id
        WHERE cp.id = {participantId:UUID}
          AND cp.influencer_id = {influencerId:UUID}
          AND cp.status = 'accepted'
          AND now() >= c.start_date AND now() < c.end_date
          AND toString(cp.campaign_id) != '\\N'
          AND now() >= ct.start_date
          AND now() < ct.start_date + toIntervalDay(c.duration_days)
        LIMIT 1
      `,
      query_params: { participantId, influencerId },
    });

    const participantData = await participantResult.json<ParticipantRow>();
    const participant = participantData.data[0];

    if (!participant) {
      return Response.json(
        { success: false, message: "Active participant record not found." },
        { status: 404 }
      );
    }

    const campaignId = String(participant.campaign_id || "").trim();
    if (!campaignId || campaignId === "\\N" || !isUuidLike(campaignId)) {
      return Response.json(
        { success: false, message: "Invalid campaign reference on participant record." },
        { status: 400 }
      );
    }

    const existingResult = await clickhouse.query({
      query: `
        SELECT reel_url
        FROM campaign_reels
        WHERE campaign_id = {campaignId:UUID}
          AND influencer_id = {influencerId:UUID}
        ORDER BY created_at ASC
      `,
      query_params: { campaignId, influencerId },
    });

    const existingData = await existingResult.json<ReelRow>();
    const existingUrls = Array.from(new Set(existingData.data.map((row) => row.reel_url.trim()).filter(Boolean)));

    if (!existingUrls.includes(reelUrl)) {
      await clickhouse.insert({
        table: "campaign_reels",
        values: [
          {
            id: crypto.randomUUID(),
            campaign_id: campaignId,
            influencer_id: influencerId,
            reel_url: reelUrl,
            reel_updated_at: new Date().toISOString().slice(0, 19).replace("T", " "),
            reel_processed: 0,
            created_at: new Date().toISOString().slice(0, 19).replace("T", " "),
          },
        ],
        format: "JSONEachRow",
      });
      existingUrls.push(reelUrl);
    }

    return Response.json({
      success: true,
      reel_url: reelUrl,
      reel_urls: existingUrls,
      previous_reel_url: existingUrls[0] || "",
    });
  } catch (error) {
    console.error("/api/influencer/campaign-reel error", error);
    return Response.json(
      { success: false, message: "Failed to save reel URL." },
      { status: 500 }
    );
  }
}