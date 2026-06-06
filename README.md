# 🌱 Monabloom — Édition Graine

Une webapp Next.js 15 où tu fais germer une fleur générative kawaii **en
dialoguant** avec le Jardinier (une IA). Quand elle te plaît, son génome est
**inscrit on-chain sur le testnet Monad** (dans le calldata d'une transaction
native), et une page publique la ressuscite depuis la chaîne — pour toujours.

> **La chaîne garde la vérité** · **le code rend vivante** · **l'IA ne fait que converser.**

## Architecture

- Le génome (pétales, 2 couleurs, humeur, bloc + seedHash) est la seule source.
- Le moteur floral (`lib/flower-engine.ts`) est une **fonction pure** du génome
  + seed : même génome + même seed = même fleur, au pixel près.
- Le Jardinier (LLM) ne renvoie que des **deltas bornés**, validés par Zod et
  clampés **en code**. Une réponse cassée ne bouge jamais la fleur.

## Démarrage

```bash
npm install
cp .env.example .env.local      # puis remplis les valeurs

# 1) Génère le wallet serveur
npm run wallet:new
#   → colle la clé dans .env.local (MONAD_SERVER_PRIVATE_KEY)
#   → finance l'adresse via le faucet testnet Monad officiel

# 2) Lance
npm run dev          # http://localhost:3000
npm test             # tests unitaires (génome, PRNG, moteur)
npm run build        # build de prod
```

### Variables d'environnement (`.env.local`)

| clé | rôle |
|-----|------|
| `ANTHROPIC_API_KEY` | le Jardinier (modèle `claude-sonnet-4-5`) |
| `MONAD_SERVER_PRIVATE_KEY` | wallet serveur des inscriptions (jamais commité) |
| `MONAD_RPC_URL` | RPC testnet Monad |
| `MONAD_CHAIN_ID` | `10143` |
| `MONAD_EXPLORER_URL` | explorer testnet |

⚠️ **Aucune clé privée côté client.** `.env*` est dans `.gitignore`.

## Flux

1. `app/page.tsx` — la scène : fleur (canvas p5 mode instance) + visage ASCII + chat.
2. `app/api/jardinier/route.ts` — route unique : chat **et** inscription.
3. Tu colles ton adresse `0x…` dans le chat → transaction signée serveur,
   génome dans le calldata, certificat affiché.
4. `app/fleur/[txHash]` — ressuscite la fleur exacte depuis la chaîne.

Détails d'implémentation et arbitrages : voir [`DECISIONS.md`](./DECISIONS.md).

## Déploiement (Vercel)

Push GitHub → import Vercel → copie les 4 variables d'env → test prod complet
(chat, inscription, résurrection). **Testnet uniquement. Ne touche pas au mainnet.**
