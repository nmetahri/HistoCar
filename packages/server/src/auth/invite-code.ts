import { createHash, timingSafeEqual } from "node:crypto";
import { StatusCodes } from "http-status-codes";
import { env } from "@/env";
import { HttpError } from "@/http/errors";

function digest(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}

// Les empreintes SHA-256 font toujours la même taille : timingSafeEqual lève
// sur des longueurs différentes, comparer les codes bruts serait donc à la
// fois fragile et révélateur de la longueur attendue.
export function assertInviteCode(submitted: string): void {
  const expected = env.signupInviteCode;

  if (!expected) {
    throw new HttpError(StatusCodes.FORBIDDEN, "Les inscriptions sont fermées");
  }

  if (!timingSafeEqual(digest(submitted), digest(expected))) {
    throw new HttpError(StatusCodes.FORBIDDEN, "Code d'invitation invalide");
  }
}
