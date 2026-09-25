// Doit rester aligné sur les formats reconnus par le serveur. Lister
// image/jpeg plutôt que image/* fait convertir en JPEG les photos HEIC d'iOS.
export const ACCEPTED_ATTACHMENT_TYPES = "application/pdf,image/jpeg,image/png";
export const ATTACHMENT_HINT = "PDF, JPEG ou PNG — 10 Mo et 5 fichiers maximum par envoi.";

const UNEXPECTED_ERROR = "Erreur inattendue";

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : UNEXPECTED_ERROR;
}
