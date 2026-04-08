"use client";

import { useAccount, useDisconnect } from "wagmi";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import PixelBlast from "@/components/PixelBlast";

export default function Dashboard() {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const router = useRouter();

  /* -------------------- */
  /* Route Protection     */
  /* -------------------- */
  useEffect(() => {
    if (!isConnected) {
      router.replace("/login");
    }
  }, [isConnected, router]);

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
            </div>

            <button
              onClick={() => {
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
              <p className="text-2xl font-semibold mt-2">0</p>
            </div>

            <div className="bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-xl">
              <h3 className="text-sm text-neutral-400">
                Active Campaigns
              </h3>
              <p className="text-2xl font-semibold mt-2">0</p>
            </div>

            <div className="bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-xl">
              <h3 className="text-sm text-neutral-400">
                Total Reward Pool
              </h3>
              <p className="text-2xl font-semibold mt-2">0 ETH</p>
            </div>

          </div>

          {/* Campaign Section */}
          <div className="bg-white/5 backdrop-blur-md border border-white/10 p-8 rounded-xl">
            <h2 className="text-xl font-semibold mb-6">
              Your Campaigns
            </h2>

            <div className="text-neutral-400 text-sm">
              No campaigns created yet.
            </div>

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