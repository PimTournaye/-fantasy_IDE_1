import { useEffect, useRef, useState } from "react";
import { renderer } from "@/lib/webgpu";
import { Card } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

export function Preview() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    renderer.init(canvas).then((success) => {
      if (!success && renderer.error) {
        setError(renderer.error);
      }
    }).catch((e) => {
      setError(`Failed to initialize WebGPU: ${e.message}`);
    });
  }, []);

  if (error) {
    return (
      <Card className="w-full h-full flex flex-col items-center justify-center bg-gray-900 p-4 text-white">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h3 className="text-lg font-semibold mb-2">WebGPU Not Available</h3>
        <p className="text-sm text-gray-400 text-center max-w-md">
          {error}
        </p>
      </Card>
    );
  }

  return (
    <Card className="w-full h-full flex items-center justify-center bg-gray-900 p-4">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        width={512}
        height={512}
      />
    </Card>
  );
}