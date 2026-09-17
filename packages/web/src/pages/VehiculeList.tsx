import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { api, type Vehicule, type VehiculeFormValues } from "../api/client";
import { useAuth } from "../context/AuthContext";

const VALEURS_INITIALES: VehiculeFormValues = {
  marque: "",
  modele: "",
  immatriculation: "",
  annee: new Date().getFullYear(),
  kilometrageActuel: 0,
  motorisation: "",
  capaciteHuile: "",
  intervalleVidange: "",
};

export function VehiculeList() {
  const { deconnecter } = useAuth();
  const [vehicules, setVehicules] = useState<Vehicule[]>([]);
  const [afficherFormulaire, setAfficherFormulaire] = useState(false);
  const [valeurs, setValeurs] = useState<VehiculeFormValues>(VALEURS_INITIALES);

  useEffect(() => {
    api.listerVehicules().then(setVehicules);
  }, []);

  async function ajouterVehicule(evenement: FormEvent): Promise<void> {
    evenement.preventDefault();
    const vehicule = await api.creerVehicule(valeurs);
    setVehicules((actuels) => [...actuels, vehicule]);
    setValeurs(VALEURS_INITIALES);
    setAfficherFormulaire(false);
  }

  return (
    <main className="page">
      <header className="entete">
        <h1>Mes véhicules</h1>
        <button type="button" className="btn btn-fantome" onClick={() => deconnecter()}>
          Déconnexion
        </button>
      </header>

      {vehicules.length === 0 && !afficherFormulaire ? (
        <div className="carte etat-vide">
          <p>Aucun véhicule pour l'instant.</p>
          <button type="button" className="btn btn-primaire" onClick={() => setAfficherFormulaire(true)}>
            + Ajouter un véhicule
          </button>
        </div>
      ) : (
        <ul className="liste-vehicules">
          {vehicules.map((vehicule) => (
            <li key={vehicule.id}>
              <Link to={`/vehicules/${vehicule.id}`} className="carte carte-lien">
                <strong>
                  {vehicule.marque} {vehicule.modele}
                </strong>
                <span>{vehicule.immatriculation}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {afficherFormulaire ? (
        <form className="carte formulaire" onSubmit={ajouterVehicule}>
          <div className="champ">
            <label htmlFor="marque">Marque</label>
            <input
              id="marque"
              value={valeurs.marque}
              onChange={(e) => setValeurs({ ...valeurs, marque: e.target.value })}
              required
            />
          </div>
          <div className="champ">
            <label htmlFor="modele">Modèle</label>
            <input
              id="modele"
              value={valeurs.modele}
              onChange={(e) => setValeurs({ ...valeurs, modele: e.target.value })}
              required
            />
          </div>
          <div className="champ">
            <label htmlFor="immatriculation">Immatriculation</label>
            <input
              id="immatriculation"
              value={valeurs.immatriculation}
              onChange={(e) => setValeurs({ ...valeurs, immatriculation: e.target.value })}
              required
            />
          </div>
          <div className="champ">
            <label htmlFor="annee">Année</label>
            <input
              id="annee"
              type="number"
              value={valeurs.annee}
              onChange={(e) => setValeurs({ ...valeurs, annee: Number(e.target.value) })}
              required
            />
          </div>
          <div className="champ">
            <label htmlFor="kilometrageActuel">Kilométrage actuel</label>
            <input
              id="kilometrageActuel"
              type="number"
              value={valeurs.kilometrageActuel}
              onChange={(e) => setValeurs({ ...valeurs, kilometrageActuel: Number(e.target.value) })}
              required
            />
          </div>
          <div className="champ">
            <label htmlFor="motorisation">Motorisation</label>
            <input
              id="motorisation"
              value={valeurs.motorisation}
              onChange={(e) => setValeurs({ ...valeurs, motorisation: e.target.value })}
              required
            />
          </div>
          <div className="champ">
            <label htmlFor="capaciteHuile">Capacité huile</label>
            <input
              id="capaciteHuile"
              value={valeurs.capaciteHuile}
              onChange={(e) => setValeurs({ ...valeurs, capaciteHuile: e.target.value })}
              required
            />
          </div>
          <div className="champ">
            <label htmlFor="intervalleVidange">Intervalle vidange</label>
            <input
              id="intervalleVidange"
              value={valeurs.intervalleVidange}
              onChange={(e) => setValeurs({ ...valeurs, intervalleVidange: e.target.value })}
              required
            />
          </div>
          <div className="actions-formulaire">
            <button type="submit" className="btn btn-primaire">
              Ajouter
            </button>
            <button type="button" className="btn btn-secondaire" onClick={() => setAfficherFormulaire(false)}>
              Annuler
            </button>
          </div>
        </form>
      ) : vehicules.length > 0 ? (
        <button type="button" className="btn btn-primaire" onClick={() => setAfficherFormulaire(true)}>
          + Ajouter un véhicule
        </button>
      ) : null}
    </main>
  );
}
