"use client";

import { useAccount, useDisconnect } from "wagmi";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import PixelBlast from "@/components/PixelBlast";
import { formatUTCToIST } from "@/lib/dateTimeUtils";

type DashboardCampaign = {
  campaign_id: string;
  campaign_name: string;
  reward_pool: number;
  duration_days: number;
  status: string;
  created_at: string;
  participants: number;
};

type BrandDashboardResponse = {
  success: boolean;
  message?: string;
  company?: {
    company_id: string;
    company_name: string;
  };
  stats?: {
    total_campaigns: number;
    active_campaigns: number;
    total_reward_pool: number;
  };
  campaigns?: DashboardCampaign[];
};

export default function Dashboard() {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [stats, setStats] = useState({
    total_campaigns: 0,
    active_campaigns: 0,
    total_reward_pool: 0,
  });
  const [campaigns, setCampaigns] = useState<DashboardCampaign[]>([]);

  /* -------------------- */
  /* Route Protection     */
  /* -------------------- */
  useEffect(() => {
    if (!isConnected) {
      router.replace("/login");
    }
  }, [isConnected, router]);

  useEffect(() => {
    const enforceRole = async () => {
      if (!isConnected || !address) return;

      try {
        const res = await fetch(`/api/auth/resolve?wallet=${encodeURIComponent(address)}`);
        const data = (await res.json()) as {
          success: boolean;
          hasMultipleRoles?: boolean;
          roles?: {
            brand?: unknown;
            influencer?: unknown;
          };
        };

        if (!res.ok || !data.success || data.hasMultipleRoles) {
          setError("Wallet role validation failed.");
          router.replace("/login");
          return;
        }

        if (!data.roles?.brand) {
          if (data.roles?.influencer) {
            router.replace("/influencer/dashboard");
            return;
          }
          router.replace("/login");
        }
      } catch {
        router.replace("/login");
      }
    };

    enforceRole();
  }, [address, isConnected, router]);

  useEffect(() => {
    const loadDashboard = async () => {
      if (!isConnected || !address) return;

      setLoading(true);
      setError("");

      try {
        const res = await fetch(`/api/dashboard/brand?wallet=${encodeURIComponent(address)}`);
        const data = (await res.json()) as BrandDashboardResponse;

        if (!res.ok || !data.success || !data.stats) {
          setError(data.message || "Failed to load dashboard data.");
          return;
        }

        setCompanyName(data.company?.company_name || "");
        setStats(data.stats);
        setCampaigns(data.campaigns || []);
      } catch {
        setError("Failed to load dashboard data.");
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, [address, isConnected]);

  const rewardPoolLabel = useMemo(() => `${stats.total_reward_pool.toFixed(2)} GO`, [stats.total_reward_pool]);

  if (!isConnected) return null;

  return (
    <div className="relative min-h-screen bg-black text-white overflow-hidden">

       {/* PixelBlast Background */}
       <div className="absolute inset-0 z-0 opacity-60">
         <PixelBlast />
       </div>

       {/* Gradient Overlay */}
       <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.05),transparent_60%)]" />

       {/* Content */}
       <div className="relative z-10 px-6 py-12">
        <div className="max-w-6xl mx-auto space-y-12">

          {/* Header */}
          <div className="flex justify-between items-center border-b border-white/10 pb-6">
            <div>
              <h1 className="text-3xl font-semibold">
                Brand Dashboard
              </h1>
              <p className="text-neutral-400 text-sm mt-1">
                Wallet: {address?.slice(0, 6)}...{address?.slice(-4)}
              </p>
              <p className="text-neutral-300 text-sm mt-1">
                {companyName ? `Company: ${companyName}` : "Company not resolved"}
              </p>
            </div>

            <button
              onClick={() => {
                document.cookie = "wallet=; path=/; max-age=0";
                disconnect();
                router.push("/");
              }}
              className="bg-white text-black px-5 py-2 rounded-lg font-medium hover:bg-neutral-200 transition cursor-pointer"
            >
              Disconnect
            </button>
          </div>

          {/* Stats */}
          <div className="grid md:grid-cols-3 gap-6">

            <div className="bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-xl">
              <h3 className="text-sm text-neutral-400">
                Total Campaigns
              </h3>
              <p className="text-2xl font-semibold mt-2">{stats.total_campaigns}</p>
            </div>

            <div className="bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-xl">
              <h3 className="text-sm text-neutral-400">
                Active Campaigns
              </h3>
              <p className="text-2xl font-semibold mt-2">{stats.active_campaigns}</p>
            </div>

            <div className="bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-xl">
              <h3 className="text-sm text-neutral-400">
                Total Reward Pool
              </h3>
              <p className="text-2xl font-semibold mt-2">{rewardPoolLabel}</p>
            </div>

          </div>

          {/* Campaign Section */}
          <div className="bg-white/5 backdrop-blur-md border border-white/10 p-8 rounded-xl">
            <h2 className="text-xl font-semibold mb-6">
              Your Campaigns
            </h2>

            {loading ? (
              <div className="text-neutral-400 text-sm">Loading dashboard...</div>
            ) : error ? (
              <div className="text-red-300 text-sm">{error}</div>
            ) : campaigns.length === 0 ? (
              <div className="text-neutral-400 text-sm">No campaigns created yet.</div>
            ) : (
              <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                {campaigns.map((campaign) => (
                  <div
                    key={campaign.campaign_id}
                    className="rounded-lg border border-white/10 bg-white/5 px-4 py-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium">{campaign.campaign_name}</p>
                        <p className="text-xs text-neutral-400">
                          {campaign.duration_days} days • {campaign.participants} participants
                        </p>
                        <p className="text-xs text-neutral-500">
                          Created {formatUTCToIST(campaign.created_at)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm">{campaign.reward_pool.toFixed(2)} GO</p>
                        <p className="text-xs text-neutral-400">{campaign.status}</p>
                        <Link
                          href={`/campaigns/${campaign.campaign_id}`}
                          className="text-xs text-neutral-300 hover:text-white"
                        >
                          View details
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

           <Link href="/campaign/create">
              <button className="mt-6 bg-white text-black px-6 py-3 rounded-lg font-semibold hover:bg-neutral-200 transition cursor-pointer">
                Create Campaign
              </button>
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}