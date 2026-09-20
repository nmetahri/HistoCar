-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- Propriétaire de reprise, créé uniquement si des véhicules existent déjà :
-- sur une base vierge cette ligne n'a pas lieu d'être. Le mot de passe n'est
-- pas un hash bcrypt valide, ce compte ne peut donc pas servir à se connecter
-- tant que src/scripts/bootstrap-owner.ts ne l'a pas réconcilié avec
-- AUTH_USERNAME / AUTH_PASSWORD_HASH. Le username-marqueur est repris dans
-- src/auth/legacy-owner.ts ; ses « ! » le rendent impossible à obtenir par
-- inscription, la validation n'acceptant que [a-z0-9_-].
INSERT INTO "User" ("id", "username", "passwordHash")
SELECT 'legacy-owner', '!legacy-owner!', '!'
WHERE EXISTS (SELECT 1 FROM "Vehicle");

-- AlterTable
ALTER TABLE "Vehicle" ADD COLUMN "userId" TEXT;
UPDATE "Vehicle" SET "userId" = 'legacy-owner';
ALTER TABLE "Vehicle" ALTER COLUMN "userId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "Vehicle_userId_idx" ON "Vehicle"("userId");

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
