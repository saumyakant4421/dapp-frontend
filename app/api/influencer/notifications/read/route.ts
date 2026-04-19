import { clickhouse } from "@/lib/clickhouse";

type InfluencerRow = {
  influencer_id: string;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      wallet?: string;
      notification_id?: string;
      participant_id?: string;
    };

    const wallet = body.wallet?.trim().toLowerCase();
    const notification_id = body.notification_id;
    const participant_id = body.participant_id;

    if (!wallet || !notification_id) {
      if (!wallet || !participant_id) {
        return Response.json(
          { success: false, message: "Wallet and notification_id or participant_id are required." },
          { status: 400 }
        );
      }
    }

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
    const influencer_id = influencerData.data[0]?.influencer_id;

    if (!influencer_id) {
      return Response.json(
        { success: false, message: "Influencer profile not found." },
        { status: 404 }
      );
    }

    if (participant_id) {
      await clickhouse.command({
        query: `
          ALTER TABLE campaign_notifications
          UPDATE is_read = 1
          WHERE participant_id = {participantId:UUID}
            AND influencer_id = {influencerId:UUID}
        `,
        query_params: {
          participantId: participant_id,
          influencerId: influencer_id,
        },
      });
    } else {
      await clickhouse.command({
        query: `
          ALTER TABLE campaign_notifications
          UPDATE is_read = 1
          WHERE id = {notificationId:UUID}
            AND influencer_id = {influencerId:UUID}
        `,
        query_params: {
          notificationId: notification_id,
          influencerId: influencer_id,
        },
      });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error("/api/influencer/notifications/read error", error);
    return Response.json(
      { success: false, message: "Failed to mark notification as read." },
      { status: 500 }
    );
  }
}
