import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

const container = document.getElementById("node-container");
if (!container) {
  console.error("Could not find node-container element");
} else {
  console.log("Found container:", container);
  createRoot(container).render(<App />);
}