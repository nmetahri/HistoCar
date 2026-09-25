import { jpegFixture, pdfFixture, pngFixture } from "@tests/fixtures";
import { PDFDocument } from "pdf-lib";
import sharp from "sharp";
import { describe, expect, it, vi } from "vitest";
import { compressAttachment } from "@/attachments/attachments.compress";
import { detectAttachmentFileType } from "@/attachments/attachments.file-type";
import { mergeAttachmentsToPdf } from "@/attachments/attachments.merge";
import { inlineContentDisposition } from "@/http/file-name";

const JPEG_TYPE = { mimeType: "image/jpeg", extension: "jpg" };
const PNG_TYPE = { mimeType: "image/png", extension: "png" };
const PDF_TYPE = { mimeType: "application/pdf", extension: "pdf" };

async function countPages(pdf: Buffer): Promise<number> {
  return (await PDFDocument.load(pdf)).getPageCount();
}

describe("detectAttachmentFileType", () => {
  it("recognises PDF, JPEG and PNG from their first bytes", async () => {
    expect(detectAttachmentFileType(await pdfFixture())).toEqual(PDF_TYPE);
    expect(detectAttachmentFileType(await jpegFixture())).toEqual(JPEG_TYPE);
    expect(detectAttachmentFileType(await pngFixture())).toEqual(PNG_TYPE);
  });

  it("rejects anything else, whatever its name", () => {
    expect(detectAttachmentFileType(Buffer.from("<svg onload=alert(1)>"))).toBeNull();
    expect(detectAttachmentFileType(Buffer.alloc(0))).toBeNull();
  });
});

describe("compressAttachment", () => {
  it("downsizes a large photo and stores it as JPEG", async () => {
    const photo = await jpegFixture(4000, 3000);

    const { bytes, fileType } = await compressAttachment(photo, JPEG_TYPE);

    const metadata = await sharp(bytes).metadata();
    expect(fileType).toEqual(JPEG_TYPE);
    expect(metadata.format).toBe("jpeg");
    expect(Math.max(metadata.width ?? 0, metadata.height ?? 0)).toBe(2000);
  });

  it("never enlarges a small image", async () => {
    const { bytes } = await compressAttachment(await jpegFixture(40, 20), JPEG_TYPE);

    expect((await sharp(bytes).metadata()).width).toBe(40);
  });

  it("converts a PNG to JPEG on a white background", async () => {
    const { bytes, fileType } = await compressAttachment(await pngFixture(), PNG_TYPE);

    const { data } = await sharp(bytes).raw().toBuffer({ resolveWithObject: true });
    expect(fileType).toEqual(JPEG_TYPE);
    expect(data[0]).toBeGreaterThan(240);
  });

  it("never makes a PDF larger", async () => {
    const pdf = await pdfFixture(3);

    const { bytes, fileType } = await compressAttachment(pdf, PDF_TYPE);

    expect(fileType).toEqual(PDF_TYPE);
    expect(bytes.byteLength).toBeLessThanOrEqual(pdf.byteLength);
    expect(await countPages(bytes)).toBe(3);
  });

  it("keeps a PDF it cannot rewrite", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const broken = Buffer.from("%PDF-1.7 truncated");

    const { bytes } = await compressAttachment(broken, PDF_TYPE);

    expect(bytes).toBe(broken);
  });

  it("fails on an unreadable image", async () => {
    await expect(
      compressAttachment(Buffer.from([0xff, 0xd8, 0xff, 0x00]), JPEG_TYPE),
    ).rejects.toThrow();
  });
});

describe("mergeAttachmentsToPdf", () => {
  it("keeps every PDF page and gives each image its own page", async () => {
    const merged = await mergeAttachmentsToPdf(
      [
        { originalName: "facture.pdf", mimeType: "application/pdf", bytes: await pdfFixture(2) },
        { originalName: "ticket.jpg", mimeType: "image/jpeg", bytes: await jpegFixture() },
      ],
      "Justificatifs",
    );

    expect(await countPages(merged)).toBe(3);
  });

  it("replaces an unreadable document with a notice page", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    const merged = await mergeAttachmentsToPdf(
      [
        { originalName: "vide.pdf", mimeType: "application/pdf", bytes: Buffer.alloc(0) },
        { originalName: "ticket.jpg", mimeType: "image/jpeg", bytes: await jpegFixture() },
      ],
      "Justificatifs",
    );

    expect(await countPages(merged)).toBe(2);
  });
});

describe("inlineContentDisposition", () => {
  it("encodes the file name per RFC 5987", () => {
    expect(inlineContentDisposition("facture d'été (1).pdf")).toBe(
      "inline; filename*=UTF-8''facture%20d%27%C3%A9t%C3%A9%20%281%29.pdf",
    );
  });
});
