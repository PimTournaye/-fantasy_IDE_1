import React, { memo, useEffect, useRef, useCallback, useState } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { connectionManager } from '../../lib/ConnectionManager.ts';

interface WebGPUNodeData {
  code: string;
  onEdit: (nodeId: string) => void;
}

export const WebGPUNode = memo(({ id, data, isConnectable }: NodeProps) => {
  const nodeData = data as unknown as WebGPUNodeData;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const deviceRef = useRef<GPUDevice | null>(null);
  const contextRef = useRef<GPUCanvasContext | null>(null);
  const pipelineRef = useRef<GPURenderPipeline | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const [isSupported, setIsSupported] = useState(true);
  const [dynamicUniforms, setDynamicUniforms] = useState<Record<string, any>>({});

  // Listen for connection data updates
  useEffect(() => {
    const handleNodeDataUpdate = (event: CustomEvent) => {
      const { sourceNodeId, sourceType, data } = event.detail;
      console.log(`WebGPU node ${id} received data from ${sourceType} node ${sourceNodeId}:`, data);
      
      // Update dynamic uniforms based on source type
      setDynamicUniforms(prev => ({
        ...prev,
        [`u_${sourceType}_data`]: data
      }));
    };

    // Add event listener to this node's element
    const nodeElement = document.querySelector(`[data-id="${id}"]`);
    if (nodeElement) {
      nodeElement.addEventListener('nodeDataUpdate', handleNodeDataUpdate as EventListener);
      
      return () => {
        nodeElement.removeEventListener('nodeDataUpdate', handleNodeDataUpdate as EventListener);
      };
    }
  }, [id]);

  // Default WebGPU shader code
  const getDefaultShaderCode = () => `
struct VertexOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) uv: vec2<f32>,
}

@vertex
fn vertexMain(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
    var pos = array<vec2<f32>, 6>(
        vec2<f32>(-1.0, -1.0),
        vec2<f32>( 1.0, -1.0),
        vec2<f32>(-1.0,  1.0),
        vec2<f32>( 1.0, -1.0),
        vec2<f32>( 1.0,  1.0),
        vec2<f32>(-1.0,  1.0)
    );
    
    var uv = array<vec2<f32>, 6>(
        vec2<f32>(0.0, 1.0),
        vec2<f32>(1.0, 1.0),
        vec2<f32>(0.0, 0.0),
        vec2<f32>(1.0, 1.0),
        vec2<f32>(1.0, 0.0),
        vec2<f32>(0.0, 0.0)
    );

    var output: VertexOutput;
    output.position = vec4<f32>(pos[vertexIndex], 0.0, 1.0);
    output.uv = uv[vertexIndex];
    return output;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4<f32> {
    let uv = input.uv;
    let time = 0.001; // Will be replaced with actual time uniform
    
    let color = vec3<f32>(
        sin(uv.x * 10.0 + time),
        sin(uv.y * 10.0 + time * 1.1),
        sin((uv.x + uv.y) * 10.0 + time * 0.9)
    ) * 0.5 + 0.5;
    
    return vec4<f32>(color, 1.0);
}`;

  const initializeWebGPU = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Check WebGPU support
    if (!navigator.gpu) {
      console.error('WebGPU not supported');
      setIsSupported(false);
      return;
    }

    try {
      // Get adapter and device
      const adapter = await navigator.gpu.requestAdapter();
      if (!adapter) {
        console.error('No WebGPU adapter found');
        setIsSupported(false);
        return;
      }

      const device = await adapter.requestDevice();
      const context = canvas.getContext('webgpu');
      
      if (!context) {
        console.error('Failed to get WebGPU context');
        setIsSupported(false);
        return;
      }

      const format = navigator.gpu.getPreferredCanvasFormat();
      context.configure({
        device,
        format,
        alphaMode: 'premultiplied',
      });

      // Create shader module
      const shaderModule = device.createShaderModule({
        code: nodeData.code || getDefaultShaderCode()
      });

      // Create render pipeline
      const pipeline = device.createRenderPipeline({
        layout: 'auto',
        vertex: {
          module: shaderModule,
          entryPoint: 'vertexMain',
        },
        fragment: {
          module: shaderModule,
          entryPoint: 'fragmentMain',
          targets: [{
            format
          }]
        },
        primitive: {
          topology: 'triangle-list'
        }
      });

      deviceRef.current = device;
      contextRef.current = context;
      pipelineRef.current = pipeline;

      // Start render loop
      const startTime = performance.now();
      const render = () => {
        if (!deviceRef.current || !contextRef.current || !pipelineRef.current) return;

        const commandEncoder = deviceRef.current.createCommandEncoder();
        const textureView = contextRef.current.getCurrentTexture().createView();

        const renderPassDescriptor: GPURenderPassDescriptor = {
          colorAttachments: [{
            view: textureView,
            clearValue: { r: 0.0, g: 0.0, b: 0.0, a: 1.0 },
            loadOp: 'clear' as GPULoadOp,
            storeOp: 'store' as GPUStoreOp,
          }],
        };

        const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
        passEncoder.setPipeline(pipelineRef.current);
        passEncoder.draw(6); // Draw two triangles
        passEncoder.end();

        deviceRef.current.queue.submit([commandEncoder.finish()]);
        
        animationFrameRef.current = requestAnimationFrame(render);
      };

      render();

    } catch (error) {
      console.error('WebGPU initialization failed:', error);
      setIsSupported(false);
    }
  }, [nodeData.code]);

  useEffect(() => {
    initializeWebGPU();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [initializeWebGPU]);

  const handleEdit = useCallback(() => {
    nodeData.onEdit(id);
  }, [nodeData, id]);

  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    // Handle canvas expansion logic here if needed
  }, []);

  return (
    <div className="webgpu-node" style={{
      background: '#1e1e1e',
      border: '1px solid #00ff88',
      borderRadius: '12px',
      boxShadow: '0 4px 6px rgba(0,255,136,0.2)',
      userSelect: 'none',
      fontFamily: 'Bianzhidai, monospace',
      width: 'fit-content',
      height: 'fit-content',
      transition: 'all 0.3s ease-out',
      paddingBottom: '32px' // Ensure enough space for handles
    }}>
      {/* Input handle - bottom left */}
      <Handle 
        type="target" 
        position={Position.Bottom} 
        isConnectable={isConnectable}
        style={{
          left: '20px',
          right: 'auto',
          bottom: '24px',
          top: 'auto',
          width: '16px',
          height: '16px',
          background: '#00ff88',
          borderRadius: '50%',
          border: '2px solid #00ff88',
          zIndex: 1
        }}
      />
      
      {/* Node header */}
      <div style={{
        background: '#1e1e1e',
        color: '#00ff88',
        padding: '8px 12px',
        borderRadius: '12px 12px 0 0',
        cursor: 'move',
        fontWeight: 'bold',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid #00ff88'
      }}>
        <span>WebGPU</span>
        <button
          onClick={handleEdit}
          style={{
            background: '#1e1e1e',
            border: '1px solid #00ff88',
            borderRadius: '4px',
            padding: '2px 8px',
            cursor: 'pointer',
            fontFamily: 'Bianzhidai, monospace',
            fontSize: '12px',
            color: '#ffffff'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.background = '#00ff88';
            e.currentTarget.style.color = '#1e1e1e';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.background = '#1e1e1e';
            e.currentTarget.style.color = '#ffffff';
          }}
        >
          Edit
        </button>
      </div>
      
      {/* Canvas content */}
      <div style={{ padding: '12px', position: 'relative' }}>
        {!isSupported ? (
          <div style={{
            width: '320px',
            height: '240px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#2a2a2a',
            border: '1px solid #00ff88',
            borderRadius: '4px',
            color: '#ff4444',
            fontSize: '14px',
            textAlign: 'center'
          }}>
            WebGPU not supported in this browser
          </div>
        ) : (
          <canvas
            ref={canvasRef}
            style={{
              width: '320px',
              height: '240px',
              border: '1px solid #00ff88',
              borderRadius: '4px',
              cursor: 'pointer',
              objectFit: 'cover'
            }}
            width={320}
            height={240}
            onClick={handleCanvasClick}
          />
        )}
      </div>
      
      {/* Output handle - bottom right */}
      <Handle 
        type="source" 
        position={Position.Bottom} 
        isConnectable={isConnectable}
        style={{
          right: '4px',
          left: 'auto',
          bottom: '24px',
          top: 'auto',
          width: '16px',
          height: '16px',
          background: '#00ff88',
          borderRadius: '50%',
          border: '2px solid #00ff88',
          zIndex: 1
        }}
      />
    </div>
  );
});

WebGPUNode.displayName = 'WebGPUNode';
