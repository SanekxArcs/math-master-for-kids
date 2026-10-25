import { Suspense, lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { PairLanding } from "@/pair/PairLanding";
import { StartScreen } from "@/game/StartScreen";

/**
 * The dashboard is loaded on demand, and deliberately so.
 *
 * It is the parent's tool: charts, tables, a settings form, a login. A child's
 * tablet opens the game a hundred times and the dashboard never — so none of
 * that belongs in the bundle every one of those visits pays for, nor in the
 * service worker's precache, which downloads it to the device whether it is
 * ever used or not.
 */
const ParentRoute = lazy(() =>
  import("@/parent/ParentRoute").then((module) => ({ default: module.ParentRoute })),
);

/** The owner's page, on demand for the same reason: no tablet ever opens it. */
const AdminRoute = lazy(() =>
  import("@/admin/AdminRoute").then((module) => ({ default: module.AdminRoute })),
);

const PlayRoute = lazy(() =>
  import("@/game/PlayRoute").then((module) => ({ default: module.PlayRoute })),
);

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<StartScreen />} />
      <Route path="/play" element={<Suspense fallback={<Loading />}><PlayRoute /></Suspense>} />
      <Route path="/pets" element={<Suspense fallback={<Loading />}><PlayRoute view="pets" /></Suspense>} />
      <Route path="/horse" element={<Navigate to="/pets" replace />} />
      {/* The owner's page, loaded on demand like the dashboard. */}
      <Route
        path="/admin"
        element={
          <Suspense fallback={<Loading />}>
            <AdminRoute />
          </Suspense>
        }
      />
      {/* Where a scanned pairing QR code opens. */}
      <Route path="/pair" element={<PairLanding />} />
      <Route
        path="/parent/*"
        element={
          <Suspense fallback={<Loading />}>
            <ParentRoute />
          </Suspense>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function Loading() {
  return (
    <main className="flex min-h-dvh items-center justify-center">
      <Loader2 className="size-8 animate-spin text-primary" aria-label="Loading" />
    </main>
  );
}
