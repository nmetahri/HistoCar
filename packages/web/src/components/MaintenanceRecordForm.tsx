import { type FormEvent, useState } from "react";
import type { MaintenanceRecordFormValues } from "@/api/client";

export type MaintenanceRecordDraft = Omit<MaintenanceRecordFormValues, "mileage"> & {
  mileage: string;
};

export function emptyMaintenanceRecordDraft(): MaintenanceRecordDraft {
  return { date: new Date().toISOString().slice(0, 10), mileage: "", type: "", details: "" };
}

export function toMaintenanceRecordValues(
  draft: MaintenanceRecordDraft,
): MaintenanceRecordFormValues {
  return { ...draft, mileage: Number(draft.mileage) };
}

interface MaintenanceRecordFormProps {
  onSubmit: (values: MaintenanceRecordFormValues) => Promise<void>;
}

export function MaintenanceRecordForm({ onSubmit }: MaintenanceRecordFormProps) {
  const [draft, setDraft] = useState<MaintenanceRecordDraft>(emptyMaintenanceRecordDraft);

  async function submit(event: FormEvent): Promise<void> {
    event.preventDefault();
    await onSubmit(toMaintenanceRecordValues(draft));
    setDraft(emptyMaintenanceRecordDraft());
  }

  return (
    <form className="form inline-form" onSubmit={submit}>
      <div className="field">
        <label htmlFor="date">Date</label>
        <input
          id="date"
          type="date"
          value={draft.date}
          onChange={(event) => setDraft({ ...draft, date: event.target.value })}
          required
        />
      </div>
      <div className="field">
        <label htmlFor="mileage">Kilométrage</label>
        <input
          id="mileage"
          type="number"
          inputMode="numeric"
          min={0}
          value={draft.mileage}
          onChange={(event) => setDraft({ ...draft, mileage: event.target.value })}
          required
        />
      </div>
      <div className="field">
        <label htmlFor="type">Type</label>
        <input
          id="type"
          value={draft.type}
          onChange={(event) => setDraft({ ...draft, type: event.target.value })}
          required
        />
      </div>
      <div className="field field-wide">
        <label htmlFor="details">Détails</label>
        <textarea
          id="details"
          rows={3}
          value={draft.details}
          onChange={(event) => setDraft({ ...draft, details: event.target.value })}
          required
        />
      </div>
      <button type="submit" className="btn btn-primary">
        Ajouter
      </button>
    </form>
  );
}
