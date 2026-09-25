import { PDFDocument } from "pdf-lib";
import sharp from "sharp";
import type { AttachmentFileType } from "@/attachments/attachments.file-type";

// Suffisant pour lire une facture imprimée une fois ramenée au format A4.
const MAX_IMAGE_DIMENSION = 2000;
const JPEG_QUALITY = 80;
const PAPER_WHITE = "#ffffff";

export const COMPRESSED_IMAGE_TYPE: AttachmentFileType = {
  mimeType: "image/jpeg",
  extension: "jpg",
};

export interface CompressedAttachment {
  bytes: Buffer;
  fileType: AttachmentFileType;
}

// rotate() sans argument applique l'orientation EXIF puis retire les
// métadonnées : les photos de téléphone arrivent droites et sans position GPS.
// flatten() évite qu'un PNG transparent ne devienne noir en JPEG.
function compressImage(bytes: Buffer): Promise<Buffer> {
  return sharp(bytes)
    .rotate()
    .resize({
      width: MAX_IMAGE_DIMENSION,
      height: MAX_IMAGE_DIMENSION,
      fit: "inside",
      withoutEnlargement: true,
    })
    .flatten({ background: PAPER_WHITE })
    .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
    .toBuffer();
}

// pdf-lib ne recompresse pas les images d'un PDF : le gain vient du
// regroupement des objets en flux compressés. Un PDF chiffré ou que pdf-lib
// ne sait pas relire est conservé tel quel plutôt que refusé.
async function compressPdf(bytes: Buffer): Promise<Buffer> {
  try {
    const document = await PDFDocument.load(bytes);
    const rewritten = Buffer.from(await document.save({ useObjectStreams: true }));
    return rewritten.byteLength < bytes.byteLength ? rewritten : bytes;
  } catch (error) {
    console.warn("PDF kept uncompressed:", error);
    return bytes;
  }
}

export async function compressAttachment(
  bytes: Buffer,
  fileType: AttachmentFileType,
): Promise<CompressedAttachment> {
  if (fileType.mimeType === "application/pdf") {
    return { bytes: await compressPdf(bytes), fileType };
  }
  return { bytes: await compressImage(bytes), fileType: COMPRESSED_IMAGE_TYPE };
}
