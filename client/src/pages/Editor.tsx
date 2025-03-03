import { useState } from "react";
import { CodeEditor } from "@/components/CodeEditor";
import { NodeGraph } from "@/components/NodeGraph";
import { Preview } from "@/components/Preview";
import { PerformanceMetrics } from "@/components/PerformanceMetrics";
import { type Node } from "@shared/schema";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";

export default function Editor() {
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);

  const { data: nodes = [] } = useQuery({
    queryKey: ["/api/nodes"],
  });

  const updateNode = useMutation({
    mutationFn: async (node: Node) => {
      await fetch(`/api/nodes/${node.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(node),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/nodes"] });
    },
  });

  return (
    <div className="h-screen w-screen bg-gray-950 text-white p-4">
      <div className="grid grid-cols-[1fr_400px] gap-4 h-full">
        <div className="grid grid-rows-[1fr_300px] gap-4">
          <NodeGraph
            nodes={nodes}
            onNodeSelect={setSelectedNode}
          />
          <div className="grid grid-cols-[1fr_200px] gap-4">
            <Preview />
            <PerformanceMetrics />
          </div>
        </div>
        
        {selectedNode && (
          <div className="h-full">
            <CodeEditor
              code={selectedNode.code}
              language={selectedNode.type}
              onChange={(code) => {
                updateNode.mutate({
                  ...selectedNode,
                  code,
                });
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
