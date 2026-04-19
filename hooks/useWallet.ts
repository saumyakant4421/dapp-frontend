"use client";

import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";

type WalletState = {
  address: string | null;
  signer: ethers.Signer | null;
  chainId: number | null;
  isConnecting: boolean;
  error: string | null;
};

type EthereumProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on: (event: string, listener: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, listener: (...args: unknown[]) => void) => void;
};

function getEthereum(): EthereumProvider | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as Window & { ethereum?: EthereumProvider }).ethereum;
}

function normalizeChainId(raw: unknown): number | null {
  if (typeof raw === "bigint") return Number(raw);
  if (typeof raw === "number") return raw;
  if (typeof raw === "string") {
    if (raw.startsWith("0x")) return Number.parseInt(raw, 16);
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function useWallet() {
  const [wallet, setWallet] = useState<WalletState>({
    address: null,
    signer: null,
    chainId: null,
    isConnecting: false,
    error: null,
  });

  const connect = useCallback(async (): Promise<ethers.Signer | null> => {
    const ethereum = getEthereum();
    if (!ethereum) {
      setWallet((w) => ({ ...w, error: "MetaMask not installed" }));
      return null;
    }

    setWallet((w) => ({ ...w, isConnecting: true, error: null }));

    try {
      await ethereum.request({ method: "eth_requestAccounts" });

      const provider = new ethers.BrowserProvider(ethereum as unknown as ethers.Eip1193Provider);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      const network = await provider.getNetwork();

      setWallet({
        address,
        signer,
        chainId: normalizeChainId(network.chainId),
        isConnecting: false,
        error: null,
      });
      return signer;
    } catch (err) {
      const e = err as { code?: number; message?: string };
      setWallet((w) => ({
        ...w,
        isConnecting: false,
        error: e.code === 4001 ? "Connection rejected" : e.message || "Wallet connection failed",
      }));
      return null;
    }
  }, []);

  useEffect(() => {
    const ethereum = getEthereum();
    if (!ethereum) return;

    let isDisposed = false;

    ethereum
      .request({ method: "eth_accounts" })
      .then((accounts) => {
        if (isDisposed) return;
        if (Array.isArray(accounts) && accounts.length > 0) {
          void connect();
        }
      })
      .catch(() => undefined);

    const handleAccountsChanged = () => {
      void connect();
    };
    const handleChainChanged = () => {
      void connect();
    };

    ethereum.on("accountsChanged", handleAccountsChanged);
    ethereum.on("chainChanged", handleChainChanged);

    return () => {
      isDisposed = true;
      ethereum.removeListener?.("accountsChanged", handleAccountsChanged);
      ethereum.removeListener?.("chainChanged", handleChainChanged);
    };
  }, [connect]);

  return { ...wallet, connect };
}
