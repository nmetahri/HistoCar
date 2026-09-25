import { Prisma } from "@prisma/client";
import {
  jpegFixture,
  maintenanceRecordFixture,
  pdfFixture,
  TEST_PASSWORD,
  TEST_USER_ID,
  userFixture,
  vehicleFixture,
} from "@tests/fixtures";
import { StatusCodes } from "http-status-codes";
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
  attachment: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    createManyAndReturn: vi.fn(),
    delete: vi.fn(),
  },
}));

const storageMock = vi.hoisted(() => ({
  createStorageKey: vi.fn((userId: string, extension: string) => `${userId}/key.${extension}`),
  saveAttachmentFile: vi.fn(),
  readAttachmentFile: vi.fn(),
  removeAttachmentFiles: vi.fn(),
}));

vi.mock("@/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/attachments/attachments.storage", () => storageMock);

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

    expect(response.status).toBe(StatusCodes.OK);
    expect(response.body).toEqual({ status: "ok" });
  });
});

describe("POST /api/auth/login", () => {
  it("sets an httpOnly cookie for valid credentials", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({ username: "tester", password: TEST_PASSWORD });

    expect(response.status).toBe(StatusCodes.OK);
    expect(response.body).toEqual({ username: "tester" });
    const cookie = (response.headers["set-cookie"] as unknown as string[])[0] as string;
    expect(cookie).toContain("histocar_token=");
    expect(cookie).toContain("HttpOnly");
  });

  it("rejects a wrong password", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({ username: "tester", password: "wrong" });

    expect(response.status).toBe(StatusCodes.UNAUTHORIZED);
    expect(response.headers["set-cookie"]).toBeUndefined();
  });

  it("rejects an unknown username", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({ username: "intruder", password: TEST_PASSWORD });

    expect(response.status).toBe(StatusCodes.UNAUTHORIZED);
  });

  it("normalises the username case", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({ username: "  TESTER ", password: TEST_PASSWORD });

    expect(response.status).toBe(StatusCodes.OK);
    expect(prismaMock.user.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { username: "tester" } }),
    );
  });

  it("rejects an incomplete body", async () => {
    const response = await request(app).post("/api/auth/login").send({ username: "tester" });
    expect(response.status).toBe(StatusCodes.BAD_REQUEST);
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

    expect(response.status).toBe(StatusCodes.CREATED);
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

    expect(response.status).toBe(StatusCodes.FORBIDDEN);
    expect(prismaMock.user.create).not.toHaveBeenCalled();
  });

  it("rejects a short password", async () => {
    const response = await request(app)
      .post("/api/auth/register")
      .send({ ...validBody, password: "court" });

    expect(response.status).toBe(StatusCodes.BAD_REQUEST);
    expect(prismaMock.user.create).not.toHaveBeenCalled();
  });

  it("rejects a username with forbidden characters", async () => {
    const response = await request(app)
      .post("/api/auth/register")
      .send({ ...validBody, username: "!legacy-owner!" });

    expect(response.status).toBe(StatusCodes.BAD_REQUEST);
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

    expect(response.status).toBe(StatusCodes.CONFLICT);
    expect(response.body.message).toBe("Ce nom d'utilisateur est déjà pris");
  });
});

