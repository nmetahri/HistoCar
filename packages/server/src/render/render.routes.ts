import { existsSync } from "fs";
import { Router } from "express";
import { prisma } from "../prisma";
import { cheminRenduVehicule, regenererRendu } from "./render";

export const renderRouter = Router();

renderRouter.get("/vehicules/:id/rendu", async (req, res) => {
  const vehicule = await prisma.vehicule.findUnique({ where: { id: req.params["id"] } });
  if (!vehicule) {
    res.status(404).json({ message: "Véhicule introuvable" });
    return;
  }

  const chemin = cheminRenduVehicule(vehicule.id);
  if (!existsSync(chemin)) {
    const entretiens = await prisma.entretien.findMany({ where: { vehiculeId: vehicule.id } });
    regenererRendu(vehicule, entretiens);
  }

  res.sendFile(chemin);
});
