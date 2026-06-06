"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import FlowerPreview from "@/components/FlowerPreview";
import SoundEngine from "@/components/SoundEngine";
import RarityBadge from "@/components/RarityBadge";
import {
  genomeAleatoire,
  nomPoetique,
  DEMO_FLOWERS,
} from "@/lib/flower-random";
import { computeRarity } from "@/lib/rarity";
import { croiser } from "@/lib/actions";
import type { Genome } from "@/lib/genome";
import { getSoundEngine } from "@/lib/sound";
import {
  connect,
  reconnect,
  payMon,
  inscribeOnChain,
  getEthereum,
} from "@/lib/wallet";

// ── Types ────────────────────────────────────────────────────────────────────

interface FlowerListing {
  id: string;
  name: string;
  genome: Genome;
  price: number;
  seller: string;
  listed: boolean;
  txHash: string | null;
  explorerUrl?: string | null;
  owned?: boolean;
}

type Tab = "market" | "collection" | "breed";
type SortKey = "recent" | "price-asc" | "price-desc" | "rarity";

// ── Local storage ────────────────────────────────────────────────────────────

const STORAGE_KEY = "flowermon_collection";

function loadCollection(): FlowerListing[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function saveCollection(items: FlowerListing[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

// ── Small bits ───────────────────────────────────────────────────────────────

function PriceTag({ price }: { price: number }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-700">
      {price.toFixed(2)} MON
    </span>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-base font-medium text-zinc-800">{value}</span>
      <span className="text-[10px] uppercase tracking-wide text-zinc-400">
        {label}
      </span>
    </div>
  );
}

// ── Flower card ──────────────────────────────────────────────────────────────

function FlowerCard({
  item,
  onBuy,
  onList,
  onUnlist,
  onInscribe,
  wallet,
}: {
  item: FlowerListing;
  onBuy: (i: FlowerListing) => void;
  onList: (i: FlowerListing) => void;
  onUnlist: (i: FlowerListing) => void;
  onInscribe: (i: FlowerListing) => void;
  wallet: string | null;
}) {
  const rarity = useMemo(() => computeRarity(item.genome), [item.genome]);
  const isOwn = item.owned;

  return (
    <div
      className="group flex flex-col overflow-hidden rounded-2xl border bg-white/65 backdrop-blur-sm transition hover:scale-[1.02]"
      style={{ borderColor: `${rarity.color}40` }}
    >
      <div
        className="relative flex items-center justify-center p-4"
        style={{
          background: `radial-gradient(circle at 50% 45%, ${item.genome.couleurB}22 0%, transparent 72%)`,
        }}
      >
        <div className="absolute left-2 top-2">
          <RarityBadge rarity={rarity} small />
        </div>
        {item.txHash && (
          <a
            href={item.explorerUrl ?? "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute right-2 top-2 rounded-full bg-emerald-500/20 px-1.5 py-0.5 text-[9px] font-medium text-emerald-700 transition hover:bg-emerald-500/30"
            title="Inscribed on-chain"
          >
            on-chain
          </a>
        )}
        <FlowerPreview genome={item.genome} size={130} />
      </div>

      <div className="flex flex-1 flex-col gap-2 p-3">
        <p className="truncate text-sm font-medium text-zinc-800">{item.name}</p>
        <div className="flex items-center justify-between gap-1">
          <PriceTag price={item.price} />
          <span className="truncate text-[10px] text-zinc-400">
            {item.seller.slice(0, 6)}…{item.seller.slice(-4)}
          </span>
        </div>

        {isOwn ? (
          <div className="mt-auto flex flex-col gap-1.5">
            {item.listed ? (
              <button
                onClick={() => onUnlist(item)}
                className="rounded-full border border-black/10 py-1.5 text-xs text-zinc-500 transition hover:bg-black/5"
              >
                Unlist
              </button>
            ) : (
              <button
                onClick={() => onList(item)}
                className="rounded-full py-1.5 text-xs font-medium text-white transition hover:opacity-90"
                style={{ background: item.genome.couleurA }}
              >
                List for sale
              </button>
            )}
            {!item.txHash && (
              <button
                onClick={() => onInscribe(item)}
                className="rounded-full border border-black/10 py-1 text-[11px] text-zinc-500 transition hover:border-emerald-400 hover:text-emerald-600"
              >
                Inscribe on-chain
              </button>
            )}
          </div>
        ) : (
          <button
            onClick={() => onBuy(item)}
            className="mt-auto rounded-full py-1.5 text-xs font-medium text-white transition hover:opacity-90"
            style={{ background: item.genome.couleurA }}
          >
            {wallet ? `Buy ${item.price.toFixed(2)} MON` : "Connect wallet"}
          </button>
        )}
      </div>
    </div>
  );
}

// ── List modal ───────────────────────────────────────────────────────────────

function PriceModal({
  item,
  onConfirm,
  onClose,
}: {
  item: FlowerListing;
  onConfirm: (price: number) => void;
  onClose: () => void;
}) {
  const [price, setPrice] = useState(item.price.toFixed(2));
  const rarity = computeRarity(item.genome);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm">
      <div
        className="w-full max-w-sm rounded-2xl border bg-white p-6 shadow-xl"
        style={{ borderColor: `${rarity.color}55` }}
      >
        <h2 className="mb-1 text-lg font-medium text-zinc-800">List for sale</h2>
        <p className="mb-4 text-sm text-zinc-500">{item.name}</p>
        <div className="mb-5 flex items-center gap-3">
          <FlowerPreview genome={item.genome} size={80} />
          <div className="flex-1">
            <div className="mb-2">
              <RarityBadge rarity={rarity} />
            </div>
            <label className="mb-1 block text-xs text-zinc-500">Price in MON</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full rounded-xl bg-zinc-100 px-3 py-2 text-sm text-zinc-800 outline-none focus:bg-zinc-50"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 rounded-full border border-black/10 py-2 text-sm text-zinc-500 transition hover:bg-black/5"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(parseFloat(price) || 0.05)}
            className="flex-1 rounded-full py-2 text-sm font-medium text-white transition hover:opacity-90"
            style={{ background: item.genome.couleurA }}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Buy modal ────────────────────────────────────────────────────────────────

function BuyModal({
  item,
  onConfirm,
  onClose,
  buying,
}: {
  item: FlowerListing;
  onConfirm: () => void;
  onClose: () => void;
  buying: boolean;
}) {
  const rarity = computeRarity(item.genome);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm">
      <div
        className="w-full max-w-sm rounded-2xl border bg-white p-6 shadow-xl"
        style={{ borderColor: `${rarity.color}55` }}
      >
        <h2 className="mb-1 text-lg font-medium text-zinc-800">Pick this flower</h2>
        <p className="mb-4 text-xs text-zinc-500">{item.name}</p>
        <div className="mb-4 flex items-center gap-4">
          <FlowerPreview genome={item.genome} size={90} />
          <div className="text-sm text-zinc-600">
            <div className="mb-2">
              <RarityBadge rarity={rarity} />
            </div>
            <p>
              Price:{" "}
              <span className="font-medium text-emerald-600">
                {item.price.toFixed(2)} MON
              </span>
            </p>
            <p className="mt-2 text-xs text-zinc-500">
              Payment is sent in MON on Monad testnet.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onClose}
            disabled={buying}
            className="flex-1 rounded-full border border-black/10 py-2 text-sm text-zinc-500 transition hover:bg-black/5 disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={buying}
            className="flex-1 rounded-full py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
            style={{ background: item.genome.couleurA }}
          >
            {buying ? "Transaction…" : "Pick"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Pollination (breeding) ───────────────────────────────────────────────────

function BreedTab({
  owned,
  onKeep,
}: {
  owned: FlowerListing[];
  onKeep: (child: Genome) => void;
}) {
  const [selected, setSelected] = useState<string[]>([]);

  function toggle(id: string) {
    setSelected((cur) => {
      if (cur.includes(id)) return cur.filter((x) => x !== id);
      if (cur.length >= 2) return [cur[1], id];
      return [...cur, id];
    });
  }

  const parents = selected
    .map((id) => owned.find((f) => f.id === id))
    .filter(Boolean) as FlowerListing[];

  const child = useMemo(() => {
    if (parents.length !== 2) return null;
    return croiser(parents[0].genome, parents[1].genome);
  }, [parents]);

  if (owned.length < 2) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-zinc-500">You need at least two flowers to pollinate.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-zinc-500">
        Pick <span className="text-zinc-800">two flowers</span> to cross — their
        child inherits their traits.
      </p>

      {child && (
        <div
          className="mx-auto flex w-full max-w-md flex-col items-center gap-3 rounded-2xl border bg-white/70 p-5"
          style={{ borderColor: `${computeRarity(child).color}55` }}
        >
          <div className="flex items-center gap-4">
            <FlowerPreview genome={parents[0].genome} size={64} />
            <span className="text-2xl text-zinc-400">+</span>
            <FlowerPreview genome={parents[1].genome} size={64} />
            <span className="text-2xl text-zinc-400">=</span>
            <FlowerPreview genome={child} size={96} />
          </div>
          <RarityBadge rarity={computeRarity(child)} />
          <button
            onClick={() => {
              onKeep(child);
              setSelected([]);
            }}
            className="rounded-full px-6 py-2 text-sm font-medium text-white transition hover:opacity-90"
            style={{ background: child.couleurA }}
          >
            Hatch the hybrid
          </button>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
        {owned.map((f) => {
          const isSel = selected.includes(f.id);
          return (
            <button
              key={f.id}
              onClick={() => toggle(f.id)}
              className="relative flex flex-col items-center gap-1 rounded-xl border bg-white/60 p-2 transition hover:scale-[1.03]"
              style={{
                borderColor: isSel ? f.genome.couleurA : "rgba(0,0,0,0.08)",
                boxShadow: isSel ? `0 0 16px ${f.genome.couleurA}55` : undefined,
              }}
            >
              {isSel && (
                <span
                  className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold text-white"
                  style={{ background: f.genome.couleurA }}
                >
                  {selected.indexOf(f.id) + 1}
                </span>
              )}
              <FlowerPreview genome={f.genome} size={84} />
              <span className="truncate text-[10px] text-zinc-500">{f.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function GardenPage() {
  const [collection, setCollection] = useState<FlowerListing[]>([]);
  const [wallet, setWallet] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("market");
  const [sort, setSort] = useState<SortKey>("recent");
  const [listModal, setListModal] = useState<FlowerListing | null>(null);
  const [buyModal, setBuyModal] = useState<FlowerListing | null>(null);
  const [buying, setBuying] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [dummyGenome] = useState(() => genomeAleatoire());

  useEffect(() => {
    setCollection(loadCollection());
    reconnect().then((acc) => acc && setWallet(acc));

    const eth = getEthereum();
    const onAccounts = (...args: unknown[]) => {
      const accs = args[0] as string[];
      setWallet(accs?.[0] ?? null);
    };
    eth?.on?.("accountsChanged", onAccounts);
    return () => eth?.removeListener?.("accountsChanged", onAccounts);
  }, []);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3200);
  }

  async function connectWallet() {
    const eth = getEthereum();
    if (!eth) {
      showToast("Install MetaMask to pick flowers!");
      return;
    }
    try {
      const acc = await connect();
      if (acc) {
        setWallet(acc);
        showToast(`Wallet connected: ${acc.slice(0, 8)}…`);
      }
    } catch {
      showToast("Connection cancelled.");
    }
  }

  function persist(updated: FlowerListing[]) {
    setCollection(updated);
    saveCollection(updated);
  }

  function createFlower() {
    const genome = genomeAleatoire();
    const name = nomPoetique(genome.seedHash);
    const rarity = computeRarity(genome);
    const newFlower: FlowerListing = {
      id: `own-${Date.now()}`,
      name,
      genome,
      price: 0.1,
      seller: wallet ?? "0x0000000000000000000000000000000000000000",
      listed: false,
      txHash: null,
      owned: true,
    };
    persist([...collection, newFlower]);
    getSoundEngine().playBloom();
    showToast(`${name} has bloomed — ${rarity.tier}!`);
    setTab("collection");
  }

  function keepChild(child: Genome) {
    const name = nomPoetique(child.seedHash);
    const newFlower: FlowerListing = {
      id: `hybrid-${Date.now()}`,
      name,
      genome: child,
      price: 0.15,
      seller: wallet ?? "0x0000000000000000000000000000000000000000",
      listed: false,
      txHash: null,
      owned: true,
    };
    persist([...collection, newFlower]);
    getSoundEngine().playBloom();
    showToast(`Hybrid ${name} created!`);
    setTab("collection");
  }

  function confirmList(price: number) {
    if (!listModal) return;
    persist(
      collection.map((f) =>
        f.id === listModal.id ? { ...f, listed: true, price } : f,
      ),
    );
    setListModal(null);
    getSoundEngine().playSell();
    showToast("Flower listed for sale!");
  }

  function handleUnlist(item: FlowerListing) {
    persist(collection.map((f) => (f.id === item.id ? { ...f, listed: false } : f)));
    showToast("Flower removed from sale.");
  }

  async function handleInscribe(item: FlowerListing) {
    if (!wallet) {
      connectWallet();
      return;
    }
    try {
      showToast("Sign the transaction in your wallet…");
      const { txHash, explorerUrl } = await inscribeOnChain(wallet, item.genome);
      persist(
        collection.map((f) =>
          f.id === item.id ? { ...f, txHash, explorerUrl } : f,
        ),
      );
      getSoundEngine().playSell();
      showToast("Flower inscribed forever ⛓");
    } catch {
      showToast("Inscription cancelled or rejected.");
    }
  }

  function handleBuy(item: FlowerListing) {
    if (!wallet) {
      connectWallet();
      return;
    }
    setBuyModal(item);
  }

  async function confirmBuy() {
    if (!buyModal || !wallet) return;
    setBuying(true);
    try {
      await payMon(wallet, buyModal.seller, buyModal.price);
      const acquired: FlowerListing = {
        ...buyModal,
        id: `acquired-${Date.now()}`,
        owned: true,
        listed: false,
        seller: wallet,
      };
      persist([...collection, acquired]);
      getSoundEngine().playSell();
      showToast(`${buyModal.name} joined your collection!`);
      setBuyModal(null);
    } catch {
      showToast("Transaction cancelled or rejected.");
    } finally {
      setBuying(false);
    }
  }

  const ownedFlowers = useMemo(
    () => collection.filter((f) => f.owned),
    [collection],
  );

  const baseItems: FlowerListing[] = useMemo(() => {
    if (tab === "market") {
      const demoListed = DEMO_FLOWERS.filter((f) => f.listed);
      const ownListed = collection.filter((f) => f.listed && f.owned);
      return [...demoListed, ...ownListed];
    }
    if (tab === "collection") return ownedFlowers;
    return [];
  }, [tab, collection, ownedFlowers]);

  const items = useMemo(() => {
    const arr = [...baseItems];
    switch (sort) {
      case "price-asc":
        return arr.sort((a, b) => a.price - b.price);
      case "price-desc":
        return arr.sort((a, b) => b.price - a.price);
      case "rarity":
        return arr.sort(
          (a, b) =>
            computeRarity(b.genome).score - computeRarity(a.genome).score,
        );
      default:
        return arr.reverse();
    }
  }, [baseItems, sort]);

  const floor =
    baseItems.length > 0 ? Math.min(...baseItems.map((i) => i.price)) : 0;

  return (
    <div className="min-h-screen text-zinc-800">
      {/* Nav */}
      <nav className="sticky top-0 z-30 flex items-center justify-between border-b border-black/10 bg-white/65 px-4 py-3 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <Link href="/" className="brand-title font-display text-lg">
            FLOWER<span className="brand-dot">MON</span>
          </Link>
          <span className="hidden rounded-full border border-black/10 bg-white/60 px-2.5 py-0.5 text-xs text-zinc-500 sm:inline-block">
            The Garden
          </span>
        </div>
        <div className="flex items-center gap-2">
          <SoundEngine genome={dummyGenome} />
          {wallet ? (
            <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs text-emerald-700">
              {wallet.slice(0, 6)}…{wallet.slice(-4)}
            </span>
          ) : (
            <button
              onClick={connectWallet}
              className="pill rounded-full px-3 py-1.5 text-xs"
            >
              Connect wallet
            </button>
          )}
          <button
            onClick={createFlower}
            className="rounded-full px-3 py-1.5 text-xs font-medium text-white transition hover:opacity-90"
            style={{ background: "#ff6ec7" }}
          >
            + New flower
          </button>
        </div>
      </nav>

      <div className="mx-auto max-w-6xl px-4 pt-6">
        {/* Tabs + stats + sort */}
        <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex gap-1 rounded-full bg-white/60 p-1">
            {(
              [
                ["market", "Market"],
                ["collection", "My collection"],
                ["breed", "Pollination"],
              ] as const
            ).map(([t, label]) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`rounded-full px-4 py-1.5 text-sm transition ${tab === t ? "bg-white text-zinc-800 shadow-sm" : "text-zinc-500 hover:text-zinc-700"}`}
              >
                {label}
                {t === "collection" && ownedFlowers.length > 0 && (
                  <span className="ml-1.5 rounded-full bg-black/10 px-1.5 py-0.5 text-[10px]">
                    {ownedFlowers.length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {tab !== "breed" && (
            <div className="flex items-center gap-5">
              <Stat label="Flowers" value={String(items.length)} />
              {tab === "market" && (
                <Stat label="Floor price" value={`${floor.toFixed(2)} MON`} />
              )}
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
                className="rounded-full border border-black/10 bg-white/70 px-3 py-1.5 text-xs text-zinc-600 outline-none hover:bg-white"
              >
                <option value="recent">Recent</option>
                <option value="price-asc">Price ↑</option>
                <option value="price-desc">Price ↓</option>
                <option value="rarity">Rarity</option>
              </select>
            </div>
          )}
        </div>

        {/* Content */}
        {tab === "breed" ? (
          <BreedTab owned={ownedFlowers} onKeep={keepChild} />
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <p className="text-zinc-500">
              {tab === "market"
                ? "The garden is still sleeping."
                : "Your collection is empty. Grow your first flower!"}
            </p>
            {tab === "collection" && (
              <button
                onClick={createFlower}
                className="mt-4 rounded-full px-5 py-2 text-sm font-medium text-white"
                style={{ background: "#ff6ec7" }}
              >
                Grow a flower
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {items.map((item) => (
              <FlowerCard
                key={item.id}
                item={item}
                onBuy={handleBuy}
                onList={(i) => setListModal(i)}
                onUnlist={handleUnlist}
                onInscribe={handleInscribe}
                wallet={wallet}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {listModal && (
        <PriceModal
          item={listModal}
          onConfirm={confirmList}
          onClose={() => setListModal(null)}
        />
      )}
      {buyModal && (
        <BuyModal
          item={buyModal}
          onConfirm={confirmBuy}
          onClose={() => setBuyModal(null)}
          buying={buying}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-zinc-900/90 px-5 py-2.5 text-sm text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
