import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ExercisesPage } from "@/pages/ExercisesPage";
import { WorkoutsPage } from "@/pages/WorkoutsPage";
import { Dumbbell, ListChecks } from "lucide-react";

export function LibraryPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Library</h1>

      <Tabs defaultValue="exercises">
        <TabsList className="!w-full grid grid-cols-2">
          <TabsTrigger value="exercises">
            <Dumbbell className="size-3.5" />
            Exercises
          </TabsTrigger>
          <TabsTrigger value="workouts">
            <ListChecks className="size-3.5" />
            Workouts
          </TabsTrigger>
        </TabsList>
        <TabsContent value="exercises" className="mt-4">
          <ExercisesPage />
        </TabsContent>
        <TabsContent value="workouts" className="mt-4">
          <WorkoutsPage />
        </TabsContent>
      </Tabs>
    </div>
  );
}
