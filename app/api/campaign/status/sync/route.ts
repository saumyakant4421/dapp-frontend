import { syncCampaignStatuses } from "@/lib/campaignStatus";

function isAuthorized(req: Request): boolean {
  const expected = process.env.INTERNAL_SYNC_API_KEY;
  if (!expected) return true;

  const provided = req.headers.get("x-internal-sync-key") || "";
  return provided === expected;
}

export async function POST(req: Request) {
  try {
    if (!isAuthorized(req)) {
      return Response.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }

    await syncCampaignStatuses();

    return Response.json({
      success: true,
      message: "Campaign statuses synced and persisted.",
    });
  } catch (error) {
    console.error("/api/campaign/status/sync error", error);
    return Response.json(
      { success: false, message: "Failed to sync campaign statuses." },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  return POST(req);
}
