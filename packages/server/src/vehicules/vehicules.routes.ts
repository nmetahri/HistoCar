import { Router } from "express";
import { prisma } from "../prisma";
import { regenererRendu } from "../render/render";
import { vehiculeSchema, vehiculeUpdateSchema } from "./vehicules.schema";

export const vehiculesRouter = Router();

vehiculesRouter.get("/vehicules", async (_req, res) => {
  const vehicules = await prisma.vehicule.findMany({ orderBy: { marque: "asc" } });
  res.json(vehicules);
});

vehiculesRouter.get("/vehicules/:id", async (req, res) => {
  const vehicule = await prisma.vehicule.findUnique({
    where: { id: req.params["id"] },
    include: { entretiens: { orderBy: { date: "desc" } } },
  });
  if (!vehicule) {
    res.status(404).json({ message: "Véhicule introuvable" });
    return;
  }
  res.json(vehicule);
});

vehiculesRouter.post("/vehicules", async (req, res) => {
  const parsed = vehiculeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.message });
    return;
  }

  const vehicule = await prisma.vehicule.create({ data: parsed.data });
  regenererRendu(vehicule, []);
  res.status(201).json(vehicule);
});

vehiculesRouter.put("/vehicules/:id", async (req, res) => {
  const parsed = vehiculeUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.message });
    return;
  }

  const vehicule = await prisma.vehicule.update({
    where: { id: req.params["id"] },
    data: parsed.data,
  });
  const entretiens = await prisma.entretien.findMany({ where: { vehiculeId: vehicule.id } });
  regenererRendu(vehicule, entretiens);
  res.json(vehicule);
});

vehiculesRouter.delete("/vehicules/:id", async (req, res) => {
  await prisma.vehicule.delete({ where: { id: req.params["id"] } });
  res.status(204).send();
});
