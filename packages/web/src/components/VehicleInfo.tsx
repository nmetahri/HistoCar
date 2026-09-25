import type { Vehicle } from "@/api/client";
import { formatIsoDate, formatMileage } from "@/format";

interface VehicleInfoProps {
  vehicle: Vehicle;
  estimatedMileage: number | null;
}

export function VehicleInfo({ vehicle, estimatedMileage }: VehicleInfoProps) {
  const details = [
    { label: "Immatriculation", value: vehicle.licensePlate },
    { label: "Année", value: String(vehicle.year) },
    {
      label: "Kilométrage initial",
      value: `${formatMileage(vehicle.initialMileage)} au ${formatIsoDate(vehicle.initialMileageDate)}`,
    },
    {
      label: "Kilométrage estimé aujourd'hui",
      value: estimatedMileage === null ? "—" : `≈ ${formatMileage(estimatedMileage)}`,
    },
    { label: "Motorisation", value: vehicle.engine },
    { label: "Capacité huile", value: vehicle.oilCapacity },
    { label: "Intervalle vidange", value: vehicle.oilChangeInterval },
  ];

  return (
    <section className="card">
      <dl className="vehicle-info">
        {details.map((detail) => (
          <div key={detail.label}>
            <dt>{detail.label}</dt>
            <dd>{detail.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
