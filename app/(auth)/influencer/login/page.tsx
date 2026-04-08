"use client";

import Aurora from "@/components/Aurora";
import { useAccount, useConnect } from "wagmi";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function InfluencerLogin() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const router = useRouter();

  const [error, setError] = useState("");

useEffect(() => {
  if (isConnected && address) {
    document.cookie = `wallet=${address}; path=/`;
    router.push("/influencer/dashboard");
  }
}, [isConnected, address, router]);

  const handleConnect = async () => {
    try {
      const connector = connectors[0];
      await connect({ connector });
    } catch {
      setError("MetaMask connection failed.");
    }
  };

  return (
    <Aurora>

      <div className="min-h-screen flex items-center justify-center px-6 text-white">

        <div className="max-w-md w-full bg-white/10 backdrop-blur border border-white/10 p-8 rounded-xl space-y-6 text-center">

          <h1 className="text-2xl font-semibold">
            Influencer Login
          </h1>

          <p className="text-neutral-400 text-sm">
            Connect your wallet to access influencer campaigns.
          </p>

          <button
            onClick={handleConnect}
            className="w-full bg-white text-black py-3 rounded-lg font-semibold hover:bg-neutral-200 transition"
          >
            Connect MetaMask
          </button>

          {error && (
            <p className="text-red-400 text-sm">{error}</p>
          )}

        </div>

      </div>

    </Aurora>
  );
}