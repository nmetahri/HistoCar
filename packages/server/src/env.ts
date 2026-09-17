function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Variable d'environnement manquante: ${name}`);
  }
  return value;
}

export const env = {
  port: Number(process.env["PORT"] ?? 3001),
  webOrigin: requireEnv("WEB_ORIGIN"),
  jwtSecret: requireEnv("JWT_SECRET"),
  authUsername: requireEnv("AUTH_USERNAME"),
  authPasswordHash: requireEnv("AUTH_PASSWORD_HASH"),
  isProduction: process.env["NODE_ENV"] === "production",
};
