import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import ErrorBoundary from "./ErrorBoundary";
import "./styles.css";

const root = document.getElementById("root");

if (!root) {
  throw new Error("No se encontró el contenedor raíz de Micro app.");
}

createRoot(root).render(
  <React.StrictMode>
    <ErrorBoundary><App /></ErrorBoundary>
  </React.StrictMode>,
);
