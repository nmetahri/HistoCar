import bcrypt from "bcrypt";
import { Router } from "express";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { env } from "../env";
import { COOKIE_NAME, requireAuth } from "./auth.middleware";

export const authRouter = Router();

const SEPT_JOURS_EN_MS = 7 * 24 * 60 * 60 * 1000;

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

authRouter.post("/auth/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Identifiants invalides" });
    return;
  }

  const { username, password } = parsed.data;
  const identifiantValide = username === env.authUsername;
  const motDePasseValide = await bcrypt.compare(password, env.authPasswordHash);

  if (!identifiantValide || !motDePasseValide) {
    res.status(401).json({ message: "Identifiants incorrects" });
    return;
  }

  const token = jwt.sign({ sub: username }, env.jwtSecret, { expiresIn: "7d" });
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: "lax",
    maxAge: SEPT_JOURS_EN_MS,
  });
  res.json({ username });
});

authRouter.post("/auth/logout", (_req, res) => {
  res.clearCookie(COOKIE_NAME);
  res.status(204).send();
});

authRouter.get("/auth/me", requireAuth, (_req, res) => {
  res.json({ username: env.authUsername });
});
