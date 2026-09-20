import type { Response } from "express";
import jwt from "jsonwebtoken";
import { COOKIE_NAME } from "@/auth/auth.middleware";
import type { AuthenticatedUser } from "@/auth/auth.user";
import { env } from "@/env";

const SESSION_TTL = "7d";
const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export function issueSession(res: Response, user: AuthenticatedUser): void {
  const token = jwt.sign({ sub: user.id }, env.jwtSecret, { expiresIn: SESSION_TTL });
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE_MS,
  });
}