describe("requireAuth", () => {
  it("blocks protected routes without a cookie", async () => {
    for (const path of [
      "/api/vehicles",
      "/api/vehicles/veh_1",
      "/api/vehicles/veh_1/report.pdf?currentMileage=1",
    ]) {
      const response = await request(app).get(path);
      expect(response.status, path).toBe(StatusCodes.UNAUTHORIZED);
    }
    expect(prismaMock.vehicle.findMany).not.toHaveBeenCalled();
    expect(prismaMock.vehicle.findFirst).not.toHaveBeenCalled();
  });

  it("rejects a token signed with another secret", async () => {
    const response = await request(app)
      .get("/api/vehicles")
      .set("Cookie", "histocar_token=bogus.token.value");

    expect(response.status).toBe(StatusCodes.UNAUTHORIZED);
  });

  it("rejects a valid token whose account no longer exists", async () => {
    const cookie = await sessionCookie();
    prismaMock.user.findUnique.mockResolvedValue(null);

    const response = await request(app).get("/api/vehicles").set("Cookie", cookie);

    expect(response.status).toBe(StatusCodes.UNAUTHORIZED);
    expect(prismaMock.vehicle.findMany).not.toHaveBeenCalled();
  });

  it("lets a valid cookie through", async () => {
    prismaMock.vehicle.findMany.mockResolvedValue([vehicleFixture()]);
    const response = await request(app)
      .get("/api/vehicles")
      .set("Cookie", await sessionCookie());

    expect(response.status).toBe(StatusCodes.OK);
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
      expect.objectContaining({ where: { userId: TEST_USER_ID, active: true } }),
    );
  });

  it("returns 404 for an unknown vehicle", async () => {
    prismaMock.vehicle.findFirst.mockResolvedValue(null);
    const response = await request(app)
      .get("/api/vehicles/unknown")
      .set("Cookie", await sessionCookie());

    expect(response.status).toBe(StatusCodes.NOT_FOUND);
    expect(response.body.message).toBe("Véhicule introuvable");
  });

  it("validates the body on create", async () => {
    const response = await request(app)
      .post("/api/vehicles")
      .set("Cookie", await sessionCookie())
      .send({ make: "Peugeot" });

    expect(response.status).toBe(StatusCodes.BAD_REQUEST);
    expect(response.body.message).toBe("Données invalides");
    expect(prismaMock.vehicle.create).not.toHaveBeenCalled();
  });

  it("creates a vehicle owned by the signed-in user", async () => {
    const vehicle = vehicleFixture();
    prismaMock.vehicle.create.mockResolvedValue(vehicle);
    const { id, userId, active, createdAt, updatedAt, initialMileageDate, ...data } = vehicle;

    const response = await request(app)
      .post("/api/vehicles")
      .set("Cookie", await sessionCookie())
      .send({ ...data, initialMileageDate: "2021-06-01" });

    expect(response.status).toBe(StatusCodes.CREATED);
    expect(prismaMock.vehicle.create).toHaveBeenCalledWith({
      data: { ...data, initialMileageDate, userId: TEST_USER_ID },
    });
  });

  it("refuses to update a vehicle owned by someone else", async () => {
    prismaMock.vehicle.findFirst.mockResolvedValue(null);

    const response = await request(app)
      .put("/api/vehicles/veh_other")
      .set("Cookie", await sessionCookie())
      .send({ initialMileage: 1 });

    expect(response.status).toBe(StatusCodes.NOT_FOUND);
    expect(prismaMock.vehicle.update).not.toHaveBeenCalled();
    expect(prismaMock.vehicle.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "veh_other", userId: TEST_USER_ID, active: true } }),
    );
  });

  it("refuses to delete a vehicle owned by someone else", async () => {
    prismaMock.vehicle.findFirst.mockResolvedValue(null);

    const response = await request(app)
      .delete("/api/vehicles/veh_other")
      .set("Cookie", await sessionCookie());

    expect(response.status).toBe(StatusCodes.NOT_FOUND);
    expect(prismaMock.vehicle.delete).not.toHaveBeenCalled();
  });

  it("archives a vehicle on delete instead of removing it", async () => {
    prismaMock.vehicle.findFirst.mockResolvedValue({ id: "veh_1" });
    prismaMock.vehicle.update.mockResolvedValue(vehicleFixture({ active: false }));

    const response = await request(app)
      .delete("/api/vehicles/veh_1")
      .set("Cookie", await sessionCookie());

    expect(response.status).toBe(StatusCodes.NO_CONTENT);
    expect(prismaMock.vehicle.delete).not.toHaveBeenCalled();
    expect(prismaMock.vehicle.update).toHaveBeenCalledWith({
      where: { id: "veh_1" },
      data: { active: false },
    });
  });

  it("ignores an active flag sent through update", async () => {
    prismaMock.vehicle.findFirst.mockResolvedValue({ id: "veh_1" });
    prismaMock.vehicle.update.mockResolvedValue(vehicleFixture());

    await request(app)
      .put("/api/vehicles/veh_1")
      .set("Cookie", await sessionCookie())
      .send({ initialMileage: 130000, active: false });

    expect(prismaMock.vehicle.update).toHaveBeenCalledWith({
      where: { id: "veh_1" },
      data: { initialMileage: 130000 },
    });
  });

  it("only lists the archived vehicles of the signed-in user", async () => {
    prismaMock.vehicle.findMany.mockResolvedValue([vehicleFixture({ active: false })]);

    const response = await request(app)
      .get("/api/vehicles/archived")
      .set("Cookie", await sessionCookie());

    expect(response.status).toBe(StatusCodes.OK);
    expect(response.body).toHaveLength(1);
    expect(prismaMock.vehicle.findFirst).not.toHaveBeenCalled();
    expect(prismaMock.vehicle.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: TEST_USER_ID, active: false } }),
    );
  });

  it("restores an archived vehicle", async () => {
    prismaMock.vehicle.findFirst.mockResolvedValue({ id: "veh_1" });
    prismaMock.vehicle.update.mockResolvedValue(vehicleFixture());

    const response = await request(app)
      .post("/api/vehicles/veh_1/restore")
      .set("Cookie", await sessionCookie());

    expect(response.status).toBe(StatusCodes.OK);
    expect(response.body.active).toBe(true);
    expect(prismaMock.vehicle.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "veh_1", userId: TEST_USER_ID, active: false } }),
    );
    expect(prismaMock.vehicle.update).toHaveBeenCalledWith({
      where: { id: "veh_1" },
      data: { active: true },
    });
  });

  it("refuses to restore a vehicle that is not archived or not owned", async () => {
    prismaMock.vehicle.findFirst.mockResolvedValue(null);

    const response = await request(app)
      .post("/api/vehicles/veh_other/restore")
      .set("Cookie", await sessionCookie());

    expect(response.status).toBe(StatusCodes.NOT_FOUND);
    expect(prismaMock.vehicle.update).not.toHaveBeenCalled();
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

    expect(response.status).toBe(StatusCodes.CREATED);
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

    expect(response.status).toBe(StatusCodes.NOT_FOUND);
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

    expect(response.status).toBe(StatusCodes.NOT_FOUND);
    expect(prismaMock.maintenanceRecord.delete).not.toHaveBeenCalled();
    expect(prismaMock.maintenanceRecord.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: "rec_1",
          vehicleId: "veh_other",
          vehicle: { userId: TEST_USER_ID, active: true },
        },
      }),
    );
  });
});

