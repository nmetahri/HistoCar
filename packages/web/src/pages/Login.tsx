import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function Login() {
  const { username, connecter } = useAuth();
  const navigate = useNavigate();
  const [usernameSaisi, setUsernameSaisi] = useState("");
  const [password, setPassword] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);

  if (username) {
    return <Navigate to="/" replace />;
  }

  async function soumettre(evenement: FormEvent): Promise<void> {
    evenement.preventDefault();
    setErreur(null);
    try {
      await connecter(usernameSaisi, password);
      navigate("/");
    } catch {
      setErreur("Identifiants incorrects");
    }
  }

  return (
    <main className="page-centree">
      <form className="carte formulaire formulaire-connexion" onSubmit={soumettre}>
        <h1 className="titre-connexion">HistoCar</h1>
        <div className="champ">
          <label htmlFor="username">Utilisateur</label>
          <input
            id="username"
            value={usernameSaisi}
            onChange={(evenement) => setUsernameSaisi(evenement.target.value)}
            autoComplete="username"
            required
          />
        </div>
        <div className="champ">
          <label htmlFor="password">Mot de passe</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(evenement) => setPassword(evenement.target.value)}
            autoComplete="current-password"
            required
          />
        </div>
        {erreur && <p className="erreur">{erreur}</p>}
        <button type="submit" className="btn btn-primaire">
          Se connecter
        </button>
      </form>
    </main>
  );
}
