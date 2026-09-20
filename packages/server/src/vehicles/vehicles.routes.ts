import { Router } from "express";
import { getAuthUser } from "@/auth/auth.user";
import { asyncRoute } from "@/http/errors";
import { prisma } from "@/prisma";
import { assertVehicleOwned, findOwnedVehicle } from "@/vehicles/vehicles.access";
import { vehicleSchema, vehicleUpdateSchema } from "@/vehicles/vehicles.schema";

export const vehiclesRouter = Router();

vehiclesRouter.get(
  "/vehicles",
  asyncRoute(async (req, res) => {
    const vehicles = await prisma.vehicle.findMany({
      where: { userId: getAuthUser(req).id },
      orderBy: { make: "asc" },
    });
    res.json(vehicles);
  }),
);

vehiclesRouter.get(
  "/vehicles/:id",
  asyncRoute(async (req, res) => {
    const vehicle = await findOwnedVehicle(req.params["id"] as string, getAuthUser(req).id);
    res.json(vehicle);
  }),
);

vehiclesRouter.post(
  "/vehicles",
  asyncRoute(async (req, res) => {
    const data = vehicleSchema.parse(req.body);
    const vehicle = await prisma.vehicle.create({
      data: { ...data, userId: getAuthUser(req).id },
    });
    res.status(201).json(vehicle);
  }),
);

vehiclesRouter.put(
  "/vehicles/:id",
  asyncRoute(async (req, res) => {
    const id = req.params["id"] as string;
    const data = vehicleUpdateSchema.parse(req.body);

    await assertVehicleOwned(id, getAuthUser(req).id);
    const vehicle = await prisma.vehicle.update({ where: { id }, data });
    res.json(vehicle);
  }),
);

vehiclesRouter.delete(
  "/vehicles/:id",
  asyncRoute(async (req, res) => {
    const id = req.params["id"] as string;

    await assertVehicleOwned(id, getAuthUser(req).id);
    await prisma.vehicle.delete({ where: { id } });
    res.status(204).send();
  }),
);
