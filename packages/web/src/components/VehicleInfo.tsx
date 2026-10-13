import type { Vehicle } from "@/api/client";
import { LinkifiedText } from "@/components/LinkifiedText";
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
  const notes = vehicle.notes.trim();

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
      {notes === "" ? null : (
        <div className="vehicle-notes">
          <h3>Notes additionnelles</h3>
          <p>
            <LinkifiedText text={notes} />
          </p>
        </div>
      )}
    </section>
  );
}
