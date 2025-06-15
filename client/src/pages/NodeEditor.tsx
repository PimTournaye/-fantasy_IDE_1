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
        
        {/* Code Editor Overlay - Matching Original Design */}
        {isEditorOpen && selectedNode && (
          <div style={{
            position: 'fixed',
            top: '0',
            right: '0',
            width: '50%',
            height: '100%',
            zIndex: '100',
            backgroundColor: 'rgba(0,0,0, 0.95)',
            transition: 'background-color 0.3s ease'
          }}>
            {/* Close button in top-right corner */}
            <button
              onClick={closeEditor}
              style={{
                position: 'absolute',
                top: '10px',
                right: '10px',
                background: '#1e1e1e',
                border: '1px solid #ff69b4',
                borderRadius: '4px',
                padding: '8px 16px',
                cursor: 'pointer',
                fontFamily: 'Bianzhidai, monospace',
                color: '#ff69b4',
                fontSize: '14px',
                zIndex: '102'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = '#ff69b4';
                e.currentTarget.style.color = '#1e1e1e';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = '#1e1e1e';
                e.currentTarget.style.color = '#ff69b4';
              }}
            >
              ✕
            </button>
            
            {/* Code Editor Area - Full Screen like Original */}
            <div style={{
              width: '100%',
              height: '100%',
              fontFamily: 'monospace',
              fontSize: '14px',
              background: 'linear-gradient(0.25turn,#ff69b400,#ff69b422,#ff69b400, #ff69b400), rgba(0,0,0,0.8)'
            }}>
              <CodeEditor
                code={selectedNode.code}
                language={selectedNode.type === 'webgl' ? 'wgsl' : 'javascript'}
                onChange={handleCodeChange}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
