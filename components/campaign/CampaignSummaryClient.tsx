"use client";

import { useAccount } from "wagmi";
import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import ShapeHero from "@/components/kokonutui/shape-hero";
import {
  BadgeDollarSign,
  CalendarClock,
  ChevronRight,
  CircleAlert,
  Gauge,
  Link2,
  ShieldCheck,
  Users,
  UserRoundCheck,
  UserRoundX,
} from "lucide-react";

type CampaignSummaryResponse = {
  success: boolean;
  message?: string;
  role?: "brand" | "influencer";
  campaign?: {
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
  participant_stats?: {
    total_participants: number;
    invited_count: number;
    accepted_count: number;
    rejected_count: number;
    expired_count: number;
  };
  involved_influencers?: Array<{
    influencer_id: string;
    handle_name: string;
    status: string;
    reel_url: string;
    reel_urls?: string[];
  }>;
};

export default function CampaignSummaryClient({ campaignId }: { campaignId: string }) {
  const { address, isConnected } = useAccount();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState<CampaignSummaryResponse | null>(null);
  const [participantFilters, setParticipantFilters] = useState<string[]>([]);

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
          `/api/campaign/${encodeURIComponent(campaignId)}/summary?wallet=${encodeURIComponent(address)}`
        );

        const json = (await res.json()) as CampaignSummaryResponse;

        if (!res.ok || !json.success) {
          setError(json.message || "Failed to load campaign details.");
          return;
        }

        setData(json);
      } catch {
        setError("Failed to load campaign details.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [address, campaignId, isConnected]);

  const visibleParticipants = useMemo(() => {
    const rows = data?.involved_influencers || [];
    if (!participantFilters.length) return rows;
    return rows.filter((row) => participantFilters.includes(row.status));
  }, [data?.involved_influencers, participantFilters]);

  const toggleFilter = (status: string) => {
    setParticipantFilters((prev) =>
      prev.includes(status) ? prev.filter((item) => item !== status) : [...prev, status]
    );
  };

  const clearFilters = () => setParticipantFilters([]);

  const participantStats = data?.participant_stats;
  const acceptanceRate =
    participantStats && participantStats.total_participants > 0
      ? Math.round((participantStats.accepted_count / participantStats.total_participants) * 100)
      : 0;

  const dashboardHref =
    data?.role === "influencer"
      ? "/influencer/dashboard"
      : data?.role === "brand"
      ? "/dashboard"
      : "/";

  const backLabel =
    data?.role === "influencer"
      ? "Back to influencer dashboard"
      : data?.role === "brand"
      ? "Back to brand dashboard"
      : "Back";

  return (
    <div className="relative min-h-screen bg-black text-white px-6 py-10 overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <ShapeHero />
        <div className="pointer-events-none absolute inset-0 bg-black/55 [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]" />
      </div>
      
      <div className="relative z-10 max-w-6xl mx-auto">
        <div className="flex items-center justify-between gap-4 mb-8">
          <div>
            <p className="text-[11px] uppercase tracking-[0.35em] text-neutral-500">Campaign summary</p>
            <h1 className="text-2xl font-semibold mt-2">Campaign Overview</h1>
          </div>
          <Link href={dashboardHref} className="inline-flex items-center gap-2 text-sm text-neutral-300 hover:text-white">
            {backLabel} <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        {loading ? (
          <p className="text-neutral-400 text-sm">Loading campaign...</p>
        ) : error ? (
          <p className="text-red-400 text-sm">{error}</p>
        ) : !data?.campaign ? (
          <p className="text-neutral-400 text-sm">Campaign not found.</p>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-6">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 text-neutral-300">
                      <ShieldCheck className="h-4 w-4" />
                      <span className="text-xs uppercase tracking-[0.25em]">Campaign</span>
                    </div>
                    <h2 className="mt-3 text-2xl font-semibold leading-tight">{data.campaign.campaign_name}</h2>
                    <p className="mt-2 text-sm text-neutral-300">Brand: {data.campaign.company_name || "Unknown"}</p>
                  </div>
                  <div className="rounded-full border border-white/10 bg-black/40 p-3 text-white">
                    <CircleAlert className="h-5 w-5" />
                  </div>
                </div>

                <p className="mt-4 text-xs text-neutral-500">Campaign ID: {data.campaign.campaign_id}</p>

                <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <InfoTile icon={<Gauge className="h-4 w-4" />} label="Status" value={data.campaign.status} />
                  <InfoTile icon={<BadgeDollarSign className="h-4 w-4" />} label="Reward Pool" value={`${data.campaign.reward_pool.toFixed(2)} GO`} />
                  <InfoTile icon={<CalendarClock className="h-4 w-4" />} label="Duration" value={`${data.campaign.duration_days} days`} />
                  <InfoTile icon={<Users className="h-4 w-4" />} label="Moderation K" value={`${data.campaign.moderation_k}`} />
                </div>

                <div className="mt-4 grid gap-2 text-xs text-neutral-300 md:grid-cols-3">
                  <MetaLine label="Invite deadline" value={data.campaign.invitation_deadline} />
                  <MetaLine label="Start date" value={data.campaign.start_date} />
                  <MetaLine label="End date" value={data.campaign.end_date} />
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
                <div className="flex items-center gap-2 mb-4">
                  <Users className="h-4 w-4 text-neutral-300" />
                  <h3 className="text-lg font-medium">Participation Snapshot</h3>
                </div>
                <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
                  <StatTile label="Total" value={participantStats?.total_participants ?? 0} icon={<Users className="h-4 w-4" />} />
                  <StatTile label="Invited" value={participantStats?.invited_count ?? 0} icon={<UserRoundCheck className="h-4 w-4" />} />
                  <StatTile label="Accepted" value={participantStats?.accepted_count ?? 0} icon={<UserRoundCheck className="h-4 w-4" />} />
                  <StatTile label="Rejected" value={participantStats?.rejected_count ?? 0} icon={<UserRoundX className="h-4 w-4" />} />
                  <StatTile label="Expired" value={participantStats?.expired_count ?? 0} icon={<CircleAlert className="h-4 w-4" />} />
                  <StatTile label="Acceptance Rate" value={`${acceptanceRate}%`} icon={<Gauge className="h-4 w-4" />} />
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-neutral-300" />
                    <h3 className="text-lg font-medium whitespace-nowrap">Involved Influencers</h3>
                  </div>
                    <div className="grid w-full max-w-[300px] gap-1.5 sm:grid-cols-3 sm:justify-end lg:grid-cols-3 lg:max-w-[300px]">
                    {(["all", "invited", "accepted", "rejected", "expired"] as const).map((status, index) => {
                      const isAll = status === "all";
                      const isActive = isAll ? participantFilters.length === 0 : participantFilters.includes(status);

                      return (
                        <button
                          key={status}
                          onClick={() => (isAll ? clearFilters() : toggleFilter(status))}
                            className={`px-2 py-1 rounded-full text-[10px] leading-none border transition whitespace-nowrap ${
                            isActive
                              ? "bg-white text-black border-white"
                              : "bg-black/30 text-neutral-300 border-white/10 hover:border-white/30"
                          } ${index >= 3 ? "sm:col-span-1" : ""}`}
                        >
                          {status}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {!visibleParticipants.length ? (
                  <p className="text-sm text-neutral-400">No participant data yet.</p>
                ) : (
                  <div className="space-y-2">
                    {visibleParticipants.map((row) => (
                      <div
                        key={row.influencer_id}
                        className="rounded-xl border border-white/10 bg-black/30 px-4 py-3"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                          <p className="text-sm font-medium">@{row.handle_name}</p>
                          <p className="text-[11px] text-neutral-500">Influencer validation record</p>
                            {(row.reel_urls?.length || 0) > 0 ? (
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {(row.reel_urls || []).map((url) => (
                                  <a
                                    key={`${row.influencer_id}-${url}`}
                                    href={url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex max-w-full items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-neutral-300 hover:text-white truncate"
                                  >
                                    <Link2 className="h-3 w-3" />
                                    {url}
                                  </a>
                                ))}
                              </div>
                            ) : row.reel_url ? (
                              <a
                                href={row.reel_url}
                                target="_blank"
                                rel="noreferrer"
                                className="mt-2 inline-flex items-center gap-1 text-xs text-neutral-200 hover:text-white"
                              >
                                <Link2 className="h-3.5 w-3.5" />
                                {row.reel_url}
                              </a>
                            ) : (
                              <p className="mt-2 text-xs text-neutral-500">No reel URL submitted.</p>
                            )}
                          </div>
                          <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-white/10 text-neutral-200 border border-white/10 shrink-0">
                            <ShieldCheck className="h-3.5 w-3.5" />
                            {row.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
                <div className="flex items-center gap-2 mb-4">
                  <ShieldCheck className="h-4 w-4 text-neutral-300" />
                  <h3 className="text-lg font-medium">Quick Validation</h3>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 text-sm">
                  <MiniNote title="Verified Brand" value={data.campaign.company_name || "Unknown"} />
                  <MiniNote title="Live Participants" value={`${data.participant_stats?.accepted_count ?? 0} active`} />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function InfoTile({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/35 p-4">
      <div className="flex items-center gap-2 text-neutral-400">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white">
          {icon}
        </span>
        <p>{label}</p>
      </div>
      <p className="mt-3 text-base font-medium text-white">{value}</p>
    </div>
  );
}

function StatTile({ icon, label, value }: { icon: ReactNode; label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/35 p-4">
      <div className="flex items-center justify-between gap-3 text-neutral-400">
        <p className="text-sm">{label}</p>
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white">
          {icon}
        </span>
      </div>
      <p className="mt-3 text-2xl font-semibold text-white">{value}</p>
    </div>
  );
}

function MetaLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/30 px-3 py-2">
      <p className="text-[11px] uppercase tracking-[0.2em] text-neutral-500">{label}</p>
      <p className="mt-1 text-sm text-neutral-200">{value}</p>
    </div>
  );
}

function MiniNote({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/30 px-4 py-3">
      <p className="text-[11px] uppercase tracking-[0.2em] text-neutral-500">{title}</p>
      <p className="mt-2 text-sm text-white">{value}</p>
    </div>
  );
}
