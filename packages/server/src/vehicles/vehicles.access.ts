import type { Prisma } from "@prisma/client";
import { HttpError } from "@/http/errors";
import { prisma } from "@/prisma";

export type VehicleWithRecords = Prisma.VehicleGetPayload<{
  include: { maintenanceRecords: true };
}>;

// Un véhicule appartenant à quelqu'un d'autre est traité comme inexistant :
// répondre 403 confirmerait son existence. Un véhicule supprimé (inactif)
// l'est aussi, sauf pour sa restauration.
const notFound = (): HttpError => new HttpError(404, "Véhicule introuvable");

async function assertVehicleExists(where: Prisma.VehicleWhereInput): Promise<void> {
  const vehicle = await prisma.vehicle.findFirst({ where, select: { id: true } });

  if (!vehicle) {
    throw notFound();
  }
}

export function assertVehicleOwned(vehicleId: string, userId: string): Promise<void> {
  return assertVehicleExists({ id: vehicleId, userId, active: true });
}

export function assertArchivedVehicleOwned(vehicleId: string, userId: string): Promise<void> {
  return assertVehicleExists({ id: vehicleId, userId, active: false });
}

export async function findOwnedVehicle(
  vehicleId: string,
  userId: string,
): Promise<VehicleWithRecords> {
  const vehicle = await prisma.vehicle.findFirst({
    where: { id: vehicleId, userId, active: true },
    include: { maintenanceRecords: { orderBy: { date: "desc" } } },
  });

  if (!vehicle) {
    throw notFound();
  }

  return vehicle;
}
