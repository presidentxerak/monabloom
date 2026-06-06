"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  connect,
  reconnect,
  disconnect,
  getBalanceMon,
  getChainId,
  switchToMonad,
  explorerAddress,
  getEthereum,
  MONAD_CHAIN_ID,
} from "@/lib/wallet";

/**
 * Header wallet control. Shows "Connect Wallet" when disconnected and a small
 * address chip when connected; the chip opens a "Manage Wallet" modal with the
 * address, network, MON balance, explorer link and a disconnect action.
 *
 * Self-contained: it reconnects on load and tracks account/chain changes. It
 * reports the active account to the parent through `onChange` so pages that
 * need the address (e.g. buying) can react.
 */
export default function WalletButton({
  onChange,
  className = "",
}: {
  onChange?: (acc: string | null) => void;
  className?: string;
}) {
  const [wallet, setWallet] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [mounted, setMounted] = useState(false);
  const cbRef = useRef(onChange);
  cbRef.current = onChange;

  useEffect(() => setMounted(true), []);

  const set = (acc: string | null) => {
    setWallet(acc);
    cbRef.current?.(acc);
  };

  useEffect(() => {
    reconnect().then((acc) => acc && set(acc));
    const eth = getEthereum();
    const onAccounts = (...a: unknown[]) => set((a[0] as string[])?.[0] ?? null);
    const onChain = (...a: unknown[]) => {
      try {
        setChainId(Number(BigInt(a[0] as string)));
      } catch {
        /* ignore */
      }
    };
    eth?.on?.("accountsChanged", onAccounts);
    eth?.on?.("chainChanged", onChain);
    return () => {
      eth?.removeListener?.("accountsChanged", onAccounts);
      eth?.removeListener?.("chainChanged", onChain);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!wallet) {
      setBalance(null);
      setChainId(null);
      return;
    }
    getBalanceMon(wallet).then(setBalance);
    getChainId().then(setChainId);
  }, [wallet, open]);

  async function doConnect() {
    const eth = getEthereum();
    if (!eth) {
      window.open("https://metamask.io/download/", "_blank", "noopener");
      return;
    }
    setBusy(true);
    try {
      const acc = await connect();
      if (acc) {
        set(acc);
        setOpen(true);
      }
    } catch {
      /* user declined */
    } finally {
      setBusy(false);
    }
  }

  async function doDisconnect() {
    await disconnect();
    set(null);
    setOpen(false);
  }

  async function doSwitch() {
    setBusy(true);
    try {
      await switchToMonad();
      setChainId(MONAD_CHAIN_ID);
    } catch {
      /* declined */
    } finally {
      setBusy(false);
    }
  }

  function copy() {
    if (!wallet) return;
    try {
      navigator.clipboard?.writeText(wallet);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  }

  const wrongChain = wallet != null && chainId != null && chainId !== MONAD_CHAIN_ID;

  return (
    <>
      {wallet ? (
        <button
          onClick={() => setOpen(true)}
          className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition hover:brightness-105 ${
            wrongChain
              ? "border-amber-400/60 bg-amber-400/15 text-amber-700"
              : "border-emerald-500/30 bg-emerald-500/12 text-emerald-700"
          } ${className}`}
          title="Manage wallet"
        >
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: wrongChain ? "#f59e0b" : "#10b981" }}
          />
          {wallet.slice(0, 5)}…{wallet.slice(-3)}
        </button>
      ) : (
        <button
          onClick={doConnect}
          disabled={busy}
          className={`btn-bump rounded-full px-3.5 py-1.5 text-xs font-medium disabled:opacity-60 ${className}`}
        >
          {busy ? "Connecting…" : (
            <>
              <span className="sm:hidden">Connect</span>
              <span className="hidden sm:inline">Connect Wallet</span>
            </>
          )}
        </button>
      )}

      {open && wallet && mounted && createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/35 p-3 backdrop-blur-sm sm:items-center"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-3xl border border-black/10 bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
            style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))" }}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-base text-zinc-800">Manage Wallet</h2>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="flex h-7 w-7 items-center justify-center rounded-full text-zinc-400 transition hover:bg-black/5 hover:text-zinc-700"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M6 6l12 12M18 6 6 18" />
                </svg>
              </button>
            </div>

            {/* Address */}
            <div className="mb-3 rounded-2xl bg-zinc-100 p-3">
              <div className="mb-1 text-[10px] uppercase tracking-wider text-zinc-400">Address</div>
              <div className="flex items-center justify-between gap-2">
                <span className="truncate font-mono text-xs text-zinc-700">{wallet}</span>
                <button
                  onClick={copy}
                  className="shrink-0 rounded-full border border-black/10 px-2.5 py-1 text-[11px] text-zinc-500 transition hover:bg-white"
                >
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
            </div>

            {/* Network + balance */}
            <div className="mb-4 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-zinc-100 p-3">
                <div className="mb-1 text-[10px] uppercase tracking-wider text-zinc-400">Network</div>
                {wrongChain ? (
                  <button
                    onClick={doSwitch}
                    disabled={busy}
                    className="rounded-full bg-amber-400/20 px-2.5 py-1 text-[11px] font-medium text-amber-700 transition hover:bg-amber-400/30 disabled:opacity-50"
                  >
                    Switch to Monad
                  </button>
                ) : (
                  <div className="flex items-center gap-1.5 text-sm font-medium text-zinc-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Monad Testnet
                  </div>
                )}
              </div>
              <div className="rounded-2xl bg-zinc-100 p-3">
                <div className="mb-1 text-[10px] uppercase tracking-wider text-zinc-400">Balance</div>
                <div className="text-sm font-medium text-zinc-700">
                  {balance == null ? "…" : `${balance.toFixed(3)} MON`}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <a
                href={explorerAddress(wallet)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 rounded-full border border-black/10 py-2 text-center text-sm text-zinc-600 transition hover:bg-black/5"
              >
                Explorer
              </a>
              <button
                onClick={doDisconnect}
                className="flex-1 rounded-full bg-rose-500/12 py-2 text-sm font-medium text-rose-600 transition hover:bg-rose-500/20"
              >
                Disconnect
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
