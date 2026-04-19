import { clickhouse } from "@/lib/clickhouse";
import { ensureCampaignNotificationsTable } from "@/lib/notifications";
import { ensureCampaignParticipantsTokenColumns } from "@/lib/campaignParticipantsMetadata";

type InfluencerRow = {
  influencer_id: string;
};

type NotificationRow = {
  id: string;
  campaign_id: string;
  participant_id: string;
  notification_type: string;
  title: string;
  message: string;
  is_read: number | string;
  created_at: string;
  campaign_name: string;
  reward_pool: number | string;
  invitation_deadline: string;
  start_date: string;
  participant_status: string;
  token_status: string;
  oauth_platform: string;
};

export async function GET(req: Request) {
  try {
    const wallet = req.url
      ? new URL(req.url).searchParams.get("wallet")?.trim().toLowerCase()
      : null;

    if (!wallet) {
      return Response.json(
        { success: false, message: "Wallet address is required." },
        { status: 400 }
      );
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
        { success: false, needsOnboarding: true, notifications: [] },
        { status: 404 }
      );
    }

    await ensureCampaignNotificationsTable();
    await ensureCampaignParticipantsTokenColumns();

    const notificationsResult = await clickhouse.query({
      query: `
        SELECT
          argMax(n.id, n.created_at) as id,
          n.campaign_id as campaign_id,
          n.participant_id as participant_id,
          argMax(n.notification_type, n.created_at) as notification_type,
          argMax(n.title, n.created_at) as title,
          argMax(n.message, n.created_at) as message,
          argMax(n.is_read, n.created_at) as is_read,
          toString(max(n.created_at)) as created_at,
          argMax(c.campaign_name, n.created_at) as campaign_name,
          argMax(c.reward_pool, n.created_at) as reward_pool,
          argMax(toString(ct.invitation_deadline), n.created_at) as invitation_deadline,
          argMax(toString(ct.start_date), n.created_at) as start_date,
          argMax(cp.status, n.created_at) as participant_status,
          argMax(cp.token_status, n.created_at) as token_status,
          argMax(cp.oauth_platform, n.created_at) as oauth_platform
        FROM campaign_notifications n
        INNER JOIN campaigns c ON n.campaign_id = c.campaign_id
        INNER JOIN campaign_timelines ct ON n.campaign_id = ct.campaign_id
        LEFT JOIN campaign_participants cp
          ON cp.id = n.participant_id
        WHERE n.influencer_id = {influencerId:UUID}
          AND isNotNull(n.participant_id)
        GROUP BY n.campaign_id, n.participant_id
        ORDER BY created_at DESC
        LIMIT 50
      `,
      query_params: { influencerId: influencer_id },
    });

    const data = await notificationsResult.json<NotificationRow>();

    const notifications = data.data.map((row) => ({
      id: row.id,
      campaign_id: row.campaign_id,
      participant_id: row.participant_id,
      notification_type: row.notification_type,
      title: row.title,
      message: row.message,
      is_read: Number(row.is_read ?? 0) === 1,
      created_at: row.created_at,
      campaign_name: row.campaign_name,
      reward_pool: Number(row.reward_pool ?? 0),
      invitation_deadline: row.invitation_deadline,
      start_date: row.start_date,
      participant_status: row.participant_status || "invited",
      token_status: row.token_status || "missing",
      oauth_platform: row.oauth_platform || "",
    }));

    return Response.json({ success: true, notifications });
  } catch (error) {
    console.error("/api/influencer/notifications error", error);
    return Response.json(
      { success: false, message: "Failed to load notifications." },
      { status: 500 }
    );
  }
}
