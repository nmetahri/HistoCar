import { type Request, Router } from "express";
import { StatusCodes } from "http-status-codes";
import { type AttachmentLocation, findOwnedAttachment } from "@/attachments/attachments.access";
import { mergeAttachmentsToPdf } from "@/attachments/attachments.merge";
import { loadVehicleAttachments, storeAttachments } from "@/attachments/attachments.service";
import { readAttachmentFile, removeAttachmentFiles } from "@/attachments/attachments.storage";
import { receiveAttachmentFiles } from "@/attachments/attachments.upload";
import { getAuthUser } from "@/auth/auth.user";
import { asyncMiddleware, asyncRoute, HttpError } from "@/http/errors";
import { buildVehicleFileName, inlineContentDisposition } from "@/http/file-name";
import { assertRecordOwned } from "@/maintenance/maintenance.access";
import { prisma } from "@/prisma";

export const attachmentsRouter = Router();

const RECORD_ATTACHMENTS_PATH = "/vehicles/:vehicleId/maintenance/:recordId/attachments";

function attachmentLocation(req: Request): AttachmentLocation {
  return {
    attachmentId: req.params["id"] as string,
    recordId: req.params["recordId"] as string,
    vehicleId: req.params["vehicleId"] as string,
    userId: getAuthUser(req).id,
  };
}

attachmentsRouter.post(
  RECORD_ATTACHMENTS_PATH,
  // Vérifié avant multer : aucun octet n'est lu pour un entretien étranger.
  asyncMiddleware(async (req, _res, next) => {
    await assertRecordOwned(
      req.params["recordId"] as string,
      req.params["vehicleId"] as string,
      getAuthUser(req).id,
    );
    next();
  }),
  receiveAttachmentFiles,
  asyncRoute(async (req, res) => {
    const files = (req.files as Express.Multer.File[] | undefined) ?? [];
    if (files.length === 0) {
      throw new HttpError(StatusCodes.BAD_REQUEST, "Aucun fichier reçu");
    }

    const attachments = await storeAttachments(
      files,
      req.params["recordId"] as string,
      getAuthUser(req).id,
    );
    res.status(StatusCodes.CREATED).json(attachments);
  }),
);

attachmentsRouter.get(
  `${RECORD_ATTACHMENTS_PATH}/:id`,
  asyncRoute(async (req, res) => {
    const attachment = await findOwnedAttachment(attachmentLocation(req));
    const bytes = await readAttachmentFile(attachment.storageKey);

    res
      .type(attachment.mimeType)
      .set("Content-Disposition", inlineContentDisposition(attachment.originalName))
      .set("Cache-Control", "private, no-store")
      .send(bytes);
  }),
);

attachmentsRouter.delete(
  `${RECORD_ATTACHMENTS_PATH}/:id`,
  asyncRoute(async (req, res) => {
    const attachment = await findOwnedAttachment(attachmentLocation(req));

    await prisma.attachment.delete({ where: { id: attachment.id } });
    await removeAttachmentFiles([attachment.storageKey]);
    res.status(StatusCodes.NO_CONTENT).send();
  }),
);

attachmentsRouter.get(
  "/vehicles/:id/attachments.pdf",
  asyncRoute(async (req, res) => {
    const { licensePlate, title, attachments } = await loadVehicleAttachments(
      req.params["id"] as string,
      getAuthUser(req).id,
    );
    const pdf = await mergeAttachmentsToPdf(attachments, title);

    res
      .type("application/pdf")
      .set(
        "Content-Disposition",
        `attachment; filename="${buildVehicleFileName("justificatifs", licensePlate)}"`,
      )
      .set("Cache-Control", "no-store")
      .send(pdf);
  }),
);
