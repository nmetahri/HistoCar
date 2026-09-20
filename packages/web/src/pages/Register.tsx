import { type FormEvent, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { ApiError } from "@/api/client";
import { useAuth } from "@/context/AuthContext";

const MIN_PASSWORD_LENGTH = 10;

export function Register() {
  const { username, signUp } = useAuth();
  const navigate = useNavigate();
  const [submittedUsername, setSubmittedUsername] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (username) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    setError(null);

    if (password !== passwordConfirmation) {
      setError("Les deux mots de passe ne correspondent pas");
      return;
    }

    try {
      await signUp(submittedUsername, password, inviteCode);
      navigate("/");
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Création du compte impossible");
    }
  }

  return (
    <main className="centered-page">
      <form className="card form login-form" onSubmit={handleSubmit}>
        <h1 className="login-title">Créer un compte</h1>
        <div className="field">
          <label htmlFor="username">Utilisateur</label>
          <input
            id="username"
            value={submittedUsername}
            onChange={(event) => setSubmittedUsername(event.target.value)}
            autoComplete="username"
            minLength={3}
            maxLength={32}
            required
          />
          <small className="hint">3 à 32 caractères : lettres, chiffres, tiret ou tiret bas</small>
        </div>
        <div className="field">
          <label htmlFor="password">Mot de passe</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password"
            minLength={MIN_PASSWORD_LENGTH}
            required
          />
          <small className="hint">{MIN_PASSWORD_LENGTH} caractères minimum</small>
        </div>
        <div className="field">
          <label htmlFor="password-confirmation">Confirmer le mot de passe</label>
          <input
            id="password-confirmation"
            type="password"
            value={passwordConfirmation}
            onChange={(event) => setPasswordConfirmation(event.target.value)}
            autoComplete="new-password"
            required
          />
        </div>
        <div className="field">
          <label htmlFor="invite-code">Code d'invitation</label>
          <input
            id="invite-code"
            value={inviteCode}
            onChange={(event) => setInviteCode(event.target.value)}
            autoComplete="off"
            required
          />
        </div>
        {error && <p className="error">{error}</p>}
        <button type="submit" className="btn btn-primary">
          Créer le compte
        </button>
        <p className="form-footer">
          Déjà un compte ? <Link to="/login">Se connecter</Link>
        </p>
      </form>
    </main>
  );
}
