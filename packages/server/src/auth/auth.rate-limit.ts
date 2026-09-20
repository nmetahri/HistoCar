import type { RequestHandler } from "express";
import rateLimit from "express-rate-limit";
import { env } from "@/env";

const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 10;

const REGISTER_WINDOW_MS = 60 * 60 * 1000;
const REGISTER_MAX_ACCOUNTS = 5;

export interface AuthLimiters {
  login: RequestHandler;
  register: RequestHandler;
}

const passThrough: RequestHandler = (_req, _res, next) => next();

// Construit à l'appel de createApp() et non à l'import : un limiter figé au
// chargement du module serait impossible à activer depuis un test.
// Désactivé hors production : dev et tests enchaînent des dizaines de
// requêtes dans la même fenêtre depuis une seule IP.
export function createAuthLimiters(): AuthLimiters {
  if (!env.rateLimitEnabled) {
    return { login: passThrough, register: passThrough };
  }

  return {
    login: rateLimit({
      windowMs: LOGIN_WINDOW_MS,
      limit: LOGIN_MAX_ATTEMPTS,
      standardHeaders: true,
      legacyHeaders: false,
      message: { message: "Trop de tentatives de connexion, réessayez plus tard" },
    }),
    register: rateLimit({
      windowMs: REGISTER_WINDOW_MS,
      limit: REGISTER_MAX_ACCOUNTS,
      standardHeaders: true,
      legacyHeaders: false,
      message: { message: "Trop de créations de compte, réessayez plus tard" },
    }),
  };
}
