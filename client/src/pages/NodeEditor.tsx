import { useState, useCallback } from "react";
import NodeGraphWithProvider from "@/components/NodeGraph.tsx";
import { CodeEditor } from "@/components/CodeEditor";
import "@/styles/react-flow.css";

interface SelectedNode {
  id: string;
  type: string;
  code: string;
}

export default function NodeEditor() {
  const [selectedNode, setSelectedNode] = useState<SelectedNode | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  const handleNodeSelect = useCallback((node: any) => {
    console.log('Node selected:', node);
    setSelectedNode({
      id: node.id,
      type: node.type,
      code: node.data?.code || ''
    });
    setIsEditorOpen(true);
  }, []);

  const handleCodeChange = useCallback((code: string) => {
    if (selectedNode) {
      setSelectedNode(prev => prev ? { ...prev, code } : null);
      // TODO: Update the node in the graph
      console.log('Code updated for node', selectedNode.id, ':', code);
    }
  }, [selectedNode]);

  const closeEditor = useCallback(() => {
    setIsEditorOpen(false);
    setSelectedNode(null);
  }, []);

  return (
    <div style={{
      height: '100vh',
      width: '100vw',
      backgroundColor: '#121212',
      color: 'white',
      overflow: 'hidden',
      fontFamily: 'Bianzhidai, monospace'
    }}>
      {/* Main Node Graph */}
      <div className="relative w-full h-full">
        <NodeGraphWithProvider
          nodes={[]}
          onNodeSelect={handleNodeSelect}
        />
        
        {/* Code Editor Overlay */}
        {isEditorOpen && selectedNode && (
          <div className="absolute top-0 right-0 w-1/2 h-full bg-gray-900/95 backdrop-blur-sm border-l border-pink-500 z-50">
            <div className="flex items-center justify-between p-4 border-b border-pink-500">
              <h2 className="text-lg font-bold text-pink-500">
                Edit {selectedNode.type} Node
              </h2>
              <button
                onClick={closeEditor}
                className="px-3 py-1 bg-gray-700 border border-pink-500 rounded hover:bg-pink-500 hover:text-gray-800 transition-colors"
              >
                ✕ Close
              </button>
            </div>
            
            <div className="h-[calc(100%-4rem)]">
              {/* Temporary simple textarea while we fix CodeMirror */}
              <textarea
                value={selectedNode.code}
                onChange={(e) => handleCodeChange(e.target.value)}
                className="w-full h-full p-4 bg-gray-900 text-green-400 font-mono text-sm border border-pink-500 rounded resize-none focus:outline-none focus:ring-1 focus:ring-pink-500"
                placeholder="Enter your code here..."
              />
            </div>
          </div>
        )}
        
        {/* Welcome Message */}
        {!isEditorOpen && (
          <div style={{
            position: 'absolute',
            top: '20px',
            left: '20px',
            background: 'rgba(30, 30, 30, 0.95)',
            backdropFilter: 'blur(8px)',
            border: '1px solid #ff69b4',
            borderRadius: '12px',
            padding: '16px',
            maxWidth: '28rem',
            fontFamily: 'Bianzhidai, monospace',
            boxShadow: '0 4px 6px rgba(255,105,180,0.2)'
          }}>
            <h1 style={{
              fontSize: '1.25rem',
              fontWeight: 'bold',
              color: '#ff69b4',
              marginBottom: '8px'
            }}>
              React Flow Node System
            </h1>
            <p style={{
              color: '#ffffff',
              fontSize: '0.875rem',
              marginBottom: '8px'
            }}>
              🎉 You're now using React Flow instead of the laggy vanilla JS system!
            </p>
            <p style={{
              color: '#cccccc',
              fontSize: '0.75rem'
            }}>
              • Use the buttons in the top-right to add nodes<br/>
              • Drag nodes to move them around<br/>
              • Click and drag from handles to create connections<br/>
              • Click "Edit" on any node to modify its code
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
