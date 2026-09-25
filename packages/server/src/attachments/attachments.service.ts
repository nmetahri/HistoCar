import { StatusCodes } from "http-status-codes";
import { type CompressedAttachment, compressAttachment } from "@/attachments/attachments.compress";
import {
  type AttachmentFileType,
  detectAttachmentFileType,
} from "@/attachments/attachments.file-type";
import type { MergeableAttachment } from "@/attachments/attachments.merge";
import { type PublicAttachment, publicAttachmentSelect } from "@/attachments/attachments.public";
import {
  createStorageKey,
  readAttachmentFile,
  removeAttachmentFiles,
  saveAttachmentFile,
} from "@/attachments/attachments.storage";
import { HttpError } from "@/http/errors";
import { prisma } from "@/prisma";

const MAX_ORIGINAL_NAME_LENGTH = 255;

interface PreparedAttachment {
  storageKey: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  bytes: Buffer;
}

export interface VehicleAttachments {
  licensePlate: string;
  title: string;
  attachments: MergeableAttachment[];
}

function withExtension(fileName: string, extension: string): string {
  const baseName = fileName.replace(/\.[^.]*$/, "") || fileName;
  return `${baseName}.${extension}`;
}

async function compressOrReject(
  file: Express.Multer.File,
  fileType: AttachmentFileType,
): Promise<CompressedAttachment> {
  try {
    return await compressAttachment(file.buffer, fileType);
  } catch (error) {
    console.error(`Failed to compress attachment "${file.originalname}":`, error);
    throw new HttpError(StatusCodes.BAD_REQUEST, `Fichier illisible : ${file.originalname}`);
  }
}

async function prepareAttachment(
  file: Express.Multer.File,
  userId: string,
): Promise<PreparedAttachment> {
  const detectedType = detectAttachmentFileType(file.buffer);

  if (!detectedType) {
    throw new HttpError(
      StatusCodes.UNSUPPORTED_MEDIA_TYPE,
      `Format non supporté (PDF, JPEG ou PNG) : ${file.originalname}`,
    );
  }

  const { bytes, fileType } = await compressOrReject(file, detectedType);

  return {
    storageKey: createStorageKey(userId, fileType.extension),
    originalName: withExtension(file.originalname, fileType.extension).slice(
      -MAX_ORIGINAL_NAME_LENGTH,
    ),
    mimeType: fileType.mimeType,
    sizeBytes: bytes.byteLength,
    bytes,
  };
}

export async function storeAttachments(
  files: readonly Express.Multer.File[],
  recordId: string,
  userId: string,
): Promise<PublicAttachment[]> {
  const prepared = await Promise.all(files.map((file) => prepareAttachment(file, userId)));

  try {
    await Promise.all(
      prepared.map(({ storageKey, bytes }) => saveAttachmentFile(storageKey, bytes)),
    );
    return await prisma.attachment.createManyAndReturn({
      data: prepared.map(({ bytes, ...attachment }) => ({
        ...attachment,
        maintenanceRecordId: recordId,
      })),
      select: publicAttachmentSelect,
    });
  } catch (error) {
    await removeAttachmentFiles(prepared.map(({ storageKey }) => storageKey));
    throw error;
  }
}

// Un fichier manquant sur disque est transmis vide : la fusion le remplace
// par une page « Document illisible » au lieu d'échouer en entier.
async function readForMerge(storageKey: string): Promise<Buffer> {
  try {
    return await readAttachmentFile(storageKey);
  } catch (error) {
    console.error(`Failed to read attachment file ${storageKey}:`, error);
    return Buffer.alloc(0);
  }
}

export async function loadVehicleAttachments(
  vehicleId: string,
  userId: string,
): Promise<VehicleAttachments> {
  const vehicle = await prisma.vehicle.findFirst({
    where: { id: vehicleId, userId, active: true },
    select: {
      make: true,
      model: true,
      licensePlate: true,
      maintenanceRecords: {
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
        select: {
          attachments: {
            orderBy: { createdAt: "asc" },
            select: { originalName: true, mimeType: true, storageKey: true },
          },
        },
      },
    },
  });

  if (!vehicle) {
    throw new HttpError(StatusCodes.NOT_FOUND, "Véhicule introuvable");
  }

  const stored = vehicle.maintenanceRecords.flatMap((record) => record.attachments);
  if (stored.length === 0) {
    throw new HttpError(StatusCodes.NOT_FOUND, "Aucun justificatif pour ce véhicule");
  }

  const attachments = await Promise.all(
    stored.map(async ({ originalName, mimeType, storageKey }) => ({
      originalName,
      mimeType,
      bytes: await readForMerge(storageKey),
    })),
  );

  return {
    licensePlate: vehicle.licensePlate,
    title: `Justificatifs - ${vehicle.make} ${vehicle.model}`,
    attachments,
  };
}
