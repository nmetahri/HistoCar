import type { MaintenanceRecord, Vehicle } from "@prisma/client";

// Les polices Helvetica embarquées dans pdfkit n'encodent que WinAnsi
// (cp1252). Au-delà — flèches, emoji, alphabets non latins — le document
// afficherait des glyphes erronés.
const WIN_ANSI_PUNCTUATION = new Set([
  0x0152, 0x0153, 0x0160, 0x0161, 0x0178, 0x017d, 0x017e, 0x0192, 0x02c6, 0x02dc, 0x2013, 0x2014,
  0x2018, 0x2019, 0x201a, 0x201c, 0x201d, 0x201e, 0x2020, 0x2021, 0x2022, 0x2026, 0x2030, 0x2039,
  0x203a, 0x20ac, 0x2122,
]);

function isWinAnsi(codePoint: number): boolean {
  const isPrintableAscii = codePoint >= 0x20 && codePoint <= 0x7e;
  const isLatin1Supplement = codePoint >= 0xa0 && codePoint <= 0xff;
  const isLineBreak = codePoint === 0x0a;

  return (
    isPrintableAscii || isLatin1Supplement || isLineBreak || WIN_ANSI_PUNCTUATION.has(codePoint)
  );
}

export interface ReportField {
  label: string;
  value: string;
}

export interface ReportModel {
  title: string;
  generatedOn: string;
  fields: ReportField[];
  rows: string[][];
  totalCost: string | null;
}

// Itéré par point de code : un emoji occupe deux unités UTF-16 et donnerait
// sinon deux points d'interrogation.
export function sanitizeWinAnsi(value: string): string {
  return Array.from(value.normalize("NFC"), (character) =>
    isWinAnsi(character.codePointAt(0) as number) ? character : "?",
  ).join("");
}

export function formatDate(date: Date): string {
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const year = date.getUTCFullYear();
  return `${day}/${month}/${year}`;
}

function groupThousands(value: number): string {
  return Math.trunc(value)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

export function formatMileage(mileage: number): string {
  return `${groupThousands(mileage)} km`;
}

const CENTS_PER_EURO = 100;

// Formaté à la main : Intl sépare les milliers par une espace fine insécable
// (U+202F) que Helvetica ne sait pas encoder.
export function formatCost(costCents: number): string {
  const euros = groupThousands(costCents / CENTS_PER_EURO);
  const cents = String(costCents % CENTS_PER_EURO).padStart(2, "0");
  return `${euros},${cents} €`;
}

function sumCosts(records: readonly MaintenanceRecord[]): number | null {
  const costs = records.flatMap((record) => (record.costCents === null ? [] : [record.costCents]));
  return costs.length === 0 ? null : costs.reduce((total, cost) => total + cost, 0);
}

export const REPORT_COLUMN_HEADERS = ["Date", "Kilométrage", "Type", "Détails", "Coût"];

export function toReportModel(
  vehicle: Vehicle,
  records: readonly MaintenanceRecord[],
): ReportModel {
  const rows = [...records]
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .map((record) => [
      formatDate(record.date),
      formatMileage(record.mileage),
      sanitizeWinAnsi(record.type),
      sanitizeWinAnsi(record.details),
      record.costCents === null ? "" : formatCost(record.costCents),
    ]);
  const totalCost = sumCosts(records);

  const make = sanitizeWinAnsi(vehicle.make);
  const model = sanitizeWinAnsi(vehicle.model);

  return {
    title: `Historique d'entretien - ${make} ${model}`,
    generatedOn: formatDate(new Date()),
    fields: [
      { label: "Marque", value: make },
      { label: "Modèle", value: model },
      { label: "Immatriculation", value: sanitizeWinAnsi(vehicle.licensePlate) },
      { label: "Année", value: String(vehicle.year) },
      { label: "Kilométrage actuel", value: formatMileage(vehicle.currentMileage) },
      { label: "Motorisation", value: sanitizeWinAnsi(vehicle.engine) },
      { label: "Capacité huile", value: sanitizeWinAnsi(vehicle.oilCapacity) },
      { label: "Intervalle vidange préconisé", value: sanitizeWinAnsi(vehicle.oilChangeInterval) },
    ],
    rows,
    totalCost: totalCost === null ? null : formatCost(totalCost),
  };
}
