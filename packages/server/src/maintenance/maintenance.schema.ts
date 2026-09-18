import { z } from "zod";

export const maintenanceRecordSchema = z.object({
  date: z.string().date(),
  mileage: z.number().int().min(0),
  type: z.string().min(1),
  details: z.string().min(1),
});

export const maintenanceRecordUpdateSchema = maintenanceRecordSchema.partial();
