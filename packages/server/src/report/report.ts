import type { MaintenanceRecord, Vehicle } from "@prisma/client";

const HTML_ENTITIES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function escapeHtml(value: string | number): string {
  return String(value).replace(/[&<>"']/g, (character) => HTML_ENTITIES[character] as string);
}

export function formatDate(date: Date): string {
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const year = date.getUTCFullYear();
  return `${day}/${month}/${year}`;
}

export function formatMileage(mileage: number): string {
  const digits = Math.trunc(mileage).toString();
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${grouped} km`;
}

function buildMaintenanceRows(records: readonly MaintenanceRecord[]): string {
  const sorted = [...records].sort((a, b) => b.date.getTime() - a.date.getTime());
  return sorted
    .map(
      (record) =>
        "<tr>" +
        `<td>${formatDate(record.date)}</td>` +
        `<td>${formatMileage(record.mileage)}</td>` +
        `<td>${escapeHtml(record.type)}</td>` +
        `<td>${escapeHtml(record.details)}</td>` +
        "</tr>",
    )
    .join("\n");
}

export function buildMaintenanceReport(
  vehicle: Vehicle,
  records: readonly MaintenanceRecord[],
): string {
  const maintenanceRows = buildMaintenanceRows(records);
  const generatedOn = formatDate(new Date());
  const make = escapeHtml(vehicle.make);
  const model = escapeHtml(vehicle.model);

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>Historique d'entretien - ${make} ${model}</title>
<style>
  @page { size: A4; margin: 1cm; }
  * {
    box-sizing: border-box;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  html, body { height: 100%; }
  body {
    font-family: "Helvetica Neue", Arial, sans-serif;
    color: #1a1a1a;
    max-width: 800px;
    margin: 0 auto;
    padding: 1rem;
    line-height: 1.35;
    font-size: 1.05rem;
  }
  h1 {
    font-size: 1.6rem;
    margin: 0 0 0.2rem;
    border-bottom: 2px solid #1a1a1a;
    padding-bottom: 0.3rem;
  }
  .subtitle {
    color: #555;
    margin-top: 0;
    margin-bottom: 0.9rem;
    font-size: 0.85rem;
  }
  .vehicle-info {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.25rem 2rem;
    background: #f4f4f4;
    border-radius: 6px;
    padding: 0.6rem 1.1rem;
    margin-bottom: 0.9rem;
    font-size: 0.9rem;
  }
  .vehicle-info span.label {
    font-weight: 600;
    color: #444;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.82rem;
  }
  th, td {
    border: 1px solid #ddd;
    padding: 0.28rem 0.4rem;
    text-align: left;
    vertical-align: top;
  }
  th {
    background: #1a1a1a;
    color: #fff;
    font-weight: 600;
  }
  tr:nth-child(even) { background: #fafafa; }
  footer {
    margin-top: 0.9rem;
    font-size: 0.68rem;
    color: #888;
    border-top: 1px solid #ddd;
    padding-top: 0.3rem;
  }
  @media print {
    body { padding: 0; }
    table, tr, td, th { page-break-inside: avoid; }
    .no-print { display: none; }
  }
  .print-button {
    position: fixed;
    top: 1rem;
    right: 1rem;
    padding: 0.5rem 1rem;
    background: #1a1a1a;
    color: #fff;
    border: none;
    border-radius: 6px;
    font-size: 0.9rem;
    cursor: pointer;
  }
</style>
</head>
<body>
  <button type="button" class="no-print print-button" onclick="window.print()">Imprimer</button>
  <h1>Historique d'entretien du véhicule</h1>
  <p class="subtitle">Document généré le ${generatedOn}</p>

  <div class="vehicle-info">
    <div><span class="label">Marque :</span> ${make}</div>
    <div><span class="label">Modèle :</span> ${model}</div>
    <div><span class="label">Immatriculation :</span> ${escapeHtml(vehicle.licensePlate)}</div>
    <div><span class="label">Année :</span> ${escapeHtml(vehicle.year)}</div>
    <div><span class="label">Kilométrage actuel :</span> ${formatMileage(vehicle.currentMileage)}</div>
    <div><span class="label">Motorisation :</span> ${escapeHtml(vehicle.engine)}</div>
    <div><span class="label">Capacité huile :</span> ${escapeHtml(vehicle.oilCapacity)}</div>
    <div><span class="label">Intervalle vidange préconisé :</span> ${escapeHtml(vehicle.oilChangeInterval)}</div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Date</th>
        <th>Kilométrage</th>
        <th>Type</th>
        <th>Détails</th>
      </tr>
    </thead>
    <tbody>
      ${maintenanceRows}
    </tbody>
  </table>

  <footer>
    Document fourni à titre informatif pour l'historique d'entretien du véhicule.
  </footer>
</body>
</html>
`;
}
