"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

interface Item {
  href: string;
  label: string;
  icon: ReactNode;
}

const ITEMS: Item[] = [
  {
    href: "/",
    label: "Home",
    icon: <path d="M4 11.5 12 4l8 7.5M6 10v9h12v-9" />,
  },
  {
    href: "/cards",
    label: "Cards",
    icon: <><rect x="4" y="5" width="16" height="14" rx="2.5" /><path d="M4 10h16" /></>,
  },
  {
    href: "/blitz",
    label: "Garden",
    icon: <><circle cx="12" cy="8" r="3.4" /><path d="M12 11.4V20M8 20h8" /></>,
  },
  {
    href: "/play",
    label: "Play",
    icon: <><path d="M12 4c2 2.4 3.2 4.2 3.2 6a3.2 3.2 0 0 1-6.4 0c0-1.8 1.2-3.6 3.2-6Z" /><path d="M9 20h6" /></>,
  },
];

/** Fixed bottom navigation bar, shown on small screens only. */
export default function MobileNav() {
  const path = usePathname() ?? "/";
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 flex items-stretch border-t border-black/10 bg-white/85 backdrop-blur-md sm:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {ITEMS.map((it) => {
        const active = it.href === "/" ? path === "/" : path.startsWith(it.href);
        return (
          <Link
            key={it.href}
            href={it.href}
            className={`flex flex-1 flex-col items-center justify-center gap-0.5 py-1.5 text-[10px] transition ${
              active ? "text-fuchsia-600" : "text-zinc-500"
            }`}
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={active ? 2 : 1.6}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {it.icon}
            </svg>
            <span className={active ? "font-medium" : ""}>{it.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
