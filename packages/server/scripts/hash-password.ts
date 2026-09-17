import bcrypt from "bcrypt";

const SALT_ROUNDS = 12;

async function main(): Promise<void> {
  const motDePasse = process.argv[2];
  if (!motDePasse) {
    console.error("Usage: npm run hash-password -- <mot-de-passe>");
    process.exit(1);
  }

  const hash = await bcrypt.hash(motDePasse, SALT_ROUNDS);
  console.log(hash);
}

main();
