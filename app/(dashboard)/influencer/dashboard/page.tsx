"use client";

import { useAccount } from "wagmi";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function InfluencerDashboard() {

  const { address, isConnected } = useAccount();
  const router = useRouter();

  useEffect(() => {
    if (!isConnected) {
      router.push("/influencer/login");
    }
  }, [isConnected, router]);

  return (
    <div className="min-h-screen bg-black text-white px-8 py-16">

      <div className="max-w-5xl mx-auto">

        <h1 className="text-3xl font-semibold mb-8">
          Influencer Dashboard
        </h1>

        <div className="mb-10">
          <p className="text-neutral-400 text-sm">
            Connected Wallet
          </p>

          <p className="font-mono text-lg">
            {address || "Not connected"}
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">

          <div className="bg-white/10 border border-white/10 rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-3">
              Active Campaigns
            </h2>

            <p className="text-neutral-400 text-sm">
              No campaigns yet.
            </p>
          </div>

          <div className="bg-white/10 border border-white/10 rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-3">
              Earnings
            </h2>

            <p className="text-neutral-400 text-sm">
              0 ETH
            </p>
          </div>

        </div>

      </div>

    </div>
  );
}