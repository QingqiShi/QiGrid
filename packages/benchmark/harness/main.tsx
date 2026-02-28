import { createRoot } from "react-dom/client";
import { App } from "./App";

// biome-ignore lint/style/noNonNullAssertion: root element always exists in harness HTML
createRoot(document.getElementById("root")!).render(<App />);
