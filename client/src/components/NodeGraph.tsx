import React, { useCallback, useState, useEffect, useRef } from 'react';
import {
  ReactFlow,
  Node,
  Edge,
  addEdge,
  useNodesState,
  useEdgesState,
  Connection,
  ReactFlowProvider,
  Controls,
  MiniMap,
  Background,
  BackgroundVariant,
  ConnectionMode,
  Panel,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

// Import our custom node types
import { WebGLNode, WebcamNode, JavaScriptNode, AINode } from './nodes/index.ts';

// Define custom node types
const nodeTypes = {
  webgl: WebGLNode,
  webcam: WebcamNode,
  javascript: JavaScriptNode,
  ai: AINode,
};

interface NodeGraphProps {
  nodes: any[];
  onNodeSelect?: (node: any) => void;
}

// Initial setup for testing
const initialNodes: Node[] = [
  {
    id: 'demo-webgl-1',
    type: 'webgl',
    position: { x: 100, y: 100 },
    data: { 
      code: `// Default WebGL shader
precision mediump float;
uniform float u_time;
uniform vec2 u_resolution;

void main() {
    vec2 st = gl_FragCoord.xy / u_resolution.xy;
    float t = u_time * 0.5;
    vec3 color = vec3(
        sin(st.x * 10.0 + t),
        sin(st.y * 10.0 + t * 1.1),
        sin((st.x + st.y) * 10.0 + t * 0.9)
    ) * 0.5 + 0.5;
    gl_FragColor = vec4(color, 1.0);
}`,
      onEdit: (nodeId: string) => console.log('Edit node:', nodeId)
    },
  },
  {
    id: 'demo-webcam-1',
    type: 'webcam',
    position: { x: 400, y: 100 },
    data: {
      onEdit: (nodeId: string) => console.log('Edit webcam:', nodeId)
    },
  },
];

const initialEdges: Edge[] = [];

export function NodeGraph({ nodes: externalNodes, onNodeSelect }: NodeGraphProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [nodeIdCounter, setNodeIdCounter] = useState(1);

  const onConnect = useCallback(
    (params: Connection) => {
      console.log('Connection created:', params);
      setEdges((eds) => addEdge(params, eds));
    },
    [setEdges]
  );

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    console.log('Node clicked:', node.id);
    onNodeSelect?.(node);
  }, [onNodeSelect]);

  // Function to add new nodes
  const addNode = useCallback((type: string) => {
    const newNode: Node = {
      id: `${type}-${Date.now()}`,
      type,
      position: {
        x: Math.random() * 300 + 100,
        y: Math.random() * 300 + 100,
      },
      data: {
        code: type === 'webgl' ? `// New ${type} node\nprecision mediump float;\nvoid main() {\n    gl_FragColor = vec4(1.0, 0.0, 1.0, 1.0);\n}` : `// New ${type} node`,
        onEdit: (nodeId: string) => console.log('Edit node:', nodeId),
      },
    };

    setNodes((nds) => [...nds, newNode]);
    setNodeIdCounter(counter => counter + 1);
  }, [setNodes]);

  return (
    <div className="w-full h-full bg-gray-950">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        connectionMode={ConnectionMode.Loose}
        fitView
        className="react-flow-dark-theme"
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
        <Controls />
        <MiniMap 
          nodeColor="#ff69b4"
          nodeStrokeWidth={3}
          zoomable
          pannable
        />
        
        {/* Control Panel */}
        <Panel position="top-right" className="space-x-2">
          <button
            onClick={() => addNode('webgl')}
            className="px-4 py-2 bg-pink-500 text-white rounded hover:bg-pink-600 transition-colors"
          >
            + WebGL
          </button>
          <button
            onClick={() => addNode('webcam')}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            + Webcam
          </button>
          <button
            onClick={() => addNode('javascript')}
            className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 transition-colors"
          >
            + JavaScript
          </button>
          <button
            onClick={() => addNode('ai')}
            className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors"
          >
            + AI
          </button>
        </Panel>
      </ReactFlow>
    </div>
  );
}

// Wrapper component with ReactFlowProvider
export default function NodeGraphWithProvider(props: NodeGraphProps) {
  return (
    <ReactFlowProvider>
      <NodeGraph {...props} />
    </ReactFlowProvider>
  );
}
