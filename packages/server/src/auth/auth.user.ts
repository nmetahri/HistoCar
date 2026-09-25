import type { Request } from "express";
import { StatusCodes } from "http-status-codes";
import { HttpError } from "@/http/errors";

export interface AuthenticatedUser {
  id: string;
  username: string;
}

// Évite de disperser des `!` dans les routes : requireAuth garantit déjà la
// présence de req.user, mais le type reste optionnel côté Express.
export function getAuthUser(req: Request): AuthenticatedUser {
  if (!req.user) {
    throw new HttpError(StatusCodes.UNAUTHORIZED, "Non authentifié");
  }
  return req.user;
}
