function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

const isProduction = process.env["NODE_ENV"] === "production";

export const env = {
  port: Number(process.env["PORT"] ?? 3001),
  webOrigin: requireEnv("WEB_ORIGIN"),
  jwtSecret: requireEnv("JWT_SECRET"),
  // Absent = inscriptions fermées.
  signupInviteCode: process.env["SIGNUP_INVITE_CODE"],
  isProduction,
  rateLimitEnabled: process.env["RATE_LIMIT_ENABLED"] === "true" || isProduction,
};
