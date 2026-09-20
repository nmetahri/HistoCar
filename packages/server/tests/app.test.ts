import { Prisma } from "@prisma/client";
import {
  maintenanceRecordFixture,
  TEST_PASSWORD,
  TEST_USER_ID,
  userFixture,
  vehicleFixture,
} from "@tests/fixtures";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "@/app";

const prismaMock = vi.hoisted(() => ({
  user: {
    findUnique: vi.fn(),
    create: vi.fn(),
  },
  vehicle: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  maintenanceRecord: {
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("@/prisma", () => ({ prisma: prismaMock }));

const app = createApp();
const INVITE_CODE = "invitation-de-test";

interface UserLookup {
  where: { id?: string; username?: string };
}

async function sessionCookie(): Promise<string> {
  const response = await request(app)
    .post("/api/auth/login")
    .send({ username: "tester", password: TEST_PASSWORD });
  const cookies = response.headers["set-cookie"] as unknown as string[];
  return cookies[0] as string;
}

beforeEach(() => {
  vi.clearAllMocks();
  // Sert au login (recherche par username) comme à requireAuth (par id).
  prismaMock.user.findUnique.mockImplementation(({ where }: UserLookup) => {
    const found = where.id ? where.id === TEST_USER_ID : where.username === "tester";
    return Promise.resolve(found ? userFixture() : null);
  });
});

describe("GET /api/health", () => {
  it("answers without authentication", async () => {
    const response = await request(app).get("/api/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok" });
  });
});

describe("POST /api/auth/login", () => {
  it("sets an httpOnly cookie for valid credentials", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({ username: "tester", password: TEST_PASSWORD });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ username: "tester" });
    const cookie = (response.headers["set-cookie"] as unknown as string[])[0] as string;
    expect(cookie).toContain("histocar_token=");
    expect(cookie).toContain("HttpOnly");
  });

  it("rejects a wrong password", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({ username: "tester", password: "wrong" });

    expect(response.status).toBe(401);
    expect(response.headers["set-cookie"]).toBeUndefined();
  });

  it("rejects an unknown username", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({ username: "intruder", password: TEST_PASSWORD });

    expect(response.status).toBe(401);
  });

  it("normalises the username case", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({ username: "  TESTER ", password: TEST_PASSWORD });

    expect(response.status).toBe(200);
    expect(prismaMock.user.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { username: "tester" } }),
    );
  });

  it("rejects an incomplete body", async () => {
    const response = await request(app).post("/api/auth/login").send({ username: "tester" });
    expect(response.status).toBe(400);
  });
});

describe("POST /api/auth/register", () => {
  const validBody = {
    username: "nouveau",
    password: "mot-de-passe-solide",
    inviteCode: INVITE_CODE,
  };

  it("creates the account and opens a session", async () => {
    prismaMock.user.create.mockResolvedValue({ id: "usr_3", username: "nouveau" });

    const response = await request(app).post("/api/auth/register").send(validBody);

    expect(response.status).toBe(201);
    expect(response.body).toEqual({ username: "nouveau" });
    expect((response.headers["set-cookie"] as unknown as string[])[0]).toContain("histocar_token=");
  });

  it("normalises the username before storing it", async () => {
    prismaMock.user.create.mockResolvedValue({ id: "usr_3", username: "nouveau" });

    await request(app)
      .post("/api/auth/register")
      .send({ ...validBody, username: " Nouveau " });

    expect(prismaMock.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ username: "nouveau" }),
      }),
    );
  });

  it("rejects a wrong invite code without touching the database", async () => {
    const response = await request(app)
      .post("/api/auth/register")
      .send({ ...validBody, inviteCode: "mauvais-code" });

    expect(response.status).toBe(403);
    expect(prismaMock.user.create).not.toHaveBeenCalled();
  });

  it("rejects a short password", async () => {
    const response = await request(app)
      .post("/api/auth/register")
      .send({ ...validBody, password: "court" });

    expect(response.status).toBe(400);
    expect(prismaMock.user.create).not.toHaveBeenCalled();
  });

  it("rejects a username with forbidden characters", async () => {
    const response = await request(app)
      .post("/api/auth/register")
      .send({ ...validBody, username: "!legacy-owner!" });

    expect(response.status).toBe(400);
    expect(prismaMock.user.create).not.toHaveBeenCalled();
  });

  it("maps a unique constraint violation to 409", async () => {
    prismaMock.user.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Unique constraint", {
        code: "P2002",
        clientVersion: "5.22.0",
      }),
    );

    const response = await request(app).post("/api/auth/register").send(validBody);

    expect(response.status).toBe(409);
    expect(response.body.message).toBe("Ce nom d'utilisateur est déjà pris");
  });
});

