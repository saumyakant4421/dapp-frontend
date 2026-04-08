"use client";

import { useState, useEffect } from "react";
import { useAccount, useConnect } from "wagmi";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

type Step = 1 | 2 | 3 | 4;

export default function LoginForm() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();

  const [step, setStep] = useState<Step>(1);
  const [company, setCompany] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const progress = (step / 4) * 100;

  /* ------------------------ */
  /* Wallet Binding + Finish  */
  /* ------------------------ */
  useEffect(() => {
    if (step === 3 && isConnected && address) {
      setStep(4);

      fetch("/api/wallet/bind", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_name: company,
          wallet_address: address,
        }),
      }).then(() => {
        setTimeout(() => {
          router.push("/dashboard");
        }, 600);
      });
    }
  }, [isConnected, address, step, company, router]);

  /* ------------------------ */

  const checkCompany = async () => {
    if (!company.trim()) {
      setError("Enter company name.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/company/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company_name: company }),
      });

      const data = await res.json();

      if (!data.success) {
        setError("Company not verified.");
        return;
      }

      setStep(3);
    } catch {
      setError("Server error.");
    } finally {
      setLoading(false);
    }
  };

  /* ------------------------ */
  /* Safe Wallet Connect      */
  /* ------------------------ */
  const handleWalletConnect = async () => {
    try {
      setError("");

      if (typeof window !== "undefined" && !(window as Window & { ethereum?: unknown }).ethereum) {
        setError("MetaMask not detected.");
        return;
      }

      const metaMaskConnector = connectors.find(
        (c) => c.id === "metaMask" || c.name === "MetaMask"
      );

      if (!metaMaskConnector) {
        setError("MetaMask connector not available.");
        return;
      }

      await connect({ connector: metaMaskConnector });
    } catch (err) {
      console.error(err);
      setError("Wallet connection failed.");
    }
  };

  return (
    <div className="h-[460px] w-full p-6 bg-white/10 backdrop-blur-md rounded-2xl text-white flex flex-col justify-between border border-white/10">

      {/* Progress */}
      <div>
        <div className="h-1.5 bg-neutral-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-white transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="flex justify-center gap-4 mt-3 text-xs">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-5 w-5 rounded-full flex items-center justify-center transition ${
                step >= s
                  ? "bg-white text-black"
                  : "bg-neutral-800 text-neutral-400"
              }`}
            >
              {s}
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col justify-center items-center">
        <div className="w-full max-w-xs space-y-4">

          {step === 1 && (
            <>
              <h2 className="text-lg font-semibold text-center">
                Is your company verified?
              </h2>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(2)}
                  className="flex-1 py-2 text-sm bg-white text-black rounded-lg font-medium hover:bg-neutral-200 transition cursor-pointer"
                >
                  Yes
                </button>

                <Link
                  href="/verify-company"
                  className="flex-1 py-2 text-sm text-center bg-neutral-800 rounded-lg font-medium hover:bg-neutral-700 transition cursor-pointer"
                >
                  No
                </Link>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <h2 className="text-lg font-semibold text-center">
                Enter Company Name
              </h2>

              <input
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg bg-black/40 border border-neutral-700 focus:outline-none focus:border-white/40"
              />

              <button
                onClick={checkCompany}
                disabled={loading}
                className="w-full py-2 text-sm bg-white text-black rounded-lg font-medium hover:bg-neutral-200 transition cursor-pointer"
              >
                {loading ? "Checking..." : "Continue"}
              </button>
            </>
          )}

          {step === 3 && (
            <>
              <h2 className="text-lg font-semibold text-center">
                Connect MetaMask
              </h2>

              <div className="flex justify-center">
                <Image
                  src="/metamask.png"
                  alt="MetaMask"
                  width={44}
                  height={44}
                  className="opacity-90"
                />
              </div>

              <button
                onClick={handleWalletConnect}
                disabled={isPending || isConnected}
                className="w-full py-2 text-sm bg-white text-black rounded-lg font-medium hover:bg-neutral-200 transition cursor-pointer"
              >
                {isPending
                  ? "Connecting..."
                  : isConnected
                  ? "Connected"
                  : "Click to Connect Wallet"}
              </button>
            </>
          )}

          {step === 4 && (
            <div className="text-center space-y-3">
              <div className="text-lg font-semibold">
                Login Successful
              </div>
              <p className="text-xs text-neutral-400">
                Redirecting to dashboard...
              </p>
            </div>
          )}

          {error && (
            <p className="text-xs text-red-400 text-center">{error}</p>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="text-xs text-neutral-400 text-center">
        Wallet identity is permanently tied to brand access.
      </div>
    </div>
  );
}