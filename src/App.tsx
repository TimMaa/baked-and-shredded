import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AppShell } from "@/components/layout/AppShell";
import { HomePage } from "@/pages/HomePage";
import { ExercisesPage } from "@/pages/ExercisesPage";
import { WorkoutsPage } from "@/pages/WorkoutsPage";
import { WorkoutDetailPage } from "@/pages/WorkoutDetailPage";
import { ExecutePage } from "@/pages/ExecutePage";
import { HistoryPage } from "@/pages/HistoryPage";

export default function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="light">
      <BrowserRouter>
        <AppShell>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/exercises" element={<ExercisesPage />} />
            <Route path="/workouts" element={<WorkoutsPage />} />
            <Route path="/workouts/:id" element={<WorkoutDetailPage />} />
            <Route path="/execute" element={<ExecutePage />} />
            <Route path="/history" element={<HistoryPage />} />
          </Routes>
        </AppShell>
      </BrowserRouter>
    </ThemeProvider>
  );
}
