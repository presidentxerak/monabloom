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
  const acc = accounts?.[0] ?? null;
  // Switching to Monad is best-effort: never let a declined/failed network
  // switch drop an otherwise-successful wallet connection.
  if (acc) {
    try {
      await ensureMonadChain(eth);
    } catch {
      // keep the connection even if the user stays on another network
    }
  }
  return acc;
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

export function explorerTx(hash: string): string {
  return `${EXPLORER_URL.replace(/\/$/, "")}/tx/${hash}`;
}

export function explorerAddress(addr: string): string {
  return `${EXPLORER_URL.replace(/\/$/, "")}/address/${addr}`;
}

export const MONAD_CHAIN_ID = CHAIN_ID;

/** Read the native MON balance (in MON) of an address. */
export async function getBalanceMon(address: string): Promise<number | null> {
  const eth = getEthereum();
  if (!eth) return null;
  try {
    const hex = (await eth.request({
      method: "eth_getBalance",
      params: [address, "latest"],
    })) as string;
    return Number(BigInt(hex)) / 1e18;
  } catch {
    return null;
  }
}

/** Current chain id the wallet is on, as a decimal number. */
export async function getChainId(): Promise<number | null> {
  const eth = getEthereum();
  if (!eth) return null;
  try {
    const hex = (await eth.request({ method: "eth_chainId" })) as string;
    return Number(BigInt(hex));
  } catch {
    return null;
  }
}

/** Ask the wallet to switch to Monad testnet (adds it if unknown). */
export async function switchToMonad(): Promise<void> {
  const eth = getEthereum();
  if (!eth) return;
  await ensureMonadChain(eth);
}

/**
 * Best-effort disconnect: newer wallets support revoking the eth_accounts
 * permission. If unsupported, the UI simply forgets the account locally.
 */
export async function disconnect(): Promise<void> {
  const eth = getEthereum();
  if (!eth) return;
  try {
    await eth.request({
      method: "wallet_revokePermissions",
      params: [{ eth_accounts: {} }],
    });
  } catch {
    // not supported everywhere — local state is cleared by the caller
  }
}

/**
 * Inscribe a flower genome ON-CHAIN, player-funded: a self-transaction on Monad
 * testnet whose calldata carries the genome JSON. No server wallet needed — the
 * player signs it with their own wallet, so it's truly their flower, forever.
 * Returns the tx hash + explorer link.
 */
export async function inscribeOnChain(
  from: string,
  genome: unknown,
): Promise<{ txHash: string; explorerUrl: string }> {
  const eth = getEthereum();
  if (!eth) throw new Error("no wallet");
  await ensureMonadChain(eth);

  const json = JSON.stringify(genome);
  const bytes = new TextEncoder().encode(json);
  const data =
    "0x" +
    Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

  const txHash = (await eth.request({
    method: "eth_sendTransaction",
    params: [{ from, to: from, value: "0x0", data }],
  })) as string;

  return { txHash, explorerUrl: explorerTx(txHash) };
}

export { EXPLORER_URL };
