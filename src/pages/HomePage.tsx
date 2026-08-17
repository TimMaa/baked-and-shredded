import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useTheme } from "next-themes";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Dumbbell, ListChecks, Play, BarChart3, Download, Upload, Sun, Moon } from "lucide-react";
import { exportAllData, importData } from "@/lib/dataTransfer";

const features = [
  {
    to: "/exercises",
    icon: Dumbbell,
    title: "Manage Exercises",
    description: "Build your exercise library with muscle group targeting",
  },
  {
    to: "/workouts",
    icon: ListChecks,
    title: "Build Workouts",
    description: "Create workout plans from your exercise library",
  },
  {
    to: "/execute",
    icon: Play,
    title: "Execute Workout",
    description: "Track sets and reps in real-time during your session",
  },
  {
    to: "/history",
    icon: BarChart3,
    title: "History & Analytics",
    description: "Review performance trends and deviation patterns",
  },
];

export function HomePage() {
  const { theme, setTheme } = useTheme();
  const fileRef = useRef<HTMLInputElement>(null);
  const [importMessage, setImportMessage] = useState<{ success: boolean; text: string } | null>(null);

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const result = await importData(file);
    setImportMessage({ success: result.success, text: result.message });
    if (fileRef.current) fileRef.current.value = "";
    setTimeout(() => setImportMessage(null), 5000);
  };

  return (
    <div className="space-y-8">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-primary">
          Baked & Shredded
        </h1>
        <p className="text-muted-foreground">
          Cultivate strength through mindful training
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {features.map(({ to, icon: Icon, title, description }) => (
          <Link key={to} to={to} className="no-underline">
            <Card className="h-full transition-colors hover:border-primary/50">
              <CardContent className="flex flex-col items-center gap-2 pt-4 text-center">
                <Icon className="size-8 text-primary" />
                <h2 className="text-sm font-medium">{title}</h2>
                <p className="text-xs text-muted-foreground">{description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Separator />

      <div className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground">Settings</h3>

        <div className="flex items-center justify-between">
          <span className="text-sm">Theme</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            {theme === "dark" ? <Sun className="size-3.5" /> : <Moon className="size-3.5" />}
            {theme === "dark" ? "Light" : "Dark"}
          </Button>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm">Export data</span>
          <Button variant="outline" size="sm" onClick={exportAllData}>
            <Download className="size-3.5" /> Export
          </Button>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm">Import data</span>
          <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
            <Upload className="size-3.5" /> Import
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept=".json"
            onChange={handleImport}
            className="hidden"
          />
        </div>

        {importMessage && (
          <p className={`text-xs ${importMessage.success ? "text-success" : "text-destructive"}`}>
            {importMessage.text}
          </p>
        )}
      </div>
    </div>
  );
}
