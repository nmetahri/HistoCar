import { type ChangeEvent, type FormEvent, useState } from "react";
import type { MaintenanceRecord, MaintenanceRecordFormValues } from "@/api/client";
import {
  ACCEPTED_ATTACHMENT_TYPES,
  ATTACHMENT_HINT,
  errorMessage,
} from "@/components/attachment-files";
import { formatMileage, todayIsoDate } from "@/format";
import { estimateMileage, type MileageReading } from "@/mileage/estimate-mileage";

const CENTS_PER_EURO = 100;

const MILEAGE_ESTIMATE_HELP =
  "Idéal pour enregistrer un ancien entretien dont vous ne connaissez plus le kilométrage. " +
  "Le calcul part des relevés qui encadrent la date choisie (kilométrage initial, entretiens " +
  "déjà saisis) et suppose un rythme de roulage régulier entre eux. Après le dernier relevé, il " +
  "prolonge le rythme de la dernière année connue. Résultat arrondi à la centaine.";

export type MaintenanceRecordDraft = Omit<MaintenanceRecordFormValues, "mileage" | "costCents"> & {
  mileage: string;
  cost: string;
};

export function emptyMaintenanceRecordDraft(): MaintenanceRecordDraft {
  return {
    date: todayIsoDate(),
    mileage: "",
    type: "",
    details: "",
    cost: "",
  };
}

export function toCostDraft(costCents: number | null): string {
  return costCents === null ? "" : (costCents / CENTS_PER_EURO).toFixed(2);
}

function toCostCents(cost: string): number | null {
  return cost.trim() === "" ? null : Math.round(Number(cost) * CENTS_PER_EURO);
}

export function toMaintenanceRecordValues({
  cost,
  mileage,
  ...draft
}: MaintenanceRecordDraft): MaintenanceRecordFormValues {
  return { ...draft, mileage: Number(mileage), costCents: toCostCents(cost) };
}

interface MaintenanceRecordFormProps {
  mileageReadings: readonly MileageReading[];
  onCreate: (values: MaintenanceRecordFormValues) => Promise<MaintenanceRecord>;
  onAttach: (recordId: string, files: readonly File[]) => Promise<void>;
}

export function MaintenanceRecordForm({
  mileageReadings,
  onCreate,
  onAttach,
}: MaintenanceRecordFormProps) {
  const [draft, setDraft] = useState<MaintenanceRecordDraft>(emptyMaintenanceRecordDraft);
  const [files, setFiles] = useState<File[]>([]);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const estimatedMileage = estimateMileage(mileageReadings, draft.date);

  function selectFiles(event: ChangeEvent<HTMLInputElement>): void {
    setFiles(Array.from(event.target.files ?? []));
  }

  function reset(): void {
    setDraft(emptyMaintenanceRecordDraft());
    setFiles([]);
    setFileInputKey((key) => key + 1);
  }

  // L'entretien est créé avant l'envoi des fichiers : le formulaire est vidé
  // dès cette étape pour qu'un échec d'envoi ne pousse pas à le recréer.
  async function submit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setError(null);

    const pendingFiles = files;
    let record: MaintenanceRecord;
    try {
      record = await onCreate(toMaintenanceRecordValues(draft));
    } catch (creationError) {
      setError(errorMessage(creationError));
      return;
    }
    reset();

    if (pendingFiles.length === 0) {
      return;
    }
    try {
      await onAttach(record.id, pendingFiles);
    } catch (uploadError) {
      setError(`Entretien ajouté, mais justificatifs refusés : ${errorMessage(uploadError)}`);
    }
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
          placeholder={
            estimatedMileage === null ? undefined : `≈ ${formatMileage(estimatedMileage)}`
          }
          value={draft.mileage}
          onChange={(event) => setDraft({ ...draft, mileage: event.target.value })}
          required
        />
        <span className="with-tooltip">
          <button
            type="button"
            className="btn-link"
            aria-describedby="mileage-estimate-help"
            disabled={estimatedMileage === null}
            onClick={() => setDraft({ ...draft, mileage: String(estimatedMileage) })}
          >
            Déduire depuis l'historique
          </button>
          <span role="tooltip" id="mileage-estimate-help" className="tooltip">
            {MILEAGE_ESTIMATE_HELP}
          </span>
        </span>
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
      <div className="field">
        <label htmlFor="cost">Coût (€)</label>
        <input
          id="cost"
          type="number"
          inputMode="decimal"
          min={0}
          step={0.01}
          value={draft.cost}
          onChange={(event) => setDraft({ ...draft, cost: event.target.value })}
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
      <div className="field field-wide">
        <label htmlFor="attachments">Justificatifs</label>
        <input
          key={fileInputKey}
          id="attachments"
          type="file"
          multiple
          accept={ACCEPTED_ATTACHMENT_TYPES}
          onChange={selectFiles}
        />
        <span className="hint">{ATTACHMENT_HINT}</span>
      </div>
      {error && <p className="error field-wide">{error}</p>}
      <button type="submit" className="btn btn-primary">
        Ajouter
      </button>
    </form>
  );
}
