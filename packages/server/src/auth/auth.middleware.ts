import type { RequestHandler } from "express";
import { StatusCodes } from "http-status-codes";
import jwt from "jsonwebtoken";
import { env } from "@/env";
import { asyncMiddleware } from "@/http/errors";
import { prisma } from "@/prisma";

export const COOKIE_NAME = "histocar_token";

function readUserId(token: string): string | null {
  try {
    const payload = jwt.verify(token, env.jwtSecret);
    if (typeof payload === "string" || typeof payload.sub !== "string") {
      return null;
    }
    return payload.sub;
  } catch {
    return null;
  }
}

export const requireAuth: RequestHandler = asyncMiddleware(async (req, res, next) => {
  const token = req.cookies?.[COOKIE_NAME] as string | undefined;
  const userId = token ? readUserId(token) : null;

  if (!userId) {
    res.status(StatusCodes.UNAUTHORIZED).json({ message: "Non authentifié" });
    return;
  }

  // Relecture en base plutôt que confiance au seul payload : les jetons émis
  // avant la table User portent un username et non un id, et un compte
  // supprimé conserverait sinon son accès pendant sept jours.
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, username: true },
  });

  if (!user) {
    res.clearCookie(COOKIE_NAME);
    res.status(StatusCodes.UNAUTHORIZED).json({ message: "Session invalide ou expirée" });
    return;
  }

  req.user = user;
  next();
});
