import { type FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, type Vehicle, type VehicleFormValues } from "@/api/client";
import { useAuth } from "@/context/AuthContext";

const INITIAL_VALUES: VehicleFormValues = {
  make: "",
  model: "",
  licensePlate: "",
  year: new Date().getFullYear(),
  currentMileage: 0,
  engine: "",
  oilCapacity: "",
  oilChangeInterval: "",
};

export function VehicleList() {
  const { signOut } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [values, setValues] = useState<VehicleFormValues>(INITIAL_VALUES);

  useEffect(() => {
    api.listVehicles().then(setVehicles);
  }, []);

  async function addVehicle(event: FormEvent): Promise<void> {
    event.preventDefault();
    const vehicle = await api.createVehicle(values);
    setVehicles((current) => [...current, vehicle]);
    setValues(INITIAL_VALUES);
    setShowForm(false);
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
        <form className="card form" onSubmit={addVehicle}>
          <div className="field">
            <label htmlFor="make">Marque</label>
            <input
              id="make"
              value={values.make}
              onChange={(event) => setValues({ ...values, make: event.target.value })}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="model">Modèle</label>
            <input
              id="model"
              value={values.model}
              onChange={(event) => setValues({ ...values, model: event.target.value })}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="licensePlate">Immatriculation</label>
            <input
              id="licensePlate"
              value={values.licensePlate}
              onChange={(event) => setValues({ ...values, licensePlate: event.target.value })}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="year">Année</label>
            <input
              id="year"
              type="number"
              value={values.year}
              onChange={(event) => setValues({ ...values, year: Number(event.target.value) })}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="currentMileage">Kilométrage actuel</label>
            <input
              id="currentMileage"
              type="number"
              value={values.currentMileage}
              onChange={(event) =>
                setValues({ ...values, currentMileage: Number(event.target.value) })
              }
              required
            />
          </div>
          <div className="field">
            <label htmlFor="engine">Motorisation</label>
            <input
              id="engine"
              value={values.engine}
              onChange={(event) => setValues({ ...values, engine: event.target.value })}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="oilCapacity">Capacité huile</label>
            <input
              id="oilCapacity"
              value={values.oilCapacity}
              onChange={(event) => setValues({ ...values, oilCapacity: event.target.value })}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="oilChangeInterval">Intervalle vidange</label>
            <input
              id="oilChangeInterval"
              value={values.oilChangeInterval}
              onChange={(event) => setValues({ ...values, oilChangeInterval: event.target.value })}
              required
            />
          </div>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary">
              Ajouter
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>
              Annuler
            </button>
          </div>
        </form>
      ) : vehicles.length > 0 ? (
        <button type="button" className="btn btn-primary" onClick={() => setShowForm(true)}>
          + Ajouter un véhicule
        </button>
      ) : null}
    </main>
  );
}
