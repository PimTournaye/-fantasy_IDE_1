import { useRef, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { type Node } from "@shared/schema";
import { nodeEngine } from "@/lib/node-engine";

interface NodeGraphProps {
  nodes: Node[];
  onNodeSelect: (node: Node) => void;
}

export function NodeGraph({ nodes, onNodeSelect }: NodeGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dragging, setDragging] = useState<{
    nodeId: number;
    offset: { x: number; y: number };
  } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw connections
      ctx.strokeStyle = "#666";
      ctx.lineWidth = 2;
      nodes.forEach(node => {
        if (node.connections) {
          (node.connections as { to: number }[]).forEach(conn => {
            const target = nodes.find(n => n.id === conn.to);
            if (target && node.position && target.position) {
              ctx.beginPath();
              ctx.moveTo(
                (node.position as { x: number }).x + 100,
                (node.position as { y: number }).y + 25
              );
              ctx.lineTo(
                (target.position as { x: number }).x,
                (target.position as { y: number }).y + 25
              );
              ctx.stroke();
            }
          });
        }
      });
    };

    draw();
  }, [nodes]);

  return (
    <div className="relative w-full h-full bg-gray-900 overflow-hidden">
      <canvas
        ref={canvasRef}
        className="absolute inset-0"
        width={2000}
        height={2000}
      />

      {nodes.map(node => (
        <Card
          key={node.id}
          className="absolute p-4 w-[200px] cursor-move bg-gray-800 text-white"
          style={{
            transform: `translate(${(node.position as { x: number }).x}px, ${(node.position as { y: number }).y}px)`
          }}
          onClick={() => onNodeSelect(node)}
        >
          <div className="font-bold mb-2">{node.type}</div>
          <div className="text-xs opacity-60 truncate">{node.code.slice(0, 50)}</div>
        </Card>
      ))}
    </div>
  );
}