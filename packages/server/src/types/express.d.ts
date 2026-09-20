import type { AuthenticatedUser } from "@/auth/auth.user";

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}
