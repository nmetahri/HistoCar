import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, type Vehicle, type VehicleFormValues } from "@/api/client";
import { VehicleForm } from "@/components/VehicleForm";
import { useAuth } from "@/context/AuthContext";

export function VehicleList() {
  const { signOut } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [archivedVehicles, setArchivedVehicles] = useState<Vehicle[]>([]);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    api.listVehicles().then(setVehicles);
    api.listArchivedVehicles().then(setArchivedVehicles);
  }, []);

  async function addVehicle(values: VehicleFormValues): Promise<void> {
    const vehicle = await api.createVehicle(values);
    setVehicles((current) => [...current, vehicle]);
    setShowForm(false);
  }

  async function restoreVehicle(vehicleId: string): Promise<void> {
    const vehicle = await api.restoreVehicle(vehicleId);
    setArchivedVehicles((current) => current.filter((archived) => archived.id !== vehicleId));
    setVehicles((current) => [...current, vehicle]);
  }

  return (
    <main className="page">
      <header className="header">
        <h1>Mes véhicules</h1>
        <button type="button" className="btn btn-ghost" onClick={() => signOut()}>
          Déconnexion
        </button>
      </header>

      {vehicles.length === 0 && !showForm ? (
        <div className="card empty-state">
          <p>Aucun véhicule pour l'instant.</p>
          <button type="button" className="btn btn-primary" onClick={() => setShowForm(true)}>
            + Ajouter un véhicule
          </button>
        </div>
      ) : (
        <ul className="vehicle-list">
          {vehicles.map((vehicle) => (
            <li key={vehicle.id}>
              <Link to={`/vehicles/${vehicle.id}`} className="card card-link">
                <strong>
                  {vehicle.make} {vehicle.model}
                </strong>
                <span>{vehicle.licensePlate}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {showForm ? (
        <VehicleForm
          submitLabel="Ajouter"
          onSubmit={addVehicle}
          onCancel={() => setShowForm(false)}
        />
      ) : vehicles.length > 0 ? (
        <button type="button" className="btn btn-primary" onClick={() => setShowForm(true)}>
          + Ajouter un véhicule
        </button>
      ) : null}

      {archivedVehicles.length > 0 ? (
        <details className="card archived-section">
          <summary>Véhicules supprimés ({archivedVehicles.length})</summary>
          <ul className="archived-list">
            {archivedVehicles.map((vehicle) => (
              <li key={vehicle.id}>
                <span>
                  {vehicle.make} {vehicle.model} · {vehicle.licensePlate}
                </span>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => restoreVehicle(vehicle.id)}
                >
                  Restaurer
                </button>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </main>
  );
}
