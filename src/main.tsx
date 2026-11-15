import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// The service worker lets the app open without a connection. It is only built for
// production; in development every change should load fresh.
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch((error: unknown) => {
      console.warn("Offline support is unavailable:", error);
    });
  });
}
