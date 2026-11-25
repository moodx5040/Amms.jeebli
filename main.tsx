import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
  window.addEventListener("load", () => {
    const workerUrl = new URL("./service-worker.js", document.baseURI);
    navigator.serviceWorker.register(workerUrl).catch((error) => {
      console.warn("PWA service worker registration failed:", error);
    });
  });
}

createRoot(document.getElementById("root")!).render(<App />);