describe("maintenance record deletion", () => {
  it("removes the attachment files once the record is gone", async () => {
    prismaMock.maintenanceRecord.findFirst.mockResolvedValue({ id: "rec_1" });
    prismaMock.attachment.findMany.mockResolvedValue([{ storageKey: "usr_1/a.pdf" }]);
    prismaMock.maintenanceRecord.delete.mockResolvedValue(maintenanceRecordFixture());

    const response = await request(app)
      .delete("/api/vehicles/veh_1/maintenance/rec_1")
      .set("Cookie", await sessionCookie());

    expect(response.status).toBe(StatusCodes.NO_CONTENT);
    expect(storageMock.removeAttachmentFiles).toHaveBeenCalledWith(["usr_1/a.pdf"]);
    expect(prismaMock.maintenanceRecord.delete.mock.invocationCallOrder[0]).toBeLessThan(
      storageMock.removeAttachmentFiles.mock.invocationCallOrder[0] as number,
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
      .get("/api/vehicles/veh_1/report.pdf?currentMileage=130000")
      .set("Cookie", await sessionCookie());

    expect(response.status).toBe(StatusCodes.OK);
    expect(response.headers["content-type"]).toContain("application/pdf");
    expect(response.headers["cache-control"]).toBe("no-store");
    expect(response.headers["content-disposition"]).toBe(
      'attachment; filename="historique-entretien-ab-123-cd.pdf"',
    );
    expect(response.body.subarray(0, 4).toString()).toBe("%PDF");
  });

  it("requires the current mileage", async () => {
    for (const query of ["", "?currentMileage=-5", "?currentMileage=abc"]) {
      const response = await request(app)
        .get(`/api/vehicles/veh_1/report.pdf${query}`)
        .set("Cookie", await sessionCookie());

      expect(response.status).toBe(StatusCodes.BAD_REQUEST);
    }
    expect(prismaMock.vehicle.findFirst).not.toHaveBeenCalled();
  });

  it("returns 404 for a vehicle owned by someone else", async () => {
    prismaMock.vehicle.findFirst.mockResolvedValue(null);

    const response = await request(app)
      .get("/api/vehicles/veh_other/report.pdf?currentMileage=130000")
      .set("Cookie", await sessionCookie());

    expect(response.status).toBe(StatusCodes.NOT_FOUND);
    expect(prismaMock.vehicle.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "veh_other", userId: TEST_USER_ID, active: true } }),
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
      .send({ initialMileage: 1 });

    expect(response.status).toBe(StatusCodes.NOT_FOUND);
    expect(response.body.message).toBe("Ressource introuvable");
  });

  it("returns a detail-free 500 on an unexpected error", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    prismaMock.vehicle.findMany.mockRejectedValue(new Error("db connection lost"));

    const response = await request(app)
      .get("/api/vehicles")
      .set("Cookie", await sessionCookie());

    expect(response.status).toBe(StatusCodes.INTERNAL_SERVER_ERROR);
    expect(response.body).toEqual({ message: "Erreur interne du serveur" });
    expect(response.text).not.toContain("db connection lost");
  });
});

