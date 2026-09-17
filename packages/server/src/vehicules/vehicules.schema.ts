import { z } from "zod";

export const vehiculeSchema = z.object({
  marque: z.string().min(1),
  modele: z.string().min(1),
  immatriculation: z.string().min(1),
  annee: z.number().int().min(1900).max(2100),
  kilometrageActuel: z.number().int().min(0),
  motorisation: z.string().min(1),
  capaciteHuile: z.string().min(1),
  intervalleVidange: z.string().min(1),
});

export const vehiculeUpdateSchema = vehiculeSchema.partial();