describe("requireAuth", () => {
  it("blocks protected routes without a cookie", async () => {
    for (const path of ["/api/vehicles", "/api/vehicles/veh_1", "/api/vehicles/veh_1/report.pdf"]) {
      const response = await request(app).get(path);
      expect(response.status, path).toBe(401);
    }
    expect(prismaMock.vehicle.findMany).not.toHaveBeenCalled();
    expect(prismaMock.vehicle.findFirst).not.toHaveBeenCalled();
  });

  it("rejects a token signed with another secret", async () => {
    const response = await request(app)
      .get("/api/vehicles")
      .set("Cookie", "histocar_token=bogus.token.value");

    expect(response.status).toBe(401);
  });

  it("rejects a valid token whose account no longer exists", async () => {
    const cookie = await sessionCookie();
    prismaMock.user.findUnique.mockResolvedValue(null);

    const response = await request(app).get("/api/vehicles").set("Cookie", cookie);

    expect(response.status).toBe(401);
    expect(prismaMock.vehicle.findMany).not.toHaveBeenCalled();
  });

  it("lets a valid cookie through", async () => {
    prismaMock.vehicle.findMany.mockResolvedValue([vehicleFixture()]);
    const response = await request(app)
      .get("/api/vehicles")
      .set("Cookie", await sessionCookie());

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
  });

  it("answers /auth/me with the current user", async () => {
    const response = await request(app)
      .get("/api/auth/me")
      .set("Cookie", await sessionCookie());
    expect(response.body).toEqual({ username: "tester" });
  });
});

describe("vehicles", () => {
  it("only lists the vehicles of the signed-in user", async () => {
    prismaMock.vehicle.findMany.mockResolvedValue([]);

    await request(app)
      .get("/api/vehicles")
      .set("Cookie", await sessionCookie());

    expect(prismaMock.vehicle.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: TEST_USER_ID } }),
    );
  });

  it("returns 404 for an unknown vehicle", async () => {
    prismaMock.vehicle.findFirst.mockResolvedValue(null);
    const response = await request(app)
      .get("/api/vehicles/unknown")
      .set("Cookie", await sessionCookie());

    expect(response.status).toBe(404);
    expect(response.body.message).toBe("Véhicule introuvable");
  });

  it("validates the body on create", async () => {
    const response = await request(app)
      .post("/api/vehicles")
      .set("Cookie", await sessionCookie())
      .send({ make: "Peugeot" });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Données invalides");
    expect(prismaMock.vehicle.create).not.toHaveBeenCalled();
  });

  it("creates a vehicle owned by the signed-in user", async () => {
    const vehicle = vehicleFixture();
    prismaMock.vehicle.create.mockResolvedValue(vehicle);
    const { id, userId, createdAt, updatedAt, ...data } = vehicle;

    const response = await request(app)
      .post("/api/vehicles")
      .set("Cookie", await sessionCookie())
      .send(data);

    expect(response.status).toBe(201);
    expect(prismaMock.vehicle.create).toHaveBeenCalledWith({
      data: { ...data, userId: TEST_USER_ID },
    });
  });

  it("refuses to update a vehicle owned by someone else", async () => {
    prismaMock.vehicle.findFirst.mockResolvedValue(null);

    const response = await request(app)
      .put("/api/vehicles/veh_other")
      .set("Cookie", await sessionCookie())
      .send({ currentMileage: 1 });

    expect(response.status).toBe(404);
    expect(prismaMock.vehicle.update).not.toHaveBeenCalled();
    expect(prismaMock.vehicle.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "veh_other", userId: TEST_USER_ID } }),
    );
  });

  it("refuses to delete a vehicle owned by someone else", async () => {
    prismaMock.vehicle.findFirst.mockResolvedValue(null);

    const response = await request(app)
      .delete("/api/vehicles/veh_other")
      .set("Cookie", await sessionCookie());

    expect(response.status).toBe(404);
    expect(prismaMock.vehicle.delete).not.toHaveBeenCalled();
  });
});

