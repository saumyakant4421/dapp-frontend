"use client";

import { useAccount } from "wagmi";
import Link from "next/link";
import { useEffect, useState } from "react";
import { formatUTCToIST } from "@/lib/dateTimeUtils";
import { ChevronLeft, Download, Printer } from "lucide-react";

type CampaignReportResponse = {
  success: boolean;
  ready: boolean;
  message?: string;
  report?: {
    ready: boolean;
    role: "brand" | "influencer";
    campaign: {
      campaign_id: string;
      campaign_name: string;
      company_name: string;
      status: string;
      reward_pool: number;
      duration_days: number;
      invitation_deadline: string;
      start_date: string;
      end_date: string;
      target_gender: string;
      target_age_group: string;
      moderation_k: number;
    };
    metrics: {
      total_participants: number;
      invited_count: number;
      accepted_count: number;
      rejected_count: number;
      expired_count: number;
      total_reels_published: number;
      total_reach: number;
      total_engagement_rate: number;
      total_comments: number;
      total_reward_distributed: number;
      reward_per_accepted_influencer: number;
    };
    influencers: Array<{
      influencer_id: string;
      influencer_name: string;
      instagram_handle: string;
      status: string;
      reels_involved: number;
      ipi_score: number;
      rewards_earned: number;
      wallet_address: string;
      reel_urls: string[];
      top_performer: boolean;
    }>;
    insights: {
      top_keywords: string;
      summary: string;
    };
    comment_keywords: string[];
    generated_at: string;
  };
};

function formatCompactDateRange(startDate: string, endDate: string) {
  const start = formatUTCToIST(startDate);
  const end = formatUTCToIST(endDate);
  return `${start.split(" ")[0]} → ${end.split(" ")[0]}`;
}

