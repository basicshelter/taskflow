import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { stories } from "./stories";
import "./styles.scss";

const storyName = new URLSearchParams(window.location.search).get("story");
const Story = storyName ? stories[storyName] : undefined;

if (!Story) {
  throw new Error(`Unknown component story: ${storyName ?? "(missing)"}`);
}

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Component story root element is missing.");
}

createRoot(rootElement).render(
  <StrictMode>
    <Story />
  </StrictMode>,
);
