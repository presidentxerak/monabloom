// Disposable one-shot: generate a server wallet for inscriptions.
//   npm run wallet:new
// Copy the printed private key into .env.local as MONAD_SERVER_PRIVATE_KEY,
// then fund the printed address from the official Monad testnet faucet.
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

const privateKey = generatePrivateKey();
const account = privateKeyToAccount(privateKey);

console.log("\n🌱 Nouveau wallet serveur Monabloom\n");
console.log("  Adresse      :", account.address);
console.log("  Clé privée   :", privateKey);
console.log("\n→ Mets la clé dans .env.local :");
console.log(`  MONAD_SERVER_PRIVATE_KEY=${privateKey}`);
console.log(
  "\n→ Va chercher du MON testnet pour cette adresse sur le faucet officiel Monad.",
);
console.log("  (https://docs.monad.xyz → Testnet faucet)\n");
console.log(
  "⚠  Ne commit JAMAIS cette clé. .env* est déjà dans le .gitignore.\n",
);
