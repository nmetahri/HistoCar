import bcrypt from "bcrypt";
import { Router } from "express";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { COOKIE_NAME, requireAuth } from "@/auth/auth.middleware";
import { env } from "@/env";
import { asyncRoute, HttpError } from "@/http/errors";

export const authRouter = Router();

const SEVEN_DAYS_IN_MS = 7 * 24 * 60 * 60 * 1000;

const credentialsSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

authRouter.post(
  "/auth/login",
  asyncRoute(async (req, res) => {
    const parsed = credentialsSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new HttpError(400, "Identifiants invalides");
    }

    const { username, password } = parsed.data;
    const usernameMatches = username === env.authUsername;
    const passwordMatches = await bcrypt.compare(password, env.authPasswordHash);

    if (!usernameMatches || !passwordMatches) {
      throw new HttpError(401, "Identifiants incorrects");
    }

    const token = jwt.sign({ sub: username }, env.jwtSecret, { expiresIn: "7d" });
    res.cookie(COOKIE_NAME, token, {
      httpOnly: true,
      secure: env.isProduction,
      sameSite: "lax",
      maxAge: SEVEN_DAYS_IN_MS,
    });
    res.json({ username });
  }),
);

authRouter.post("/auth/logout", (_req, res) => {
  res.clearCookie(COOKIE_NAME);
  res.status(204).send();
});

authRouter.get("/auth/me", requireAuth, (_req, res) => {
  res.json({ username: env.authUsername });
});
