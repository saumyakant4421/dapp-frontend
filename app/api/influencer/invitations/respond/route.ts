import { clickhouse } from "@/lib/clickhouse";
import { ensureCampaignParticipantsTokenColumns } from "@/lib/campaignParticipantsMetadata";
import { toClickHouseDateTime } from "@/lib/notifications";
import { upsertCampaignAccessToken } from "@/lib/tokenCredentials";

type InfluencerRow = {
  influencer_id: string;
  instagram_handle: string;
  name: string;
};

type InvitationRow = {
  campaign_id: string;
  status: string;
  invitation_deadline_ts: number | string;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      wallet?: string;
      participant_id?: string;
      notification_id?: string;
      action?: "accept" | "reject";
      platform?: string;
      access_token?: string;
      refresh_token?: string;
    };

    const wallet = body.wallet?.trim().toLowerCase();
    let participant_id = body.participant_id;
    const notification_id = body.notification_id;
    const action = body.action;
    const platform = (body.platform || "instagram").trim().toLowerCase();
    const access_token = body.access_token?.trim();

    if (!wallet || !action) {
      return Response.json(
        { success: false, message: "Wallet and action are required." },
        { status: 400 }
      );
    }

    if (action !== "accept" && action !== "reject") {
      return Response.json(
        { success: false, message: "Action must be accept or reject." },
        { status: 400 }
      );
    }

    if (action === "accept" && !access_token) {
      return Response.json(
        { success: false, message: "Access token is required to accept invitation." },
        { status: 400 }
      );
    }

    const influencerResult = await clickhouse.query({
      query: `
        SELECT influencer_id, instagram_handle, name
        FROM influencers
        WHERE lower(wallet_address) = {wallet:String}
        LIMIT 1
      `,
      query_params: { wallet },
    });

    const influencerData = await influencerResult.json<InfluencerRow>();
    const influencer = influencerData.data[0];
    const influencer_id = influencer?.influencer_id;

    if (!influencer_id) {
      return Response.json(
        { success: false, message: "Influencer profile not found." },
        { status: 404 }
      );
    }

    if (!participant_id && notification_id) {
      const notificationResult = await clickhouse.query({
        query: `
          SELECT participant_id
          FROM campaign_notifications
          WHERE id = {notificationId:UUID}
            AND influencer_id = {influencerId:UUID}
          LIMIT 1
        `,
        query_params: {
          notificationId: notification_id,
          influencerId: influencer_id,
        },
      });

      const notificationData = await notificationResult.json<{ participant_id: string }>();
      participant_id = notificationData.data[0]?.participant_id;
    }

    if (!participant_id) {
      return Response.json(
        { success: false, message: "Invitation ID could not be resolved." },
        { status: 400 }
      );
    }

    const invitationResult = await clickhouse.query({
      query: `
        SELECT
          cp.campaign_id,
          cp.status,
          toUnixTimestamp(ct.invitation_deadline) as invitation_deadline_ts
        FROM campaign_participants cp
        INNER JOIN campaign_timelines ct ON cp.campaign_id = ct.campaign_id
        WHERE cp.id = {participantId:UUID}
          AND cp.influencer_id = {influencerId:UUID}
        LIMIT 1
      `,
      query_params: { participantId: participant_id, influencerId: influencer_id },
    });

    const invitationData = await invitationResult.json<InvitationRow>();
    const current = invitationData.data[0];

    if (!current) {
      return Response.json(
        { success: false, message: "Invitation not found." },
        { status: 404 }
      );
    }

    if (current.status !== "invited") {
      const sameTerminalState =
        (action === "accept" && current.status === "accepted") ||
        (action === "reject" && current.status === "rejected");

      if (sameTerminalState) {
        return Response.json({
          success: true,
          status: current.status,
          already_processed: true,
          message: `Invitation already ${current.status}.`,
        });
      }

      return Response.json(
        { success: false, message: `Invitation already ${current.status}.` },
        { status: 409 }
      );
    }

    const now = new Date();
    const nowSec = Math.floor(now.getTime() / 1000);
    const deadlineSec = Number(current.invitation_deadline_ts);

    if (Number.isFinite(deadlineSec) && nowSec > deadlineSec) {
      await clickhouse.command({
        query: `
          ALTER TABLE campaign_participants
          UPDATE
            status = 'expired',
            decision = 'expired',
            responded_at = {respondedAt:DateTime}
          WHERE id = {participantId:UUID}
            AND influencer_id = {influencerId:UUID}
            AND status = 'invited'
        `,
        query_params: {
          respondedAt: toClickHouseDateTime(now),
          participantId: participant_id,
          influencerId: influencer_id,
        },
      });

      return Response.json(
        { success: false, message: "Invitation deadline has passed." },
        { status: 409 }
      );
    }

    const nextStatus = action === "accept" ? "accepted" : "rejected";

    await ensureCampaignParticipantsTokenColumns();

    if (action === "accept" && access_token) {
      await upsertCampaignAccessToken({
        influencerId: influencer_id,
        handleName: influencer?.instagram_handle || influencer?.name || "",
        campaignId: current.campaign_id,
        accessToken: access_token,
      });

      await clickhouse.command({
        query: `
          ALTER TABLE campaign_participants
          UPDATE
            status = {status:String},
            decision = {decision:String},
            responded_at = {respondedAt:DateTime},
            token_status = 'active',
            oauth_platform = {platform:String},
            token_updated_at = {tokenUpdatedAt:DateTime}
          WHERE id = {participantId:UUID}
            AND influencer_id = {influencerId:UUID}
            AND status = 'invited'
        `,
        query_params: {
          status: nextStatus,
          decision: nextStatus,
          respondedAt: toClickHouseDateTime(now),
          platform,
          tokenUpdatedAt: toClickHouseDateTime(now),
          participantId: participant_id,
          influencerId: influencer_id,
        },
      });

      return Response.json({
        success: true,
        status: nextStatus,
        token_status: "active",
        storage: "clickhouse",
      });
    }

    await clickhouse.command({
      query: `
        ALTER TABLE campaign_participants
        UPDATE
          status = {status:String},
          decision = {decision:String},
          responded_at = {respondedAt:DateTime},
          token_status = if(token_status = '', 'missing', token_status)
        WHERE id = {participantId:UUID}
          AND influencer_id = {influencerId:UUID}
          AND status = 'invited'
      `,
      query_params: {
        status: nextStatus,
        decision: nextStatus,
        respondedAt: toClickHouseDateTime(now),
        participantId: participant_id,
        influencerId: influencer_id,
      },
    });

    return Response.json({ success: true, status: nextStatus });
  } catch (error) {
    console.error("/api/influencer/invitations/respond error", error);
    return Response.json(
      { success: false, message: "Failed to update invitation." },
      { status: 500 }
    );
  }
}
