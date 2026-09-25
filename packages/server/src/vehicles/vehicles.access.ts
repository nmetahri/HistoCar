import type { Prisma } from "@prisma/client";
import { StatusCodes } from "http-status-codes";
import { publicAttachmentSelect } from "@/attachments/attachments.public";
import { HttpError } from "@/http/errors";
import { prisma } from "@/prisma";

const vehicleDetailInclude = {
  maintenanceRecords: {
    orderBy: { date: "desc" },
    include: {
      attachments: { orderBy: { createdAt: "asc" }, select: publicAttachmentSelect },
    },
  },
} satisfies Prisma.VehicleInclude;

export type VehicleWithRecords = Prisma.VehicleGetPayload<{
  include: typeof vehicleDetailInclude;
}>;

// Un véhicule appartenant à quelqu'un d'autre est traité comme inexistant :
// répondre 403 confirmerait son existence. Un véhicule supprimé (inactif)
// l'est aussi, sauf pour sa restauration.
const notFound = (): HttpError => new HttpError(StatusCodes.NOT_FOUND, "Véhicule introuvable");

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
    include: vehicleDetailInclude,
  });

  if (!vehicle) {
    throw notFound();
  }

  return vehicle;
}
