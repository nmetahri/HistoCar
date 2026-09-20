import cookieParser from "cookie-parser";
import cors from "cors";
import express, { type Express } from "express";
import helmet from "helmet";
import { requireAuth } from "@/auth/auth.middleware";
import { authLimiter } from "@/auth/auth.rate-limit";
import { authRouter } from "@/auth/auth.routes";
import { env } from "@/env";
import { healthRouter } from "@/health/health.routes";
import { errorHandler } from "@/http/errors";
import { maintenanceRouter } from "@/maintenance/maintenance.routes";
import { reportRouter } from "@/report/report.routes";
import { vehiclesRouter } from "@/vehicles/vehicles.routes";

export function createApp(): Express {
  const app = express();

  // Derrière nginx + cloudflared : nécessaire pour que req.ip reflète le
  // vrai client (X-Forwarded-For) plutôt que l'IP du proxy interne.
  app.set("trust proxy", 1);

  app.use(helmet());
  app.use(cors({ origin: env.webOrigin, credentials: true }));
  app.use(express.json());
  app.use(cookieParser());

  app.use("/api", healthRouter);
  app.use("/api/auth/login", authLimiter);
  app.use("/api", authRouter);
  app.use("/api", requireAuth, vehiclesRouter);
  app.use("/api", requireAuth, maintenanceRouter);
  app.use("/api", requireAuth, reportRouter);

  app.use(errorHandler);

  return app;
}
