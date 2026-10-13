import { type FormEvent, useState } from "react";
import type { VehicleFormValues } from "@/api/client";
import { todayIsoDate } from "@/format";

type VehicleDraft = Record<keyof VehicleFormValues, string>;

const EMPTY_VEHICLE_DRAFT: VehicleDraft = {
  make: "",
  model: "",
  licensePlate: "",
  year: String(new Date().getFullYear()),
  initialMileage: "",
  initialMileageDate: todayIsoDate(),
  engine: "",
  oilCapacity: "",
  oilChangeInterval: "",
  notes: "",
};

function toVehicleDraft(values: VehicleFormValues): VehicleDraft {
  return {
    ...values,
    year: String(values.year),
    initialMileage: String(values.initialMileage),
    initialMileageDate: values.initialMileageDate.slice(0, 10),
  };
}

function toVehicleValues(draft: VehicleDraft): VehicleFormValues {
  return { ...draft, year: Number(draft.year), initialMileage: Number(draft.initialMileage) };
}

type VehicleFieldType = "text" | "number" | "date" | "textarea";

const NOTES_ROWS = 4;

interface VehicleField {
  name: keyof VehicleFormValues;
  label: string;
  type: VehicleFieldType;
  hint?: string;
  optional?: boolean;
}

const VEHICLE_FIELDS: readonly VehicleField[] = [
  { name: "make", label: "Marque", type: "text" },
  { name: "model", label: "Modèle", type: "text" },
  { name: "licensePlate", label: "Immatriculation", type: "text" },
  { name: "year", label: "Année", type: "number" },
  {
    name: "initialMileage",
    label: "Kilométrage initial",
    type: "number",
    hint: "Relevé de référence, à l'achat par exemple.",
  },
  { name: "initialMileageDate", label: "Date du kilométrage initial", type: "date" },
  { name: "engine", label: "Motorisation", type: "text" },
  { name: "oilCapacity", label: "Capacité huile", type: "text" },
  { name: "oilChangeInterval", label: "Intervalle vidange", type: "text" },
  {
    name: "notes",
    label: "Notes additionnelles",
    type: "textarea",
    hint: "Facultatif : liens utiles, références de pièces…",
    optional: true,
  },
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
          {field.type === "textarea" ? (
            <textarea
              id={field.name}
              rows={NOTES_ROWS}
              value={draft[field.name]}
              onChange={(event) => setDraft({ ...draft, [field.name]: event.target.value })}
              required={!field.optional}
            />
          ) : (
            <input
              id={field.name}
              type={field.type}
              inputMode={field.type === "number" ? "numeric" : undefined}
              min={field.type === "number" ? 0 : undefined}
              value={draft[field.name]}
              onChange={(event) => setDraft({ ...draft, [field.name]: event.target.value })}
              required={!field.optional}
            />
          )}
          {field.hint ? <span className="hint">{field.hint}</span> : null}
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
