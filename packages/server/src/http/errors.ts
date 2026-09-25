import { Prisma } from "@prisma/client";
import type { NextFunction, Request, RequestHandler, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { MulterError } from "multer";
import { ZodError } from "zod";

export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export function asyncRoute(
  handler: (req: Request, res: Response) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    handler(req, res).catch(next);
  };
}

export function asyncMiddleware(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    handler(req, res, next).catch(next);
  };
}

export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (error instanceof HttpError) {
    res.status(error.status).json({ message: error.message });
    return;
  }

  if (error instanceof ZodError) {
    res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: "Données invalides", details: error.flatten() });
    return;
  }

  if (error instanceof MulterError) {
    const isTooLarge = error.code === "LIMIT_FILE_SIZE";
    res.status(isTooLarge ? StatusCodes.REQUEST_TOO_LONG : StatusCodes.BAD_REQUEST).json({
      message: isTooLarge ? "Fichier trop volumineux" : "Envoi de fichiers invalide",
    });
    return;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
    res.status(StatusCodes.NOT_FOUND).json({ message: "Ressource introuvable" });
    return;
  }

  console.error("Unhandled error:", error);
  res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: "Erreur interne du serveur" });
}
