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
  Background,
  BackgroundVariant,
  ConnectionMode,
  Panel,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

// Import our custom node types
import { WebGLNode, WebcamNode, JavaScriptNode, AINode, WebGPUNode, HDMINode, CheckboxGridNode } from './nodes/index.ts';
import { connectionManager } from '../lib/ConnectionManager.ts';

// Define custom node types
const nodeTypes = {
  webgl: WebGLNode,
  webcam: WebcamNode,
  javascript: JavaScriptNode,
  ai: AINode,
  webgpu: WebGPUNode,
  hdmi: HDMINode,
  checkbox: CheckboxGridNode,
};

interface NodeGraphProps {
  nodes: any[];
  onNodeSelect?: (node: any) => void;
  onNodeUpdate?: (nodeId: string, data: any) => void;
}

// Initial demo nodes

// Initial demo nodes
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
      onEdit: (nodeId: string) => console.log('Edit WebGL node:', nodeId)
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

export function NodeGraph({ nodes: externalNodes, onNodeSelect, onNodeUpdate }: NodeGraphProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [nodeIdCounter, setNodeIdCounter] = useState(1);

  // Update node edit callbacks when onNodeSelect changes
  useEffect(() => {
    if (onNodeSelect) {
      setNodes((currentNodes) => 
        currentNodes.map(node => ({
          ...node,
          data: {
            ...node.data,
            onEdit: (nodeId: string) => {
              console.log('Edit node:', nodeId);
              onNodeSelect(node);
            }
          }
        }))
      );
    }
  }, [onNodeSelect, setNodes]);

  const onConnect = useCallback(
    (params: Connection) => {
      console.log('Connection created:', params);
      
      // Validate connection types
      const sourceNode = nodes.find(n => n.id === params.source);
      const targetNode = nodes.find(n => n.id === params.target);
      
      if (!sourceNode || !targetNode) return;
      
      // Define valid connection types
      const validConnections: Record<string, string[]> = {
        webcam: ['webgl', 'webgpu'],        // Webcam can connect to WebGL/WebGPU nodes
        hdmi: ['webgl', 'webgpu'],          // HDMI can connect to WebGL/WebGPU nodes
        checkbox: ['webgl', 'webgpu'],      // Checkbox can connect to WebGL/WebGPU nodes for patterns
        webgl: ['webgl', 'webgpu', 'javascript'], // WebGL can connect to other graphics or JavaScript nodes
        webgpu: ['webgl', 'webgpu', 'javascript'], // WebGPU can connect to other graphics or JavaScript nodes
        javascript: ['webgl', 'webgpu'],    // JavaScript can connect to graphics nodes
        ai: ['webgl', 'webgpu']             // AI can connect to graphics nodes
      };
      
      const sourceType = sourceNode.type || 'unknown';
      const targetType = targetNode.type || 'unknown';
      
      if (!validConnections[sourceType]?.includes(targetType)) {
        console.warn(`Invalid connection: ${sourceType} -> ${targetType}`);
        return;
      }
      
      // Create the edge
      const newEdge: Edge = {
        id: `${params.source}-${params.target}`,
        source: params.source!,
        target: params.target!,
        sourceHandle: params.sourceHandle,
        targetHandle: params.targetHandle,
        type: 'default',
        style: { stroke: '#ff69b4', strokeWidth: 2 }
      };
      
      setEdges((eds) => addEdge(newEdge, eds));
      
      // Set up data flow between nodes using ConnectionManager
      connectionManager.addConnection(sourceNode, targetNode, newEdge);
    },
    [setEdges, nodes]
  );

  // Handle edge removal
  const onEdgesDelete = useCallback((edges: Edge[]) => {
    edges.forEach(edge => {
      const connectionId = `${edge.source}-${edge.target}`;
      connectionManager.removeConnection(connectionId);
    });
  }, []);

  // Setup data flow between connected nodes (legacy function, now handled by ConnectionManager)
  const setupDataFlow = useCallback((sourceNode: Node, targetNode: Node, edge: Edge) => {
    // This is now handled by ConnectionManager.addConnection()
    console.log(`Data flow setup delegated to ConnectionManager: ${sourceNode.type} -> ${targetNode.type}`);
  }, []);

  // Function to add new nodes
  const addNode = useCallback((type: string) => {
    let defaultCode = `// New ${type} node`;
    
    if (type === 'webgl') {
      defaultCode = `// New WebGL shader
precision mediump float;
uniform float u_time;
uniform vec2 u_resolution;

void main() {
    vec2 st = gl_FragCoord.xy / u_resolution.xy;
    vec3 color = vec3(sin(st.x * 10.0 + u_time), sin(st.y * 10.0 + u_time), 0.5);
    gl_FragColor = vec4(color, 1.0);
}`;
    } else if (type === 'webgpu') {
      defaultCode = `// New WebGPU shader
struct VertexOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) uv: vec2<f32>,
}

@vertex
fn vertexMain(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
    var pos = array<vec2<f32>, 6>(
        vec2<f32>(-1.0, -1.0), vec2<f32>( 1.0, -1.0), vec2<f32>(-1.0,  1.0),
        vec2<f32>( 1.0, -1.0), vec2<f32>( 1.0,  1.0), vec2<f32>(-1.0,  1.0)
    );
    var output: VertexOutput;
    output.position = vec4<f32>(pos[vertexIndex], 0.0, 1.0);
    output.uv = (pos[vertexIndex] + 1.0) * 0.5;
    return output;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> {
    let uv = input.uv;
    let color = vec3<f32>(uv.x, uv.y, 0.5);
    return vec4<f32>(color, 1.0);
}`;
    } else if (type === 'javascript') {
      defaultCode = `// New JavaScript node
function process(input) {
    // Process input data here
    console.log('Processing:', input);
    return input;
}`;
    }

    const newNode: Node = {
      id: `${type}-${Date.now()}`,
      type,
      position: {
        x: Math.random() * 300 + 100,
        y: Math.random() * 300 + 100,
      },
      data: {
        code: defaultCode,
        onEdit: (nodeId: string) => {
          const foundNode = nodes.find(n => n.id === nodeId);
          if (foundNode && onNodeSelect) {
            onNodeSelect(foundNode);
          }
        },
      },
    };

    setNodes((nds) => [...nds, newNode]);
    setNodeIdCounter(counter => counter + 1);
  }, [setNodes, nodes, onNodeSelect]);

  return (
    <div className="w-full h-full bg-gray-950">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onEdgesDelete={onEdgesDelete}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        connectionMode={ConnectionMode.Loose}
        fitView
        className="react-flow-dark-theme"
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
        <Controls />
        
        {/* Control Panel */}
        <Panel position="top-right" className="flex space-x-2">
          <button
            onClick={() => addNode('webgl')}
            className="neon-button"
          >
          Add WebGL Tile
          </button>
          <button
            onClick={() => addNode('webgpu')}
            className="neon-button"
          >
          Add WebGPU Tile
          </button>
          <button
            onClick={() => addNode('webcam')}
            className="neon-button"
          >
          Add Webcam Tile
          </button>
          <button
            onClick={() => addNode('hdmi')}
            className="neon-button"
          >
          Add HDMI Tile
          </button>
          <button
            onClick={() => addNode('checkbox')}
            className="neon-button"
          >
          Add Grid Tile
          </button>
          <button
            onClick={() => addNode('javascript')}
            className="neon-button"
          >
          Add JS Tile
          </button>
          <button
            onClick={() => addNode('ai')}
            className="neon-button"
          >
          Add AI Tile
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