function downloadText(filename: string, content: string, mime = "text/plain") {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function CampaignReportClient({ campaignId }: { campaignId: string }) {
  const { address, isConnected } = useAccount();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState<CampaignReportResponse | null>(null);

  useEffect(() => {
    if (!isConnected) return;

    const load = async () => {
      if (!address || !campaignId) {
        setError("Campaign ID is missing.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");

      try {
        const res = await fetch(
          `/api/campaign/${encodeURIComponent(campaignId)}/report?wallet=${encodeURIComponent(address)}`
        );
        const json = (await res.json()) as CampaignReportResponse;

        if (!res.ok || !json.success) {
          setError(json.message || "Failed to load campaign report.");
          return;
        }

        setData(json);
      } catch {
        setError("Failed to load campaign report.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [address, campaignId, isConnected]);

  const report = data?.report;

  const handleDownloadCsv = () => {
    if (!report) return;

    const rows = [
      ["Influencer Name", "Handle", "Reels Involved", "IPI Score", "Rewards Earned (GO)", "Wallet", "Top Performer"],
      ...report.influencers.map((row) => [
        row.influencer_name,
        row.instagram_handle,
        String(row.reels_involved),
        String(row.ipi_score),
        `${row.rewards_earned.toFixed(2)} GO`,
        row.wallet_address,
        row.top_performer ? "Yes" : "No",
      ]),
    ];

    const csv = rows
      .map((cols) => cols.map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\n");

    downloadText(
      `${report.campaign.campaign_name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-report.csv`,
      csv,
      "text/csv"
    );
  };

  const handleDownloadPdf = () => {
    window.print();
  };

  if (!isConnected) return null;

  return (
    <div className="relative min-h-screen bg-slate-50 text-gray-900 px-6 py-4 overflow-hidden">
      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }
          body {
            background: white !important;
            color: #1f2937 !important;
            margin: 0;
            padding: 0;
          }
          html {
            background: white !important;
          }
          * {
            box-shadow: none !important;
          }
        }
        .watermark {
          transform: rotate(-45deg);
          opacity: 0.035;
          font-size: 120px;
          font-weight: 700;
          color: #000;
          white-space: nowrap;
          pointer-events: none;
          user-select: none;
          mix-blend-mode: multiply;
        }
        @media print {
          .watermark {
            opacity: 0.04;
          }
        }
      `}</style>

      <div className="relative max-w-4xl mx-auto bg-white rounded-sm border border-gray-200 shadow-sm overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
          <div className="watermark">Encentive</div>
        </div>
        {/* Header Bar */}
        <div className="flex items-center justify-between gap-4 px-6 py-3 bg-gradient-to-r from-slate-900 to-slate-800 no-print border-b border-gray-200">
          <Link href={`/campaigns/${campaignId}`} className="inline-flex items-center gap-1.5 text-xs text-gray-300 hover:text-white transition">
            <ChevronLeft className="h-3 w-3" /> Back
          </Link>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadPdf}
              className="inline-flex items-center gap-1.5 rounded text-xs bg-white/10 hover:bg-white/20 px-2.5 py-1.5 text-white transition font-medium"
            >
              <Printer className="h-3 w-3" /> PDF
            </button>
            <button
              onClick={handleDownloadCsv}
              className="inline-flex items-center gap-1.5 rounded bg-white px-2.5 py-1.5 text-xs font-medium text-slate-900 hover:bg-gray-100 transition"
              disabled={!report}
            >
              <Download className="h-3 w-3" /> CSV
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-4 relative z-20">
          {loading ? (
            <p className="text-gray-500 text-xs">Loading report...</p>
          ) : error ? (
            <p className="text-red-600 text-xs">{error}</p>
          ) : !report ? (
            <p className="text-gray-500 text-xs">Report not available yet.</p>
          ) : !report.ready ? (
            <p className="text-xs text-gray-600">This report becomes available once the campaign is over and rewards are distributed.</p>
          ) : (
            <div className="space-y-0">
              {/* Header */}
              <div className="pb-3 border-b border-gray-300 mb-3">
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div className="flex-1">
                    <h1 className="text-base font-bold text-slate-900">{report.campaign.campaign_name}</h1>
                    <p className="text-xs text-gray-600 mt-0.5">{report.campaign.company_name}</p>
                  </div>
                  <div className="text-xs font-semibold text-slate-700 px-2 py-1 bg-slate-100 rounded">
                    {report.campaign.status === "closed" ? "Completed" : report.campaign.status}
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-2 text-xs">
                  <div>
                    <span className="text-gray-600">Period:</span>
                    <p className="font-semibold text-gray-900">{formatCompactDateRange(report.campaign.start_date, report.campaign.end_date)}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Status:</span>
                    <p className="font-semibold text-gray-900">{report.campaign.status}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Participants:</span>
                    <p className="font-semibold text-gray-900">{report.metrics.accepted_count}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Total Reward:</span>
                    <p className="font-semibold text-gray-900">{report.metrics.total_reward_distributed.toFixed(2)} GO</p>
                  </div>
                </div>
              </div>

              {/* Summary */}
              <p className="text-xs text-gray-700 leading-snug mb-3 italic text-slate-700">{report.insights.summary}</p>

              {/* Key Metrics */}
              <div className="mb-3 pb-3 border-b border-gray-200">
                <p className="text-xs font-bold text-slate-900 mb-2 uppercase tracking-wide">Campaign Metrics</p>
                <div className="grid grid-cols-4 gap-2">
                  <div className="bg-slate-100 rounded p-2">
                    <p className="text-[10px] text-gray-600 font-semibold">Total Reach</p>
                    <p className="text-sm font-bold text-slate-900">{report.metrics.total_reach.toLocaleString()}</p>
                  </div>
                  <div className="bg-slate-100 rounded p-2">
                    <p className="text-[10px] text-gray-600 font-semibold">Engagement Rate</p>
                    <p className="text-sm font-bold text-slate-900">{report.metrics.total_engagement_rate.toFixed(1)}%</p>
                  </div>
                  <div className="bg-slate-100 rounded p-2">
                    <p className="text-[10px] text-gray-600 font-semibold">Comments</p>
                    <p className="text-sm font-bold text-slate-900">{report.metrics.total_comments.toLocaleString()}</p>
                  </div>
                  <div className="bg-slate-100 rounded p-2">
                    <p className="text-[10px] text-gray-600 font-semibold">Total Reels</p>
                    <p className="text-sm font-bold text-slate-900">{report.metrics.total_reels_published}</p>
                  </div>
                </div>
              </div>

              {/* Participation */}
              <div className="mb-3 pb-3 border-b border-gray-200">
                <p className="text-xs font-bold text-slate-900 mb-2 uppercase tracking-wide">Participation</p>
                <div className="grid grid-cols-5 gap-1.5 text-xs">
                  <div className="text-center py-1.5 bg-blue-50 rounded"><span className="font-bold text-slate-900">{report.metrics.total_participants}</span><p className="text-[9px] text-gray-600">Invited</p></div>
                  <div className="text-center py-1.5 bg-green-50 rounded"><span className="font-bold text-slate-900">{report.metrics.accepted_count}</span><p className="text-[9px] text-gray-600">Accepted</p></div>
                  <div className="text-center py-1.5 bg-red-50 rounded"><span className="font-bold text-slate-900">{report.metrics.rejected_count}</span><p className="text-[9px] text-gray-600">Rejected</p></div>
                  <div className="text-center py-1.5 bg-gray-100 rounded"><span className="font-bold text-slate-900">{report.metrics.expired_count}</span><p className="text-[9px] text-gray-600">Expired</p></div>
                  <div className="text-center py-1.5 bg-amber-50 rounded"><span className="font-bold text-slate-900">{report.metrics.invited_count}</span><p className="text-[9px] text-gray-600">Pending</p></div>
                </div>
              </div>

              {/* Influencers */}
              <div className="mb-3">
                <p className="text-xs font-bold text-slate-900 mb-2 uppercase tracking-wide">Creator Performance ({report.influencers.length})</p>
                <div className="grid grid-cols-2 gap-2">
                  {report.influencers.map((row, index) => (
                    <div key={row.influencer_id} className="border border-gray-200 bg-slate-50 rounded p-3">
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div className="flex-1">
                          <p className="text-xs font-semibold text-gray-900">{row.influencer_name}</p>
                          <p className="text-[10px] text-gray-600">@{row.instagram_handle || "unknown"}</p>
                        </div>
                        {row.top_performer || index === 0 ? (
                          <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">★ Top</span>
                        ) : null}
                      </div>

                      {/* Stats Grid */}
                      <div className="grid grid-cols-2 gap-1.5 mb-1.5 text-[10px]">
                        <div className="bg-white border border-gray-200 rounded p-1.5">
                          <span className="text-gray-600 font-semibold">Reels</span>
                          <p className="font-bold text-gray-900">{row.reels_involved}</p>
                        </div>
                        <div className="bg-white border border-gray-200 rounded p-1.5">
                          <span className="text-gray-600 font-semibold">Amount</span>
                          <p className="font-bold text-gray-900">{row.rewards_earned.toFixed(2)} GO</p>
                        </div>
                        <div className="bg-white border border-gray-200 rounded p-1.5">
                          <span className="text-gray-600 font-semibold">IPI</span>
                          <p className="font-bold text-gray-900">{row.ipi_score}</p>
                        </div>
                        <div className="bg-white border border-gray-200 rounded p-1.5">
                          <span className="text-gray-600 font-semibold">Links</span>
                          <p className="font-bold text-gray-900">{row.reel_urls.length}</p>
                        </div>
                      </div>

                      {/* Reel URLs */}
                      {row.reel_urls.length > 0 && (
                        <div className="bg-white border border-gray-200 rounded p-1.5">
                          <p className="text-[10px] text-gray-600 font-semibold mb-0.5">URLs ({row.reel_urls.length})</p>
                          <div className="space-y-0.5">
                            {row.reel_urls.slice(0, 5).map((url, idx) => (
                              <a
                                key={idx}
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[9px] text-blue-600 hover:underline break-all block"
                                title={url}
                              >
                                {url}
                              </a>
                            ))}
                            {row.reel_urls.length > 5 && (
                              <p className="text-[9px] text-gray-600">+{row.reel_urls.length - 5} more</p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Wallet */}
                      {row.wallet_address && (
                        <div className="mt-1.5 text-[9px] text-gray-600 truncate">
                          <span className="font-semibold">Wallet:</span> {row.wallet_address.slice(0, 6)}...{row.wallet_address.slice(-4)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Insights Footer */}
              <div className="border-t border-gray-300 pt-2 mt-3">
                <div className="grid grid-cols-1 gap-2 text-xs mb-2">
                  <div>
                    <span className="text-gray-600 font-semibold">Keywords:</span>
                    <p className="font-semibold text-gray-900 text-[10px]">{report.insights.top_keywords}</p>
                  </div>
                </div>
                <div className="text-[9px] text-gray-500 pt-1 border-t border-gray-200">
                  Generated {formatUTCToIST(report.generated_at.replace("T", " ").slice(0, 19))} • Campaign ID: {report.campaign.campaign_id.slice(0, 8)}... • Encentive Platform
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
