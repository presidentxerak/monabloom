"use client";

import type { FeedAction } from "@/lib/actions";

/** Clean white line icons (no labels) for the care actions. */
const ICONS: Record<FeedAction, { label: string; path: React.ReactNode }> = {
  eau: {
    label: "Water",
    path: (
      <path d="M12 3c3.2 3.6 5.5 6.6 5.5 9.4A5.5 5.5 0 0 1 12 18a5.5 5.5 0 0 1-5.5-5.6C6.5 9.6 8.8 6.6 12 3Z" />
    ),
  },
  engrais: {
    label: "Fertilizer",
    path: (
      <>
        <path d="M12 20v-7" />
        <path d="M12 13c-3 0-5-2-5-5 3 0 5 2 5 5Z" />
        <path d="M12 11c0-3 2-5 5-5 0 3-2 5-5 5Z" />
      </>
    ),
  },
  soleil: {
    label: "Sun",
    path: (
      <>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19" />
      </>
    ),
  },
  pouvoir: {
    label: "Power",
    path: (
      <path d="M12 3l2.2 5.6L20 10l-4.5 3.4L17 19l-5-3-5 3 1.5-5.6L4 10l5.8-1.4L12 3Z" />
    ),
  },
};

const ORDER: FeedAction[] = ["eau", "engrais", "soleil", "pouvoir"];

export default function FeedBar({
  onFeed,
}: {
  onFeed: (action: FeedAction) => void;
}) {
  return (
    <div className="flex items-center gap-1 rounded-full bg-black/35 p-1.5 backdrop-blur-md">
      {ORDER.map((id) => (
        <button
          key={id}
          onClick={() => onFeed(id)}
          title={ICONS[id].label}
          aria-label={ICONS[id].label}
          className="flex h-10 w-10 items-center justify-center rounded-full text-white/90 transition hover:scale-110 hover:bg-white/15 active:scale-95"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {ICONS[id].path}
          </svg>
        </button>
      ))}
    </div>
  );
}
