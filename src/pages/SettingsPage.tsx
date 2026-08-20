import { useRef, useState, useEffect, useCallback } from "react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Upload, Sun, Moon } from "lucide-react";
import { exportAllData, importData } from "@/lib/dataTransfer";
import * as db from "@/lib/db";
import type { UserPreferences } from "@/types";

export function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const fileRef = useRef<HTMLInputElement>(null);
  const [importMessage, setImportMessage] = useState<{ success: boolean; text: string } | null>(null);
  const [prefs, setPrefs] = useState<UserPreferences | null>(null);
  const [equipmentDraft, setEquipmentDraft] = useState("");

  useEffect(() => {
    db.getUserPreferences().then((p) => {
      setPrefs(p);
      setEquipmentDraft(p.availableEquipment);
    });
  }, []);

  const saveEquipment = useCallback(async () => {
    if (!prefs) return;
    const updated = { ...prefs, availableEquipment: equipmentDraft };
    await db.saveUserPreferences(updated);
    setPrefs(updated);
  }, [prefs, equipmentDraft]);

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const result = await importData(file);
    setImportMessage({ success: result.success, text: result.message });
    if (fileRef.current) fileRef.current.value = "";
    setTimeout(() => setImportMessage(null), 5000);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Appearance</CardTitle>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Available Equipment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Describe what equipment you have. AI features will only suggest exercises you can do.
          </p>
          <textarea
            placeholder="e.g. Two 20kg dumbbells, pull-up bar, resistance bands, yoga mat"
            value={equipmentDraft}
            onChange={(e) => setEquipmentDraft(e.target.value)}
            onBlur={saveEquipment}
            className="w-full rounded-md border bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            rows={3}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Data</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
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
        </CardContent>
      </Card>
    </div>
  );
}
