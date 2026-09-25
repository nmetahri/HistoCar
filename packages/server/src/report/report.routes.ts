import { Router } from "express";
import { getAuthUser } from "@/auth/auth.user";
import { asyncRoute } from "@/http/errors";
import { buildVehicleFileName } from "@/http/file-name";
import { buildMaintenancePdf } from "@/report/pdf/builder";
import { toReportModel } from "@/report/report.data";
import { reportQuerySchema } from "@/report/report.schema";
import { findOwnedVehicle } from "@/vehicles/vehicles.access";

export const reportRouter = Router();

export function buildReportFileName(licensePlate: string): string {
  return buildVehicleFileName("historique-entretien", licensePlate);
}

reportRouter.get(
  "/vehicles/:id/report.pdf",
  asyncRoute(async (req, res) => {
    const { currentMileage } = reportQuerySchema.parse(req.query);
    const vehicle = await findOwnedVehicle(req.params["id"] as string, getAuthUser(req).id);
    const pdf = await buildMaintenancePdf(
      toReportModel(vehicle, vehicle.maintenanceRecords, currentMileage),
    );

    res
      .type("application/pdf")
      .set(
        "Content-Disposition",
        `attachment; filename="${buildReportFileName(vehicle.licensePlate)}"`,
      )
      .set("Cache-Control", "no-store")
      .send(pdf);
  }),
);
