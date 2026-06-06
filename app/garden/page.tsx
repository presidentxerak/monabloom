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
import type { Genome } from "@/lib/genome";
import { getSoundEngine } from "@/lib/sound";
import { connect, reconnect, payMon, getEthereum } from "@/lib/wallet";

// ── Types ────────────────────────────────────────────────────────────────────

interface FlowerListing {
  id: string;
  name: string;
  genome: Genome;
  price: number;
  seller: string;
  listed: boolean;
  txHash: string | null;
  owned?: boolean;
}

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
    <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-xs font-medium text-emerald-300">
      {price.toFixed(2)} MON
    </span>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-base font-medium text-zinc-100">{value}</span>
      <span className="text-[10px] uppercase tracking-wide text-zinc-500">
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
  wallet,
}: {
  item: FlowerListing;
  onBuy: (i: FlowerListing) => void;
  onList: (i: FlowerListing) => void;
  onUnlist: (i: FlowerListing) => void;
  wallet: string | null;
}) {
  const rarity = useMemo(() => computeRarity(item.genome), [item.genome]);
  const isOwn = item.owned;

  return (
    <div
      className="group flex flex-col overflow-hidden rounded-2xl border bg-black/50 backdrop-blur-sm transition hover:scale-[1.02]"
      style={{
        borderColor: `${rarity.color}55`,
        boxShadow: `0 0 18px ${item.genome.couleurA}22`,
      }}
    >
      <div
        className="relative flex items-center justify-center p-4"
        style={{
          background: `radial-gradient(circle at 50% 50%, ${item.genome.couleurA}18 0%, transparent 70%)`,
        }}
      >
        <div className="absolute left-2 top-2">
          <RarityBadge rarity={rarity} small />
        </div>
        <FlowerPreview genome={item.genome} size={130} />
      </div>

      <div className="flex flex-1 flex-col gap-2 p-3">
        <p
          className="truncate text-sm font-medium"
          style={{ color: item.genome.couleurA }}
        >
          {item.name}
        </p>
        <div className="flex items-center justify-between gap-1">
          <PriceTag price={item.price} />
          <span className="truncate text-[10px] text-zinc-600">
            {item.seller.slice(0, 6)}…{item.seller.slice(-4)}
          </span>
        </div>

        {isOwn ? (
          <div className="mt-auto flex gap-1.5">
            {item.listed ? (
              <button
                onClick={() => onUnlist(item)}
                className="flex-1 rounded-full border border-white/20 py-1.5 text-xs text-zinc-400 transition hover:bg-white/10"
              >
                Retirer
              </button>
            ) : (
              <button
                onClick={() => onList(item)}
                className="flex-1 rounded-full py-1.5 text-xs font-medium text-black transition hover:opacity-90"
                style={{ background: item.genome.couleurA }}
              >
                Mettre en vente
              </button>
            )}
          </div>
        ) : (
          <button
            onClick={() => onBuy(item)}
            className="mt-auto rounded-full py-1.5 text-xs font-medium text-black transition hover:opacity-90"
            style={{ background: item.genome.couleurA }}
          >
            {wallet ? `Acheter ${item.price.toFixed(2)} MON` : "Connecter le wallet"}
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div
        className="w-full max-w-sm rounded-2xl border bg-black/90 p-6"
        style={{ borderColor: `${rarity.color}66` }}
      >
        <h2
          className="mb-1 text-lg font-medium"
          style={{ color: item.genome.couleurA }}
        >
          Mettre en vente
        </h2>
        <p className="mb-4 text-sm text-zinc-500">{item.name}</p>
        <div className="mb-5 flex items-center gap-3">
          <FlowerPreview genome={item.genome} size={80} />
          <div className="flex-1">
            <div className="mb-2">
              <RarityBadge rarity={rarity} />
            </div>
            <label className="mb-1 block text-xs text-zinc-400">
              Prix en MON
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full rounded-xl bg-white/5 px-3 py-2 text-sm text-zinc-100 outline-none focus:bg-white/10"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 rounded-full border border-white/20 py-2 text-sm text-zinc-400 transition hover:bg-white/10"
          >
            Annuler
          </button>
          <button
            onClick={() => onConfirm(parseFloat(price) || 0.05)}
            className="flex-1 rounded-full py-2 text-sm font-medium text-black transition hover:opacity-90"
            style={{ background: item.genome.couleurA }}
          >
            Confirmer
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div
        className="w-full max-w-sm rounded-2xl border bg-black/90 p-6"
        style={{ borderColor: `${rarity.color}66` }}
      >
        <h2
          className="mb-1 text-lg font-medium"
          style={{ color: item.genome.couleurA }}
        >
          Cueillir cette fleur
        </h2>
        <p className="mb-4 text-xs text-zinc-500">{item.name}</p>
        <div className="mb-4 flex items-center gap-4">
          <FlowerPreview genome={item.genome} size={90} />
          <div className="text-sm text-zinc-300">
            <div className="mb-2">
              <RarityBadge rarity={rarity} />
            </div>
            <p>
              Prix :{" "}
              <span className="font-medium text-emerald-300">
                {item.price.toFixed(2)} MON
              </span>
            </p>
            <p className="mt-2 text-xs text-zinc-400">
              Le paiement part en MON sur Monad testnet.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onClose}
            disabled={buying}
            className="flex-1 rounded-full border border-white/20 py-2 text-sm text-zinc-400 transition hover:bg-white/10 disabled:opacity-40"
          >
            Annuler
          </button>
          <button
            onClick={onConfirm}
            disabled={buying}
            className="flex-1 rounded-full py-2 text-sm font-medium text-black transition hover:opacity-90 disabled:opacity-50"
            style={{ background: item.genome.couleurA }}
          >
            {buying ? "Transaction…" : "Cueillir"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function GardenPage() {
  const [collection, setCollection] = useState<FlowerListing[]>([]);
  const [wallet, setWallet] = useState<string | null>(null);
  const [tab, setTab] = useState<"market" | "collection">("market");
  const [sort, setSort] = useState<SortKey>("recent");
  const [listModal, setListModal] = useState<FlowerListing | null>(null);
  const [buyModal, setBuyModal] = useState<FlowerListing | null>(null);
  const [buying, setBuying] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [dummyGenome] = useState(() => genomeAleatoire());

  // Load collection + silently reconnect wallet + watch account changes.
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
    setTimeout(() => setToast(null), 3000);
  }

  async function connectWallet() {
    const eth = getEthereum();
    if (!eth) {
      showToast("Installe MetaMask pour cueillir des fleurs !");
      return;
    }
    try {
      const acc = await connect();
      if (acc) {
        setWallet(acc);
        showToast(`Wallet connecté : ${acc.slice(0, 8)}…`);
      }
    } catch {
      showToast("Connexion annulée.");
    }
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
    const updated = [...collection, newFlower];
    setCollection(updated);
    saveCollection(updated);
    getSoundEngine().playBloom();
    showToast(`${name} a éclos — ${rarity.tier} !`);
    setTab("collection");
  }

  function confirmList(price: number) {
    if (!listModal) return;
    const updated = collection.map((f) =>
      f.id === listModal.id ? { ...f, listed: true, price } : f,
    );
    setCollection(updated);
    saveCollection(updated);
    setListModal(null);
    getSoundEngine().playSell();
    showToast("Fleur mise en vente !");
  }

  function handleUnlist(item: FlowerListing) {
    const updated = collection.map((f) =>
      f.id === item.id ? { ...f, listed: false } : f,
    );
    setCollection(updated);
    saveCollection(updated);
    showToast("Fleur retirée de la vente.");
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
      const updated = [...collection, acquired];
      setCollection(updated);
      saveCollection(updated);
      getSoundEngine().playSell();
      showToast(`${buyModal.name} rejoint ta collection !`);
      setBuyModal(null);
    } catch {
      showToast("Transaction annulée ou refusée.");
    } finally {
      setBuying(false);
    }
  }

  // Build listings for the active tab.
  const baseItems: FlowerListing[] = useMemo(() => {
    if (tab === "market") {
      const demoListed = DEMO_FLOWERS.filter((f) => f.listed);
      const ownListed = collection.filter((f) => f.listed && f.owned);
      return [...demoListed, ...ownListed];
    }
    return collection.filter((f) => f.owned);
  }, [tab, collection]);

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
  const ownedCount = collection.filter((f) => f.owned).length;

  return (
    <div className="min-h-screen bg-void text-zinc-100">
      {/* Nav */}
      <nav className="sticky top-0 z-30 flex items-center justify-between border-b border-white/10 bg-black/70 px-4 py-3 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <Link href="/" className="neon-title font-display text-xl tracking-widest">
            FLOWERMON
          </Link>
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-zinc-400">
            🌿 The Garden
          </span>
        </div>
        <div className="flex items-center gap-2">
          {wallet ? (
            <span className="rounded-full bg-emerald-900/40 px-3 py-1 text-xs text-emerald-300">
              {wallet.slice(0, 6)}…{wallet.slice(-4)}
            </span>
          ) : (
            <button
              onClick={connectWallet}
              className="rounded-full bg-white/10 px-3 py-1.5 text-xs transition hover:bg-white/20"
            >
              Connecter wallet
            </button>
          )}
          <button
            onClick={createFlower}
            className="rounded-full px-3 py-1.5 text-xs font-medium text-black transition hover:opacity-90"
            style={{ background: "#ff6ec7" }}
          >
            + Faire éclore
          </button>
        </div>
      </nav>

      <div className="mx-auto max-w-6xl px-4 pt-6">
        {/* Tabs + stats + sort */}
        <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex gap-1 rounded-full bg-white/5 p-1">
            {(["market", "collection"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`rounded-full px-5 py-1.5 text-sm transition ${tab === t ? "bg-white/15 text-zinc-100" : "text-zinc-500 hover:text-zinc-300"}`}
              >
                {t === "market" ? "Marché" : "Ma collection"}
                {t === "collection" && ownedCount > 0 && (
                  <span className="ml-1.5 rounded-full bg-white/20 px-1.5 py-0.5 text-[10px]">
                    {ownedCount}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-5">
            <Stat label="Fleurs" value={String(items.length)} />
            {tab === "market" && (
              <Stat label="Prix plancher" value={`${floor.toFixed(2)} MON`} />
            )}
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="rounded-full bg-white/5 px-3 py-1.5 text-xs text-zinc-300 outline-none hover:bg-white/10"
            >
              <option value="recent">Récent</option>
              <option value="price-asc">Prix ↑</option>
              <option value="price-desc">Prix ↓</option>
              <option value="rarity">Rareté</option>
            </select>
          </div>
        </div>

        {/* Grid */}
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="mb-4 text-5xl opacity-30">🌸</div>
            <p className="text-zinc-500">
              {tab === "market"
                ? "Le jardin est encore en sommeil."
                : "Ta collection est vide. Fais éclore ta première fleur !"}
            </p>
            {tab === "collection" && (
              <button
                onClick={createFlower}
                className="mt-4 rounded-full px-5 py-2 text-sm font-medium text-black"
                style={{ background: "#ff6ec7" }}
              >
                Faire éclore une fleur
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
        <div className="fixed bottom-16 left-1/2 z-50 -translate-x-1/2 rounded-full border border-white/10 bg-black/90 px-5 py-2.5 text-sm text-zinc-200 shadow-lg">
          {toast}
        </div>
      )}

      <SoundEngine genome={dummyGenome} />
    </div>
  );
}
