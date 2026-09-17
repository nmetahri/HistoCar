import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../env";

export const COOKIE_NAME = "histocar_token";

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const token = req.cookies?.[COOKIE_NAME] as string | undefined;
  if (!token) {
    res.status(401).json({ message: "Non authentifié" });
    return;
  }

  try {
    jwt.verify(token, env.jwtSecret);
    next();
  } catch {
    res.status(401).json({ message: "Session invalide ou expirée" });
  }
}
