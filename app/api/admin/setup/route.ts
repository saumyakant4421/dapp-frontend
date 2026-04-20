import { ensureCampaignTimelinesTable } from "@/lib/campaignTimeline";
import { ensureCampaignNotificationsTable } from "@/lib/notifications";
import {
  cleanupLegacyCampaignParticipantColumns,
  backfillCampaignParticipantsResponseData,
  ensureCampaignParticipantsTokenColumns,
} from "@/lib/campaignParticipantsMetadata";
import { ensureTokenCredentialsStore } from "@/lib/tokenCredentials";
import { ensureCampaignReelsTable } from "@/lib/campaignReels";
import { ensureIdentityTables } from "@/lib/identityTables";

export async function POST() {
  try {
    await ensureIdentityTables();
    await ensureCampaignTimelinesTable();
    await ensureCampaignNotificationsTable();
    await ensureCampaignParticipantsTokenColumns();
    await cleanupLegacyCampaignParticipantColumns();
    await ensureCampaignReelsTable();
    await ensureTokenCredentialsStore();
    await backfillCampaignParticipantsResponseData();

    return Response.json({
      success: true,
      message: "Campaign and token infrastructure is ready.",
      tables: [
        "company_verification_requests",
        "wallet_bindings",
        "influencers",
        "campaign_timelines",
        "campaign_notifications",
        "campaign_participants",
        "campaign_reels",
        "secure_tokens.influencer_token_credentials",
      ],
    });
  } catch (error) {
    console.error("/api/admin/setup error", error);
    return Response.json(
      { success: false, message: "Failed to initialize campaign tables." },
      { status: 500 }
    );
  }
}
