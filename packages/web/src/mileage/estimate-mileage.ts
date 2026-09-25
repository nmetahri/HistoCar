import type { VehicleWithMaintenance } from "@/api/client";

export interface MileageReading {
  day: number;
  mileage: number;
}

const MS_PER_DAY = 86_400_000;
const DAYS_PER_YEAR = 365.25;
// Moyenne annuelle d'une voiture particulière en France, utilisée faute de
// deux relevés assez espacés pour mesurer le rythme réel du véhicule.
const DEFAULT_KM_PER_DAY = 12_000 / DAYS_PER_YEAR;
// Hors de l'historique connu, on prolonge le rythme de l'année la plus proche
// plutôt que la moyenne de toute la vie du véhicule.
const RATE_WINDOW_DAYS = DAYS_PER_YEAR;
// Arrondi assumé : afficher le kilomètre près laisserait croire à une mesure.
const ESTIMATE_ROUNDING_KM = 100;

function toDay(isoDate: string): number {
  return Math.floor(Date.parse(isoDate.slice(0, 10)) / MS_PER_DAY);
}

function productionReading(year: number): MileageReading {
  return { day: toDay(`${year}-01-01`), mileage: 0 };
}

export function vehicleMileageReadings(vehicle: VehicleWithMaintenance): MileageReading[] {
  const knownReadings = [
    { day: toDay(vehicle.initialMileageDate), mileage: vehicle.initialMileage },
    ...vehicle.maintenanceRecords.map((record) => ({
      day: toDay(record.date),
      mileage: record.mileage,
    })),
  ].sort((a, b) => a.day - b.day);

  const production = productionReading(vehicle.year);
  const firstKnownDay = knownReadings[0]?.day ?? Number.POSITIVE_INFINITY;
  return production.day < firstKnownDay ? [production, ...knownReadings] : knownReadings;
}

function findLastReading(
  readings: readonly MileageReading[],
  predicate: (reading: MileageReading) => boolean,
): MileageReading | undefined {
  return [...readings].reverse().find(predicate);
}

function kmPerDay(from: MileageReading, to: MileageReading): number {
  const days = to.day - from.day;
  const rate = days > 0 ? (to.mileage - from.mileage) / days : 0;
  return rate > 0 ? rate : DEFAULT_KM_PER_DAY;
}

function interpolate(before: MileageReading, after: MileageReading, day: number): number {
  if (after.day === before.day) {
    return before.mileage;
  }
  const progress = (day - before.day) / (after.day - before.day);
  return before.mileage + (after.mileage - before.mileage) * progress;
}

function extrapolateForward(readings: readonly MileageReading[], day: number): number {
  const last = readings[readings.length - 1] as MileageReading;
  const reference =
    findLastReading(readings, (reading) => reading.day <= last.day - RATE_WINDOW_DAYS) ??
    (readings[0] as MileageReading);
  return last.mileage + kmPerDay(reference, last) * (day - last.day);
}

function extrapolateBackward(readings: readonly MileageReading[], day: number): number {
  const first = readings[0] as MileageReading;
  const reference =
    readings.find((reading) => reading.day >= first.day + RATE_WINDOW_DAYS) ??
    (readings[readings.length - 1] as MileageReading);
  return first.mileage - kmPerDay(first, reference) * (first.day - day);
}

function rawEstimate(readings: readonly MileageReading[], day: number): number {
  const before = findLastReading(readings, (reading) => reading.day <= day);
  const after = readings.find((reading) => reading.day >= day);

  if (before && after) {
    return interpolate(before, after, day);
  }
  return before ? extrapolateForward(readings, day) : extrapolateBackward(readings, day);
}

// Un compteur ne recule pas : l'estimation reste entre le plus haut relevé
// antérieur et le plus bas relevé postérieur. Si ces bornes se contredisent
// (saisie erronée), la borne basse l'emporte.
function clampToReadings(
  readings: readonly MileageReading[],
  day: number,
  estimate: number,
): number {
  const earlierMileages = readings
    .filter((reading) => reading.day <= day)
    .map((reading) => reading.mileage);
  const laterMileages = readings
    .filter((reading) => reading.day >= day)
    .map((reading) => reading.mileage);
  const floor = Math.max(0, ...earlierMileages);
  const ceiling = Math.min(Number.POSITIVE_INFINITY, ...laterMileages);
  return Math.max(floor, Math.min(estimate, ceiling));
}

// Les relevés doivent être triés par date croissante.
export function estimateMileage(
  readings: readonly MileageReading[],
  isoDate: string,
): number | null {
  const day = toDay(isoDate);
  if (readings.length === 0 || Number.isNaN(day)) {
    return null;
  }

  const roundedEstimate =
    Math.round(rawEstimate(readings, day) / ESTIMATE_ROUNDING_KM) * ESTIMATE_ROUNDING_KM;
  return clampToReadings(readings, day, roundedEstimate);
}
