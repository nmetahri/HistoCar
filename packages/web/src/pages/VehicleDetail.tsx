import { type FormEvent, useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, type MaintenanceRecordFormValues, type VehicleWithMaintenance } from "@/api/client";

const INITIAL_VALUES: MaintenanceRecordFormValues = {
  date: new Date().toISOString().slice(0, 10),
  mileage: 0,
  type: "",
  details: "",
};

export function VehicleDetail() {
  const { id } = useParams<{ id: string }>();
  const vehicleId = id as string;
  const [vehicle, setVehicle] = useState<VehicleWithMaintenance | null>(null);
  const [values, setValues] = useState<MaintenanceRecordFormValues>(INITIAL_VALUES);
  const [editedRecordId, setEditedRecordId] = useState<string | null>(null);
  const [editedValues, setEditedValues] = useState<MaintenanceRecordFormValues>(INITIAL_VALUES);

  const reload = useCallback(async () => {
    const data = await api.getVehicle(vehicleId);
    setVehicle(data);
  }, [vehicleId]);

  useEffect(() => {
    reload();
  }, [reload]);

  async function addRecord(event: FormEvent): Promise<void> {
    event.preventDefault();
    await api.createMaintenanceRecord(vehicleId, values);
    setValues(INITIAL_VALUES);
    await reload();
  }

  async function deleteRecord(recordId: string): Promise<void> {
    if (!window.confirm("Supprimer cette ligne d'entretien ?")) {
      return;
    }
    await api.deleteMaintenanceRecord(vehicleId, recordId);
    await reload();
  }

  function startEditing(record: VehicleWithMaintenance["maintenanceRecords"][number]): void {
    setEditedRecordId(record.id);
    setEditedValues({
      date: record.date.slice(0, 10),
      mileage: record.mileage,
      type: record.type,
      details: record.details,
    });
  }

  function cancelEditing(): void {
    setEditedRecordId(null);
  }

  async function saveEditing(recordId: string): Promise<void> {
    await api.updateMaintenanceRecord(vehicleId, recordId, editedValues);
    setEditedRecordId(null);
    await reload();
  }

  if (!vehicle) {
    return <p className="loading">Chargement...</p>;
  }

  return (
    <main className="page">
      <header className="header">
        <div className="header-links">
          <Link to="/" className="back-link">
            ← Véhicules
          </Link>
          <h1>
            {vehicle.make} {vehicle.model}
          </h1>
        </div>
      </header>

      <section className="card">
        <h2>Ajouter un entretien</h2>
        <form className="form inline-form" onSubmit={addRecord}>
          <div className="field">
            <label htmlFor="date">Date</label>
            <input
              id="date"
              type="date"
              value={values.date}
              onChange={(event) => setValues({ ...values, date: event.target.value })}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="mileage">Kilométrage</label>
            <input
              id="mileage"
              type="number"
              value={values.mileage}
              onChange={(event) => setValues({ ...values, mileage: Number(event.target.value) })}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="type">Type</label>
            <input
              id="type"
              value={values.type}
              onChange={(event) => setValues({ ...values, type: event.target.value })}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="details">Détails</label>
            <textarea
              id="details"
              value={values.details}
              onChange={(event) => setValues({ ...values, details: event.target.value })}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary">
            Ajouter
          </button>
        </form>
      </section>

      <section className="card">
        <h2>Historique</h2>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Km</th>
                <th>Type</th>
                <th>Détails</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {vehicle.maintenanceRecords.map((record) =>
                editedRecordId === record.id ? (
                  <tr key={record.id}>
                    <td data-label="Date">
                      <input
                        type="date"
                        value={editedValues.date}
                        onChange={(event) =>
                          setEditedValues({ ...editedValues, date: event.target.value })
                        }
                      />
                    </td>
                    <td data-label="Km">
                      <input
                        type="number"
                        value={editedValues.mileage}
                        onChange={(event) =>
                          setEditedValues({ ...editedValues, mileage: Number(event.target.value) })
                        }
                      />
                    </td>
                    <td data-label="Type">
                      <input
                        value={editedValues.type}
                        onChange={(event) =>
                          setEditedValues({ ...editedValues, type: event.target.value })
                        }
                      />
                    </td>
                    <td data-label="Détails">
                      <textarea
                        value={editedValues.details}
                        onChange={(event) =>
                          setEditedValues({ ...editedValues, details: event.target.value })
                        }
                      />
                    </td>
                    <td className="row-actions" data-label="Actions">
                      <button
                        type="button"
                        className="btn-icon btn-icon-success"
                        title="Enregistrer"
                        aria-label="Enregistrer"
                        onClick={() => saveEditing(record.id)}
                      >
                        ✓
                      </button>
                      <button
                        type="button"
                        className="btn-icon btn-icon-neutral"
                        title="Annuler"
                        aria-label="Annuler"
                        onClick={cancelEditing}
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ) : (
                  <tr key={record.id}>
                    <td data-label="Date">{new Date(record.date).toLocaleDateString("fr-FR")}</td>
                    <td data-label="Km">{record.mileage.toLocaleString("fr-FR")}</td>
                    <td data-label="Type">{record.type}</td>
                    <td data-label="Détails">{record.details}</td>
                    <td className="row-actions" data-label="Actions">
                      <button
                        type="button"
                        className="btn-icon btn-icon-neutral"
                        title="Modifier"
                        aria-label="Modifier"
                        onClick={() => startEditing(record)}
                      >
                        🔧
                      </button>
                      <button
                        type="button"
                        className="btn-icon btn-icon-danger"
                        title="Supprimer"
                        aria-label="Supprimer"
                        onClick={() => deleteRecord(record.id)}
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card">
        <div className="header">
          <h2>Document d'entretien</h2>
          <a className="btn btn-secondary" href={api.reportPdfUrl(vehicleId)} download>
            Télécharger le PDF
          </a>
        </div>
        <p className="muted">
          Historique complet du véhicule au format A4, prêt à imprimer ou à transmettre.
        </p>
      </section>
    </main>
  );
}
