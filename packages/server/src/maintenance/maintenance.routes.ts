import { Router } from "express";
import { asyncRoute } from "@/http/errors";
import {
  maintenanceRecordSchema,
  maintenanceRecordUpdateSchema,
} from "@/maintenance/maintenance.schema";
import { prisma } from "@/prisma";

export const maintenanceRouter = Router();

maintenanceRouter.post(
  "/vehicles/:vehicleId/maintenance",
  asyncRoute(async (req, res) => {
    const data = maintenanceRecordSchema.parse(req.body);
    const record = await prisma.maintenanceRecord.create({
      data: {
        ...data,
        date: new Date(data.date),
        vehicleId: req.params["vehicleId"] as string,
      },
    });
    res.status(201).json(record);
  }),
);

maintenanceRouter.put(
  "/vehicles/:vehicleId/maintenance/:id",
  asyncRoute(async (req, res) => {
    const { date, ...rest } = maintenanceRecordUpdateSchema.parse(req.body);
    const record = await prisma.maintenanceRecord.update({
      where: { id: req.params["id"] as string },
      data: { ...rest, ...(date ? { date: new Date(date) } : {}) },
    });
    res.json(record);
  }),
);

maintenanceRouter.delete(
  "/vehicles/:vehicleId/maintenance/:id",
  asyncRoute(async (req, res) => {
    await prisma.maintenanceRecord.delete({ where: { id: req.params["id"] as string } });
    res.status(204).send();
  }),
);
