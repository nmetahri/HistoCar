import { Router } from "express";
import { prisma } from "../prisma";
import { regenererRendu } from "../render/render";
import { entretienSchema, entretienUpdateSchema } from "./entretiens.schema";

export const entretiensRouter = Router({ mergeParams: true });

async function regenererApresMutation(vehiculeId: string): Promise<void> {
  const vehicule = await prisma.vehicule.findUnique({ where: { id: vehiculeId } });
  if (!vehicule) {
    return;
  }
  const entretiens = await prisma.entretien.findMany({ where: { vehiculeId } });
  regenererRendu(vehicule, entretiens);
}

entretiensRouter.post("/vehicules/:vehiculeId/entretiens", async (req, res) => {
  const parsed = entretienSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.message });
    return;
  }

  const vehiculeId = req.params["vehiculeId"] as string;
  const entretien = await prisma.entretien.create({
    data: { ...parsed.data, date: new Date(parsed.data.date), vehiculeId },
  });
  await regenererApresMutation(vehiculeId);
  res.status(201).json(entretien);
});

entretiensRouter.put("/vehicules/:vehiculeId/entretiens/:id", async (req, res) => {
  const parsed = entretienUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.message });
    return;
  }

  const { date, ...reste } = parsed.data;
  const vehiculeId = req.params["vehiculeId"] as string;
  const entretien = await prisma.entretien.update({
    where: { id: req.params["id"] },
    data: { ...reste, ...(date ? { date: new Date(date) } : {}) },
  });
  await regenererApresMutation(vehiculeId);
  res.json(entretien);
});

entretiensRouter.delete("/vehicules/:vehiculeId/entretiens/:id", async (req, res) => {
  await prisma.entretien.delete({ where: { id: req.params["id"] } });
  await regenererApresMutation(req.params["vehiculeId"] as string);
  res.status(204).send();
});
