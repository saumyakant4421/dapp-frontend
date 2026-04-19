import { clickhouse } from "@/lib/clickhouse";
import { ensureCampaignNotificationsTable, toClickHouseDateTime } from "@/lib/notifications";

type ParticipantRequestBody = {
  campaign_id: string;
  influencers: Array<{
    influencer_id?: string;
    name?: string;
    handle?: string;
  }>;
};

type InfluencerRow = {
  influencer_id: string;
  instagram_handle: string;
};

type CampaignRow = {
  campaign_name: string;
};

// /api/campaign/participants
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ParticipantRequestBody;
    const { campaign_id, influencers } = body;

    if (!campaign_id || !influencers?.length) {
      return Response.json({ success: false }, { status: 400 });
    }

    const selectedInfluencerIds = Array.from(
      new Set(influencers.map((inf) => (inf.influencer_id || "").trim()).filter(Boolean))
    );

    if (selectedInfluencerIds.length < 2 || selectedInfluencerIds.length > 6) {
      return Response.json(
        {
          success: false,
          message: "A campaign must have between 2 and 6 influencers.",
        },
        { status: 400 }
      );
    }

    await ensureCampaignNotificationsTable();

    const campaignResult = await clickhouse.query({
      query: `
        SELECT campaign_name, company_id
        FROM campaigns
        WHERE campaign_id = {campaignId:UUID}
        LIMIT 1
      `,
      query_params: { campaignId: campaign_id },
    });

    const campaignData = await campaignResult.json<CampaignRow>();
    const campaign = campaignData.data[0];

    const joined_at = new Date().toISOString().slice(0, 19).replace("T", " ");
    const rows: Array<{
      id: string;
      campaign_id: string;
      influencer_id: string;
      status: string;
      joined_at: string;
    }> = [];

    const notificationRows: Array<{
      id: string;
      influencer_id: string;
      participant_id: string;
      campaign_id: string;
      notification_type: string;
      title: string;
      message: string;
      is_read: number;
      created_at: string;
    }> = [];

    const seenInfluencerIds = new Set<string>();

    for (const influencerId of selectedInfluencerIds) {
      seenInfluencerIds.add(influencerId);

      const result = await clickhouse.query({
        query: `
          SELECT influencer_id, instagram_handle
          FROM influencers
          WHERE influencer_id = {influencerId:UUID}
            AND wallet_address != ''
          LIMIT 1
        `,
        query_params: { influencerId },
      });

      const data = await result.json<InfluencerRow>();

      const influencer_id = data.data[0]?.influencer_id;

      if (!influencer_id) continue;

      const participant_id = crypto.randomUUID();

      rows.push({
        id: participant_id,
        campaign_id,
        influencer_id,
        status: "invited",
        joined_at,
      });

      notificationRows.push({
        id: crypto.randomUUID(),
        influencer_id,
        participant_id,
        campaign_id,
        notification_type: "invitation",
        title: "New campaign invitation",
        message: campaign
          ? `You have been invited to ${campaign.campaign_name}.`
          : `You have been invited to a new campaign.`,
        is_read: 0,
        created_at: toClickHouseDateTime(new Date()),
      });
    }

    if (rows.length !== seenInfluencerIds.size) {
      return Response.json(
        {
          success: false,
          message:
            "One or more selected influencers are not registered. Please select only registered influencers.",
        },
        { status: 400 }
      );
    }

    if (rows.length > 0) {
      await clickhouse.insert({
        table: "campaign_participants",
        values: rows,
        format: "JSONEachRow",
      });

      await clickhouse.insert({
        table: "campaign_notifications",
        values: notificationRows,
        format: "JSONEachRow",
      });
    }

    return Response.json({ success: true, inserted: rows.length });

  } catch (err) {
    console.error("/api/campaign/participants error", err);
    return Response.json({ success: false }, { status: 500 });
  }
}