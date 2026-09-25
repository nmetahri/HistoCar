import { z } from "zod";

// Le kilométrage évolue sans cesse : il est demandé à chaque téléchargement
// plutôt que stocké sur le véhicule.
export const reportQuerySchema = z.object({
  currentMileage: z.coerce.number().int().min(0),
});
