"use client";

import type { Genome } from "@/lib/genome";

export interface CertificateData {
  txHash: string;
  explorerUrl: string;
  blockNumber?: number;
}

/** Botanical plaque shown once the flower is inscribed on-chain. */
export default function Certificate({
  cert,
  genome,
}: {
  cert: CertificateData;
  genome: Genome;
}) {
  const short = `${cert.txHash.slice(0, 10)}…${cert.txHash.slice(-8)}`;
  return (
    <div
      className="rounded-xl border p-4 font-mono text-sm"
      style={{
        borderColor: genome.couleurB,
        boxShadow: `0 0 18px ${genome.couleurB}55, inset 0 0 12px ${genome.couleurA}22`,
        background: "rgba(5,2,8,0.7)",
      }}
    >
      <div
        className="mb-2 font-display text-base tracking-wide"
        style={{ color: genome.couleurA }}
      >
        🌱 Plantée pour l'éternité
      </div>
      <dl className="space-y-1 text-zinc-300">
        <div className="flex justify-between gap-3">
          <dt className="text-zinc-500">tx</dt>
          <dd>
            <a
              href={cert.explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="underline decoration-dotted hover:text-white"
              style={{ color: genome.couleurB }}
            >
              {short}
            </a>
          </dd>
        </div>
        {cert.blockNumber !== undefined && (
          <div className="flex justify-between gap-3">
            <dt className="text-zinc-500">bloc</dt>
            <dd>{cert.blockNumber}</dd>
          </div>
        )}
        <div className="flex justify-between gap-3">
          <dt className="text-zinc-500">graine</dt>
          <dd>#{genome.bloc}</dd>
        </div>
      </dl>
      <a
        href={`/fleur/${cert.txHash}`}
        className="mt-3 block text-center text-xs underline hover:text-white"
        style={{ color: genome.couleurA }}
      >
        → ouvrir la page de résurrection
      </a>
    </div>
  );
}
