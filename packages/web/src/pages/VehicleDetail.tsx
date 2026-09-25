import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  api,
  type MaintenanceRecordFormValues,
  type Vehicle,
  type VehicleFormValues,
  type VehicleWithMaintenance,
} from "@/api/client";
import {
  emptyMaintenanceRecordDraft,
  type MaintenanceRecordDraft,
  MaintenanceRecordForm,
  toMaintenanceRecordValues,
} from "@/components/MaintenanceRecordForm";
import { VehicleForm } from "@/components/VehicleForm";
import { VehicleInfo } from "@/components/VehicleInfo";

const DELETE_VEHICLE_CONFIRMATION =
  "Supprimer ce véhicule ? Il pourra être restauré depuis la liste des véhicules.";

function toVehicleFormValues(vehicle: Vehicle): VehicleFormValues {
  return {
    make: vehicle.make,
    model: vehicle.model,
    licensePlate: vehicle.licensePlate,
    year: vehicle.year,
    currentMileage: vehicle.currentMileage,
    engine: vehicle.engine,
    oilCapacity: vehicle.oilCapacity,
    oilChangeInterval: vehicle.oilChangeInterval,
  };
}

export function VehicleDetail() {
  const { id } = useParams<{ id: string }>();
  const vehicleId = id as string;
  const navigate = useNavigate();
  const [vehicle, setVehicle] = useState<VehicleWithMaintenance | null>(null);
  const [editedRecordId, setEditedRecordId] = useState<string | null>(null);
  const [editedValues, setEditedValues] = useState<MaintenanceRecordDraft>(
    emptyMaintenanceRecordDraft,
  );
  const [isEditingVehicle, setIsEditingVehicle] = useState(false);

  const reload = useCallback(async () => {
    const data = await api.getVehicle(vehicleId);
    setVehicle(data);
  }, [vehicleId]);

  useEffect(() => {
    reload();
  }, [reload]);

  async function saveVehicle(values: VehicleFormValues): Promise<void> {
    await api.updateVehicle(vehicleId, values);
    setIsEditingVehicle(false);
    await reload();
  }

  async function deleteVehicle(): Promise<void> {
    if (!window.confirm(DELETE_VEHICLE_CONFIRMATION)) {
      return;
    }
    await api.deleteVehicle(vehicleId);
    navigate("/");
  }

  async function addRecord(values: MaintenanceRecordFormValues): Promise<void> {
    await api.createMaintenanceRecord(vehicleId, values);
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
      mileage: String(record.mileage),
      type: record.type,
      details: record.details,
    });
  }

  function cancelEditing(): void {
    setEditedRecordId(null);
  }

  async function saveEditing(recordId: string): Promise<void> {
    await api.updateMaintenanceRecord(vehicleId, recordId, toMaintenanceRecordValues(editedValues));
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
        {isEditingVehicle ? null : (
          <div className="header-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsEditingVehicle(true)}
            >
              Modifier
            </button>
            <button type="button" className="btn btn-danger" onClick={deleteVehicle}>
              Supprimer
            </button>
          </div>
        )}
      </header>

      {isEditingVehicle ? (
        <VehicleForm
          initialValues={toVehicleFormValues(vehicle)}
          submitLabel="Enregistrer"
          onSubmit={saveVehicle}
          onCancel={() => setIsEditingVehicle(false)}
        />
      ) : (
        <VehicleInfo vehicle={vehicle} />
      )}

      <section className="card">
        <h2>Ajouter un entretien</h2>
        <MaintenanceRecordForm onSubmit={addRecord} />
      </section>

      {vehicle.maintenanceRecords.length > 0 ? (
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
                            setEditedValues({ ...editedValues, mileage: event.target.value })
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
      ) : null}

      <section className="card report-card">
        <h2>Document d'entretien</h2>
        <p className="muted">
          Historique complet du véhicule au format A4, prêt à imprimer ou à transmettre.
        </p>
        <a className="btn btn-secondary" href={api.reportPdfUrl(vehicleId)} download>
          Télécharger le PDF
        </a>
      </section>
    </main>
  );
}
