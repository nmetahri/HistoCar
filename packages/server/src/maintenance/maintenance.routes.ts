import { Router } from "express";
import { getAuthUser } from "@/auth/auth.user";
import { asyncRoute, HttpError } from "@/http/errors";
import {
  maintenanceRecordSchema,
  maintenanceRecordUpdateSchema,
} from "@/maintenance/maintenance.schema";
import { prisma } from "@/prisma";
import { assertVehicleOwned } from "@/vehicles/vehicles.access";

export const maintenanceRouter = Router();

// Contrôle le véhicule parent en même temps que le propriétaire : le
// vehicleId de l'URL était auparavant ignoré, n'importe quel entretien
// pouvait donc être modifié depuis n'importe quel véhicule.
async function assertRecordOwned(
  recordId: string,
  vehicleId: string,
  userId: string,
): Promise<void> {
  const record = await prisma.maintenanceRecord.findFirst({
    where: { id: recordId, vehicleId, vehicle: { userId, active: true } },
    select: { id: true },
  });

  if (!record) {
    throw new HttpError(404, "Entretien introuvable");
  }
}

maintenanceRouter.post(
  "/vehicles/:vehicleId/maintenance",
  asyncRoute(async (req, res) => {
    const vehicleId = req.params["vehicleId"] as string;
    const data = maintenanceRecordSchema.parse(req.body);

    await assertVehicleOwned(vehicleId, getAuthUser(req).id);
    const record = await prisma.maintenanceRecord.create({
      data: { ...data, date: new Date(data.date), vehicleId },
    });
    res.status(201).json(record);
  }),
);

maintenanceRouter.put(
  "/vehicles/:vehicleId/maintenance/:id",
  asyncRoute(async (req, res) => {
    const id = req.params["id"] as string;
    const { date, ...rest } = maintenanceRecordUpdateSchema.parse(req.body);

    await assertRecordOwned(id, req.params["vehicleId"] as string, getAuthUser(req).id);
    const record = await prisma.maintenanceRecord.update({
      where: { id },
      data: { ...rest, ...(date ? { date: new Date(date) } : {}) },
    });
    res.json(record);
  }),
);

maintenanceRouter.delete(
  "/vehicles/:vehicleId/maintenance/:id",
  asyncRoute(async (req, res) => {
    const id = req.params["id"] as string;

    await assertRecordOwned(id, req.params["vehicleId"] as string, getAuthUser(req).id);
    await prisma.maintenanceRecord.delete({ where: { id } });
    res.status(204).send();
  }),
);
