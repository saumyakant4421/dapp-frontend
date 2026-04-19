"use client";

import { useAccount, useDisconnect } from "wagmi";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import LineWaves from "@/components/LineWaves";
import { Bell, Clock3, LayoutGrid, Wallet } from "lucide-react";

type Notification = {
  id: string;
  campaign_id: string;
  participant_id: string;
  title: string;
  message: string;
  campaign_name: string;
  reward_pool: number;
  invitation_deadline: string;
  start_date: string;
  participant_status: "invited" | "accepted" | "rejected" | "expired";
  token_status?: string;
  oauth_platform?: string;
  is_read: boolean;
};

type ActiveCampaign = {
  participant_id: string;
  campaign_id: string;
  campaign_name: string;
  reward_pool: number;
  duration_days: number;
  start_date: string;
  reel_urls: string[];
};

type InfluencerProfile = {
  name: string;
  instagram_handle: string;
  instagram_id: string;
};

type EarningsSummary = {
  total_estimated_earned: number;
  completed_campaigns: number;
};

type EarningsRow = {
  campaign_id: string;
  campaign_name: string;
  end_date: string;
  estimated_earning: number;
};

export default function InfluencerDashboard() {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const router = useRouter();
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [activeCampaigns, setActiveCampaigns] = useState<ActiveCampaign[]>([]);
  const [profile, setProfile] = useState<InfluencerProfile | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState("");
  const [accessTokenByParticipant, setAccessTokenByParticipant] = useState<Record<string, string>>({});
  const [platformByParticipant, setPlatformByParticipant] = useState<Record<string, string>>({});
  const [reelDraftByParticipant, setReelDraftByParticipant] = useState<Record<string, string>>({});
  const [reelEditorOpenByParticipant, setReelEditorOpenByParticipant] = useState<Record<string, boolean>>({});
  const [showNotifications, setShowNotifications] = useState(false);
  const [earningsSummary, setEarningsSummary] = useState<EarningsSummary>({
    total_estimated_earned: 0,
    completed_campaigns: 0,
  });
  const [pastEarnings, setPastEarnings] = useState<EarningsRow[]>([]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;
  const activeCampaignCount = activeCampaigns.length;
  const displayName = profile?.name || profile?.instagram_handle || "Influencer";

  const handleLogout = () => {
    document.cookie = "wallet=; path=/; max-age=0";
    document.cookie = "influencer_wallet=; path=/; max-age=0";
    disconnect();
    router.push("/influencer/login");
  };

  const loadData = useCallback(async (opts?: { silent?: boolean }) => {
    if (!address) return;
    const silent = opts?.silent ?? false;
    if (silent) setRefreshing(true);
    else setInitialLoading(true);
    setError("");

    try {
      const resolveRes = await fetch(`/api/auth/resolve?wallet=${encodeURIComponent(address)}`);
      const resolveData = (await resolveRes.json()) as {
        success: boolean;
        hasMultipleRoles?: boolean;
        roles?: {
          brand?: unknown;
          influencer?: unknown;
        };
      };

      if (!resolveRes.ok || !resolveData.success || resolveData.hasMultipleRoles) {
        setError("Wallet role validation failed.");
        router.push("/influencer/login");
        return;
      }

      if (!resolveData.roles?.influencer) {
        if (resolveData.roles?.brand) {
          router.push("/dashboard");
          return;
        }
        router.push("/influencer/login");
        return;
      }

      const [notificationsRes, activeRes, profileRes, earningsRes] = await Promise.all([
        fetch(`/api/influencer/notifications?wallet=${encodeURIComponent(address)}`),
        fetch(`/api/influencer/active-campaigns?wallet=${encodeURIComponent(address)}`),
        fetch(`/api/influencer/profile?wallet=${encodeURIComponent(address)}`),
        fetch(`/api/influencer/earnings?wallet=${encodeURIComponent(address)}`),
      ]);

      const notificationsData = (await notificationsRes.json()) as {
        success: boolean; needsOnboarding?: boolean; notifications?: Notification[]; message?: string;
      };
      const activeData = (await activeRes.json()) as {
        success: boolean; needsOnboarding?: boolean; campaigns?: ActiveCampaign[];
      };
      const profileData = (await profileRes.json()) as {
        exists?: boolean; influencer?: InfluencerProfile;
      };
      const earningsData = (await earningsRes.json()) as {
        success: boolean;
        needsOnboarding?: boolean;
        summary?: EarningsSummary;
        rows?: EarningsRow[];
      };

      if (notificationsData.needsOnboarding || activeData.needsOnboarding || earningsData.needsOnboarding) {
        router.push("/influencer/onboard");
        return;
      }
      if (!notificationsRes.ok || !notificationsData.success)
        setError(notificationsData.message || "Failed to load notifications.");

      setNotifications(notificationsData.notifications || []);
      setActiveCampaigns(activeData.campaigns || []);
      setProfile(profileData.exists ? profileData.influencer || null : null);
      setEarningsSummary(
        earningsData.success
          ? earningsData.summary || { total_estimated_earned: 0, completed_campaigns: 0 }
          : { total_estimated_earned: 0, completed_campaigns: 0 }
      );
      setPastEarnings(earningsData.success ? earningsData.rows || [] : []);
    } catch {
      setError("Failed to load influencer dashboard.");
    } finally {
      setInitialLoading(false);
      setRefreshing(false);
    }
  }, [address, router]);

  const respond = async (notificationId: string, participant_id: string, action: "accept" | "reject") => {
    if (!address) return;
    setActionLoadingId(participant_id + action);
    const platform = platformByParticipant[participant_id] || "instagram";
    const accessToken = accessTokenByParticipant[participant_id]?.trim() || "";
    if (action === "accept" && !accessToken) {
      setError("Access token is required before accepting.");
      setActionLoadingId("");
      return;
    }
    try {
      const res = await fetch("/api/influencer/invitations/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet: address, participant_id, notification_id: notificationId, action, platform, access_token: action === "accept" ? accessToken : undefined }),
      });
      const data = (await res.json()) as { success: boolean; message?: string };
      if (!res.ok || !data.success) { setError(data.message || "Failed to update."); return; }
      await fetch("/api/influencer/notifications/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet: address, participant_id }),
      });
      setAccessTokenByParticipant((prev) => ({ ...prev, [participant_id]: "" }));
      await loadData({ silent: true });
    } catch {
      setError("Failed to update invitation.");
    } finally {
      setActionLoadingId("");
    }
  };

  const saveReelUrl = async (participantId: string) => {
    if (!address) return;
    const reelUrl = reelDraftByParticipant[participantId]?.trim() || "";
    if (!reelUrl) { setError("Reel URL is required."); return; }
    try {
      const res = await fetch("/api/influencer/campaign-reel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet: address, participant_id: participantId, reel_url: reelUrl }),
      });
      const data = (await res.json()) as { success: boolean; message?: string };
      if (!res.ok || !data.success) { setError(data.message || "Failed to save reel URL."); return; }
      setReelEditorOpenByParticipant((prev) => ({ ...prev, [participantId]: false }));
      await loadData({ silent: true });
    } catch {
      setError("Failed to save reel URL.");
    }
  };

  useEffect(() => {
    if (!isConnected) { router.push("/influencer/login"); return; }
    loadData();
  }, [isConnected, router, loadData]);

  useEffect(() => {
    if (!isConnected || !address) return;
    const timer = setInterval(() => loadData({ silent: true }), 30000);
    return () => clearInterval(timer);
  }, [address, isConnected, loadData]);

  return (
    <div className="relative min-h-screen bg-black text-white px-4 py-5 overflow-hidden">

      <div className="absolute inset-0 z-0 opacity-75">
        <LineWaves color1="#1c2c2fff" color2="#22232bff" color3="#3b5249ff" brightness={0.28} speed={0.25} enableMouseInteraction />
      </div>
      <div className="absolute inset-0 z-0 bg-black/45" />

      <div className="relative z-10 max-w-7xl mx-auto space-y-3">

        {/* ── Header Bar ── */}
        <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-4 backdrop-blur-md shadow-xl shadow-black/20">
          <div className="flex flex-wrap items-center justify-between gap-4">

            {/* Left: title + meta */}
            <div className="min-w-0">
              <p className="text-[9px] uppercase tracking-[0.3em] text-neutral-500 leading-none">Influencer workspace</p>
              <h1 className="mt-0.5 text-xl font-semibold leading-tight">Influencer Dashboard</h1>
              <p className="text-xs text-neutral-400 truncate">
                {displayName}{profile?.instagram_id ? ` · ${profile.instagram_id}` : ""}
              </p>
            </div>

            {/* Centre: stat pills */}
            <div className="flex flex-wrap items-center gap-2">
              <StatPill icon={<Wallet className="h-3 w-3" />} label="Wallet" value={address ? `${address.slice(0, 6)}…${address.slice(-4)}` : "—"} />
              <StatPill icon={<Bell className="h-3 w-3" />} label="Unread" value={String(unreadCount)} accent={unreadCount > 0} />
              <StatPill icon={<LayoutGrid className="h-3 w-3" />} label="Active" value={String(activeCampaignCount)} />
            </div>

            {/* Right: actions */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button onClick={() => router.push("/")} className="px-3 py-1.5 rounded-lg text-[11px] font-medium bg-neutral-800 hover:bg-neutral-700 transition">Home</button>
              <button onClick={handleLogout} className="px-3 py-1.5 rounded-lg text-[11px] font-medium bg-white text-black hover:bg-neutral-200 transition">Logout</button>
            </div>
          </div>
        </div>

        {/* ── Main Grid ── */}
        <div className="grid gap-3 xl:grid-cols-[1.45fr_0.95fr] items-start">

          {/* Notifications */}
          <div className="rounded-xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur-md">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold">Notifications</h2>
              {showNotifications && notifications.length > 0 && (
                <button
                  onClick={() => setShowNotifications(false)}
                  className="text-[11px] px-2 py-0.5 rounded-full bg-white/10 border border-white/10 text-neutral-300 hover:text-white transition"
                >
                  Hide
                </button>
              )}
            </div>

            {initialLoading ? (
              <p className="text-neutral-400 text-sm">Loading…</p>
            ) : notifications.length === 0 ? (
              <div className="min-h-[260px] flex items-center justify-center">
                <div className="relative rounded-xl border border-white/10 bg-black/25 px-4 py-2 text-sm text-neutral-400">
                  No Notifications
                  <span className="absolute -top-2 -right-2 min-w-5 h-5 px-1 rounded-full bg-white/80 text-black text-[10px] font-semibold flex items-center justify-center">
                    0
                  </span>
                </div>
              </div>
            ) : !showNotifications ? (
              <div className="min-h-[260px] flex items-center justify-center">
                <button
                  onClick={() => setShowNotifications(true)}
                  className="relative rounded-xl border border-white/15 bg-black/35 px-4 py-2 text-sm text-neutral-200 hover:bg-black/45 hover:text-white transition"
                >
                  Show Notifications
                  <span className="absolute -top-2 -right-2 min-w-5 h-5 px-1 rounded-full bg-white text-black text-[10px] font-semibold flex items-center justify-center">
                    {unreadCount}
                  </span>
                </button>
              </div>
            ) : (
              <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
                {notifications.map((inv) => (
                  <div
                    key={inv.id}
                    className={`rounded-lg border p-2.5 transition ${inv.is_read ? "border-white/8 bg-black/20" : "border-emerald-400/20 bg-emerald-400/8"}`}
                  >
                    {/* Row 1: title + badge */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {!inv.is_read && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />}
                        <p className="text-xs font-medium truncate">{inv.title}</p>
                      </div>
                      <span className={`shrink-0 text-[9px] px-1.5 py-0.5 rounded-full ${inv.is_read ? "bg-white/10 text-neutral-400" : "bg-emerald-400/20 text-emerald-300"}`}>
                        {inv.is_read ? "Read" : "New"}
                      </span>
                    </div>

                    {/* Row 2: message */}
                        <p className="mt-1 text-[11px] leading-4 text-neutral-400 line-clamp-2">{inv.message}</p>

                    {/* Row 3: meta inline */}
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-neutral-500">
                      <span>{inv.campaign_name}</span>
                      <span>{inv.reward_pool.toFixed(2)} GO</span>
                      <span>Due {inv.invitation_deadline}</span>
                      <span className="capitalize">{inv.participant_status}</span>
                      <Link href={`/campaigns/${inv.campaign_id}`} className="text-neutral-400 hover:text-white underline underline-offset-2">Details</Link>
                    </div>

                    {inv.participant_status === "accepted" && inv.token_status && (
                      <p className="mt-1 text-[11px] text-emerald-400/80">
                        Token: {inv.token_status}{inv.oauth_platform ? ` (${inv.oauth_platform})` : ""}
                      </p>
                    )}

                    {/* Accept / Reject controls */}
                    {inv.participant_status === "invited" && (
                      <div className="mt-2 space-y-1.5">
                        <div className="flex gap-1.5">
                          <select
                            value={platformByParticipant[inv.participant_id] || "instagram"}
                            onChange={(e) => setPlatformByParticipant((prev) => ({ ...prev, [inv.participant_id]: e.target.value }))}
                            className="w-24 px-2 py-1 text-[11px] rounded-md bg-black/40 border border-neutral-700 focus:outline-none focus:border-white/30"
                          >
                            <option value="instagram">Instagram</option>
                          </select>
                          <input
                            type="password"
                            placeholder="Paste access token"
                            value={accessTokenByParticipant[inv.participant_id] || ""}
                            onChange={(e) => setAccessTokenByParticipant((prev) => ({ ...prev, [inv.participant_id]: e.target.value }))}
                            className="flex-1 px-2 py-1 text-[11px] rounded-md bg-black/40 border border-neutral-700 focus:outline-none focus:border-white/30"
                          />
                        </div>
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => respond(inv.id, inv.participant_id, "accept")}
                            disabled={actionLoadingId === inv.participant_id + "accept"}
                            className="px-2.5 py-1 text-[11px] bg-white text-black rounded-md hover:bg-neutral-200 disabled:opacity-50 transition"
                          >
                            Accept + Save Token
                          </button>
                          <button
                            onClick={() => respond(inv.id, inv.participant_id, "reject")}
                            disabled={actionLoadingId === inv.participant_id + "reject"}
                            className="px-2.5 py-1 text-[11px] bg-neutral-800 rounded-md hover:bg-neutral-700 disabled:opacity-50 transition"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {refreshing && !initialLoading && (
              <p className="mt-2 text-[10px] text-neutral-600">Syncing…</p>
            )}
          </div>

          {/* Right column */}
          <div className="space-y-3">

            {/* Earnings */}
            <div className="rounded-xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur-md">
              <div className="flex items-center gap-1.5 mb-2">
                <Clock3 className="h-3 w-3 text-neutral-400" />
                <h2 className="text-base font-semibold">Earnings</h2>
              </div>
              <div className="rounded-lg border border-white/10 bg-black/25 px-3 py-2.5">
                <p className="text-[10px] uppercase tracking-[0.25em] text-neutral-500">Past earnings (estimated)</p>
                <p className="mt-1 text-2xl font-semibold">{earningsSummary.total_estimated_earned.toFixed(4)} GO</p>
                <p className="mt-0.5 text-xs text-neutral-500">
                  Closed campaigns: {earningsSummary.completed_campaigns}
                </p>

                {pastEarnings.length > 0 ? (
                  <div className="mt-2 max-h-28 overflow-y-auto space-y-1.5 pr-1">
                    {pastEarnings.slice(0, 6).map((row) => (
                      <div key={row.campaign_id} className="text-[11px] text-neutral-400 flex items-center justify-between gap-2">
                        <span className="truncate">{row.campaign_name}</span>
                        <span className="text-neutral-300 shrink-0">{row.estimated_earning.toFixed(4)} GO</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-1 text-xs text-neutral-500">No closed campaign earnings yet.</p>
                )}
              </div>
            </div>

            {/* Active Campaigns */}
            <div className="rounded-xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur-md">
              <div className="flex items-center gap-1.5 mb-2">
                <LayoutGrid className="h-3 w-3 text-neutral-400" />
                <h2 className="text-base font-semibold">Active Campaigns</h2>
              </div>

              {initialLoading ? (
                <p className="text-neutral-400 text-sm">Loading…</p>
              ) : activeCampaigns.length === 0 ? (
                <p className="text-neutral-500 text-xs">No active campaigns yet.</p>
              ) : (
                <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
                  {activeCampaigns.map((campaign) => (
                    <div key={campaign.campaign_id} className="rounded-lg border border-white/10 px-3 py-2.5 bg-black/25 space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium leading-tight">{campaign.campaign_name}</p>
                        <button
                          onClick={() => {
                            setReelDraftByParticipant((prev) => ({
                              ...prev,
                              [campaign.participant_id]: "",
                            }));
                            setReelEditorOpenByParticipant((prev) => ({ ...prev, [campaign.participant_id]: true }));
                          }}
                          className="shrink-0 rounded-md border border-white/10 bg-white/10 px-2 py-1 text-[10px] text-neutral-200 hover:bg-white/15 transition"
                        >
                          {campaign.reel_urls.length > 0 ? "Add Reel" : "Add Reel"}
                        </button>
                      </div>

                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-neutral-500 -mt-0.5">
                        <span>{campaign.reward_pool.toFixed(2)} GO</span>
                        <span>{campaign.duration_days}d</span>
                        <span>Started {campaign.start_date}</span>
                      </div>

                      {campaign.reel_urls.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {campaign.reel_urls.map((url) => (
                            <a
                              key={url}
                              href={url}
                              target="_blank"
                              rel="noreferrer"
                              className="max-w-full rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-neutral-300 hover:text-white truncate"
                            >
                              {url}
                            </a>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[11px] text-neutral-600">No reel URL added.</p>
                      )}

                      {reelEditorOpenByParticipant[campaign.participant_id] && (
                        <div className="space-y-1.5 pt-0.5">
                          <input
                            value={reelDraftByParticipant[campaign.participant_id] ?? ""}
                            onChange={(e) => setReelDraftByParticipant((prev) => ({ ...prev, [campaign.participant_id]: e.target.value }))}
                            placeholder="https://instagram.com/reel/..."
                            className="w-full px-2 py-1 text-[11px] rounded-md bg-black/40 border border-neutral-700 focus:outline-none focus:border-white/30"
                          />
                          <div className="flex gap-1.5">
                            <button onClick={() => saveReelUrl(campaign.participant_id)} className="px-2.5 py-1 text-[11px] bg-white text-black rounded-md hover:bg-neutral-200 transition">Save</button>
                            <button onClick={() => setReelEditorOpenByParticipant((prev) => ({ ...prev, [campaign.participant_id]: false }))} className="px-2.5 py-1 text-[11px] bg-neutral-800 rounded-md hover:bg-neutral-700 transition">Cancel</button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {error && <p className="text-[11px] text-red-400">{error}</p>}
      </div>
    </div>
  );
}

function StatPill({
  icon,
  label,
  value,
  accent = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 ${accent ? "border-emerald-400/25 bg-emerald-400/8" : "border-white/10 bg-black/25"}`}>
      <span className={`${accent ? "text-emerald-400" : "text-neutral-400"}`}>{icon}</span>
      <span className="text-[10px] uppercase tracking-[0.15em] text-neutral-500">{label}</span>
      <span className="text-xs font-medium text-white">{value}</span>
    </div>
  );
}