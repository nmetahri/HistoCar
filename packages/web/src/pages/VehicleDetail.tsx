import { Fragment, useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  api,
  type MaintenanceRecord,
  type MaintenanceRecordFormValues,
  type Vehicle,
  type VehicleFormValues,
  type VehicleWithMaintenance,
} from "@/api/client";
import { AttachmentsEditor } from "@/components/AttachmentsEditor";
import {
  emptyMaintenanceRecordDraft,
  type MaintenanceRecordDraft,
  MaintenanceRecordForm,
  toCostDraft,
  toMaintenanceRecordValues,
} from "@/components/MaintenanceRecordForm";
import { VehicleForm } from "@/components/VehicleForm";
import { VehicleInfo } from "@/components/VehicleInfo";
import { formatMileage, todayIsoDate } from "@/format";
import { estimateMileage, vehicleMileageReadings } from "@/mileage/estimate-mileage";

const DELETE_VEHICLE_CONFIRMATION =
  "Supprimer ce véhicule ? Il pourra être restauré depuis la liste des véhicules.";

const CENTS_PER_EURO = 100;
const euroFormatter = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });

function formatCost(costCents: number | null): string {
  return costCents === null ? "" : euroFormatter.format(costCents / CENTS_PER_EURO);
}

function sumCosts(records: readonly MaintenanceRecord[]): number | null {
  const costs = records.flatMap((record) => (record.costCents === null ? [] : [record.costCents]));
  return costs.length === 0 ? null : costs.reduce((total, cost) => total + cost, 0);
}

function toVehicleFormValues(vehicle: Vehicle): VehicleFormValues {
  return {
    make: vehicle.make,
    model: vehicle.model,
    licensePlate: vehicle.licensePlate,
    year: vehicle.year,
    initialMileage: vehicle.initialMileage,
    initialMileageDate: vehicle.initialMileageDate,
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

  async function addRecord(values: MaintenanceRecordFormValues): Promise<MaintenanceRecord> {
    const record = await api.createMaintenanceRecord(vehicleId, values);
    await reload();
    return record;
  }

  async function attachToRecord(recordId: string, files: readonly File[]): Promise<void> {
    try {
      await api.uploadAttachments(vehicleId, recordId, files);
    } finally {
      await reload();
    }
  }

  async function deleteRecord(recordId: string): Promise<void> {
    if (!window.confirm("Supprimer cette ligne d'entretien ?")) {
      return;
    }
    await api.deleteMaintenanceRecord(vehicleId, recordId);
    await reload();
  }

  function startEditing(record: MaintenanceRecord): void {
    setEditedRecordId(record.id);
    setEditedValues({
      date: record.date.slice(0, 10),
      mileage: String(record.mileage),
      type: record.type,
      details: record.details,
      cost: toCostDraft(record.costCents),
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

  const totalCost = sumCosts(vehicle.maintenanceRecords);
  const hasAttachments = vehicle.maintenanceRecords.some((record) => record.attachments.length > 0);
  const mileageReadings = vehicleMileageReadings(vehicle);
  const estimatedCurrentMileage = estimateMileage(mileageReadings, todayIsoDate());

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
        <VehicleInfo vehicle={vehicle} estimatedMileage={estimatedCurrentMileage} />
      )}

      <section className="card">
        <h2>Ajouter un entretien</h2>
        <MaintenanceRecordForm
          mileageReadings={mileageReadings}
          onCreate={addRecord}
          onAttach={attachToRecord}
        />
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
                  <th>Coût</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {vehicle.maintenanceRecords.map((record) =>
                  editedRecordId === record.id ? (
                    <Fragment key={record.id}>
                      <tr className="editing-row">
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
                        <td data-label="Coût">
                          <input
                            type="number"
                            inputMode="decimal"
                            min={0}
                            step={0.01}
                            value={editedValues.cost}
                            onChange={(event) =>
                              setEditedValues({ ...editedValues, cost: event.target.value })
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
                      <tr className="attachments-row">
                        <td colSpan={6}>
                          <AttachmentsEditor
                            vehicleId={vehicleId}
                            record={record}
                            onChange={reload}
                          />
                        </td>
                      </tr>
                    </Fragment>
                  ) : (
                    <tr key={record.id}>
                      <td data-label="Date">{new Date(record.date).toLocaleDateString("fr-FR")}</td>
                      <td data-label="Km">{record.mileage.toLocaleString("fr-FR")}</td>
                      <td data-label="Type">{record.type}</td>
                      <td data-label="Détails">{record.details}</td>
                      <td data-label="Coût" className="cost-cell">
                        {formatCost(record.costCents)}
                      </td>
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
              {totalCost === null ? null : (
                <tfoot>
                  <tr>
                    <th colSpan={4} scope="row">
                      Coût total
                    </th>
                    <td data-label="Coût total" className="cost-cell">
                      {formatCost(totalCost)}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </section>
      ) : null}

      <section className="card report-card">
        <h2>Document d'entretien</h2>
        <p className="muted">
          Historique complet du véhicule au format A4, prêt à imprimer ou à transmettre.
        </p>
        {/* Formulaire natif : la réponse est un PDF en pièce jointe, le navigateur
            le télécharge sans quitter la page. */}
        <form className="report-form" method="get" action={api.reportPdfUrl(vehicleId)}>
          <div className="field">
            <label htmlFor="currentMileage">Kilométrage actuel</label>
            <input
              id="currentMileage"
              name="currentMileage"
              type="number"
              inputMode="numeric"
              min={0}
              placeholder={
                estimatedCurrentMileage === null
                  ? undefined
                  : `≈ ${formatMileage(estimatedCurrentMileage)}`
              }
              required
            />
          </div>
          <div className="report-actions">
            <button type="submit" className="btn btn-secondary">
              Télécharger le PDF
            </button>
            {hasAttachments ? (
              <a className="btn btn-secondary" href={api.attachmentsPdfUrl(vehicleId)} download>
                Télécharger les justificatifs
              </a>
            ) : null}
          </div>
        </form>
      </section>
    </main>
  );
}
