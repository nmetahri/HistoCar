import type { Prisma } from "@prisma/client";
import { HttpError } from "@/http/errors";
import { prisma } from "@/prisma";

export type VehicleWithRecords = Prisma.VehicleGetPayload<{
  include: { maintenanceRecords: true };
}>;

// Un véhicule appartenant à quelqu'un d'autre est traité comme inexistant :
// répondre 403 confirmerait son existence.
const notFound = (): HttpError => new HttpError(404, "Véhicule introuvable");

export async function assertVehicleOwned(vehicleId: string, userId: string): Promise<void> {
  const vehicle = await prisma.vehicle.findFirst({
    where: { id: vehicleId, userId },
    select: { id: true },
  });

  if (!vehicle) {
    throw notFound();
  }
}

export async function findOwnedVehicle(
  vehicleId: string,
  userId: string,
): Promise<VehicleWithRecords> {
  const vehicle = await prisma.vehicle.findFirst({
    where: { id: vehicleId, userId },
    include: { maintenanceRecords: { orderBy: { date: "desc" } } },
  });

  if (!vehicle) {
    throw notFound();
  }

  return vehicle;
}
