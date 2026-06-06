"use client";

// Client for the real, server-backed Blitz Garden chat (/api/social).

export interface ChatMsg { id: string; owner: string; text: string; ts: number }

/** A stable per-browser handle so your messages have an identity. */
export function guestName(): string {
  if (typeof window === "undefined") return "guest";
  try {
    let h = localStorage.getItem("blitz_handle");
    if (!h) {
      h = "guest" + Math.floor(1000 + Math.random() * 9000);
      localStorage.setItem("blitz_handle", h);
    }
    return h;
  } catch {
    return "guest";
  }
}

export async function fetchChat(): Promise<ChatMsg[]> {
  try {
    const res = await fetch("/api/social", { cache: "no-store" });
    const data = await res.json();
    return (data.messages as ChatMsg[]) ?? [];
  } catch {
    return [];
  }
}

export async function sendChat(text: string, owner = guestName()): Promise<ChatMsg[]> {
  try {
    const res = await fetch("/api/social", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text, owner }),
    });
    const data = await res.json();
    return (data.messages as ChatMsg[]) ?? [];
  } catch {
    return [];
  }
}
