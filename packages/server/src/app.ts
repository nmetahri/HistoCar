import cookieParser from "cookie-parser";
import cors from "cors";
import express, { type Express } from "express";
import { authRouter } from "./auth/auth.routes";
import { requireAuth } from "./auth/auth.middleware";
import { entretiensRouter } from "./entretiens/entretiens.routes";
import { env } from "./env";
import { renderRouter } from "./render/render.routes";
import { vehiculesRouter } from "./vehicules/vehicules.routes";

export function creerApp(): Express {
  const app = express();

  app.use(cors({ origin: env.webOrigin, credentials: true }));
  app.use(express.json());
  app.use(cookieParser());

  app.use("/api", authRouter);
  app.use("/api", requireAuth, vehiculesRouter);
  app.use("/api", requireAuth, entretiensRouter);
  app.use("/api", requireAuth, renderRouter);

  return app;
}