describe("attachments", () => {
  const UPLOAD_PATH = "/api/vehicles/veh_1/maintenance/rec_1/attachments";
  const storedAttachment = {
    id: "att_1",
    maintenanceRecordId: "rec_1",
    originalName: "facture.pdf",
    mimeType: "application/pdf",
    sizeBytes: 1024,
    storageKey: "usr_1/a.pdf",
    createdAt: new Date("2026-03-15T00:00:00Z"),
  };

  beforeEach(() => {
    prismaMock.maintenanceRecord.findFirst.mockResolvedValue({ id: "rec_1" });
    prismaMock.attachment.createManyAndReturn.mockImplementation(({ data }: { data: object[] }) =>
      Promise.resolve(data),
    );
  });

  it("stores a compressed copy of each uploaded file", async () => {
    const response = await request(app)
      .post(UPLOAD_PATH)
      .set("Cookie", await sessionCookie())
      .attach("files", await jpegFixture(3000, 1500), "photo garage.png")
      .attach("files", await pdfFixture(), "facture.pdf");

    expect(response.status).toBe(StatusCodes.CREATED);
    expect(storageMock.saveAttachmentFile).toHaveBeenCalledTimes(2);
    expect(prismaMock.attachment.createManyAndReturn).toHaveBeenCalledWith(
      expect.objectContaining({
        data: [
          expect.objectContaining({
            originalName: "photo garage.jpg",
            mimeType: "image/jpeg",
            storageKey: "usr_1/key.jpg",
            maintenanceRecordId: "rec_1",
          }),
          expect.objectContaining({ originalName: "facture.pdf", mimeType: "application/pdf" }),
        ],
      }),
    );
  });

  it("rejects a file that is neither a PDF nor an image, whatever its name", async () => {
    const response = await request(app)
      .post(UPLOAD_PATH)
      .set("Cookie", await sessionCookie())
      .attach("files", Buffer.from("<html></html>"), "facture.pdf");

    expect(response.status).toBe(StatusCodes.UNSUPPORTED_MEDIA_TYPE);
    expect(storageMock.saveAttachmentFile).not.toHaveBeenCalled();
  });

  it("rejects a file over the size limit", async () => {
    const response = await request(app)
      .post(UPLOAD_PATH)
      .set("Cookie", await sessionCookie())
      .attach("files", Buffer.alloc(10 * 1024 * 1024 + 1), "enorme.pdf");

    expect(response.status).toBe(StatusCodes.REQUEST_TOO_LONG);
    expect(response.body.message).toBe("Fichier trop volumineux");
  });

  it("rejects an upload without files", async () => {
    const response = await request(app)
      .post(UPLOAD_PATH)
      .set("Cookie", await sessionCookie())
      .field("note", "rien");

    expect(response.status).toBe(StatusCodes.BAD_REQUEST);
    expect(response.body.message).toBe("Aucun fichier reçu");
  });

  it("refuses an upload to a record owned by someone else before reading it", async () => {
    prismaMock.maintenanceRecord.findFirst.mockResolvedValue(null);

    const response = await request(app)
      .post("/api/vehicles/veh_other/maintenance/rec_1/attachments")
      .set("Cookie", await sessionCookie())
      .attach("files", await pdfFixture(), "facture.pdf");

    expect(response.status).toBe(StatusCodes.NOT_FOUND);
    expect(storageMock.saveAttachmentFile).not.toHaveBeenCalled();
  });

  it("removes the written files when the database insert fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    prismaMock.attachment.createManyAndReturn.mockRejectedValue(new Error("db down"));

    const response = await request(app)
      .post(UPLOAD_PATH)
      .set("Cookie", await sessionCookie())
      .attach("files", await pdfFixture(), "facture.pdf");

    expect(response.status).toBe(StatusCodes.INTERNAL_SERVER_ERROR);
    expect(storageMock.removeAttachmentFiles).toHaveBeenCalledWith(["usr_1/key.pdf"]);
  });

  it("serves an attachment inline, uncached, scoped to its owner", async () => {
    prismaMock.attachment.findFirst.mockResolvedValue(storedAttachment);
    storageMock.readAttachmentFile.mockResolvedValue(await pdfFixture());

    const response = await request(app)
      .get(`${UPLOAD_PATH}/att_1`)
      .set("Cookie", await sessionCookie());

    expect(response.status).toBe(StatusCodes.OK);
    expect(response.headers["content-type"]).toContain("application/pdf");
    expect(response.headers["content-disposition"]).toBe("inline; filename*=UTF-8''facture.pdf");
    expect(response.headers["cache-control"]).toBe("private, no-store");
    expect(prismaMock.attachment.findFirst).toHaveBeenCalledWith({
      where: {
        id: "att_1",
        maintenanceRecordId: "rec_1",
        maintenanceRecord: { vehicleId: "veh_1", vehicle: { userId: TEST_USER_ID, active: true } },
      },
    });
  });

  it("returns 404 for an attachment owned by someone else", async () => {
    prismaMock.attachment.findFirst.mockResolvedValue(null);

    const response = await request(app)
      .delete(`${UPLOAD_PATH}/att_other`)
      .set("Cookie", await sessionCookie());

    expect(response.status).toBe(StatusCodes.NOT_FOUND);
    expect(prismaMock.attachment.delete).not.toHaveBeenCalled();
    expect(storageMock.removeAttachmentFiles).not.toHaveBeenCalled();
  });

  it("deletes the row, then the file", async () => {
    prismaMock.attachment.findFirst.mockResolvedValue(storedAttachment);

    const response = await request(app)
      .delete(`${UPLOAD_PATH}/att_1`)
      .set("Cookie", await sessionCookie());

    expect(response.status).toBe(StatusCodes.NO_CONTENT);
    expect(prismaMock.attachment.delete).toHaveBeenCalledWith({ where: { id: "att_1" } });
    expect(storageMock.removeAttachmentFiles).toHaveBeenCalledWith(["usr_1/a.pdf"]);
  });
});

