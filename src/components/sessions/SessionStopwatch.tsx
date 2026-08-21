import { Button } from "@/components/ui/button";
import { Play, Pause, RotateCcw } from "lucide-react";

interface SessionStopwatchProps {
  ms: number;
  running: boolean;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
}

export function SessionStopwatch({ ms, running, onStart, onPause, onReset }: SessionStopwatchProps) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const centiseconds = Math.floor((ms % 1000) / 10);

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="font-mono text-3xl font-bold tabular-nums text-foreground">
        {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}.
        {String(centiseconds).padStart(2, "0")}
      </div>
      <div className="flex items-center gap-3">
        {running ? (
          <Button variant="outline" className="h-14 min-w-28 text-lg" onClick={onPause}>
            <Pause className="size-5" />
            Pause
          </Button>
        ) : (
          <Button variant="default" className="h-14 min-w-28 text-lg" onClick={onStart}>
            <Play className="size-5" />
            Start
          </Button>
        )}
        <Button variant="ghost" className="h-14 text-lg" onClick={onReset}>
          <RotateCcw className="size-5" />
          Reset
        </Button>
      </div>
    </div>
  );
}

export function formatStopwatchTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}
