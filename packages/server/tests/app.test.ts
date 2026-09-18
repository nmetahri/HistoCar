import { Prisma } from "@prisma/client";
import { maintenanceRecordFixture, TEST_PASSWORD, vehicleFixture } from "@tests/fixtures";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "@/app";

const prismaMock = vi.hoisted(() => ({
  vehicle: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  maintenanceRecord: {
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("@/prisma", () => ({ prisma: prismaMock }));

const app = createApp();

async function sessionCookie(): Promise<string> {
  const response = await request(app)
    .post("/api/auth/login")
    .send({ username: "tester", password: TEST_PASSWORD });
  const cookies = response.headers["set-cookie"] as unknown as string[];
  return cookies[0] as string;
}

beforeEach(() => {
  vi.clearAllMocks();
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

  it("rejects an incomplete body", async () => {
    const response = await request(app).post("/api/auth/login").send({ username: "tester" });
    expect(response.status).toBe(400);
  });
});

describe("requireAuth", () => {
  it("blocks protected routes without a cookie", async () => {
    for (const path of ["/api/vehicles", "/api/vehicles/veh_1", "/api/vehicles/veh_1/report"]) {
      const response = await request(app).get(path);
      expect(response.status, path).toBe(401);
    }
    expect(prismaMock.vehicle.findMany).not.toHaveBeenCalled();
    expect(prismaMock.vehicle.findUnique).not.toHaveBeenCalled();
  });

  it("rejects a token signed with another secret", async () => {
    const response = await request(app)
      .get("/api/vehicles")
      .set("Cookie", "histocar_token=bogus.token.value");

    expect(response.status).toBe(401);
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
  it("returns 404 for an unknown vehicle", async () => {
    prismaMock.vehicle.findUnique.mockResolvedValue(null);
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

  it("creates a vehicle and returns 201", async () => {
    const vehicle = vehicleFixture();
    prismaMock.vehicle.create.mockResolvedValue(vehicle);
    const { id, createdAt, updatedAt, ...data } = vehicle;

    const response = await request(app)
      .post("/api/vehicles")
      .set("Cookie", await sessionCookie())
      .send(data);

    expect(response.status).toBe(201);
    expect(prismaMock.vehicle.create).toHaveBeenCalledWith({ data });
  });
});

describe("maintenance records", () => {
  it("converts the date and takes the vehicleId from the URL", async () => {
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

  it("omits the date field when the update does not carry one", async () => {
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
});

describe("GET /api/vehicles/:id/report", () => {
  it("builds the HTML on demand, uncached", async () => {
    prismaMock.vehicle.findUnique.mockResolvedValue({
      ...vehicleFixture(),
      maintenanceRecords: [maintenanceRecordFixture()],
    });

    const response = await request(app)
      .get("/api/vehicles/veh_1/report")
      .set("Cookie", await sessionCookie());

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toContain("text/html");
    expect(response.headers["cache-control"]).toBe("no-store");
    expect(response.text).toContain("Peugeot");
    expect(response.text).toContain("Huile 5W30 + filtre");
  });

  it("reflects newly added records immediately", async () => {
    const cookie = await sessionCookie();
    prismaMock.vehicle.findUnique.mockResolvedValue({
      ...vehicleFixture(),
      maintenanceRecords: [],
    });
    const before = await request(app).get("/api/vehicles/veh_1/report").set("Cookie", cookie);
    expect(before.text).not.toContain("Courroie");

    prismaMock.vehicle.findUnique.mockResolvedValue({
      ...vehicleFixture(),
      maintenanceRecords: [maintenanceRecordFixture({ type: "Courroie" })],
    });
    const after = await request(app).get("/api/vehicles/veh_1/report").set("Cookie", cookie);
    expect(after.text).toContain("Courroie");
  });
});

describe("errorHandler", () => {
  it("maps Prisma P2025 to 404", async () => {
    prismaMock.vehicle.update.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Record not found", {
        code: "P2025",
        clientVersion: "5.22.0",
      }),
    );

    const response = await request(app)
      .put("/api/vehicles/unknown")
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
