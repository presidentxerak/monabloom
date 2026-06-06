import Link from "next/link";
import FlowerCanvas from "@/components/FlowerCanvas";
import { explorerTxUrl, lireGenome } from "@/lib/monad";

export const dynamic = "force-dynamic";

export default async function FleurPage({
  params,
}: {
  params: Promise<{ txHash: string }>;
}) {
  const { txHash } = await params;
  const genome = await lireGenome(txHash);

  if (!genome) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
        <h1 className="font-display text-2xl text-zinc-700">
          this seed doesn't bloom here
        </h1>
        <p className="max-w-md text-sm text-zinc-500">
          No valid flower could be resurrected from this transaction.
        </p>
        <Link href="/" className="text-sm underline text-zinc-600">
          ← back to the garden
        </Link>
      </main>
    );
  }

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center">
      <div className="absolute inset-0">
        <FlowerCanvas genome={genome} />
      </div>
      <div className="pointer-events-none absolute bottom-6 left-0 right-0 flex flex-col items-center gap-1 text-center font-mono text-xs text-zinc-600">
        <p>
          Born at block <span className="text-zinc-800">{genome.bloc}</span> ·
          inscribed forever on Monad
        </p>
        <a
          href={explorerTxUrl(txHash)}
          target="_blank"
          rel="noopener noreferrer"
          className="pointer-events-auto underline hover:text-zinc-900"
        >
          view the transaction
        </a>
      </div>
    </main>
  );
}
