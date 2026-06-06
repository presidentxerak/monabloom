import Link from "next/link";
import AsciiFace from "@/components/AsciiFace";
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
        <h1 className="font-display text-2xl text-zinc-300">
          cette graine ne fleurit pas ici
        </h1>
        <p className="max-w-md text-sm text-zinc-500">
          Aucune fleur valide n'a pu être ressuscitée depuis cette transaction.
        </p>
        <Link href="/" className="text-sm underline text-zinc-400">
          ← retourner au jardin
        </Link>
      </main>
    );
  }

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center p-4">
      <div className="relative aspect-square w-full max-w-[80vh]">
        <FlowerCanvas genome={genome} />
        <AsciiFace genome={genome} />
      </div>
      <div className="absolute bottom-6 left-0 right-0 flex flex-col items-center gap-1 text-center font-mono text-xs text-zinc-500">
        <p>
          Née au bloc <span className="text-zinc-300">{genome.bloc}</span> ·
          inscrite à jamais sur Monad
        </p>
        <a
          href={explorerTxUrl(txHash)}
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-zinc-300"
        >
          voir la transaction
        </a>
      </div>
    </main>
  );
}
