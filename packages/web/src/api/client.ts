const API_URL = import.meta.env["VITE_API_URL"] as string;

export interface Vehicule {
  id: string;
  marque: string;
  modele: string;
  immatriculation: string;
  annee: number;
  kilometrageActuel: number;
  motorisation: string;
  capaciteHuile: string;
  intervalleVidange: string;
}

export interface Entretien {
  id: string;
  vehiculeId: string;
  date: string;
  kilometrage: number;
  type: string;
  details: string;
}

export type VehiculeAvecEntretiens = Vehicule & { entretiens: Entretien[] };

export type VehiculeFormValues = Omit<Vehicule, "id">;
export type EntretienFormValues = Omit<Entretien, "id" | "vehiculeId">;

class ApiError extends Error {}

async function requete<T>(chemin: string, options: RequestInit = {}): Promise<T> {
  const reponse = await fetch(`${API_URL}${chemin}`, {
    ...options,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...options.headers },
  });

  if (!reponse.ok) {
    const corps = (await reponse.json().catch(() => ({}))) as { message?: string };
    throw new ApiError(corps.message ?? `Erreur ${reponse.status}`);
  }

  if (reponse.status === 204) {
    return undefined as T;
  }
  return (await reponse.json()) as T;
}

export const api = {
  login: (username: string, password: string) =>
    requete<{ username: string }>("/auth/login", { method: "POST", body: JSON.stringify({ username, password }) }),
  logout: () => requete<void>("/auth/logout", { method: "POST" }),
  me: () => requete<{ username: string }>("/auth/me"),

  listerVehicules: () => requete<Vehicule[]>("/vehicules"),
  obtenirVehicule: (id: string) => requete<VehiculeAvecEntretiens>(`/vehicules/${id}`),
  creerVehicule: (donnees: VehiculeFormValues) =>
    requete<Vehicule>("/vehicules", { method: "POST", body: JSON.stringify(donnees) }),
  modifierVehicule: (id: string, donnees: Partial<VehiculeFormValues>) =>
    requete<Vehicule>(`/vehicules/${id}`, { method: "PUT", body: JSON.stringify(donnees) }),
  supprimerVehicule: (id: string) => requete<void>(`/vehicules/${id}`, { method: "DELETE" }),

  creerEntretien: (vehiculeId: string, donnees: EntretienFormValues) =>
    requete<Entretien>(`/vehicules/${vehiculeId}/entretiens`, { method: "POST", body: JSON.stringify(donnees) }),
  modifierEntretien: (vehiculeId: string, id: string, donnees: Partial<EntretienFormValues>) =>
    requete<Entretien>(`/vehicules/${vehiculeId}/entretiens/${id}`, {
      method: "PUT",
      body: JSON.stringify(donnees),
    }),
  supprimerEntretien: (vehiculeId: string, id: string) =>
    requete<void>(`/vehicules/${vehiculeId}/entretiens/${id}`, { method: "DELETE" }),

  urlRendu: (vehiculeId: string) => `${API_URL}/vehicules/${vehiculeId}/rendu`,
};
