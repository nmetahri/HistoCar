import { StatusCodes } from "http-status-codes";
import { HttpError } from "@/http/errors";
import { prisma } from "@/prisma";

// Contrôle le véhicule parent en même temps que le propriétaire : le
// vehicleId de l'URL était auparavant ignoré, n'importe quel entretien
// pouvait donc être modifié depuis n'importe quel véhicule.
export async function assertRecordOwned(
  recordId: string,
  vehicleId: string,
  userId: string,
): Promise<void> {
  const record = await prisma.maintenanceRecord.findFirst({
    where: { id: recordId, vehicleId, vehicle: { userId, active: true } },
    select: { id: true },
  });

  if (!record) {
    throw new HttpError(StatusCodes.NOT_FOUND, "Entretien introuvable");
  }
}
