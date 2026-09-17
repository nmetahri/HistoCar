import { z } from "zod";

export const entretienSchema = z.object({
  date: z.string().date(),
  kilometrage: z.number().int().min(0),
  type: z.string().min(1),
  details: z.string().min(1),
});

export const entretienUpdateSchema = entretienSchema.partial();
