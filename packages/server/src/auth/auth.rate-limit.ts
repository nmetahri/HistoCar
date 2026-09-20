import type { RequestHandler } from "express";
import rateLimit from "express-rate-limit";
import { env } from "@/env";

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS_PER_WINDOW = 10;

const passThrough: RequestHandler = (_req, _res, next) => next();

// Désactivé hors production : les tests et le dev enchaînent des dizaines
// de connexions dans la même fenêtre depuis une seule IP.
export const authLimiter: RequestHandler = env.isProduction
  ? rateLimit({
      windowMs: WINDOW_MS,
      limit: MAX_ATTEMPTS_PER_WINDOW,
      standardHeaders: true,
      legacyHeaders: false,
      message: { message: "Trop de tentatives de connexion, réessayez plus tard" },
    })
  : passThrough;
