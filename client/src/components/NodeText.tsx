import { useState, useEffect } from "react";
import { type Node } from "@shared/schema";
import { editorManager } from "@/lib/node-system/EditorManager";

interface NodeTextProps {
  nodes: Node[];
  onNodeSelect: (node: Node) => void;
}

export function NodeText({ nodes, onNodeSelect }: NodeTextProps) {
  const [code, setCode] = useState("");

  useEffect(() => {
    // Generate the JSON representation of nodes
    const nodeData = nodes.map(node => ({
      id: node.id,
      type: node.type,
      code: node.code || "",
      position: {
        x: node.position?.x || 0,
        y: node.position?.y || 0
      },
      connections: node.connections || []
    }));

    const nodeText = JSON.stringify(nodeData, null, 2);
    setCode(nodeText);
    editorManager.setCode(nodeText);
  }, [nodes]);

  const handleEdit = () => {
    editorManager.toggleEditor('text-view', 'javascript');
  };

  const handleRun = () => {
    console.log('Running code from text view');
    try {
      // Create a new function from the code
      const func = new Function(code);
      func();
    } catch (error) {
      console.error("Error executing code:", error);
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-gray-900 p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-white text-xl font-bold">Node Code View</h2>
        <div className="flex gap-2">
          <button
            onClick={handleEdit}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Edit
          </button>
          <button
            onClick={handleRun}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Run
          </button>
        </div>
      </div>
      
      <div className="flex-1 overflow-auto">
        <pre className="w-full h-full bg-gray-800 text-white p-4 rounded overflow-auto">
          {code}
        </pre>
      </div>
    </div>
  );
} 