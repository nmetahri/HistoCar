import { Router } from "express";
import { getAuthUser } from "@/auth/auth.user";
import { asyncRoute } from "@/http/errors";
import { buildMaintenancePdf } from "@/report/pdf/builder";
import { toReportModel } from "@/report/report.data";
import { findOwnedVehicle } from "@/vehicles/vehicles.access";

export const reportRouter = Router();

// L'immatriculation est saisie par l'utilisateur : la réduire à de l'ASCII
// évite guillemets et retours chariot dans l'en-tête Content-Disposition.
export function buildReportFileName(licensePlate: string): string {
  const slug = licensePlate
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();

  return `historique-entretien-${slug || "vehicule"}.pdf`;
}

reportRouter.get(
  "/vehicles/:id/report.pdf",
  asyncRoute(async (req, res) => {
    const vehicle = await findOwnedVehicle(req.params["id"] as string, getAuthUser(req).id);
    const pdf = await buildMaintenancePdf(toReportModel(vehicle, vehicle.maintenanceRecords));

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
