"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import FlowerPreview from "@/components/FlowerPreview";
import SoundEngine from "@/components/SoundEngine";
import { genomeAleatoire, DEMO_FLOWERS } from "@/lib/flower-random";
import type { Genome } from "@/lib/genome";
import { getSoundEngine } from "@/lib/sound";

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

// ── Local storage helpers ────────────────────────────────────────────────────

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

// ── MON price display ────────────────────────────────────────────────────────

function PriceTag({ price }: { price: number }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-xs font-medium text-emerald-300">
      {price.toFixed(2)} MON
    </span>
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
  onBuy: (item: FlowerListing) => void;
  onList: (item: FlowerListing) => void;
  onUnlist: (item: FlowerListing) => void;
  wallet: string | null;
}) {
  const isOwn = item.owned;

  return (
    <div
      className="group flex flex-col overflow-hidden rounded-2xl border bg-black/50 backdrop-blur-sm transition hover:scale-[1.02]"
      style={{
        borderColor: `${item.genome.couleurB}44`,
        boxShadow: `0 0 18px ${item.genome.couleurA}22`,
      }}
    >
      <div
        className="flex items-center justify-center p-4"
        style={{
          background: `radial-gradient(circle at 50% 50%, ${item.genome.couleurA}18 0%, transparent 70%)`,
        }}
      >
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
            disabled={!wallet}
            className="mt-auto rounded-full py-1.5 text-xs font-medium text-black transition hover:opacity-90 disabled:opacity-40"
            style={{ background: item.genome.couleurA }}
          >
            {wallet ? `Acheter ${item.price.toFixed(2)} MON` : "Connecter le wallet"}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Price modal ──────────────────────────────────────────────────────────────

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div
        className="w-full max-w-sm rounded-2xl border bg-black/90 p-6"
        style={{ borderColor: `${item.genome.couleurB}66` }}
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
            Mettre en vente
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Buy modal ────────────────────────────────────────────────────────────────

function BuyModal({
  item,
  wallet,
  onConfirm,
  onClose,
  buying,
}: {
  item: FlowerListing;
  wallet: string | null;
  onConfirm: () => void;
  onClose: () => void;
  buying: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div
        className="w-full max-w-sm rounded-2xl border bg-black/90 p-6"
        style={{ borderColor: `${item.genome.couleurB}66` }}
      >
        <h2
          className="mb-1 text-lg font-medium"
          style={{ color: item.genome.couleurA }}
        >
          Acquérir cette fleur
        </h2>
        <p className="mb-4 text-xs text-zinc-500">{item.name}</p>
        <div className="mb-4 flex items-center gap-4">
          <FlowerPreview genome={item.genome} size={90} />
          <div className="text-sm text-zinc-300">
            <p>
              Prix :{" "}
              <span className="font-medium text-emerald-300">
                {item.price.toFixed(2)} MON
              </span>
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              Vendeur : {item.seller.slice(0, 8)}…
            </p>
            <p className="mt-2 text-xs text-zinc-400">
              La fleur sera ajoutée à ta collection.
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
            {buying ? "Transaction…" : `Acheter`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function MarketplacePage() {
  const [collection, setCollection] = useState<FlowerListing[]>([]);
  const [wallet, setWallet] = useState<string | null>(null);
  const [tab, setTab] = useState<"market" | "collection">("market");
  const [listModal, setListModal] = useState<FlowerListing | null>(null);
  const [buyModal, setBuyModal] = useState<FlowerListing | null>(null);
  const [buying, setBuying] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [dummyGenome] = useState(() => genomeAleatoire());

  // Load collection from localStorage
  useEffect(() => {
    setCollection(loadCollection());
  }, []);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  async function connectWallet() {
    const eth = (window as unknown as { ethereum?: { request: (a: { method: string; params?: unknown[] }) => Promise<unknown> } }).ethereum;
    if (!eth) {
      showToast("Installe MetaMask pour acheter des fleurs !");
      return;
    }
    try {
      const accounts = (await eth.request({ method: "eth_requestAccounts" })) as string[];
      if (accounts.length > 0) {
        setWallet(accounts[0]);
        showToast(`Wallet connecté : ${accounts[0].slice(0, 8)}…`);
      }
    } catch {
      showToast("Connexion wallet annulée.");
    }
  }

  function createFlower() {
    const genome = genomeAleatoire();
    const name = `Fleur #${collection.length + 1}`;
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
    showToast(`${name} créée !`);
    setTab("collection");
  }

  function handleList(item: FlowerListing) {
    setListModal(item);
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
      const eth = (window as unknown as { ethereum?: { request: (a: { method: string; params?: unknown[] }) => Promise<unknown> } }).ethereum;
      if (eth) {
        const valueHex = `0x${Math.floor(buyModal.price * 1e18).toString(16)}`;
        await eth.request({
          method: "eth_sendTransaction",
          params: [{ from: wallet, to: buyModal.seller, value: valueHex }],
        });
      }
      // Add to collection
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
      showToast(`${buyModal.name} ajoutée à ta collection !`);
      setBuyModal(null);
    } catch {
      showToast("Transaction annulée.");
    } finally {
      setBuying(false);
    }
  }

  // All listings for the market tab
  const demoListed = DEMO_FLOWERS.filter((f) => f.listed);
  const ownListed = collection.filter((f) => f.listed && f.owned);
  const marketListings: FlowerListing[] = [...demoListed, ...ownListed];

  const tabItems = tab === "market" ? marketListings : collection.filter((f) => f.owned);

  return (
    <div className="min-h-screen bg-void text-zinc-100">
      {/* Nav */}
      <nav className="sticky top-0 z-30 flex items-center justify-between border-b border-white/10 bg-black/70 px-4 py-3 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <Link href="/" className="neon-title font-display text-xl tracking-widest">
            FLOWERMON
          </Link>
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-zinc-400">
            Marketplace
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
            + Créer une fleur
          </button>
        </div>
      </nav>

      {/* Tabs */}
      <div className="mx-auto max-w-6xl px-4 pt-6">
        <div className="mb-6 flex gap-1 rounded-full bg-white/5 p-1 w-fit">
          {(["market", "collection"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-full px-5 py-1.5 text-sm transition ${tab === t ? "bg-white/15 text-zinc-100" : "text-zinc-500 hover:text-zinc-300"}`}
            >
              {t === "market" ? "Marché" : "Ma collection"}
              {t === "collection" && collection.filter((f) => f.owned).length > 0 && (
                <span className="ml-1.5 rounded-full bg-white/20 px-1.5 py-0.5 text-[10px]">
                  {collection.filter((f) => f.owned).length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Grid */}
        {tabItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="mb-4 text-5xl opacity-30">🌸</div>
            <p className="text-zinc-500">
              {tab === "market"
                ? "Le marché est vide pour l'instant."
                : "Ta collection est vide. Crée ta première fleur !"}
            </p>
            {tab === "collection" && (
              <button
                onClick={createFlower}
                className="mt-4 rounded-full px-5 py-2 text-sm font-medium text-black"
                style={{ background: "#ff6ec7" }}
              >
                Créer une fleur
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {tabItems.map((item) => (
              <FlowerCard
                key={item.id}
                item={item}
                onBuy={handleBuy}
                onList={handleList}
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
          wallet={wallet}
          onConfirm={confirmBuy}
          onClose={() => setBuyModal(null)}
          buying={buying}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-16 left-1/2 z-50 -translate-x-1/2 rounded-full bg-black/90 px-5 py-2.5 text-sm text-zinc-200 shadow-lg border border-white/10">
          {toast}
        </div>
      )}

      {/* Sound engine — uses a dummy genome for effects when on marketplace */}
      <SoundEngine genome={dummyGenome} />
    </div>
  );
}
