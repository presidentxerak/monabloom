import Link from "next/link";
import FlowerPreview from "@/components/FlowerPreview";
import RarityBadge from "@/components/RarityBadge";
import { MonadLogo, LunarstrategyLogo } from "@/components/Logos";
import { genomeFromSeed } from "@/lib/flower-random";
import { computeRarity } from "@/lib/rarity";
import { tokenLabel, rank } from "@/lib/identity";
import { nomPoetique } from "@/lib/flower-random";
import type { Genome } from "@/lib/genome";

const SAMPLE_SEEDS = [
  "aurora-crown-bloom",
  "violet-thug-spark",
  "golden-party-dawn",
  "mint-round-reverie",
  "cobalt-star-ember",
  "rose-tophat-tide",
];

const SAMPLES: Genome[] = SAMPLE_SEEDS.map((s, i) => {
  const g = genomeFromSeed(s);
  // Showcase a bit of variety in accessories.
  const hats = ["crown", "none", "party", "none", "beret", "tophat"] as const;
  const glasses = ["none", "thug", "none", "round", "star", "none"] as const;
  return { ...g, chapeau: hats[i], lunettes: glasses[i] };
});

const TRAITS = [
  { k: "Petals", v: "3 to 12 arms, each flower different" },
  { k: "Colours", v: "two live gradient tones" },
  { k: "Mood", v: "joyful, dreamy, playful, serene, melancholic" },
  { k: "Petal shape", v: "oval, diamond, ring, pointed and more" },
  { k: "Accessories", v: "hats, glasses, sneakers" },
  { k: "Motion", v: "spin speed and overall size" },
];

export default function Landing() {
  return (
    <main className="min-h-screen text-zinc-800">
      {/* Nav */}
      <nav className="flex items-center justify-between px-5 py-4">
        <span className="brand-title font-display text-lg">
          FLOWER<span className="brand-dot">MON</span>
        </span>
        <div className="flex items-center gap-2 text-xs">
          <Link href="/cards" className="pill rounded-full px-3 py-1.5">Cards</Link>
          <Link href="/blitz" className="pill rounded-full px-3 py-1.5">Blitz Garden</Link>
          <Link href="/play" className="btn-bump rounded-full px-3 py-1.5 font-medium">Play</Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative flex flex-col items-center px-5 pb-10 pt-10 text-center">
        <div className="pointer-events-none absolute inset-0 -z-10 opacity-70"
          style={{ background: "radial-gradient(circle at 50% 30%, #ffd6f5 0%, transparent 55%), radial-gradient(circle at 70% 60%, #cfd6ff 0%, transparent 55%)" }} />
        <h1 className="font-display text-5xl tracking-tight text-zinc-900 sm:text-7xl">Flowermon</h1>
        <p className="mt-2 font-display text-2xl text-fuchsia-500 sm:text-3xl">フラワーモン</p>
        <p className="mt-6 max-w-xl text-sm leading-relaxed text-zinc-600">
          Grow living 3D flower characters just by talking to them. Collect, dress,
          breed and trade them on the Monad testnet. Every Flowermon is unique,
          generated from an on chain seed, with its own name, rank and rarity.
        </p>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3 text-sm">
          <Link href="/play" className="btn-bump rounded-full px-5 py-2.5 font-medium">Grow a Flower</Link>
          <Link href="/cards" className="pill rounded-full px-5 py-2.5">Browse Cards</Link>
          <Link href="/blitz" className="pill rounded-full px-5 py-2.5">Enter Blitz Garden</Link>
        </div>

        {/* Hackathon credit + logos */}
        <div className="mt-10 flex flex-col items-center gap-3">
          <span className="text-[11px] uppercase tracking-[0.25em] text-zinc-400">
            Created at the Monad hackathon
          </span>
          <div className="flex flex-wrap items-center justify-center gap-5 text-zinc-900">
            <MonadLogo className="h-5 w-auto" />
            <span className="text-zinc-300">×</span>
            <LunarstrategyLogo className="h-5 w-auto" />
          </div>
        </div>
      </section>

      {/* Sample flower cards */}
      <section className="mx-auto max-w-5xl px-5 py-8">
        <h2 className="mb-5 text-center font-display text-xl text-zinc-800">Meet a few of them</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {SAMPLES.map((g, i) => {
            const r = computeRarity(g);
            return (
              <div key={i} className="flex flex-col items-center rounded-2xl border border-black/10 bg-white/70 p-4">
                <FlowerPreview genome={g} size={150} />
                <span className="mt-1 truncate font-display text-xs text-zinc-800">
                  {nomPoetique(g.seedHash)} <span className="text-zinc-400">{tokenLabel(g.seedHash)}</span>
                </span>
                <div className="mt-1 flex items-center gap-2">
                  <RarityBadge rarity={r} small />
                  <span className="text-[10px] text-zinc-400">Rank #{rank(g)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Rarity traits */}
      <section className="mx-auto max-w-5xl px-5 py-10">
        <h2 className="mb-2 text-center font-display text-xl text-zinc-800">Rarity and traits</h2>
        <p className="mx-auto mb-6 max-w-2xl text-center text-sm text-zinc-600">
          Each flower carries a set of traits. Bolder, rarer combinations push it up
          the rarity ladder, from Common to Legendary. The rank you see on every
          card is computed from those traits.
        </p>
        <div className="mb-6 flex flex-wrap justify-center gap-2">
          {(["Common", "Uncommon", "Rare", "Epic", "Legendary"] as const).map((t, i) => (
            <span key={t} className="rounded-full border px-3 py-1 text-xs font-medium"
              style={{ color: ["#7a8090", "#16b572", "#1f8fff", "#a64bff", "#e0a400"][i], borderColor: ["#7a8090", "#16b572", "#1f8fff", "#a64bff", "#e0a400"][i] + "66" }}>
              {t}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
          {TRAITS.map((t) => (
            <div key={t.k} className="rounded-2xl border border-black/10 bg-white/70 p-4">
              <div className="font-display text-sm text-zinc-800">{t.k}</div>
              <div className="mt-1 text-xs text-zinc-500">{t.v}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Monad chain */}
      <section className="mx-auto max-w-3xl px-5 py-10 text-center">
        <h2 className="mb-2 font-display text-xl text-zinc-800">Built on Monad</h2>
        <p className="mx-auto max-w-2xl text-sm leading-relaxed text-zinc-600">
          Monad is a fast, EVM compatible blockchain. Flowermon runs on its testnet,
          where the native currency is MON. When you plant a flower it is inscribed
          forever in the calldata of a transaction, so the seed and traits live on
          the chain. The code reads that seed and renders the exact same flower,
          pixel for pixel, every time. You can save flowers to Cards, list them for
          MON, breed two of them into a hybrid, and meet other owners in the Blitz
          Garden.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3 text-sm">
          <Link href="/play" className="btn-bump rounded-full px-5 py-2.5 font-medium">Start growing</Link>
          <Link href="/blitz" className="pill rounded-full px-5 py-2.5">Enter Blitz Garden</Link>
        </div>
      </section>

      <footer className="px-5 py-8 text-center text-[11px] text-zinc-400">
        Flowermon · generative 3D flowers on Monad testnet · created at the Monad hackathon by Lunarstrategy
      </footer>
    </main>
  );
}
