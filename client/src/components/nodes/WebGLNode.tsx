import React, { memo, useEffect, useRef, useCallback, useState } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { connectionManager } from '../../lib/ConnectionManager.ts';

interface WebGLNodeData {
  code: string;
  onEdit: (nodeId: string) => void;
}

export const WebGLNode = memo(({ id, data, isConnectable }: NodeProps) => {
  const nodeData = data as unknown as WebGLNodeData;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glRef = useRef<WebGLRenderingContext | null>(null);
  const programRef = useRef<WebGLProgram | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const [dynamicUniforms, setDynamicUniforms] = useState<Record<string, any>>({});

  // Listen for connection data updates
  useEffect(() => {
    const handleNodeDataUpdate = (event: CustomEvent) => {
      const { sourceNodeId, sourceType, data } = event.detail;
      console.log(`WebGL node ${id} received data from ${sourceType} node ${sourceNodeId}:`, data);
      
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

  // Vertex shader source (same as original system)
  const vertexShaderSource = `
    attribute vec2 position;
    void main() {
      gl_Position = vec4(position, 0.0, 1.0);
    }
  `;

  // Enhanced shader code with dynamic uniforms for connections
  const getEnhancedShaderCode = useCallback((baseCode: string) => {
    let enhancedCode = baseCode;
    const connections = connectionManager.getInputConnections(id);
    
    // Add uniforms for connected inputs
    connections.forEach(connection => {
      const sourceType = connection.sourceNode.type;
      switch (sourceType) {
        case 'webcam':
          if (!enhancedCode.includes('uniform sampler2D u_webcam;')) {
            enhancedCode = 'uniform sampler2D u_webcam;\n' + enhancedCode;
          }
          break;
        case 'webgl':
          if (!enhancedCode.includes('uniform sampler2D u_texture;')) {
            enhancedCode = 'uniform sampler2D u_texture;\n' + enhancedCode;
          }
          break;
        case 'javascript':
          if (!enhancedCode.includes('uniform vec4 u_javascript_data;')) {
            enhancedCode = 'uniform vec4 u_javascript_data;\n' + enhancedCode;
          }
          break;
        case 'ai':
          if (!enhancedCode.includes('uniform vec4 u_ai_data;')) {
            enhancedCode = 'uniform vec4 u_ai_data;\n' + enhancedCode;
          }
          break;
      }
    });
    
    return enhancedCode;
  }, [id]);

  const createShader = useCallback((gl: WebGLRenderingContext, type: number, source: string) => {
    const shader = gl.createShader(type);
    if (!shader) return null;
    
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error('Shader compilation error:', gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    
    return shader;
  }, []);

  const createShaderProgram = useCallback((gl: WebGLRenderingContext, fragmentSource: string) => {
    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
    
    if (!vertexShader || !fragmentShader) return null;
    
    const program = gl.createProgram();
    if (!program) return null;
    
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Program linking error:', gl.getProgramInfoLog(program));
      gl.deleteProgram(program);
      return null;
    }
    
    return program;
  }, [createShader, vertexShaderSource]);

  const renderFrame = useCallback(() => {
    const gl = glRef.current;
    const program = programRef.current;
    const canvas = canvasRef.current;
    
    if (!gl || !program || !canvas) return;
    
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    
    gl.useProgram(program);
    
    // Set standard uniforms
    const timeLocation = gl.getUniformLocation(program, 'u_time');
    const resolutionLocation = gl.getUniformLocation(program, 'u_resolution');
    
    if (timeLocation) {
      gl.uniform1f(timeLocation, performance.now() / 1000);
    }
    
    if (resolutionLocation) {
      gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
    }
    
    // Set dynamic uniforms from connections
    const connections = connectionManager.getInputConnections(id);
    connections.forEach(connection => {
      const sourceType = connection.sourceNode.type;
      const sourceId = connection.sourceNode.id;
      
      switch (sourceType) {
        case 'webcam':
          // Handle webcam texture input
          const webcamLocation = gl.getUniformLocation(program, 'u_webcam');
          if (webcamLocation) {
            // This would bind the webcam video texture
            // For now, we'll log that it would happen
            console.log(`Would bind webcam texture from node ${sourceId}`);
          }
          break;
        case 'webgl':
          // Handle WebGL texture input
          const textureLocation = gl.getUniformLocation(program, 'u_texture');
          if (textureLocation) {
            console.log(`Would bind WebGL texture from node ${sourceId}`);
          }
          break;
        case 'javascript':
          // Handle JavaScript data input
          const jsDataLocation = gl.getUniformLocation(program, 'u_javascript_data');
          if (jsDataLocation && dynamicUniforms.u_javascript_data) {
            gl.uniform4f(jsDataLocation, 
              dynamicUniforms.u_javascript_data.x || 0,
              dynamicUniforms.u_javascript_data.y || 0,
              dynamicUniforms.u_javascript_data.z || 0,
              dynamicUniforms.u_javascript_data.w || 0
            );
          }
          break;
        case 'ai':
          // Handle AI data input
          const aiDataLocation = gl.getUniformLocation(program, 'u_ai_data');
          if (aiDataLocation && dynamicUniforms.u_ai_data) {
            gl.uniform4f(aiDataLocation,
              dynamicUniforms.u_ai_data.x || 0,
              dynamicUniforms.u_ai_data.y || 0,
              dynamicUniforms.u_ai_data.z || 0,
              dynamicUniforms.u_ai_data.w || 0
            );
          }
          break;
      }
    });
    
    // Set up vertex buffer
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1, -1,
      1, -1,
      -1, 1,
      1, 1
    ]), gl.STATIC_DRAW);
    
    const positionLocation = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
    
    // Draw
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    
    // Continue animation
    animationFrameRef.current = requestAnimationFrame(renderFrame);
  }, [id, dynamicUniforms]);

  // Initialize WebGL when component mounts or code changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = 320;
    canvas.height = 240;

    const gl = canvas.getContext('webgl');
    if (!gl) {
      console.error('WebGL not supported');
      return;
    }

    glRef.current = gl;

    // Create shader program with enhanced code that includes connection uniforms
    const enhancedCode = getEnhancedShaderCode(nodeData.code);
    const program = createShaderProgram(gl, enhancedCode);
    if (program) {
      programRef.current = program;
      renderFrame();
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [nodeData.code, createShaderProgram, renderFrame, getEnhancedShaderCode]);

  const handleEdit = useCallback(() => {
    nodeData.onEdit(id);
  }, [nodeData, id]);

  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    // Handle canvas expansion logic here if needed
  }, []);

  return (
    <div className="webgl-node" style={{
      background: '#1e1e1e',
      border: '1px solid #ff69b4',
      borderRadius: '12px',
      boxShadow: '0 4px 6px rgba(255,105,180,0.2)',
      userSelect: 'none',
      fontFamily: 'Bianzhidai, monospace',
      width: 'fit-content',
      transition: 'all 0.3s ease-out'
    }}>
      {/* Input handle */}
      <Handle 
        type="target" 
        position={Position.Left} 
        isConnectable={isConnectable}
        style={{
          width: '12px',
          height: '12px',
          background: '#ff69b4',
          borderRadius: '50%',
          border: '2px solid #ff69b4'
        }}
      />
      
      {/* Node header */}
      <div style={{
        background: '#1e1e1e',
        color: '#ff69b4',
        padding: '8px 12px',
        borderRadius: '12px 12px 0 0',
        cursor: 'move',
        fontWeight: 'bold',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid #ff69b4'
      }}>
        <span>WebGL</span>
        <button
          onClick={handleEdit}
          style={{
            background: '#1e1e1e',
            border: '1px solid #ff69b4',
            borderRadius: '4px',
            padding: '2px 8px',
            cursor: 'pointer',
            fontFamily: 'Bianzhidai, monospace',
            fontSize: '12px',
            color: '#ffffff'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.background = '#ff69b4';
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
        <canvas
          ref={canvasRef}
          style={{
            width: '320px',
            height: '240px',
            border: '1px solid #ff69b4',
            borderRadius: '4px',
            cursor: 'pointer',
            objectFit: 'cover'
          }}
          onClick={handleCanvasClick}
        />
      </div>
      
      {/* Output handle */}
      <Handle 
        type="source" 
        position={Position.Right} 
        isConnectable={isConnectable}
        style={{
          width: '12px',
          height: '12px',
          background: '#ff69b4',
          borderRadius: '50%',
          border: '2px solid #ff69b4'
        }}
      />
    </div>
  );
});

WebGLNode.displayName = 'WebGLNode';
