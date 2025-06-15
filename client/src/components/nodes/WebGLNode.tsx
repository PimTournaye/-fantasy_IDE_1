import React, { memo, useEffect, useRef, useCallback } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';

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

  // Vertex shader source (same as original system)
  const vertexShaderSource = `
    attribute vec2 position;
    void main() {
      gl_Position = vec4(position, 0.0, 1.0);
    }
  `;

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
    
    // Set uniforms
    const timeLocation = gl.getUniformLocation(program, 'u_time');
    const resolutionLocation = gl.getUniformLocation(program, 'u_resolution');
    
    if (timeLocation) {
      gl.uniform1f(timeLocation, performance.now() / 1000);
    }
    
    if (resolutionLocation) {
      gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
    }
    
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
  }, []);

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

    // Create shader program with current code
    const program = createShaderProgram(gl, nodeData.code);
    if (program) {
      programRef.current = program;
      renderFrame();
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [nodeData.code, createShaderProgram, renderFrame]);

  const handleEdit = useCallback(() => {
    nodeData.onEdit(id);
  }, [nodeData, id]);

  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    // Handle canvas expansion logic here if needed
  }, []);

  return (
    <div className="webgl-node bg-gray-800 border-2 border-pink-500 rounded-lg shadow-lg shadow-pink-500/20">
      {/* Input handle */}
      <Handle 
        type="target" 
        position={Position.Left} 
        isConnectable={isConnectable}
        className="w-3 h-3 bg-pink-500 border-2 border-pink-600"
      />
      
      {/* Node header */}
      <div className="node-header bg-gray-800 text-pink-500 px-3 py-2 border-b border-pink-500 flex justify-between items-center">
        <span className="font-bold text-sm">WebGL</span>
        <button
          onClick={handleEdit}
          className="px-2 py-1 text-xs bg-gray-700 border border-pink-500 rounded hover:bg-pink-500 hover:text-gray-800 transition-colors"
        >
          Edit
        </button>
      </div>
      
      {/* Canvas content */}
      <div className="node-content p-3">
        <canvas
          ref={canvasRef}
          className="w-80 h-60 border border-pink-500 rounded cursor-pointer"
          onClick={handleCanvasClick}
        />
      </div>
      
      {/* Output handle */}
      <Handle 
        type="source" 
        position={Position.Right} 
        isConnectable={isConnectable}
        className="w-3 h-3 bg-pink-500 border-2 border-pink-600"
      />
    </div>
  );
});

WebGLNode.displayName = 'WebGLNode';
