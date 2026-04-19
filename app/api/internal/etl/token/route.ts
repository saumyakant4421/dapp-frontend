import { clickhouse } from "@/lib/clickhouse";
import { ensureCampaignParticipantsTokenColumns } from "@/lib/campaignParticipantsMetadata";
import { getParticipantTokenCredential } from "@/lib/tokenCredentials";

type ParticipantTokenMetaRow = {
  token_status: string;
  oauth_platform: string;
};

export async function POST(req: Request) {
  try {
    const internalKey = req.headers.get("x-internal-etl-key");
    if (!internalKey || internalKey !== process.env.INTERNAL_ETL_API_KEY) {
      return Response.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }

    const body = (await req.json()) as {
      participant_id?: string;
    };

    const participant_id = body.participant_id;
    if (!participant_id) {
      return Response.json(
        { success: false, message: "participant_id is required." },
        { status: 400 }
      );
    }

    await ensureCampaignParticipantsTokenColumns();

    const result = await clickhouse.query({
      query: `
        SELECT token_status, oauth_platform
        FROM campaign_participants
        WHERE id = {participantId:UUID}
        LIMIT 1
      `,
      query_params: { participantId: participant_id },
    });

    const data = await result.json<ParticipantTokenMetaRow>();
    const row = data.data[0];

    if (!row) {
      return Response.json(
        { success: false, message: "Participant not found." },
        { status: 404 }
      );
    }

    if (row.token_status !== "active") {
      return Response.json(
        { success: false, message: `Token status is ${row.token_status}.` },
        { status: 409 }
      );
    }

    const tokenData = await getParticipantTokenCredential(participant_id);

    if (!tokenData || !tokenData.access_token) {
      return Response.json(
        { success: false, message: "No active token credential found." },
        { status: 404 }
      );
    }

    return Response.json({
      success: true,
      participant_id,
      oauth_platform: row.oauth_platform,
      token_status: row.token_status,
      access_token: tokenData.access_token,
      handle_name: tokenData.handle_name || "",
      created_at: tokenData.created_at || "",
      updated_at: tokenData.updated_at || "",
      storage: "clickhouse",
    });
  } catch (error) {
    console.error("/api/internal/etl/token error", error);
    return Response.json(
      { success: false, message: "Failed to fetch token credential." },
      { status: 500 }
    );
  }
}