describe("maintenance records", () => {
  it("converts the date and takes the vehicleId from the URL", async () => {
    prismaMock.vehicle.findFirst.mockResolvedValue({ id: "veh_1" });
    prismaMock.maintenanceRecord.create.mockResolvedValue(maintenanceRecordFixture());

    const response = await request(app)
      .post("/api/vehicles/veh_1/maintenance")
      .set("Cookie", await sessionCookie())
      .send({ date: "2026-03-15", mileage: 100000, type: "Vidange", details: "Huile" });

    expect(response.status).toBe(201);
    expect(prismaMock.maintenanceRecord.create).toHaveBeenCalledWith({
      data: {
        date: new Date("2026-03-15"),
        mileage: 100000,
        type: "Vidange",
        details: "Huile",
        vehicleId: "veh_1",
      },
    });
  });

  it("refuses to attach a record to a vehicle owned by someone else", async () => {
    prismaMock.vehicle.findFirst.mockResolvedValue(null);

    const response = await request(app)
      .post("/api/vehicles/veh_other/maintenance")
      .set("Cookie", await sessionCookie())
      .send({ date: "2026-03-15", mileage: 100000, type: "Vidange", details: "Huile" });

    expect(response.status).toBe(404);
    expect(prismaMock.maintenanceRecord.create).not.toHaveBeenCalled();
  });

  it("omits the date field when the update does not carry one", async () => {
    prismaMock.maintenanceRecord.findFirst.mockResolvedValue({ id: "rec_1" });
    prismaMock.maintenanceRecord.update.mockResolvedValue(maintenanceRecordFixture());

    await request(app)
      .put("/api/vehicles/veh_1/maintenance/rec_1")
      .set("Cookie", await sessionCookie())
      .send({ mileage: 101000 });

    expect(prismaMock.maintenanceRecord.update).toHaveBeenCalledWith({
      where: { id: "rec_1" },
      data: { mileage: 101000 },
    });
  });

  it("checks the record against both its vehicle and its owner", async () => {
    prismaMock.maintenanceRecord.findFirst.mockResolvedValue(null);

    const response = await request(app)
      .delete("/api/vehicles/veh_other/maintenance/rec_1")
      .set("Cookie", await sessionCookie());

    expect(response.status).toBe(404);
    expect(prismaMock.maintenanceRecord.delete).not.toHaveBeenCalled();
    expect(prismaMock.maintenanceRecord.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "rec_1", vehicleId: "veh_other", vehicle: { userId: TEST_USER_ID } },
      }),
    );
  });
});

describe("GET /api/vehicles/:id/report.pdf", () => {
  it("streams a PDF as an attachment, uncached", async () => {
    prismaMock.vehicle.findFirst.mockResolvedValue({
      ...vehicleFixture(),
      maintenanceRecords: [maintenanceRecordFixture()],
    });

    const response = await request(app)
      .get("/api/vehicles/veh_1/report.pdf")
      .set("Cookie", await sessionCookie());

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toContain("application/pdf");
    expect(response.headers["cache-control"]).toBe("no-store");
    expect(response.headers["content-disposition"]).toBe(
      'attachment; filename="historique-entretien-ab-123-cd.pdf"',
    );
    expect(response.body.subarray(0, 4).toString()).toBe("%PDF");
  });

  it("returns 404 for a vehicle owned by someone else", async () => {
    prismaMock.vehicle.findFirst.mockResolvedValue(null);

    const response = await request(app)
      .get("/api/vehicles/veh_other/report.pdf")
      .set("Cookie", await sessionCookie());

    expect(response.status).toBe(404);
    expect(prismaMock.vehicle.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "veh_other", userId: TEST_USER_ID } }),
    );
  });
});

describe("errorHandler", () => {
  it("maps Prisma P2025 to 404", async () => {
    prismaMock.vehicle.findFirst.mockResolvedValue({ id: "veh_1" });
    prismaMock.vehicle.update.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Record not found", {
        code: "P2025",
        clientVersion: "5.22.0",
      }),
    );

    const response = await request(app)
      .put("/api/vehicles/veh_1")
      .set("Cookie", await sessionCookie())
      .send({ currentMileage: 1 });

    expect(response.status).toBe(404);
    expect(response.body.message).toBe("Ressource introuvable");
  });

  it("returns a detail-free 500 on an unexpected error", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    prismaMock.vehicle.findMany.mockRejectedValue(new Error("db connection lost"));

    const response = await request(app)
      .get("/api/vehicles")
      .set("Cookie", await sessionCookie());

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ message: "Erreur interne du serveur" });
    expect(response.text).not.toContain("db connection lost");
  });
});
