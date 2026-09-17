import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import type { Entretien, Vehicule } from "@prisma/client";

const DOSSIER_RENDUS = join(__dirname, "..", "..", "storage", "renders");

function cheminRendu(vehiculeId: string): string {
  return join(DOSSIER_RENDUS, `${vehiculeId}.html`);
}

function formaterDate(date: Date): string {
  const jour = String(date.getUTCDate()).padStart(2, "0");
  const mois = String(date.getUTCMonth() + 1).padStart(2, "0");
  const annee = date.getUTCFullYear();
  return `${jour}/${mois}/${annee}`;
}

function formaterKilometrage(kilometrage: number): string {
  const chiffres = Math.trunc(kilometrage).toString();
  const groupe = chiffres.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${groupe} km`;
}

function construireLignesReparations(entretiens: readonly Entretien[]): string {
  const trie = [...entretiens].sort((a, b) => b.date.getTime() - a.date.getTime());
  return trie
    .map(
      (entretien) =>
        "<tr>" +
        `<td>${formaterDate(entretien.date)}</td>` +
        `<td>${formaterKilometrage(entretien.kilometrage)}</td>` +
        `<td>${entretien.type}</td>` +
        `<td>${entretien.details}</td>` +
        "</tr>",
    )
    .join("\n");
}

function construireHtml(vehicule: Vehicule, entretiens: readonly Entretien[]): string {
  const lignesReparations = construireLignesReparations(entretiens);
  const dateGeneration = formaterDate(new Date());

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>Historique d'entretien - ${vehicule.marque} ${vehicule.modele}</title>
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
  .sous-titre {
    color: #555;
    margin-top: 0;
    margin-bottom: 0.9rem;
    font-size: 0.85rem;
  }
  .infos-vehicule {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.25rem 2rem;
    background: #f4f4f4;
    border-radius: 6px;
    padding: 0.6rem 1.1rem;
    margin-bottom: 0.9rem;
    font-size: 0.9rem;
  }
  .infos-vehicule span.label {
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
  .bouton-impression {
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
  <button type="button" class="no-print bouton-impression" onclick="window.print()">Imprimer</button>
  <h1>Historique d'entretien du véhicule</h1>
  <p class="sous-titre">Document généré le ${dateGeneration}</p>

  <div class="infos-vehicule">
    <div><span class="label">Marque :</span> ${vehicule.marque}</div>
    <div><span class="label">Modèle :</span> ${vehicule.modele}</div>
    <div><span class="label">Immatriculation :</span> ${vehicule.immatriculation}</div>
    <div><span class="label">Année :</span> ${vehicule.annee}</div>
    <div><span class="label">Kilométrage actuel :</span> ${formaterKilometrage(vehicule.kilometrageActuel)}</div>
    <div><span class="label">Motorisation :</span> ${vehicule.motorisation}</div>
    <div><span class="label">Capacité huile :</span> ${vehicule.capaciteHuile}</div>
    <div><span class="label">Intervalle vidange préconisé :</span> ${vehicule.intervalleVidange}</div>
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
      ${lignesReparations}
    </tbody>
  </table>

  <footer>
    Document fourni à titre informatif pour l'historique d'entretien du véhicule.
  </footer>
</body>
</html>
`;
}

export function regenererRendu(vehicule: Vehicule, entretiens: readonly Entretien[]): void {
  mkdirSync(DOSSIER_RENDUS, { recursive: true });
  const html = construireHtml(vehicule, entretiens);
  writeFileSync(cheminRendu(vehicule.id), html, "utf-8");
}

export function cheminRenduVehicule(vehiculeId: string): string {
  return cheminRendu(vehiculeId);
}
