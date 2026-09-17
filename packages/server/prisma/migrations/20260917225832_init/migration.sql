-- CreateTable
CREATE TABLE "Vehicule" (
    "id" TEXT NOT NULL,
    "marque" TEXT NOT NULL,
    "modele" TEXT NOT NULL,
    "immatriculation" TEXT NOT NULL,
    "annee" INTEGER NOT NULL,
    "kilometrageActuel" INTEGER NOT NULL,
    "motorisation" TEXT NOT NULL,
    "capaciteHuile" TEXT NOT NULL,
    "intervalleVidange" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vehicule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Entretien" (
    "id" TEXT NOT NULL,
    "vehiculeId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "kilometrage" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Entretien_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Entretien_vehiculeId_idx" ON "Entretien"("vehiculeId");

-- AddForeignKey
ALTER TABLE "Entretien" ADD CONSTRAINT "Entretien_vehiculeId_fkey" FOREIGN KEY ("vehiculeId") REFERENCES "Vehicule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
