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

    return Response.json({
      success: true,
      message: "Campaign statuses are now computed dynamically from dates. No database mutation needed.",
    });
  } catch (error) {
    console.error("/api/internal/jobs/campaign-status-sync error", error);
    return Response.json(
      { success: false, message: "Failed to sync campaign statuses." },
      { status: 500 }
    );
  }
}
