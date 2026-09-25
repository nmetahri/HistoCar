import { existsSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

type Storage = typeof import("@/attachments/attachments.storage");

let uploadsDir: string;
let storage: Storage;

// env.ts lit UPLOADS_DIR à l'import : le module est rechargé après avoir
// pointé la variable vers un répertoire jetable.
beforeAll(async () => {
  uploadsDir = await mkdtemp(path.join(tmpdir(), "histocar-uploads-"));
  vi.stubEnv("UPLOADS_DIR", uploadsDir);
  vi.resetModules();
  storage = await import("@/attachments/attachments.storage");
});

afterAll(async () => {
  vi.unstubAllEnvs();
  await rm(uploadsDir, { recursive: true, force: true });
});

describe("attachments storage", () => {
  it("writes, reads back and removes a file under the user's folder", async () => {
    const storageKey = storage.createStorageKey("usr_1", "pdf");
    const bytes = Buffer.from("%PDF-1.7");

    await storage.saveAttachmentFile(storageKey, bytes);

    expect(storageKey).toMatch(/^usr_1\/[0-9a-f-]{36}\.pdf$/);
    expect(await storage.readAttachmentFile(storageKey)).toEqual(bytes);

    await storage.removeAttachmentFiles([storageKey]);
    expect(existsSync(path.join(uploadsDir, storageKey))).toBe(false);
  });

  it("never overwrites an existing file", async () => {
    const storageKey = storage.createStorageKey("usr_1", "jpg");
    await storage.saveAttachmentFile(storageKey, Buffer.from("first"));

    await expect(storage.saveAttachmentFile(storageKey, Buffer.from("second"))).rejects.toThrow();
  });

  it("refuses a key that escapes the uploads directory", async () => {
    await expect(storage.readAttachmentFile("../../etc/passwd")).rejects.toThrow(
      "escapes the uploads directory",
    );
  });

  it("logs rather than throws when a removal fails", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    await storage.removeAttachmentFiles(["../outside.pdf"]);

    expect(consoleError).toHaveBeenCalled();
  });
});
