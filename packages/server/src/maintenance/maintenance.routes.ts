import { Router } from "express";
import { StatusCodes } from "http-status-codes";
import { removeAttachmentFiles } from "@/attachments/attachments.storage";
import { getAuthUser } from "@/auth/auth.user";
import { asyncRoute } from "@/http/errors";
import { assertRecordOwned } from "@/maintenance/maintenance.access";
import {
  maintenanceRecordSchema,
  maintenanceRecordUpdateSchema,
} from "@/maintenance/maintenance.schema";
import { prisma } from "@/prisma";
import { assertVehicleOwned } from "@/vehicles/vehicles.access";

export const maintenanceRouter = Router();

maintenanceRouter.post(
  "/vehicles/:vehicleId/maintenance",
  asyncRoute(async (req, res) => {
    const vehicleId = req.params["vehicleId"] as string;
    const data = maintenanceRecordSchema.parse(req.body);

    await assertVehicleOwned(vehicleId, getAuthUser(req).id);
    const record = await prisma.maintenanceRecord.create({
      data: { ...data, date: new Date(data.date), vehicleId },
    });
    res.status(StatusCodes.CREATED).json(record);
  }),
);

maintenanceRouter.put(
  "/vehicles/:vehicleId/maintenance/:id",
  asyncRoute(async (req, res) => {
    const id = req.params["id"] as string;
    const { date, ...rest } = maintenanceRecordUpdateSchema.parse(req.body);

    await assertRecordOwned(id, req.params["vehicleId"] as string, getAuthUser(req).id);
    const record = await prisma.maintenanceRecord.update({
      where: { id },
      data: { ...rest, ...(date ? { date: new Date(date) } : {}) },
    });
    res.json(record);
  }),
);

maintenanceRouter.delete(
  "/vehicles/:vehicleId/maintenance/:id",
  asyncRoute(async (req, res) => {
    const id = req.params["id"] as string;

    await assertRecordOwned(id, req.params["vehicleId"] as string, getAuthUser(req).id);
    const attachments = await prisma.attachment.findMany({
      where: { maintenanceRecordId: id },
      select: { storageKey: true },
    });
    await prisma.maintenanceRecord.delete({ where: { id } });
    await removeAttachmentFiles(attachments.map((attachment) => attachment.storageKey));
    res.status(StatusCodes.NO_CONTENT).send();
  }),
);
