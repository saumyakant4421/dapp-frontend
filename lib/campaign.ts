"use client";

import { ethers } from "ethers";
import CampaignABI from "@/abi/Campaign.json";

type CampaignArtifact = {
  abi?: ethers.InterfaceAbi;
  bytecode?: { object?: string } | string;
};

export type TxStatus =
  | { state: "idle" }
  | { state: "waiting_wallet" }
  | { state: "pending"; txHash: string }
  | { state: "confirmed"; txHash: string; blockNumber: number; contractAddress: string }
  | { state: "error"; message: string; code?: number | string };

export type OnchainCreateResult = {
  txHash: string;
  contractAddress: string;
};

export async function createCampaignOnChain(
  signer: ethers.Signer,
  _campaignId: string,
  rewardEth: string,
  onStatus: (s: TxStatus) => void
): Promise<OnchainCreateResult | null> {
  onStatus({ state: "waiting_wallet" });

  try {
    const parsedReward = Number(rewardEth);
    if (!Number.isFinite(parsedReward) || parsedReward <= 0) {
      onStatus({ state: "error", message: "Invalid reward GO value" });
      return null;
    }

    const artifact = CampaignABI as CampaignArtifact;
    const rawAbi = artifact.abi;
    if (!rawAbi || !Array.isArray(rawAbi) || rawAbi.length === 0) {
      onStatus({
        state: "error",
        message: "Campaign ABI is missing. Copy Foundry out/Campaign.sol/Campaign.json into abi/Campaign.json.",
      });
      return null;
    }

    const rawBytecode =
      typeof artifact.bytecode === "string"
        ? artifact.bytecode
        : artifact.bytecode?.object;

    if (!rawBytecode || !rawBytecode.startsWith("0x")) {
      onStatus({
        state: "error",
        message: "Campaign bytecode is missing in ABI JSON. Ensure out/Campaign.sol/Campaign.json was copied.",
      });
      return null;
    }

    const value = ethers.parseEther(rewardEth);
    const factory = new ethers.ContractFactory(rawAbi, rawBytecode, signer);
    const contract = await factory.deploy({ value });
    const tx = contract.deploymentTransaction();

    if (!tx) {
      onStatus({ state: "error", message: "Missing deployment transaction" });
      return null;
    }

    onStatus({ state: "pending", txHash: tx.hash });

    const receipt = await contract.deploymentTransaction()?.wait(1);
    const blockNumber = receipt?.blockNumber ? Number(receipt.blockNumber) : 0;
    const contractAddress = await contract.getAddress();

    onStatus({ state: "confirmed", txHash: tx.hash, blockNumber, contractAddress });
    return { txHash: tx.hash, contractAddress };
  } catch (err) {
    const e = err as {
      code?: number | string;
      reason?: string;
      message?: string;
    };

    const message =
      e.code === 4001
        ? "You rejected the transaction"
        : e.code === "INSUFFICIENT_FUNDS"
        ? "Insufficient GO in wallet"
        : e.reason ?? e.message ?? "Transaction failed";

    onStatus({ state: "error", message, code: e.code });
    return null;
  }
}
