// 1 cm en points PostScript (72 dpi), pour retrouver la marge du document A4.
export const PAGE_MARGIN = 28.35;

export const FONT_REGULAR = "Helvetica";
export const FONT_BOLD = "Helvetica-Bold";

export const COLORS = {
  text: "#1a1a1a",
  muted: "#555555",
  rule: "#dddddd",
  panel: "#f4f4f4",
  zebra: "#fafafa",
  headerBackground: "#1a1a1a",
  headerText: "#ffffff",
} as const;

export const FONT_SIZES = {
  title: 18,
  subtitle: 9,
  field: 9.5,
  table: 8.5,
  footer: 7,
} as const;

// Date, kilométrage, type, détails — somme égale à 1, appliquée à la largeur
// utile de la page.
export const COLUMN_RATIOS = [0.14, 0.16, 0.2, 0.5] as const;
