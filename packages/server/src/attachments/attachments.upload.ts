import multer from "multer";

const MEGABYTE = 1024 * 1024;
export const MAX_ATTACHMENT_BYTES = 10 * MEGABYTE;
export const MAX_FILES_PER_UPLOAD = 5;
export const UPLOAD_FIELD_NAME = "files";

// En mémoire plutôt que sur disque : le type réel doit être vérifié avant
// d'écrire quoi que ce soit dans le répertoire des justificatifs.
export const receiveAttachmentFiles = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_ATTACHMENT_BYTES, files: MAX_FILES_PER_UPLOAD },
  defParamCharset: "utf8",
}).array(UPLOAD_FIELD_NAME, MAX_FILES_PER_UPLOAD);
