"use client";

type EthereumProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
};

function getEthereum(): EthereumProvider | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as Window & { ethereum?: EthereumProvider }).ethereum;
}

const REQUIRED_CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID || 31337);

function chainToHex(chainId: number): string {
  return `0x${chainId.toString(16)}`;
}

export async function ensureCorrectNetwork(): Promise<boolean> {
  const ethereum = getEthereum();
  if (!ethereum) return false;

  const currentChain = await ethereum.request({ method: "eth_chainId" });
  const parsedCurrent =
    typeof currentChain === "string" && currentChain.startsWith("0x")
      ? Number.parseInt(currentChain, 16)
      : Number(currentChain);

  if (parsedCurrent === REQUIRED_CHAIN_ID) return true;

  try {
    await ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: chainToHex(REQUIRED_CHAIN_ID) }],
    });
    return true;
  } catch (switchError) {
    const err = switchError as { code?: number };
    if (err.code === 4902) {
      await ethereum.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: chainToHex(REQUIRED_CHAIN_ID),
            chainName: "Anvil Local",
            nativeCurrency: { name: "GO", symbol: "GO", decimals: 18 },
            rpcUrls: [process.env.NEXT_PUBLIC_RPC_URL || "http://127.0.0.1:8545"],
          },
        ],
      });
      return true;
    }
    return false;
  }
}
