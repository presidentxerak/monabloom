# DECISIONS

Ambiguities resolved during the build (chose the simplest option, noted here
instead of blocking).

## Stack / scaffolding
- **Manual scaffold** instead of `create-next-app` interactive flow, for fully
  deterministic config. Equivalent result: Next.js 15 (App Router, TS strict),
  React 19, Tailwind v3 (PostCSS), `@/*` path alias.
- **Tailwind v3** (not v4) for a stable, well-understood PostCSS pipeline.
- **Vitest** for the unit tests (fast, zero-config with TS).

## Monad network
- Defaults baked as env fallbacks (override anytime via env):
  `MONAD_RPC_URL=https://testnet-rpc.monad.xyz`, `MONAD_CHAIN_ID=10143`,
  `MONAD_EXPLORER_URL=https://testnet.monadexplorer.com`, currency `MON`.
  Verify against https://docs.monad.xyz if they ever move. Chain is built with
  viem `defineChain`. **Testnet only**, `testnet: true`.

## Genome / determinism
- `seedHash` source of all organic noise via `mulberry32(seedFromHex(hash))`.
  `seedFromHex` folds the FULL hex string (FNV-1a) so distinct block hashes
  give distinct flowers.
- A fixed non-zero **garden seed** (`SEED_DEFAUT`) lets the first paint show
  organic variation before the chain is read. Replaced by the real block hash
  at germination; whatever seed is present at inscription is stored forever.
- Petal organic variation is **index-stable** (precomputed for 12 petals from
  the seed), so growing petals never reshuffles existing ones.

## Flower engine
- Geometry + colour math are **pure** (no p5 import) → unit-tested directly.
  Only the thin `drawFlower` routine touches a p5 instance.
- Looping gradient implemented as a **triangle wave** (A→B→A) so the seam where
  the gradient loops is invisible.
- `shadowBlur` is used **only on the core** (per spec — too costly elsewhere);
  petals get a faint wide stroke for the neon halo instead.
- Germination: `petalesAffiches` lerps ~0.06/frame; `floor(n)` full petals plus
  one partial at scale `n - floor(n)`. Colours lerp in RGB (~0.08/frame ≈ 45f).

## Jardinier route
- Single POST route handles **chat** and **inscription**; an inscription is
  triggered ONLY by a server-validated `0x…40` address in the latest user
  message — never by LLM output.
- Bad LLM output → `parseJardinierReply` returns a soft fallback, genome does
  not move. Never returns 500 for a malformed JSON.
- Seed is filled lazily on the first turn (`getBlock`), with a deterministic
  offline fallback so local dev renders without RPC/funding.
- Model: `claude-sonnet-4-5` (per spec).

## Out of scope (per spec)
- No smart contract / Foundry, no wallet-connect, no DB, no SSE, no cron/polling.

## Requires human action (cannot be done from here)
- Run `npm run wallet:new`, paste the key into `.env.local`, **fund** the
  address from the official faucet (needed before Phase 3 inscription works).
- Set `ANTHROPIC_API_KEY` in `.env.local` for the Jardinier to converse.
- Vercel import + env vars + end-to-end prod test (Phase 5).