describe("GET /api/vehicles/:id/attachments.pdf", () => {
  it("merges every attachment of the vehicle into one PDF", async () => {
    prismaMock.vehicle.findFirst.mockResolvedValue({
      ...vehicleFixture(),
      maintenanceRecords: [
        { attachments: [{ originalName: "a.pdf", mimeType: "application/pdf", storageKey: "k1" }] },
        { attachments: [{ originalName: "b.jpg", mimeType: "image/jpeg", storageKey: "k2" }] },
      ],
    });
    storageMock.readAttachmentFile.mockImplementation((storageKey: string) =>
      storageKey === "k1" ? pdfFixture(2) : jpegFixture(),
    );

    const response = await request(app)
      .get("/api/vehicles/veh_1/attachments.pdf")
      .set("Cookie", await sessionCookie());

    expect(response.status).toBe(StatusCodes.OK);
    expect(response.headers["content-disposition"]).toBe(
      'attachment; filename="justificatifs-ab-123-cd.pdf"',
    );
    expect(response.body.subarray(0, 4).toString()).toBe("%PDF");
  });

  it("returns 404 when the vehicle has no attachment", async () => {
    prismaMock.vehicle.findFirst.mockResolvedValue({
      ...vehicleFixture(),
      maintenanceRecords: [{ attachments: [] }],
    });

    const response = await request(app)
      .get("/api/vehicles/veh_1/attachments.pdf")
      .set("Cookie", await sessionCookie());

    expect(response.status).toBe(StatusCodes.NOT_FOUND);
    expect(response.body.message).toBe("Aucun justificatif pour ce véhicule");
  });

  it("returns 404 for a vehicle owned by someone else", async () => {
    prismaMock.vehicle.findFirst.mockResolvedValue(null);

    const response = await request(app)
      .get("/api/vehicles/veh_other/attachments.pdf")
      .set("Cookie", await sessionCookie());

    expect(response.status).toBe(StatusCodes.NOT_FOUND);
    expect(prismaMock.vehicle.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "veh_other", userId: TEST_USER_ID, active: true } }),
    );
  });
});

