import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { installRendererLogging } from "./lib/appLogger";
import "./index.css";

installRendererLogging();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
