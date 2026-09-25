import type { Prisma } from "@prisma/client";

// La storageKey reste côté serveur : elle révèle l'arborescence du disque.
export const publicAttachmentSelect = {
  id: true,
  originalName: true,
  mimeType: true,
  sizeBytes: true,
  createdAt: true,
} satisfies Prisma.AttachmentSelect;

export type PublicAttachment = Prisma.AttachmentGetPayload<{
  select: typeof publicAttachmentSelect;
}>;
