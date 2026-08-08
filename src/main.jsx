import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import { initButtonSoundListener } from "./lib/sounds";

initButtonSoundListener();

createRoot(document.getElementById("root")).render(<App />);
