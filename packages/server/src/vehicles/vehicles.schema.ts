import { z } from "zod";

export const vehicleSchema = z.object({
  make: z.string().min(1),
  model: z.string().min(1),
  licensePlate: z.string().min(1),
  year: z.number().int().min(1900).max(2100),
  currentMileage: z.number().int().min(0),
  engine: z.string().min(1),
  oilCapacity: z.string().min(1),
  oilChangeInterval: z.string().min(1),
});

export const vehicleUpdateSchema = vehicleSchema.partial();
