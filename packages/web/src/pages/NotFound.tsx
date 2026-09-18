import { Link } from "react-router-dom";

export function NotFound() {
  return (
    <main className="centered-page">
      <div className="card not-found">
        <h1>404</h1>
        <p>Cette page n'existe pas.</p>
        <Link to="/">
          <button type="button" className="btn btn-primary">
            Retour à l'accueil
          </button>
        </Link>
      </div>
    </main>
  );
}
