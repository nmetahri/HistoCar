import { Prisma } from "@prisma/client";
import bcrypt from "bcrypt";
import { Router } from "express";
import { StatusCodes } from "http-status-codes";
import { z } from "zod";
import { COOKIE_NAME, requireAuth } from "@/auth/auth.middleware";
import { issueSession } from "@/auth/auth.session";
import { type AuthenticatedUser, getAuthUser } from "@/auth/auth.user";
import { assertInviteCode } from "@/auth/invite-code";
import { asyncRoute, HttpError } from "@/http/errors";
import { prisma } from "@/prisma";

export const authRouter = Router();

const BCRYPT_ROUNDS = 12;
const USERNAME_PATTERN = /^[a-z0-9_-]{3,32}$/;
const MIN_PASSWORD_LENGTH = 10;
// bcrypt tronque au-delà de 72 octets : mieux vaut refuser que tronquer.
const MAX_PASSWORD_LENGTH = 72;

// Comparé quand aucun compte ne correspond, pour que le temps de réponse ne
// révèle pas quels usernames existent.
const DUMMY_PASSWORD_HASH = "$2b$10$MfovcLtoWTMVwe.wmfh0eOXLaMZQRnyXh8slBTd72fH.Y1NzUuRQe";

const usernameSchema = z
  .string()
  .transform((value) => value.trim().toLowerCase())
  .refine((value) => USERNAME_PATTERN.test(value));

const credentialsSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

const registrationSchema = z.object({
  username: usernameSchema,
  password: z.string().min(MIN_PASSWORD_LENGTH).max(MAX_PASSWORD_LENGTH),
  inviteCode: z.string().min(1),
});

async function createUser(username: string, password: string): Promise<AuthenticatedUser> {
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  try {
    return await prisma.user.create({
      data: { username, passwordHash },
      select: { id: true, username: true },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new HttpError(StatusCodes.CONFLICT, "Ce nom d'utilisateur est déjà pris");
    }
    throw error;
  }
}

authRouter.post(
  "/auth/register",
  asyncRoute(async (req, res) => {
    const parsed = registrationSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new HttpError(
        StatusCodes.BAD_REQUEST,
        `Nom d'utilisateur invalide (3 à 32 caractères : lettres, chiffres, - ou _) ` +
          `ou mot de passe trop court (${MIN_PASSWORD_LENGTH} caractères minimum)`,
      );
    }

    const { username, password, inviteCode } = parsed.data;
    assertInviteCode(inviteCode);

    const user = await createUser(username, password);
    issueSession(res, user);
    res.status(StatusCodes.CREATED).json({ username: user.username });
  }),
);

authRouter.post(
  "/auth/login",
  asyncRoute(async (req, res) => {
    const parsed = credentialsSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new HttpError(StatusCodes.BAD_REQUEST, "Identifiants invalides");
    }

    const user = await prisma.user.findUnique({
      where: { username: parsed.data.username.trim().toLowerCase() },
      select: { id: true, username: true, passwordHash: true },
    });

    const passwordMatches = await bcrypt.compare(
      parsed.data.password,
      user?.passwordHash ?? DUMMY_PASSWORD_HASH,
    );

    if (!user || !passwordMatches) {
      throw new HttpError(StatusCodes.UNAUTHORIZED, "Identifiants incorrects");
    }

    issueSession(res, user);
    res.json({ username: user.username });
  }),
);

authRouter.post("/auth/logout", (_req, res) => {
  res.clearCookie(COOKIE_NAME);
  res.status(StatusCodes.NO_CONTENT).send();
});

authRouter.get("/auth/me", requireAuth, (req, res) => {
  res.json({ username: getAuthUser(req).username });
});
