import { PageSizes, PDFDocument, StandardFonts } from "pdf-lib";
import { sanitizeWinAnsi } from "@/report/report.data";

export interface MergeableAttachment {
  originalName: string;
  mimeType: string;
  bytes: Buffer;
}

// 1 cm, comme la marge du document d'entretien.
const IMAGE_MARGIN = 28.35;
const NOTICE_FONT_SIZE = 12;

function pageSizeFor(width: number, height: number): [number, number] {
  const [shortSide, longSide] = PageSizes.A4;
  return width > height ? [longSide, shortSide] : [shortSide, longSide];
}

// Les images sont toujours stockées en JPEG, recompressées à l'envoi.
async function appendImage(merged: PDFDocument, attachment: MergeableAttachment): Promise<void> {
  const image = await merged.embedJpg(attachment.bytes);
  const [pageWidth, pageHeight] = pageSizeFor(image.width, image.height);
  const page = merged.addPage([pageWidth, pageHeight]);
  const { width, height } = image.scaleToFit(
    pageWidth - IMAGE_MARGIN * 2,
    pageHeight - IMAGE_MARGIN * 2,
  );

  page.drawImage(image, {
    x: (pageWidth - width) / 2,
    y: (pageHeight - height) / 2,
    width,
    height,
  });
}

async function appendPdf(merged: PDFDocument, attachment: MergeableAttachment): Promise<void> {
  const source = await PDFDocument.load(attachment.bytes, { ignoreEncryption: true });
  const pages = await merged.copyPages(source, source.getPageIndices());
  for (const page of pages) {
    merged.addPage(page);
  }
}

// Un justificatif illisible (PDF corrompu, image tronquée) ne doit pas priver
// l'utilisateur de tous les autres : il est remplacé par une page qui le signale.
async function appendUnreadableNotice(
  merged: PDFDocument,
  attachment: MergeableAttachment,
): Promise<void> {
  const font = await merged.embedFont(StandardFonts.Helvetica);
  const page = merged.addPage(PageSizes.A4);

  page.drawText(`Document illisible : ${sanitizeWinAnsi(attachment.originalName)}`, {
    x: IMAGE_MARGIN,
    y: page.getHeight() - IMAGE_MARGIN - NOTICE_FONT_SIZE,
    size: NOTICE_FONT_SIZE,
    font,
    maxWidth: page.getWidth() - IMAGE_MARGIN * 2,
  });
}

async function appendAttachment(
  merged: PDFDocument,
  attachment: MergeableAttachment,
): Promise<void> {
  try {
    if (attachment.mimeType === "application/pdf") {
      await appendPdf(merged, attachment);
    } else {
      await appendImage(merged, attachment);
    }
  } catch (error) {
    console.error(`Failed to merge attachment "${attachment.originalName}":`, error);
    await appendUnreadableNotice(merged, attachment);
  }
}

export async function mergeAttachmentsToPdf(
  attachments: readonly MergeableAttachment[],
  title: string,
): Promise<Buffer> {
  const merged = await PDFDocument.create();
  merged.setTitle(title);

  for (const attachment of attachments) {
    await appendAttachment(merged, attachment);
  }

  return Buffer.from(await merged.save());
}
