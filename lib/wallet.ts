"use client";

// Browser wallet helpers (MetaMask / EIP-1193) for The Garden.
// Ensures the user is on Monad testnet before any MON transaction.

const CHAIN_ID = Number(
  process.env.NEXT_PUBLIC_MONAD_CHAIN_ID ?? "10143",
);
const CHAIN_ID_HEX = `0x${CHAIN_ID.toString(16)}`;
const RPC_URL =
  process.env.NEXT_PUBLIC_MONAD_RPC_URL ?? "https://testnet-rpc.monad.xyz";
const EXPLORER_URL =
  process.env.NEXT_PUBLIC_MONAD_EXPLORER_URL ??
  "https://testnet.monadexplorer.com";

interface Eip1193 {
  request: (a: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: string, cb: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, cb: (...args: unknown[]) => void) => void;
}

export function getEthereum(): Eip1193 | null {
  if (typeof window === "undefined") return null;
  return (window as unknown as { ethereum?: Eip1193 }).ethereum ?? null;
}

/** Prompt the wallet to switch to (or add) Monad testnet. */
export async function ensureMonadChain(eth: Eip1193): Promise<void> {
  try {
    await eth.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: CHAIN_ID_HEX }],
    });
  } catch (err: unknown) {
    // 4902 = chain unknown to the wallet → add it, then it's selected.
    const code = (err as { code?: number })?.code;
    if (code === 4902) {
      await eth.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: CHAIN_ID_HEX,
            chainName: "Monad Testnet",
            nativeCurrency: { name: "Monad", symbol: "MON", decimals: 18 },
            rpcUrls: [RPC_URL],
            blockExplorerUrls: [EXPLORER_URL],
          },
        ],
      });
    } else {
      throw err;
    }
  }
}

export async function connect(): Promise<string | null> {
  const eth = getEthereum();
  if (!eth) return null;
  const accounts = (await eth.request({
    method: "eth_requestAccounts",
  })) as string[];
  if (!accounts?.length) return null;
  await ensureMonadChain(eth);
  return accounts[0];
}

/** Silently read an already-authorised account (for reconnect on load). */
export async function reconnect(): Promise<string | null> {
  const eth = getEthereum();
  if (!eth) return null;
  try {
    const accounts = (await eth.request({ method: "eth_accounts" })) as string[];
    return accounts?.[0] ?? null;
  } catch {
    return null;
  }
}

/** Send a native MON transfer. Returns the tx hash. */
export async function payMon(
  from: string,
  to: string,
  amountMon: number,
): Promise<string> {
  const eth = getEthereum();
  if (!eth) throw new Error("no wallet");
  await ensureMonadChain(eth);
  const valueHex = `0x${BigInt(Math.floor(amountMon * 1e18)).toString(16)}`;
  const hash = (await eth.request({
    method: "eth_sendTransaction",
    params: [{ from, to, value: valueHex }],
  })) as string;
  return hash;
}

export { EXPLORER_URL };
