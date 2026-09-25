import type { Vehicle } from "@/api/client";

interface VehicleInfoProps {
  vehicle: Vehicle;
}

export function VehicleInfo({ vehicle }: VehicleInfoProps) {
  const details = [
    { label: "Immatriculation", value: vehicle.licensePlate },
    { label: "Année", value: String(vehicle.year) },
    { label: "Kilométrage actuel", value: `${vehicle.currentMileage.toLocaleString("fr-FR")} km` },
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
