import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import { App } from "./App";
import "./styles.css";

registerSW({ immediate: true });

const conteneur = document.getElementById("root");
if (!conteneur) {
  throw new Error("Élément #root introuvable");
}

createRoot(conteneur).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
