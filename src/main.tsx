import { StrictMode, useLayoutEffect } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ConvexProvider } from "convex/react";
import { MotionConfig } from "@/lib/motion";
import "@fontsource-variable/nunito";
import { useReducedMotion } from "@/lib/motionPreference";
import App from "./App.tsx";
import { convex } from "./lib/convex.ts";
import { I18nProvider } from "./i18n/useI18n.tsx";
import { ErrorBoundary } from "./ErrorBoundary.tsx";
import "./index.css";
import { isChunkLoadError, recoverChunkError } from "./lib/chunkRecovery";

window.addEventListener("vite:preloadError", event => {
  const error = (event as Event & { payload?: unknown }).payload;
  if (!isChunkLoadError(error)) return;
  void recoverChunkError(error);
});

// Follow the device's light/dark setting live, as it changes at dusk.
const darkQuery = window.matchMedia?.("(prefers-color-scheme: dark)");
const applyScheme = () => document.documentElement.classList.toggle("dark", Boolean(darkQuery?.matches));
applyScheme();
darkQuery?.addEventListener?.("change", applyScheme);

const root = document.getElementById("root");
if (!root) throw new Error("Root element #root is missing from index.html");

// Keep CSS and JavaScript motion in step with the device preference.
function MotionPreferences({ children }: { children: React.ReactNode }) {
  const reduced = useReducedMotion();
  useLayoutEffect(() => {
    document.documentElement.classList.toggle("reduce-motion", reduced);
  }, [reduced]);
  return <MotionConfig reducedMotion={reduced ? "always" : "never"}>{children}</MotionConfig>;
}

const tree = (
  <ErrorBoundary>
    <MotionPreferences>
      <I18nProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </I18nProvider>
    </MotionPreferences>
  </ErrorBoundary>
);

createRoot(root).render(
  <StrictMode>
    {convex ? <ConvexProvider client={convex}>{tree}</ConvexProvider> : tree}
  </StrictMode>,
);
