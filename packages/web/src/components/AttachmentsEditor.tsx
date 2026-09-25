import { type ChangeEvent, useState } from "react";
import { api, type MaintenanceRecord } from "@/api/client";
import {
  ACCEPTED_ATTACHMENT_TYPES,
  ATTACHMENT_HINT,
  errorMessage,
} from "@/components/attachment-files";

const BYTES_PER_KILOBYTE = 1024;
const DELETE_ATTACHMENT_CONFIRMATION = "Supprimer ce justificatif ?";

function formatSize(sizeBytes: number): string {
  const kilobytes = sizeBytes / BYTES_PER_KILOBYTE;
  return kilobytes < BYTES_PER_KILOBYTE
    ? `${Math.ceil(kilobytes)} Ko`
    : `${(kilobytes / BYTES_PER_KILOBYTE).toFixed(1)} Mo`;
}

interface AttachmentsEditorProps {
  vehicleId: string;
  record: MaintenanceRecord;
  onChange: () => Promise<void>;
}

export function AttachmentsEditor({ vehicleId, record, onChange }: AttachmentsEditorProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(event: ChangeEvent<HTMLInputElement>): Promise<void> {
    const input = event.target;
    const files = Array.from(input.files ?? []);
    if (files.length === 0) {
      return;
    }

    setError(null);
    setIsUploading(true);
    try {
      await api.uploadAttachments(vehicleId, record.id, files);
      await onChange();
    } catch (uploadError) {
      setError(errorMessage(uploadError));
    } finally {
      setIsUploading(false);
      input.value = "";
    }
  }

  async function remove(attachmentId: string): Promise<void> {
    if (!window.confirm(DELETE_ATTACHMENT_CONFIRMATION)) {
      return;
    }

    setError(null);
    try {
      await api.deleteAttachment(vehicleId, record.id, attachmentId);
      await onChange();
    } catch (deleteError) {
      setError(errorMessage(deleteError));
    }
  }

  return (
    <div className="attachments-editor">
      <span className="attachments-title">Justificatifs</span>
      {record.attachments.length > 0 ? (
        <ul className="attachment-list">
          {record.attachments.map((attachment) => (
            <li key={attachment.id}>
              <a
                href={api.attachmentUrl(vehicleId, record.id, attachment.id)}
                target="_blank"
                rel="noreferrer"
              >
                {attachment.originalName}
              </a>
              <span className="hint">{formatSize(attachment.sizeBytes)}</span>
              <button
                type="button"
                className="btn-icon btn-icon-neutral"
                title="Supprimer le justificatif"
                aria-label={`Supprimer ${attachment.originalName}`}
                onClick={() => remove(attachment.id)}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <input
        type="file"
        multiple
        accept={ACCEPTED_ATTACHMENT_TYPES}
        aria-label="Ajouter des justificatifs"
        disabled={isUploading}
        onChange={upload}
      />
      <span className="hint">{isUploading ? "Envoi en cours..." : ATTACHMENT_HINT}</span>
      {error && <p className="error">{error}</p>}
    </div>
  );
}
