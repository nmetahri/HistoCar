export function formatMileage(mileage: number): string {
  return `${mileage.toLocaleString("fr-FR")} km`;
}

export function formatIsoDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString("fr-FR", { timeZone: "UTC" });
}

export function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}
