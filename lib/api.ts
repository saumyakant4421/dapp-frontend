"use client";

export async function notifyBackendCampaignCreated(
  campaignId: string,
  txHash: string,
  rewardEth: string
): Promise<void> {
  const res = await fetch("/api/campaign/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      campaign_id: campaignId,
      tx_hash: txHash,
      reward_eth: rewardEth,
    }),
  });

  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(err.message ?? "Backend save failed");
  }
}
