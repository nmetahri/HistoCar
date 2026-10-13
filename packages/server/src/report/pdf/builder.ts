import PDFDocument from "pdfkit";
import {
  COLORS,
  COLUMN_RATIOS,
  FONT_BOLD,
  FONT_REGULAR,
  FONT_SIZES,
  PAGE_MARGIN,
} from "@/report/pdf/layout";
import { distributeColumnWidths, drawTable } from "@/report/pdf/table";
import { REPORT_COLUMN_HEADERS, type ReportField, type ReportModel } from "@/report/report.data";

const FOOTER_NOTE = "Document fourni à titre informatif pour l'historique d'entretien du véhicule.";
const PANEL_PADDING = 8;
const FIELD_LINE_HEIGHT = 14;
const FIELDS_PER_ROW = 2;
const NOTES_LABEL = "Notes additionnelles";
const NOTES_LABEL_GAP = 2;
const NOTES_BOTTOM_GAP = 12;

function contentWidth(doc: PDFKit.PDFDocument): number {
  return doc.page.width - doc.page.margins.left - doc.page.margins.right;
}

function drawTitle(doc: PDFKit.PDFDocument, model: ReportModel): void {
  doc.font(FONT_BOLD).fontSize(FONT_SIZES.title).fillColor(COLORS.text);
  doc.text("Historique d'entretien du véhicule");

  const ruleY = doc.y + 3;
  doc
    .moveTo(doc.page.margins.left, ruleY)
    .lineTo(doc.page.margins.left + contentWidth(doc), ruleY)
    .lineWidth(1.5)
    .stroke(COLORS.text);

  doc.y = ruleY + 8;
  doc.font(FONT_REGULAR).fontSize(FONT_SIZES.subtitle).fillColor(COLORS.muted);
  doc.text(`Document généré le ${model.generatedOn}`);
}

function drawFields(doc: PDFKit.PDFDocument, fields: readonly ReportField[]): void {
  const rowCount = Math.ceil(fields.length / FIELDS_PER_ROW);
  const panelTop = doc.y + 10;
  const panelHeight = rowCount * FIELD_LINE_HEIGHT + PANEL_PADDING * 2;
  const columnWidth = (contentWidth(doc) - PANEL_PADDING * 2) / FIELDS_PER_ROW;

  doc.roundedRect(doc.page.margins.left, panelTop, contentWidth(doc), panelHeight, 4);
  doc.fill(COLORS.panel);

  doc.fontSize(FONT_SIZES.field);
  fields.forEach((field, index) => {
    const left = doc.page.margins.left + PANEL_PADDING + (index % FIELDS_PER_ROW) * columnWidth;
    const top = panelTop + PANEL_PADDING + Math.floor(index / FIELDS_PER_ROW) * FIELD_LINE_HEIGHT;

    doc.font(FONT_BOLD).fillColor(COLORS.muted);
    doc.text(`${field.label} : `, left, top, { continued: true, width: columnWidth });
    doc.font(FONT_REGULAR).fillColor(COLORS.text);
    doc.text(field.value);
  });

  doc.y = panelTop + panelHeight + 12;
}

function drawNotes(doc: PDFKit.PDFDocument, notes: string | null): void {
  if (notes === null) {
    return;
  }

  const left = doc.page.margins.left;
  doc.font(FONT_BOLD).fontSize(FONT_SIZES.field).fillColor(COLORS.muted);
  doc.text(NOTES_LABEL, left, doc.y, { width: contentWidth(doc) });

  doc.y += NOTES_LABEL_GAP;
  doc.font(FONT_REGULAR).fillColor(COLORS.text);
  doc.text(notes, left, doc.y, { width: contentWidth(doc) });

  doc.y += NOTES_BOTTOM_GAP;
}

function drawTotalCost(doc: PDFKit.PDFDocument, totalCost: string | null): void {
  if (totalCost === null) {
    return;
  }

  doc.y += 6;
  doc.font(FONT_BOLD).fontSize(FONT_SIZES.field).fillColor(COLORS.text);
  doc.text(`Coût total : ${totalCost}`, doc.page.margins.left, doc.y, {
    width: contentWidth(doc),
    align: "right",
  });
}

function drawFooter(doc: PDFKit.PDFDocument): void {
  const top = doc.y + 10;
  doc
    .moveTo(doc.page.margins.left, top)
    .lineTo(doc.page.margins.left + contentWidth(doc), top)
    .lineWidth(0.5)
    .stroke(COLORS.rule);

  doc.y = top + 5;
  doc.font(FONT_REGULAR).fontSize(FONT_SIZES.footer).fillColor(COLORS.muted);
  doc.text(FOOTER_NOTE, doc.page.margins.left, doc.y, { width: contentWidth(doc) });
}

export function buildMaintenancePdf(model: ReportModel): Promise<Buffer> {
  const doc = new PDFDocument({
    size: "A4",
    margin: PAGE_MARGIN,
    info: { Title: model.title },
  });

  // Bufferisé plutôt que streamé vers la réponse : le document pèse quelques
  // kilo-octets, et une erreur en cours de rendu reste récupérable par le
  // gestionnaire d'erreurs Express tant que rien n'a été envoyé.
  const chunks: Buffer[] = [];
  const rendered = new Promise<Buffer>((resolve, reject) => {
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  drawTitle(doc, model);
  drawFields(doc, model.fields);
  drawNotes(doc, model.notes);
  drawTable(doc, {
    headers: REPORT_COLUMN_HEADERS,
    columnWidths: distributeColumnWidths(contentWidth(doc), COLUMN_RATIOS),
    rows: model.rows,
  });
  drawTotalCost(doc, model.totalCost);
  drawFooter(doc);
  doc.end();

  return rendered;
}
