import { type FormEvent, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export function Login() {
  const { username, signIn } = useAuth();
  const navigate = useNavigate();
  const [submittedUsername, setSubmittedUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (username) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setError(null);
    try {
      await signIn(submittedUsername, password);
      navigate("/");
    } catch {
      setError("Identifiants incorrects");
    }
  }

  return (
    <main className="centered-page">
      <form className="card form login-form" onSubmit={handleSubmit}>
        <h1 className="login-title">HistoCar</h1>
        <div className="field">
          <label htmlFor="username">Utilisateur</label>
          <input
            id="username"
            value={submittedUsername}
            onChange={(event) => setSubmittedUsername(event.target.value)}
            autoComplete="username"
            required
          />
        </div>
        <div className="field">
          <label htmlFor="password">Mot de passe</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
          />
        </div>
        {error && <p className="error">{error}</p>}
        <button type="submit" className="btn btn-primary">
          Se connecter
        </button>
        <p className="form-footer">
          Pas encore de compte ? <Link to="/register">Créer un compte</Link>
        </p>
      </form>
    </main>
  );
}
