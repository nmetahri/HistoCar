import bcrypt from "bcrypt";

const SALT_ROUNDS = 12;

async function main(): Promise<void> {
  const password = process.argv[2];
  if (!password) {
    console.error("Usage: npm run hash-password -- <password>");
    process.exit(1);
  }

  const hash = await bcrypt.hash(password, SALT_ROUNDS);
  console.log(hash);
}

main();
