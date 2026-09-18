import { Router } from "express";
import { asyncRoute, HttpError } from "@/http/errors";
import { prisma } from "@/prisma";
import { buildMaintenanceReport } from "@/report/report";

export const reportRouter = Router();

reportRouter.get(
  "/vehicles/:id/report",
  asyncRoute(async (req, res) => {
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: req.params["id"] as string },
      include: { maintenanceRecords: true },
    });
    if (!vehicle) {
      throw new HttpError(404, "Véhicule introuvable");
    }

    res
      .type("html")
      .set("Cache-Control", "no-store")
      .send(buildMaintenanceReport(vehicle, vehicle.maintenanceRecords));
  }),
);
