import { useState, useEffect, useCallback } from "react";
import * as db from "@/lib/db";
import type { Activity } from "@/types";

export function useActivities() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const all = await db.getAllActivities();
    setActivities(all);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const create = useCallback(
    async (activity: Omit<Activity, "id">) => {
      await db.createActivity(activity);
      await refresh();
    },
    [refresh]
  );

  const remove = useCallback(
    async (id: number) => {
      await db.deleteActivity(id);
      await refresh();
    },
    [refresh]
  );

  return { activities, loading, create, remove, refresh };
}
