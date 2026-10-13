import { z } from "zod";

export const VEHICLE_NOTES_MAX_LENGTH = 2000;

export const vehicleSchema = z.object({
  make: z.string().min(1),
  model: z.string().min(1),
  licensePlate: z.string().min(1),
  year: z.number().int().min(1900).max(2100),
  initialMileage: z.number().int().min(0),
  initialMileageDate: z.string().date(),
  engine: z.string().min(1),
  oilCapacity: z.string().min(1),
  oilChangeInterval: z.string().min(1),
  notes: z.string().trim().max(VEHICLE_NOTES_MAX_LENGTH).optional(),
});

export const vehicleUpdateSchema = vehicleSchema.partial();
