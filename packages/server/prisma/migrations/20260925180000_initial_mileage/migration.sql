-- Le kilométrage saisi jusqu'ici était le kilométrage actuel au moment de la
-- création du véhicule : createdAt est la date qui lui correspond.
ALTER TABLE "Vehicle" RENAME COLUMN "currentMileage" TO "initialMileage";
ALTER TABLE "Vehicle" ADD COLUMN "initialMileageDate" DATE;
UPDATE "Vehicle" SET "initialMileageDate" = "createdAt"::date;
ALTER TABLE "Vehicle" ALTER COLUMN "initialMileageDate" SET NOT NULL;
