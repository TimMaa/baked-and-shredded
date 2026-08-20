import { BrowserRouter, Routes, Route, Navigate, useParams } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AppShell } from "@/components/layout/AppShell";
import { HomePage } from "@/pages/HomePage";
import { LibraryPage } from "@/pages/LibraryPage";
import { WorkoutDetailPage } from "@/pages/WorkoutDetailPage";
import { ExecutePage } from "@/pages/ExecutePage";
import { HistoryPage } from "@/pages/HistoryPage";
import { ExerciseDrilldownPage } from "@/pages/ExerciseDrilldownPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { usePWA } from "@/hooks/usePWA";

function RedirectWorkoutDetail() {
  const { id } = useParams();
  return <Navigate to={`/library/workout/${id}`} replace />;
}

export default function App() {
  const { canInstall, install, updateAvailable, reloadForUpdate, isOnline } = usePWA();

  return (
    <ThemeProvider attribute="class" defaultTheme="light">
      <BrowserRouter>
        <AppShell>
          {!isOnline && (
            <div className="bg-destructive px-4 py-1.5 text-center text-xs text-destructive-foreground">
              You're offline — your data is safe locally
            </div>
          )}
          {updateAvailable && (
            <div className="flex items-center justify-between bg-primary px-4 py-2 text-primary-foreground">
              <span className="text-sm">App update available</span>
              <button onClick={reloadForUpdate} className="rounded bg-primary-foreground px-3 py-1 text-xs font-medium text-primary">
                Reload
              </button>
            </div>
          )}
          {canInstall && (
            <div className="flex items-center justify-between bg-primary px-4 py-2 text-primary-foreground">
              <span className="text-sm">Install Baked & Shredded</span>
              <button onClick={install} className="rounded bg-primary-foreground px-3 py-1 text-xs font-medium text-primary">
                Install
              </button>
            </div>
          )}
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/train" element={<ExecutePage />} />
            <Route path="/progress" element={<HistoryPage />} />
            <Route path="/progress/exercise/:id" element={<ExerciseDrilldownPage />} />
            <Route path="/library" element={<LibraryPage />} />
            <Route path="/library/workout/:id" element={<WorkoutDetailPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            {/* Legacy redirects */}
            <Route path="/exercises" element={<Navigate to="/library" replace />} />
            <Route path="/workouts" element={<Navigate to="/library" replace />} />
            <Route path="/workouts/:id" element={<RedirectWorkoutDetail />} />
            <Route path="/execute" element={<Navigate to="/train" replace />} />
            <Route path="/history" element={<Navigate to="/progress" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AppShell>
      </BrowserRouter>
    </ThemeProvider>
  );
}
