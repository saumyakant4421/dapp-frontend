"use client";

import Aurora from "@/components/Aurora";
import { useAccount, useConnect } from "wagmi";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

export default function InfluencerLogin() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const router = useRouter();

  const [error, setError] = useState("");

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  const handleContinue = useCallback(async () => {
    if (!address) return;

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

      if (!res.ok || !data.success) {
        setError("Unable to resolve wallet roles.");
        return;
      }

      document.cookie = `wallet=${address}; path=/`;
      document.cookie = `influencer_wallet=${address}; path=/`;

      if (data.hasMultipleRoles) {
        setError("This wallet is linked to both entity types. Please contact support.");
        return;
      }

      if (data.roles?.influencer) {
        router.push("/influencer/dashboard");
        return;
      }

      if (data.roles?.brand) {
        setError("This wallet is registered as a brand. Please use brand login.");
        router.push("/login");
        return;
      }

      router.push("/influencer/onboard");
    } catch {
      setError("Unable to resolve wallet roles.");
    }
  }, [address, router]);

  const handleConnect = async () => {
    try {
      const connector = connectors[0];
      await connect({ connector });
      await handleContinue();
    } catch {
      setError("MetaMask connection failed.");
    }
  };

  return (
    <Aurora>

      <div className="h-screen overflow-hidden flex items-center justify-center px-6 text-white">

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

          {isConnected && address && (
            <button
              onClick={handleContinue}
              className="w-full bg-neutral-800 text-white py-3 rounded-lg font-semibold hover:bg-neutral-700 transition"
            >
              Continue with Connected Wallet
            </button>
          )}

          {error && (
            <p className="text-red-400 text-sm">{error}</p>
          )}

        </div>

      </div>

    </Aurora>
  );
}