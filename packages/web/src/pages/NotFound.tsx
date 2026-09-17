import { Link } from "react-router-dom";

export function NotFound() {
  return (
    <main className="page-centree">
      <div className="carte page-introuvable">
        <h1>404</h1>
        <p>Cette page n'existe pas.</p>
        <Link to="/">
          <button type="button" className="btn btn-primaire">
            Retour à l'accueil
          </button>
        </Link>
      </div>
    </main>
  );
}
