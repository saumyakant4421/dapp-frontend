"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import PixelBlast from "@/components/PixelBlast";
import Link from "next/link";

type Influencer = {
  name: string;
  handle: string;
};

export default function CreateCampaign() {
  const router = useRouter();

  const [campaignName, setCampaignName] = useState("");
  const [budget, setBudget] = useState("");
  const [duration, setDuration] = useState("7");

  const [moderation, setModeration] = useState(0.5);
  const [gender, setGender] = useState("male");
  const [ageCategory, setAgeCategory] = useState("18-24");

  const [influencers, setInfluencers] = useState<Influencer[]>([
    { name: "", handle: "" },
    { name: "", handle: "" },
  ]);

  const addInfluencer = () => {
    if (influencers.length >= 6) return;
    setInfluencers([...influencers, { name: "", handle: "" }]);
  };

  const removeInfluencer = (index: number) => {
    if (influencers.length <= 2) return;
    setInfluencers(influencers.filter((_, i) => i !== index));
  };

  const updateInfluencer = (
    index: number,
    field: keyof Influencer,
    value: string
  ) => {
    const updated = [...influencers];
    updated[index][field] = value;
    setInfluencers(updated);
  };

  const submitCampaign = () => {
    const payload = {
      campaignName,
      budget,
      duration,
      moderation,
      gender,
      ageCategory,
      influencers,
    };

    console.log("Campaign Created:", payload);

    alert("Campaign submitted successfully!");
    router.push("/dashboard");
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center px-6 py-16 overflow-hidden bg-black">

      {/* Background */}
      <div className="absolute inset-0 z-0 opacity-50">
        <PixelBlast />
      </div>

      <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.05),transparent_60%)]" />

      {/* Back Button */}
      <Link
        href="/dashboard"
        className="fixed top-16 left-20 z-20 flex items-center gap-2 text-white hover:text-neutral-300 transition text-sm cursor-pointer"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
        </svg>
        Back
      </Link>

      {/* Content */}
      <div className="relative z-10 w-full max-w-5xl grid md:grid-cols-2 gap-8 items-center">

        {/* LEFT COLUMN — Influencers */}
        <div className="h-[520px] w-full p-6 bg-white/10 backdrop-blur-md rounded-2xl text-white border border-white/10 flex flex-col">

          <h2 className="text-lg font-semibold mb-4">
            Influencers
          </h2>

          {/* Scroll container */}
          <div className="flex-1 space-y-3 overflow-y-auto pr-2">

            {influencers.map((inf, i) => (
              <div
                key={i}
                className="bg-white/5 border border-white/10 p-3 rounded-lg"
              >
                <div className="grid grid-cols-2 gap-2">

                  <input
                    value={inf.name}
                    onChange={(e) =>
                      updateInfluencer(i, "name", e.target.value)
                    }
                    placeholder="Influencer Name"
                    className="px-3 py-2 text-sm rounded-lg bg-black/40 border border-neutral-700 focus:outline-none focus:border-white/40"
                  />

                  <input
                    value={inf.handle}
                    onChange={(e) =>
                      updateInfluencer(i, "handle", e.target.value)
                    }
                    placeholder="@instagram"
                    className="px-3 py-2 text-sm rounded-lg bg-black/40 border border-neutral-700 focus:outline-none focus:border-white/40"
                  />
                </div>

                {influencers.length > 2 && (
                  <button
                    onClick={() => removeInfluencer(i)}
                    className="text-xs text-red-400 mt-2 cursor-pointer"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}

          </div>

          {influencers.length < 6 && (
            <button
              onClick={addInfluencer}
              className="text-xs text-white underline mt-3 cursor-pointer"
            >
              + Add influencer
            </button>
          )}

        </div>

        {/* RIGHT COLUMN — Campaign Setup */}
        <div className="h-[520px] w-full p-6 bg-white/10 backdrop-blur-md rounded-2xl text-white border border-white/10 flex flex-col space-y-3 justify-between">

          <h2 className="text-lg font-semibold text-center">
            Campaign Setup
          </h2>

          <div>
            <label className="text-xs text-neutral-400 mb-1 block">
              Campaign Name
            </label>

            <input
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg bg-black/40 border border-neutral-700 focus:outline-none focus:border-white/40"
            />
          </div>

          <div>
            <label className="text-xs text-neutral-400 mb-1 block">
              Reward Pool (ETH)
            </label>

            <input
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg bg-black/40 border border-neutral-700 focus:outline-none focus:border-white/40"
            />
          </div>

          <div>
            <label className="text-xs text-neutral-400 mb-1 block">
              Campaign Duration
            </label>

            <select
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg bg-black/40 border border-neutral-700 focus:outline-none focus:border-white/40 cursor-pointer"
            >
              <option value="7">7 days</option>
              <option value="14">14 days</option>
              <option value="28">28 days</option>
            </select>
          </div>

          <div>
            <label className="text-xs text-neutral-400 mb-1 block">
              Moderation Strictness ({moderation})
            </label>

            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={moderation}
              onChange={(e) => setModeration(parseFloat(e.target.value))}
              className="w-full accent-white cursor-pointer"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">

            <div>
              <label className="text-xs text-neutral-400 mb-1 block">
                Gender
              </label>

              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg bg-black/40 border border-neutral-700 focus:outline-none focus:border-white/40 cursor-pointer"
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-neutral-400 mb-1 block">
                Age Group
              </label>

              <select
                value={ageCategory}
                onChange={(e) => setAgeCategory(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg bg-black/40 border border-neutral-700 focus:outline-none focus:border-white/40 cursor-pointer"
              >
                <option>13-17</option>
                <option>18-24</option>
                <option>25-34</option>
                <option>35-44</option>
                <option>45-54</option>
                <option>55-64</option>
                <option>65+</option>
              </select>
            </div>

          </div>

          <button
            onClick={submitCampaign}
            className="w-full py-2.5 text-sm bg-white text-black rounded-lg font-semibold hover:bg-neutral-200 transition cursor-pointer"
          >
            Create Campaign
          </button>

        </div>

      </div>
    </div>
  );
}