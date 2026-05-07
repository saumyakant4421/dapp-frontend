import { loadCampaignReport } from "@/lib/campaignReport";

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const wallet = req.url
      ? new URL(req.url).searchParams.get("wallet")?.trim().toLowerCase()
      : null;

    const result = await loadCampaignReport(id, wallet || "");

    if (!result.success || !result.report) {
      return Response.json(
        {
          success: false,
          ready: false,
          message: result.message || "Failed to load campaign report.",
        },
        { status: result.message === "Campaign not found." ? 404 : 403 }
      );
    }

    return Response.json({
      success: true,
      ready: result.report.ready,
      report: result.report,
    });
  } catch (error) {
    console.error("/api/campaign/[id]/report error", error);
    return Response.json(
      { success: false, ready: false, message: "Failed to load campaign report." },
      { status: 500 }
    );
  }
}
