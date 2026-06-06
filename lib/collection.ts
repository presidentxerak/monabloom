"use client";

// Shared flower-collection storage (localStorage), used by the home page
// (save / validate a flower) and The Garden (list, sell, breed, inscribe).

import type { Genome } from "./genome";
import { nomPoetique } from "./flower-random";

export interface FlowerListing {
  id: string;
  name: string;
  genome: Genome;
  price: number;
  seller: string;
  listed: boolean;
  txHash: string | null;
  explorerUrl?: string | null;
  owned?: boolean;
  /** Display handle for marketplace listings owned by (fake or real) players. */
  owner?: string;
}

const KEY = "flowermon_collection";

export function loadCollection(): FlowerListing[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function saveCollection(items: FlowerListing[]): void {
  localStorage.setItem(KEY, JSON.stringify(items));
}

/** Append a freshly grown/validated flower to the player's collection. */
export function addOwnedGenome(
  genome: Genome,
  price = 0.1,
  owner = "you",
): FlowerListing {
  const flower: FlowerListing = {
    id: `own-${Date.now()}-${Math.floor(Math.random() * 1e4)}`,
    name: nomPoetique(genome.seedHash),
    genome,
    price,
    seller: "0x0000000000000000000000000000000000000000",
    listed: false,
    txHash: null,
    owned: true,
    owner,
  };
  const items = loadCollection();
  items.push(flower);
  saveCollection(items);
  return flower;
}
