import { randomUUID } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { env } from "@/env";

// Les clés sont toujours générées ici, jamais dérivées du nom d'origine ;
// la vérification de chemin reste une ceinture en cas de clé corrompue en base.
function resolveStoragePath(storageKey: string): string {
  const filePath = path.resolve(env.uploadsDir, storageKey);

  if (!filePath.startsWith(`${env.uploadsDir}${path.sep}`)) {
    throw new Error(`Storage key escapes the uploads directory: ${storageKey}`);
  }
  return filePath;
}

export function createStorageKey(userId: string, extension: string): string {
  return `${userId}/${randomUUID()}.${extension}`;
}

export async function saveAttachmentFile(storageKey: string, bytes: Buffer): Promise<void> {
  const filePath = resolveStoragePath(storageKey);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, bytes, { flag: "wx" });
}

export async function readAttachmentFile(storageKey: string): Promise<Buffer> {
  return readFile(resolveStoragePath(storageKey));
}

// Appelé après la suppression en base : un fichier orphelin est sans
// conséquence, alors qu'une ligne pointant vers un fichier absent donnerait un
// justificatif cassé. Un échec est donc journalisé sans faire échouer la requête.
export async function removeAttachmentFiles(storageKeys: readonly string[]): Promise<void> {
  const results = await Promise.allSettled(
    storageKeys.map(async (storageKey) => rm(resolveStoragePath(storageKey), { force: true })),
  );

  for (const result of results) {
    if (result.status === "rejected") {
      console.error("Failed to remove attachment file:", result.reason);
    }
  }
}
