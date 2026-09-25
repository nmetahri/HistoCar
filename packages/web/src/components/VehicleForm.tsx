import { type FormEvent, useState } from "react";
import type { VehicleFormValues } from "@/api/client";

type VehicleDraft = Record<keyof VehicleFormValues, string>;

const EMPTY_VEHICLE_DRAFT: VehicleDraft = {
  make: "",
  model: "",
  licensePlate: "",
  year: String(new Date().getFullYear()),
  currentMileage: "",
  engine: "",
  oilCapacity: "",
  oilChangeInterval: "",
};

function toVehicleDraft(values: VehicleFormValues): VehicleDraft {
  return { ...values, year: String(values.year), currentMileage: String(values.currentMileage) };
}

function toVehicleValues(draft: VehicleDraft): VehicleFormValues {
  return { ...draft, year: Number(draft.year), currentMileage: Number(draft.currentMileage) };
}

interface VehicleField {
  name: keyof VehicleFormValues;
  label: string;
  isNumeric: boolean;
}

const VEHICLE_FIELDS: readonly VehicleField[] = [
  { name: "make", label: "Marque", isNumeric: false },
  { name: "model", label: "Modèle", isNumeric: false },
  { name: "licensePlate", label: "Immatriculation", isNumeric: false },
  { name: "year", label: "Année", isNumeric: true },
  { name: "currentMileage", label: "Kilométrage actuel", isNumeric: true },
  { name: "engine", label: "Motorisation", isNumeric: false },
  { name: "oilCapacity", label: "Capacité huile", isNumeric: false },
  { name: "oilChangeInterval", label: "Intervalle vidange", isNumeric: false },
];

interface VehicleFormProps {
  initialValues?: VehicleFormValues;
  submitLabel: string;
  onSubmit: (values: VehicleFormValues) => Promise<void>;
  onCancel: () => void;
}

export function VehicleForm({ initialValues, submitLabel, onSubmit, onCancel }: VehicleFormProps) {
  const [draft, setDraft] = useState<VehicleDraft>(() =>
    initialValues ? toVehicleDraft(initialValues) : EMPTY_VEHICLE_DRAFT,
  );

  async function submit(event: FormEvent): Promise<void> {
    event.preventDefault();
    await onSubmit(toVehicleValues(draft));
  }

  return (
    <form className="card form" onSubmit={submit}>
      {VEHICLE_FIELDS.map((field) => (
        <div className="field" key={field.name}>
          <label htmlFor={field.name}>{field.label}</label>
          <input
            id={field.name}
            type={field.isNumeric ? "number" : "text"}
            inputMode={field.isNumeric ? "numeric" : undefined}
            min={field.isNumeric ? 0 : undefined}
            value={draft[field.name]}
            onChange={(event) => setDraft({ ...draft, [field.name]: event.target.value })}
            required
          />
        </div>
      ))}
      <div className="form-actions">
        <button type="submit" className="btn btn-primary">
          {submitLabel}
        </button>
        <button type="button" className="btn btn-secondary" onClick={onCancel}>
          Annuler
        </button>
      </div>
    </form>
  );
}
