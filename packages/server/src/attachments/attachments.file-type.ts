export interface AttachmentFileType {
  mimeType: string;
  extension: string;
}

interface FileSignature extends AttachmentFileType {
  magicBytes: readonly number[];
}

// Le type est déduit des premiers octets : le Content-Type annoncé par le
// client ne prouve rien.
const SIGNATURES: readonly FileSignature[] = [
  { mimeType: "application/pdf", extension: "pdf", magicBytes: [0x25, 0x50, 0x44, 0x46, 0x2d] },
  { mimeType: "image/jpeg", extension: "jpg", magicBytes: [0xff, 0xd8, 0xff] },
  {
    mimeType: "image/png",
    extension: "png",
    magicBytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  },
];

export function detectAttachmentFileType(bytes: Buffer): AttachmentFileType | null {
  const signature = SIGNATURES.find(({ magicBytes }) =>
    magicBytes.every((byte, index) => bytes[index] === byte),
  );

  return signature ? { mimeType: signature.mimeType, extension: signature.extension } : null;
}
