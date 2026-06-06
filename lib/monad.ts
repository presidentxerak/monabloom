import {
  createPublicClient,
  createWalletClient,
  defineChain,
  getAddress,
  http,
  isAddress,
  parseEther,
  toHex,
  type Address,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { GenomeSchema, type Genome } from "./genome";

// ─────────────────────────────────────────────────────────────────────────────
// Chain config — testnet ONLY. All values come from env (see .env.example).
// Defaults are the public Monad testnet values; override via env if they move.
// ─────────────────────────────────────────────────────────────────────────────

const RPC_URL = process.env.MONAD_RPC_URL ?? "https://testnet-rpc.monad.xyz";
const CHAIN_ID = Number(process.env.MONAD_CHAIN_ID ?? "10143");
const EXPLORER_URL =
  process.env.MONAD_EXPLORER_URL ?? "https://testnet.monadexplorer.com";

export const monadTestnet = defineChain({
  id: CHAIN_ID,
  name: "Monad Testnet",
  nativeCurrency: { name: "Monad", symbol: "MON", decimals: 18 },
  rpcUrls: {
    default: { http: [RPC_URL] },
  },
  blockExplorers: {
    default: { name: "MonadExplorer", url: EXPLORER_URL },
  },
  testnet: true,
});

export function explorerTxUrl(txHash: string): string {
  return `${EXPLORER_URL.replace(/\/$/, "")}/tx/${txHash}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Clients
// ─────────────────────────────────────────────────────────────────────────────

export function publicClient() {
  return createPublicClient({ chain: monadTestnet, transport: http(RPC_URL) });
}

function serverAccount() {
  const key = process.env.MONAD_SERVER_PRIVATE_KEY;
  if (!key) {
    throw new Error(
      "MONAD_SERVER_PRIVATE_KEY manquante : le wallet serveur n'est pas configuré.",
    );
  }
  const normalized = key.startsWith("0x") ? key : `0x${key}`;
  return privateKeyToAccount(normalized as `0x${string}`);
}

function walletClient() {
  return createWalletClient({
    account: serverAccount(),
    chain: monadTestnet,
    transport: http(RPC_URL),
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Seed reading (germination) — read a block to fill bloc + seedHash.
// ─────────────────────────────────────────────────────────────────────────────

export async function lireGrainePourGermination(): Promise<{
  bloc: number;
  seedHash: string;
}> {
  const client = publicClient();
  const block = await client.getBlock();
  return {
    bloc: Number(block.number),
    seedHash: block.hash ?? "0x0",
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Inscription guardrail — in-memory, module-level. Max 20 / hour. The decision
// to spend is in CODE, triggered only by a server-validated address; the LLM
// can never reach it.
// ─────────────────────────────────────────────────────────────────────────────

const INSCRIPTION_WINDOW_MS = 60 * 60 * 1000;
const INSCRIPTION_MAX = 20;
let inscriptionTimestamps: number[] = [];

export class RateLimitError extends Error {
  constructor() {
    super("The garden is resting. Come back in a little while to plant your flower.");
    this.name = "RateLimitError";
  }
}

function checkAndRecordInscription() {
  const now = Date.now();
  inscriptionTimestamps = inscriptionTimestamps.filter(
    (t) => now - t < INSCRIPTION_WINDOW_MS,
  );
  if (inscriptionTimestamps.length >= INSCRIPTION_MAX) {
    throw new RateLimitError();
  }
  inscriptionTimestamps.push(now);
}

// ─────────────────────────────────────────────────────────────────────────────
// Inscription + reading the genome back from chain.
// ─────────────────────────────────────────────────────────────────────────────

export interface InscriptionResult {
  txHash: string;
  blockNumber: number;
  explorerUrl: string;
}

/**
 * Inscribe a genome into the calldata of a tiny native transfer to the player.
 * Signed by the server wallet. Returns once the receipt is mined.
 */
export async function inscrireGenome(
  genome: Genome,
  adresseJoueur: string,
): Promise<InscriptionResult> {
  if (!isAddress(adresseJoueur)) {
    throw new Error("Invalid Monad address.");
  }
  const to = getAddress(adresseJoueur) as Address; // checksum

  checkAndRecordInscription();

  const wallet = walletClient();
  const pub = publicClient();

  const data = toHex(JSON.stringify(genome));

  const txHash = await wallet.sendTransaction({
    to,
    value: parseEther("0.001"),
    data,
  });

  const receipt = await pub.waitForTransactionReceipt({ hash: txHash });

  return {
    txHash,
    blockNumber: Number(receipt.blockNumber),
    explorerUrl: explorerTxUrl(txHash),
  };
}

/**
 * Resurrect a genome from chain: read the transaction, decode its calldata hex
 * into JSON, validate with Zod. Returns null on any failure (never throws into
 * a render path).
 */
export async function lireGenome(txHash: string): Promise<Genome | null> {
  try {
    if (!/^0x[0-9a-fA-F]{64}$/.test(txHash)) return null;
    const client = publicClient();
    const tx = await client.getTransaction({ hash: txHash as `0x${string}` });
    if (!tx.input || tx.input === "0x") return null;

    const hex = tx.input.slice(2);
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    }
    const json = new TextDecoder().decode(bytes);
    const parsed = GenomeSchema.safeParse(JSON.parse(json));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
