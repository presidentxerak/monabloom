"use client";

import { useState } from "react";
import { getSoundEngine } from "@/lib/sound";
import { GENRES } from "@/lib/cosmetics";

export default function MusicPlayer({ onClose }: { onClose: () => void }) {
  const engine = getSoundEngine();
  const [genre, setGenre] = useState(engine.genre);
  const [playing, setPlaying] = useState(engine.enabled);

  function choose(id: string) {
    setGenre(id);
    engine.setGenre(id);
    if (!engine.enabled) {
      engine.enable();
      setPlaying(true);
    }
  }

  function toggle() {
    engine.toggle();
    setPlaying(engine.enabled);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-3 backdrop-blur-sm sm:items-center">
      <div className="glass w-full max-w-sm rounded-3xl p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-base tracking-wide text-zinc-800">Music</h2>
          <button onClick={onClose} aria-label="Close" className="pill rounded-full px-3 py-1 text-xs">
            Done
          </button>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-2">
          {GENRES.map((g) => {
            const active = genre === g.id;
            return (
              <button
                key={g.id}
                onClick={() => choose(g.id)}
                className={`rounded-xl border px-3 py-4 text-sm font-medium transition ${
                  active ? "border-transparent bg-zinc-900 text-white" : "border-black/10 bg-white/70 text-zinc-600 hover:bg-white"
                }`}
              >
                {g.label}
              </button>
            );
          })}
        </div>

        <button
          onClick={toggle}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-zinc-900 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
        >
          {playing ? "Pause" : "Play"}
        </button>
      </div>
    </div>
  );
}
