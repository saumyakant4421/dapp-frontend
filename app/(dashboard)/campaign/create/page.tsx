"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import PixelBlast from "@/components/PixelBlast";
import Link from "next/link";
import { useWallet } from "@/hooks/useWallet";
import { createCampaignOnChain, type TxStatus } from "@/lib/campaign";
import { ensureCorrectNetwork } from "@/lib/network";

type Influencer = {
  influencer_id: string;
  name: string;
  handle: string;
  instagram_id?: string;
  category?: string;
};

export default function CreateCampaign() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const {
    signer,
    connect,
    isConnecting,
    error: walletError,
  } = useWallet();

  const [campaignName, setCampaignName] = useState("");
  const [budget, setBudget] = useState("");
  const [duration, setDuration] = useState("7");

  const [moderation, setModeration] = useState(0.5);
  const [gender, setGender] = useState("");
  const [ageCategory, setAgeCategory] = useState("");

  const [registeredInfluencers, setRegisteredInfluencers] = useState<Influencer[]>([]);
  const [selectedInfluencerIds, setSelectedInfluencerIds] = useState<string[]>([]);
  const [influencerSearch, setInfluencerSearch] = useState("");
  const [influencersLoading, setInfluencersLoading] = useState(true);
  const [influencersError, setInfluencersError] = useState("");

  const [loading, setLoading] = useState(false);
  const [invitationDeadline, setInvitationDeadline] = useState("");
  const [startDate, setStartDate] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [companyLoading, setCompanyLoading] = useState(true);
  const [companyError, setCompanyError] = useState("");
  const [dialog, setDialog] = useState<{
    open: boolean;
    type: "success" | "error";
    title: string;
    message: string;
  }>({
    open: false,
    type: "success",
    title: "",
    message: "",
  });
  const [redirectAfterDialog, setRedirectAfterDialog] = useState<string | null>(null);
  const [txStatus, setTxStatus] = useState<TxStatus>({ state: "idle" });

  const visibleInfluencers = registeredInfluencers.filter((inf) => {
    const query = influencerSearch.trim().toLowerCase();
    if (!query) return true;
    return (
      inf.name.toLowerCase().includes(query) ||
      inf.handle.toLowerCase().includes(query) ||
      (inf.instagram_id || "").toLowerCase().includes(query)
    );
  });

  const selectedInfluencers = registeredInfluencers.filter((inf) =>
    selectedInfluencerIds.includes(inf.influencer_id)
  );

  const openDialog = (
    type: "success" | "error",
    title: string,
    message: string,
    redirectTo?: string
  ) => {
    setDialog({ open: true, type, title, message });
    setRedirectAfterDialog(redirectTo || null);
  };

  const closeDialog = () => {
    setDialog((prev) => ({ ...prev, open: false }));
    if (redirectAfterDialog) {
      const nextPath = redirectAfterDialog;
      setRedirectAfterDialog(null);
      router.push(nextPath);
    }
  };

  const txStatusLabel = () => {
    if (isConnecting) return "Connecting wallet...";
    if (txStatus.state === "waiting_wallet") return "Check MetaMask...";
    if (txStatus.state === "pending") return "Waiting for on-chain confirmation...";
    if (txStatus.state === "confirmed") return "On-chain confirmation complete";
    return "";
  };

  useEffect(() => {
    const resolveCompany = async () => {
      if (!isConnected || !address) {
        setCompanyLoading(false);
        setCompanyError("Connect wallet to continue.");
        return;
      }

      setCompanyLoading(true);
      setCompanyError("");

      try {
        const res = await fetch(`/api/company/me?wallet=${encodeURIComponent(address)}`);
        const data = (await res.json()) as {
          success: boolean;
          company_name?: string;
          message?: string;
        };

        if (!res.ok || !data.success || !data.company_name) {
          setCompanyName("");
          setCompanyError(data.message || "No verified company is linked to this wallet.");
          return;
        }

        setCompanyName(data.company_name);
      } catch {
        setCompanyName("");
        setCompanyError("Failed to load company from database.");
      } finally {
        setCompanyLoading(false);
      }
    };

    resolveCompany();
  }, [address, isConnected]);

  useEffect(() => {
    const now = new Date();
    const invitation = new Date(now.getTime() + 48 * 60 * 60 * 1000);
    const start = new Date(invitation.getTime() + 24 * 60 * 60 * 1000);

    const toLocalInput = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      const hours = String(d.getHours()).padStart(2, "0");
      const minutes = String(d.getMinutes()).padStart(2, "0");
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    };

    setInvitationDeadline(toLocalInput(invitation));
    setStartDate(toLocalInput(start));
  }, []);

  useEffect(() => {
    const loadInfluencers = async () => {
      if (!isConnected || !address) {
        setInfluencersLoading(false);
        setInfluencersError("Connect wallet to load influencers.");
        return;
      }

      setInfluencersLoading(true);
      setInfluencersError("");

      try {
        const res = await fetch(`/api/influencer/registered?wallet=${encodeURIComponent(address)}`);
        const data = (await res.json()) as {
          success: boolean;
          message?: string;
          influencers?: Influencer[];
        };

        if (!res.ok || !data.success) {
          setRegisteredInfluencers([]);
          setInfluencersError(data.message || "Failed to load registered influencers.");
          return;
        }

        setRegisteredInfluencers(data.influencers || []);
      } catch {
        setRegisteredInfluencers([]);
        setInfluencersError("Failed to load registered influencers.");
      } finally {
        setInfluencersLoading(false);
      }
    };

    loadInfluencers();
  }, [address, isConnected]);

  const toggleInfluencer = (influencerId: string) => {
    setSelectedInfluencerIds((prev) => {
      if (prev.includes(influencerId)) {
        return prev.filter((id) => id !== influencerId);
      }
      if (prev.length >= 6) {
        return prev;
      }
      return [...prev, influencerId];
    });
  };

  const submitCampaign = async () => {
    try {
      setLoading(true);

      if (!address) {
        openDialog("error", "Wallet not connected", "Please connect your wallet before creating a campaign.");
        setLoading(false);
        return;
      }

      if (!companyName) {
        openDialog("error", "Company not linked", companyError || "No verified company linked to this wallet.");
        setLoading(false);
        return;
      }

      if (!invitationDeadline || !startDate) {
        openDialog("error", "Missing campaign dates", "Set invitation deadline and start date.");
        setLoading(false);
        return;
      }

      if (new Date(startDate).getTime() <= new Date(invitationDeadline).getTime()) {
        openDialog("error", "Invalid timeline", "Start date must be later than invitation deadline.");
        setLoading(false);
        return;
      }

      const invitationDate = new Date(invitationDeadline);
      const startDateValue = new Date(startDate);
      const durationDays = Number(duration);
      const endDateValue = new Date(startDateValue.getTime() + durationDays * 24 * 60 * 60 * 1000);
      const minGapMs = 24 * 60 * 60 * 1000;

      if (invitationDate.getTime() > endDateValue.getTime() - minGapMs) {
        openDialog(
          "error",
          "Invalid invitation deadline",
          "Invitation deadline must be at least 24 hours before the campaign end date."
        );
        setLoading(false);
        return;
      }

      if (selectedInfluencers.length < 2 || selectedInfluencers.length > 6) {
        openDialog(
          "error",
          "Invalid influencer selection",
          "Please select between 2 and 6 registered influencers before creating the campaign."
        );
        setLoading(false);
        return;
      }

      // 1️⃣ MetaMask payment + on-chain campaign creation first
      const campaign_id = crypto.randomUUID();

      let activeSigner = signer;
      if (!activeSigner) {
        activeSigner = await connect();
      }

      if (!activeSigner) {
        openDialog("error", "Wallet not connected", walletError || "Please connect MetaMask to submit on-chain transaction.");
        setLoading(false);
        return;
      }

      const networkReady = await ensureCorrectNetwork();
      if (!networkReady) {
        openDialog("error", "Wrong network", "Please switch MetaMask to the required chain and try again.");
        setLoading(false);
        return;
      }

      const onchain = await createCampaignOnChain(activeSigner, campaign_id, budget, setTxStatus);
      if (!onchain) {
        openDialog("error", "On-chain transaction failed", "MetaMask transaction failed. Campaign was not saved in database.");
        setLoading(false);
        return;
      }

      // 2️⃣ Create Campaign in DB only after on-chain success
      const payload = {
        wallet_address: address,
        campaign_id,
        tx_hash: onchain.txHash,
        contract_address: onchain.contractAddress,
        reward_eth: budget,
        campaign_name: campaignName,
        reward_pool: budget,
        duration_days: duration,
        invitation_deadline: invitationDeadline,
        start_date: startDate,
        ...(gender ? { target_gender: gender } : {}),
        ...(ageCategory ? { target_age_group: ageCategory } : {}),
        moderation_k: moderation,
      };

      const res = await fetch("/api/campaign/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!data.success) {
        openDialog(
          "error",
          "Database save failed",
          data.message || "On-chain transaction succeeded, but database save failed. Please contact support with your tx hash."
        );
        setLoading(false);
        return;
      }

      // 3️⃣ Add Participants
      const participantsRes = await fetch("/api/campaign/create/participants", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          campaign_id,
          influencers: selectedInfluencers.map((inf) => ({
            influencer_id: inf.influencer_id,
            name: inf.name,
            handle: inf.handle,
          })),
        }),
      });

      const participantsData = await participantsRes.json();

      if (!participantsRes.ok || !participantsData.success) {
        openDialog(
          "error",
          "Participants setup failed",
          participantsData.message || "Failed to add campaign participants."
        );
        setLoading(false);
        return;
      }

      openDialog("success", "Campaign created", "Campaign was created successfully.", "/dashboard");

    } catch (err) {
      console.error(err);
      openDialog("error", "Unexpected error", "Something went wrong while creating the campaign.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center px-6 py-16 overflow-hidden bg-black">
      <style jsx global>{`
        input[type="datetime-local"]::-webkit-calendar-picker-indicator {
          filter: invert(1);
          opacity: 1;
          cursor: pointer;
        }
      `}</style>

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
      <div className="relative z-10 w-full max-w-7xl grid md:grid-cols-3 gap-6 items-stretch">

        {/* LEFT COLUMN — Influencers */}
        <div className="h-[520px] w-full p-6 bg-white/10 backdrop-blur-md rounded-2xl text-white border border-white/10 flex flex-col">

          <h2 className="text-lg font-semibold mb-4">
            Influencers
          </h2>

          <input
            value={influencerSearch}
            onChange={(e) => setInfluencerSearch(e.target.value)}
            placeholder="Search by name, handle or Instagram ID"
            className="mb-3 px-3 py-2 text-sm rounded-lg bg-black/40 border border-neutral-700 focus:outline-none focus:border-white/40"
          />

          <div className="flex-1 space-y-2 overflow-y-auto pr-2">
            {influencersLoading ? (
              <p className="text-xs text-neutral-400">Loading registered influencers…</p>
            ) : influencersError ? (
              <p className="text-xs text-red-300">{influencersError}</p>
            ) : visibleInfluencers.length === 0 ? (
              <p className="text-xs text-neutral-400">No matching registered influencers found.</p>
            ) : (
              visibleInfluencers.map((inf) => {
                const checked = selectedInfluencerIds.includes(inf.influencer_id);
                const disableNewSelection = !checked && selectedInfluencerIds.length >= 6;

                return (
                  <label
                    key={inf.influencer_id}
                    className={`flex items-start gap-3 rounded-lg border p-3 transition ${
                      checked ? "border-white/35 bg-white/10" : "border-white/10 bg-white/5"
                    } ${disableNewSelection ? "opacity-50" : ""}`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={disableNewSelection}
                      onChange={() => toggleInfluencer(inf.influencer_id)}
                      className="mt-0.5 h-4 w-4 accent-white cursor-pointer"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{inf.name || "Unnamed"}</p>
                      <p className="text-xs text-neutral-400 truncate">@{inf.handle}</p>
                      {inf.instagram_id ? (
                        <p className="text-[11px] text-neutral-500 truncate">ID: {inf.instagram_id}</p>
                      ) : null}
                    </div>
                  </label>
                );
              })
            )}
          </div>

          <p className="text-[11px] text-neutral-400 mt-2">
            Select only registered influencers from database. Required: 2 to 6. Current: {selectedInfluencers.length}
          </p>

        </div>

        {/* MIDDLE COLUMN — Campaign Setup */}
        <div className="h-[520px] w-full p-6 bg-white/10 backdrop-blur-md rounded-2xl text-white border border-white/10 flex flex-col space-y-3 justify-between">

          <h2 className="text-lg font-semibold text-center">
            Campaign Setup
          </h2>

          <div className="text-xs text-neutral-300 bg-white/5 border border-white/10 rounded-lg px-3 py-2">
            {companyLoading
              ? "Resolving your company..."
              : companyName
              ? `Company: ${companyName}`
              : companyError || "No company linked"}
          </div>

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
              Reward Pool (GO)
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
              Invitation Deadline (IST)
            </label>

            <input
              type="datetime-local"
              value={invitationDeadline}
              onChange={(e) => setInvitationDeadline(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg bg-black/40 border border-neutral-700 text-white focus:outline-none focus:border-white/40 [color-scheme:dark]"
            />
          </div>

          <div>
            <label className="text-xs text-neutral-400 mb-1 block">
              Start Date (IST)
            </label>

            <input
              type="datetime-local"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg bg-black/40 border border-neutral-700 text-white focus:outline-none focus:border-white/40 [color-scheme:dark]"
            />
          </div>

        </div>

        {/* RIGHT COLUMN — Optional Audience & Submit */}
        <div className="h-[520px] w-full p-6 bg-white/10 backdrop-blur-md rounded-2xl text-white border border-white/10 flex flex-col space-y-4 justify-between">
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-center">
              Audience Preferences
            </h2>
            <p className="text-xs text-neutral-400 text-center">
              These fields are optional.
            </p>

            <div>
              <label className="text-xs text-neutral-400 mb-1 block">
                Gender
              </label>

              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg bg-black/40 border border-neutral-700 focus:outline-none focus:border-white/40 cursor-pointer"
              >
                <option value="">Not specified</option>
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
                <option value="">Not specified</option>
                <option value="13-17">13-17</option>
                <option value="18-24">18-24</option>
                <option value="25-34">25-34</option>
                <option value="35-44">35-44</option>
                <option value="45-54">45-54</option>
                <option value="55-64">55-64</option>
                <option value="65+">65+</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-neutral-400 mb-1 block">
                Moderation Strictness ({moderation.toFixed(1)})
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

          </div>

          <div className="space-y-1">
            {txStatusLabel() && (
              <p className="text-[11px] text-neutral-300">{txStatusLabel()}</p>
            )}
            {(txStatus.state === "pending" || txStatus.state === "confirmed") && (
              <p className="text-[11px] text-neutral-500 truncate">
                Tx: {txStatus.txHash}
              </p>
            )}
            {txStatus.state === "error" && (
              <p className="text-[11px] text-red-300">{txStatus.message}</p>
            )}
          </div>

          <button
            onClick={submitCampaign}
            disabled={
              loading ||
              isConnecting ||
              companyLoading ||
              !companyName ||
              txStatus.state === "waiting_wallet" ||
              txStatus.state === "pending"
            }
            className="w-full py-2.5 text-sm bg-white text-black rounded-lg font-semibold hover:bg-neutral-200 transition cursor-pointer disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create Campaign (DB + Chain)"}
          </button>

        </div>

      </div>

      {dialog.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-md rounded-2xl border border-white/15 bg-neutral-950/95 p-5 text-white shadow-2xl backdrop-blur-md">
            <div className="flex items-start gap-3">
              <div
                className={`mt-0.5 h-2.5 w-2.5 rounded-full ${
                  dialog.type === "success" ? "bg-emerald-400" : "bg-red-400"
                }`}
              />
              <div className="min-w-0">
                <h3 className="text-base font-semibold">{dialog.title}</h3>
                <p className="mt-1 text-sm text-neutral-300">{dialog.message}</p>
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={closeDialog}
                className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black hover:bg-neutral-200 transition cursor-pointer"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}