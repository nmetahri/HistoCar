import { COLORS, FONT_BOLD, FONT_REGULAR, FONT_SIZES } from "@/report/pdf/layout";

const CELL_PADDING_X = 4;
const CELL_PADDING_Y = 3;

export interface TableOptions {
  headers: readonly string[];
  columnWidths: readonly number[];
  rows: readonly (readonly string[])[];
}

export function distributeColumnWidths(totalWidth: number, ratios: readonly number[]): number[] {
  const widths = ratios.map((ratio) => Math.floor(totalWidth * ratio));
  const rounded = widths.reduce((sum, width) => sum + width, 0);
  const last = widths.length - 1;
  // Le reste des arrondis va à la dernière colonne, sinon le tableau est plus
  // étroit que la zone utile et le filet de droite flotte.
  widths[last] = (widths[last] as number) + (totalWidth - rounded);
  return widths;
}

function measureRow(
  doc: PDFKit.PDFDocument,
  cells: readonly string[],
  columnWidths: readonly number[],
): number {
  const tallest = cells.reduce((height, text, index) => {
    const width = (columnWidths[index] as number) - CELL_PADDING_X * 2;
    return Math.max(height, doc.heightOfString(text, { width }));
  }, 0);
  return tallest + CELL_PADDING_Y * 2;
}

function drawRow(
  doc: PDFKit.PDFDocument,
  cells: readonly string[],
  columnWidths: readonly number[],
  top: number,
  height: number,
): void {
  let left = doc.page.margins.left;

  cells.forEach((text, index) => {
    const width = columnWidths[index] as number;
    doc.rect(left, top, width, height).stroke(COLORS.rule);
    doc.text(text, left + CELL_PADDING_X, top + CELL_PADDING_Y, {
      width: width - CELL_PADDING_X * 2,
    });
    left += width;
  });
}

function fillRow(
  doc: PDFKit.PDFDocument,
  columnWidths: readonly number[],
  top: number,
  height: number,
  color: string,
): void {
  const width = columnWidths.reduce((sum, columnWidth) => sum + columnWidth, 0);
  doc.rect(doc.page.margins.left, top, width, height).fill(color);
}

function drawHeaderRow(doc: PDFKit.PDFDocument, options: TableOptions, top: number): number {
  doc.font(FONT_BOLD).fontSize(FONT_SIZES.table);
  const height = measureRow(doc, options.headers, options.columnWidths);

  fillRow(doc, options.columnWidths, top, height, COLORS.headerBackground);
  doc.fillColor(COLORS.headerText);
  drawRow(doc, options.headers, options.columnWidths, top, height);

  return top + height;
}

export function drawTable(doc: PDFKit.PDFDocument, options: TableOptions): void {
  const bottomLimit = doc.page.height - doc.page.margins.bottom;
  let top = drawHeaderRow(doc, options, doc.y);

  options.rows.forEach((cells, index) => {
    doc.font(FONT_REGULAR).fontSize(FONT_SIZES.table);
    const height = measureRow(doc, cells, options.columnWidths);

    if (top + height > bottomLimit) {
      doc.addPage();
      top = drawHeaderRow(doc, options, doc.page.margins.top);
      doc.font(FONT_REGULAR).fontSize(FONT_SIZES.table);
    }

    if (index % 2 === 1) {
      fillRow(doc, options.columnWidths, top, height, COLORS.zebra);
    }
    doc.fillColor(COLORS.text);
    drawRow(doc, cells, options.columnWidths, top, height);
    top += height;
  });

  doc.y = top;
}
