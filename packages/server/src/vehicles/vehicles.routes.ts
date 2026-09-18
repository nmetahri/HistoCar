import { Router } from "express";
import { asyncRoute, HttpError } from "@/http/errors";
import { prisma } from "@/prisma";
import { vehicleSchema, vehicleUpdateSchema } from "@/vehicles/vehicles.schema";

export const vehiclesRouter = Router();

vehiclesRouter.get(
  "/vehicles",
  asyncRoute(async (_req, res) => {
    const vehicles = await prisma.vehicle.findMany({ orderBy: { make: "asc" } });
    res.json(vehicles);
  }),
);

vehiclesRouter.get(
  "/vehicles/:id",
  asyncRoute(async (req, res) => {
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: req.params["id"] as string },
      include: { maintenanceRecords: { orderBy: { date: "desc" } } },
    });
    if (!vehicle) {
      throw new HttpError(404, "Véhicule introuvable");
    }
    res.json(vehicle);
  }),
);

vehiclesRouter.post(
  "/vehicles",
  asyncRoute(async (req, res) => {
    const data = vehicleSchema.parse(req.body);
    const vehicle = await prisma.vehicle.create({ data });
    res.status(201).json(vehicle);
  }),
);

vehiclesRouter.put(
  "/vehicles/:id",
  asyncRoute(async (req, res) => {
    const data = vehicleUpdateSchema.parse(req.body);
    const vehicle = await prisma.vehicle.update({
      where: { id: req.params["id"] as string },
      data,
    });
    res.json(vehicle);
  }),
);

vehiclesRouter.delete(
  "/vehicles/:id",
  asyncRoute(async (req, res) => {
    await prisma.vehicle.delete({ where: { id: req.params["id"] as string } });
    res.status(204).send();
  }),
);
