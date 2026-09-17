import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { api, type EntretienFormValues, type VehiculeAvecEntretiens } from "../api/client";

const VALEURS_INITIALES: EntretienFormValues = {
  date: new Date().toISOString().slice(0, 10),
  kilometrage: 0,
  type: "",
  details: "",
};

export function VehiculeDetail() {
  const { id } = useParams<{ id: string }>();
  const vehiculeId = id as string;
  const [vehicule, setVehicule] = useState<VehiculeAvecEntretiens | null>(null);
  const [valeurs, setValeurs] = useState<EntretienFormValues>(VALEURS_INITIALES);
  const [horodatageRendu, setHorodatageRendu] = useState(Date.now());
  const [entretienEnEdition, setEntretienEnEdition] = useState<string | null>(null);
  const [valeursEdition, setValeursEdition] = useState<EntretienFormValues>(VALEURS_INITIALES);

  const recharger = useCallback(async () => {
    const donnees = await api.obtenirVehicule(vehiculeId);
    setVehicule(donnees);
    setHorodatageRendu(Date.now());
  }, [vehiculeId]);

  useEffect(() => {
    recharger();
  }, [recharger]);

  async function ajouterEntretien(evenement: FormEvent): Promise<void> {
    evenement.preventDefault();
    await api.creerEntretien(vehiculeId, valeurs);
    setValeurs(VALEURS_INITIALES);
    await recharger();
  }

  async function supprimerEntretien(entretienId: string): Promise<void> {
    if (!window.confirm("Supprimer cette ligne d'entretien ?")) {
      return;
    }
    await api.supprimerEntretien(vehiculeId, entretienId);
    await recharger();
  }

  function commencerEdition(entretien: VehiculeAvecEntretiens["entretiens"][number]): void {
    setEntretienEnEdition(entretien.id);
    setValeursEdition({
      date: entretien.date.slice(0, 10),
      kilometrage: entretien.kilometrage,
      type: entretien.type,
      details: entretien.details,
    });
  }

  function annulerEdition(): void {
    setEntretienEnEdition(null);
  }

  async function enregistrerEdition(entretienId: string): Promise<void> {
    await api.modifierEntretien(vehiculeId, entretienId, valeursEdition);
    setEntretienEnEdition(null);
    await recharger();
  }

  if (!vehicule) {
    return <p className="chargement">Chargement...</p>;
  }

  return (
    <main className="page">
      <header className="entete">
        <div className="entete-liens">
          <Link to="/" className="lien-retour">
            ← Véhicules
          </Link>
          <h1>
            {vehicule.marque} {vehicule.modele}
          </h1>
        </div>
      </header>

      <section className="carte">
        <h2>Ajouter un entretien</h2>
        <form className="formulaire formulaire-ligne" onSubmit={ajouterEntretien}>
          <div className="champ">
            <label htmlFor="date">Date</label>
            <input
              id="date"
              type="date"
              value={valeurs.date}
              onChange={(e) => setValeurs({ ...valeurs, date: e.target.value })}
              required
            />
          </div>
          <div className="champ">
            <label htmlFor="kilometrage">Kilométrage</label>
            <input
              id="kilometrage"
              type="number"
              value={valeurs.kilometrage}
              onChange={(e) => setValeurs({ ...valeurs, kilometrage: Number(e.target.value) })}
              required
            />
          </div>
          <div className="champ">
            <label htmlFor="type">Type</label>
            <input
              id="type"
              value={valeurs.type}
              onChange={(e) => setValeurs({ ...valeurs, type: e.target.value })}
              required
            />
          </div>
          <div className="champ">
            <label htmlFor="details">Détails</label>
            <textarea
              id="details"
              value={valeurs.details}
              onChange={(e) => setValeurs({ ...valeurs, details: e.target.value })}
              required
            />
          </div>
          <button type="submit" className="btn btn-primaire">
            Ajouter
          </button>
        </form>
      </section>

      <section className="carte">
        <h2>Historique</h2>
        <div className="tableau-scroll">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Km</th>
                <th>Type</th>
                <th>Détails</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {vehicule.entretiens.map((entretien) =>
                entretienEnEdition === entretien.id ? (
                  <tr key={entretien.id}>
                    <td data-label="Date">
                      <input
                        type="date"
                        value={valeursEdition.date}
                        onChange={(e) => setValeursEdition({ ...valeursEdition, date: e.target.value })}
                      />
                    </td>
                    <td data-label="Km">
                      <input
                        type="number"
                        value={valeursEdition.kilometrage}
                        onChange={(e) =>
                          setValeursEdition({ ...valeursEdition, kilometrage: Number(e.target.value) })
                        }
                      />
                    </td>
                    <td data-label="Type">
                      <input
                        value={valeursEdition.type}
                        onChange={(e) => setValeursEdition({ ...valeursEdition, type: e.target.value })}
                      />
                    </td>
                    <td data-label="Détails">
                      <textarea
                        value={valeursEdition.details}
                        onChange={(e) => setValeursEdition({ ...valeursEdition, details: e.target.value })}
                      />
                    </td>
                    <td className="actions-ligne" data-label="Actions">
                      <button
                        type="button"
                        className="btn-icone btn-icone-succes"
                        title="Enregistrer"
                        aria-label="Enregistrer"
                        onClick={() => enregistrerEdition(entretien.id)}
                      >
                        ✓
                      </button>
                      <button
                        type="button"
                        className="btn-icone btn-icone-neutre"
                        title="Annuler"
                        aria-label="Annuler"
                        onClick={annulerEdition}
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ) : (
                  <tr key={entretien.id}>
                    <td data-label="Date">{new Date(entretien.date).toLocaleDateString("fr-FR")}</td>
                    <td data-label="Km">{entretien.kilometrage.toLocaleString("fr-FR")}</td>
                    <td data-label="Type">{entretien.type}</td>
                    <td data-label="Détails">{entretien.details}</td>
                    <td className="actions-ligne" data-label="Actions">
                      <button
                        type="button"
                        className="btn-icone btn-icone-neutre"
                        title="Modifier"
                        aria-label="Modifier"
                        onClick={() => commencerEdition(entretien)}
                      >
                        🔧
                      </button>
                      <button
                        type="button"
                        className="btn-icone btn-icone-danger"
                        title="Supprimer"
                        aria-label="Supprimer"
                        onClick={() => supprimerEntretien(entretien.id)}
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="carte">
        <div className="entete">
          <h2>Rendu (aperçu, impression = PDF)</h2>
          <a href={api.urlRendu(vehiculeId)} target="_blank" rel="noreferrer">
            <button type="button" className="btn btn-secondaire">
              Ouvrir le document
            </button>
          </a>
        </div>
        <iframe
          key={horodatageRendu}
          title="Rendu historique"
          className="apercu-rendu"
          src={`${api.urlRendu(vehiculeId)}?t=${horodatageRendu}`}
        />
      </section>
    </main>
  );
}
