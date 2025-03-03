import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";

export function PerformanceMetrics() {
  const [fps, setFps] = useState(0);
  const [memory, setMemory] = useState(0);

  useEffect(() => {
    let lastTime = performance.now();
    let frames = 0;

    const measure = () => {
      const now = performance.now();
      frames++;

      if (now - lastTime >= 1000) {
        setFps(frames);
        frames = 0;
        lastTime = now;

        if (performance.memory) {
          setMemory(Math.round(performance.memory.usedJSHeapSize / 1048576));
        }
      }

      requestAnimationFrame(measure);
    };

    measure();
  }, []);

  return (
    <Card className="p-4 bg-gray-800 text-white">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-sm opacity-60">FPS</div>
          <div className="text-xl font-bold">{fps}</div>
        </div>
        <div>
          <div className="text-sm opacity-60">Memory</div>
          <div className="text-xl font-bold">{memory} MB</div>
        </div>
      </div>
    </Card>
  );
}
