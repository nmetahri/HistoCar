import type { Attachment } from "@prisma/client";
import { StatusCodes } from "http-status-codes";
import { HttpError } from "@/http/errors";
import { prisma } from "@/prisma";

export interface AttachmentLocation {
  attachmentId: string;
  recordId: string;
  vehicleId: string;
  userId: string;
}

export async function findOwnedAttachment(location: AttachmentLocation): Promise<Attachment> {
  const attachment = await prisma.attachment.findFirst({
    where: {
      id: location.attachmentId,
      maintenanceRecordId: location.recordId,
      maintenanceRecord: {
        vehicleId: location.vehicleId,
        vehicle: { userId: location.userId, active: true },
      },
    },
  });

  if (!attachment) {
    throw new HttpError(StatusCodes.NOT_FOUND, "Justificatif introuvable");
  }

  return attachment;
}