describe("archiving a vehicle with attachments", () => {
  interface ActiveFilter {
    where: { active?: boolean; maintenanceRecord?: { vehicle: { active: boolean } } };
  }

  // Simule la colonne `active` en base : les mocks ne répondent que si le
  // filtre de la requête correspond à l'état courant du véhicule.
  function simulateVehicleState(): void {
    let isActive = true;
    const attachment = {
      id: "att_1",
      maintenanceRecordId: "rec_1",
      originalName: "facture.pdf",
      mimeType: "application/pdf",
      sizeBytes: 1024,
      storageKey: "usr_1/a.pdf",
      createdAt: new Date("2026-03-15T00:00:00Z"),
    };

    prismaMock.vehicle.findFirst.mockImplementation(({ where }: ActiveFilter) =>
      Promise.resolve(where.active === isActive ? { id: "veh_1" } : null),
    );
    prismaMock.vehicle.update.mockImplementation(({ data }: { data: { active: boolean } }) => {
      isActive = data.active;
      return Promise.resolve(vehicleFixture({ active: isActive }));
    });
    prismaMock.attachment.findFirst.mockImplementation(({ where }: ActiveFilter) =>
      Promise.resolve(where.maintenanceRecord?.vehicle.active === isActive ? attachment : null),
    );
  }

  it("hides the attachments while archived and serves them again once restored", async () => {
    simulateVehicleState();
    storageMock.readAttachmentFile.mockResolvedValue(await pdfFixture());
    const cookie = await sessionCookie();
    const attachmentPath = "/api/vehicles/veh_1/maintenance/rec_1/attachments/att_1";

    const archived = await request(app).delete("/api/vehicles/veh_1").set("Cookie", cookie);
    const whileArchived = await request(app).get(attachmentPath).set("Cookie", cookie);
    const restored = await request(app).post("/api/vehicles/veh_1/restore").set("Cookie", cookie);
    const afterRestore = await request(app).get(attachmentPath).set("Cookie", cookie);

    expect(archived.status).toBe(StatusCodes.NO_CONTENT);
    expect(whileArchived.status).toBe(StatusCodes.NOT_FOUND);
    expect(restored.status).toBe(StatusCodes.OK);
    expect(afterRestore.status).toBe(StatusCodes.OK);
    expect(afterRestore.body.subarray(0, 4).toString()).toBe("%PDF");
  });

  it("never deletes an attachment row or file when archiving", async () => {
    simulateVehicleState();

    await request(app)
      .delete("/api/vehicles/veh_1")
      .set("Cookie", await sessionCookie());

    expect(prismaMock.vehicle.delete).not.toHaveBeenCalled();
    expect(prismaMock.maintenanceRecord.delete).not.toHaveBeenCalled();
    expect(prismaMock.attachment.delete).not.toHaveBeenCalled();
    expect(storageMock.removeAttachmentFiles).not.toHaveBeenCalled();
  });
});
