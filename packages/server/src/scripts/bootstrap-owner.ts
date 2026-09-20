import { LEGACY_OWNER_USERNAME } from "@/auth/legacy-owner";
import { prisma } from "@/prisma";

// Lancé par le service `migrate` juste après `prisma migrate deploy`.
// N'importe pas @/env, dont les requireEnv lèveraient sur des variables que
// ce script n'utilise pas.
async function bootstrapOwner(): Promise<void> {
  const username = process.env["AUTH_USERNAME"];
  const passwordHash = process.env["AUTH_PASSWORD_HASH"];

  if (!username || !passwordHash) {
    console.info("bootstrap-owner: AUTH_USERNAME/AUTH_PASSWORD_HASH absents, rien à faire.");
    return;
  }

  // Filtrer sur le marqueur laissé par la migration : sans cette condition,
  // chaque déploiement réécraserait un mot de passe modifié depuis l'app.
  const { count } = await prisma.user.updateMany({
    where: { username: LEGACY_OWNER_USERNAME },
    data: { username: username.trim().toLowerCase(), passwordHash },
  });

  console.info(
    count === 0
      ? "bootstrap-owner: aucun compte de reprise en attente."
      : "bootstrap-owner: compte propriétaire rattaché à AUTH_USERNAME.",
  );
}

bootstrapOwner()
  .catch((error: unknown) => {
    console.error("bootstrap-owner a échoué :", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
