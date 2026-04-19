"use client";

import Aurora from "@/components/Aurora";
import { useAccount } from "wagmi";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

export default function InfluencerOnboard() {

  const { address, isConnected } = useAccount();
  const router = useRouter();

  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [instagramId, setInstagramId] = useState("");
  const [category, setCategory] = useState("fashion");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isConnected) {
      router.push("/influencer/login");
    }
  }, [isConnected, router]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  const handleSubmit = async () => {

    if (!name || !handle || !instagramId) {
      setError("All fields are required.");
      return;
    }

    try {

      setLoading(true);

      const res = await fetch("/api/influencer/onboard", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          wallet: address,
          name,
          instagram_handle: handle,
          instagram_id: instagramId,
          category
        })
      });

      const data = (await res.json()) as { success?: boolean; message?: string };

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to create influencer profile");
      }

      router.push("/influencer/dashboard");

    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save profile.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Aurora>

      <div className="h-screen overflow-hidden flex items-center justify-center px-6 text-white">

        <div className="max-w-md w-full bg-white/10 backdrop-blur border border-white/10 p-8 rounded-xl space-y-6">

          <h1 className="text-2xl font-semibold text-center">
            Complete Your Profile
          </h1>

          <p className="text-neutral-400 text-sm text-center">
            Provide your influencer details to start participating in campaigns.
          </p>

          {/* NAME */}
          <div>
            <label className="text-xs text-neutral-400 mb-1 block">
              Display Name
            </label>

            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-black/40 border border-neutral-700 focus:outline-none focus:border-white/40"
            />
          </div>

          {/* INSTAGRAM HANDLE */}
          <div>
            <label className="text-xs text-neutral-400 mb-1 block">
              Instagram Handle
            </label>

            <input
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              placeholder="@yourhandle"
              className="w-full px-3 py-2 rounded-lg bg-black/40 border border-neutral-700 focus:outline-none focus:border-white/40"
            />
          </div>

          {/* INSTAGRAM ID */}
          <div>
            <label className="text-xs text-neutral-400 mb-1 block">
              Instagram ID
            </label>

            <input
              value={instagramId}
              onChange={(e) => setInstagramId(e.target.value)}
              placeholder="9876543210123456789"
              className="w-full px-3 py-2 rounded-lg bg-black/40 border border-neutral-700 focus:outline-none focus:border-white/40"
            />
            <p className="mt-1 text-[11px] text-neutral-500">
              Enter the long alphanumeric Instagram account ID used for mapping.
            </p>
          </div>

          {/* CATEGORY */}
          <div>
            <label className="text-xs text-neutral-400 mb-1 block">
              Category
            </label>

            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-black/40 border border-neutral-700 focus:outline-none focus:border-white/40"
            >
              <option value="fashion">Fashion</option>
              <option value="tech">Tech</option>
              <option value="fitness">Fitness</option>
              <option value="gaming">Gaming</option>
              <option value="travel">Travel</option>
            </select>
          </div>

          {/* ERROR */}
          {error && (
            <p className="text-red-400 text-sm">{error}</p>
          )}

          {/* BUTTON */}
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-white text-black py-3 rounded-lg font-semibold hover:bg-neutral-200 transition"
          >
            {loading ? "Saving..." : "Complete Profile"}
          </button>

        </div>

      </div>

    </Aurora>
  );
}