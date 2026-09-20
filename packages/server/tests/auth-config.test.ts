import { TEST_PASSWORD, TEST_USER_ID, userFixture } from "@tests/fixtures";
import type { Express } from "express";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  user: { findUnique: vi.fn(), create: vi.fn() },
  vehicle: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  maintenanceRecord: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
}));

vi.mock("@/prisma", () => ({ prisma: prismaMock }));

// env.ts fige sa lecture de process.env à l'import, et createAuthLimiters est
// évalué dans createApp : reconstruire le graphe de modules est le seul moyen
// de tester une autre configuration.
async function buildApp(overrides: Record<string, string>): Promise<Express> {
  vi.resetModules();
  for (const [key, value] of Object.entries(overrides)) {
    vi.stubEnv(key, value);
  }
  const { createApp } = await import("@/app");
  return createApp();
}

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.user.findUnique.mockImplementation(
    ({ where }: { where: { id?: string; username?: string } }) => {
      const found = where.id ? where.id === TEST_USER_ID : where.username === "tester";
      return Promise.resolve(found ? userFixture() : null);
    },
  );
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("registrations without an invite code configured", () => {
  it("answers 403 rather than creating an account", async () => {
    const app = await buildApp({ SIGNUP_INVITE_CODE: "" });

    const response = await request(app).post("/api/auth/register").send({
      username: "nouveau",
      password: "mot-de-passe-solide",
      inviteCode: "peu-importe",
    });

    expect(response.status).toBe(403);
    expect(response.body.message).toBe("Les inscriptions sont fermées");
    expect(prismaMock.user.create).not.toHaveBeenCalled();
  });
});

describe("rate limiting", () => {
  it("throttles repeated login attempts once enabled", async () => {
    const app = await buildApp({ RATE_LIMIT_ENABLED: "true" });
    const attempt = () =>
      request(app).post("/api/auth/login").send({ username: "tester", password: "wrong" });

    const statuses: number[] = [];
    for (let index = 0; index < 11; index += 1) {
      statuses.push((await attempt()).status);
    }

    expect(statuses.filter((status) => status === 401)).toHaveLength(10);
    expect(statuses.at(-1)).toBe(429);
  });

  it("lets every attempt through when disabled", async () => {
    const app = await buildApp({ RATE_LIMIT_ENABLED: "false" });

    for (let index = 0; index < 12; index += 1) {
      const response = await request(app)
        .post("/api/auth/login")
        .send({ username: "tester", password: TEST_PASSWORD });
      expect(response.status).toBe(200);
    }
  });
});
