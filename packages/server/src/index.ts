import "dotenv/config";
import { creerApp } from "./app";
import { env } from "./env";

const app = creerApp();

app.listen(env.port, () => {
  console.log(`Serveur HistoCar démarré sur http://localhost:${env.port}`);
});
