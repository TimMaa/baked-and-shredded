import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AppShell } from "@/components/layout/AppShell";
import { HomePage } from "@/pages/HomePage";
import { ExercisesPage } from "@/pages/ExercisesPage";
import { WorkoutsPage } from "@/pages/WorkoutsPage";
import { WorkoutDetailPage } from "@/pages/WorkoutDetailPage";
import { ExecutePage } from "@/pages/ExecutePage";
import { HistoryPage } from "@/pages/HistoryPage";
import { usePWA } from "@/hooks/usePWA";

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
            <Route path="/exercises" element={<ExercisesPage />} />
            <Route path="/workouts" element={<WorkoutsPage />} />
            <Route path="/workouts/:id" element={<WorkoutDetailPage />} />
            <Route path="/execute" element={<ExecutePage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AppShell>
      </BrowserRouter>
    </ThemeProvider>
  );
}
