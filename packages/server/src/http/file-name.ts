// Les valeurs saisies par l'utilisateur sont réduites à de l'ASCII : cela
// évite guillemets et retours chariot dans l'en-tête Content-Disposition.
export function buildVehicleFileName(prefix: string, licensePlate: string): string {
  const slug = licensePlate
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();

  return `${prefix}-${slug || "vehicule"}.pdf`;
}

// RFC 5987 : encodeURIComponent laisse passer ' ( ) * que la syntaxe
// ext-value interdit.
export function inlineContentDisposition(fileName: string): string {
  const encoded = encodeURIComponent(fileName).replace(
    /['()*]/g,
    (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );
  return `inline; filename*=UTF-8''${encoded}`;
}
