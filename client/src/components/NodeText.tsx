import { useState, useEffect } from "react";
import { type Node } from "@shared/schema";
import { editorManager } from "@/lib/node-system/EditorManager";

interface Uniform {
  name: string;
  type: string;
  value: number | number[];
}

interface NodeTextProps {
  nodes: Node[];
  onNodeSelect: (node: Node) => void;
}

export function NodeText({ nodes, onNodeSelect }: NodeTextProps) {
  const [code, setCode] = useState("");
  const [uniforms, setUniforms] = useState<Uniform[]>([]);

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
      connections: node.connections || [],
      uniforms: (node as any).uniforms || {} // Type assertion for now
    }));

    const nodeText = JSON.stringify(nodeData, null, 2);
    setCode(nodeText);
    editorManager.setCode(nodeText);

    // Extract uniforms from shader code
    const extractUniforms = (shaderCode: string) => {
      const uniformRegex = /uniform\s+(\w+)\s+(\w+);/g;
      const matches = Array.from(shaderCode.matchAll(uniformRegex));
      return matches.map(match => ({
        name: match[2],
        type: match[1],
        value: 0
      }));
    };

    // Find WebGL nodes and extract their uniforms
    const webglNodes = nodes.filter(node => node.type === 'webgl');
    if (webglNodes.length > 0) {
      const nodeUniforms = extractUniforms(webglNodes[0].code || '');
      setUniforms(nodeUniforms);
    }
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

  const handleUniformChange = (index: number, value: number | number[]) => {
    const updatedUniforms = [...uniforms];
    updatedUniforms[index].value = value;
    setUniforms(updatedUniforms);

    // Update the uniforms in the shader
    const webglNodes = nodes.filter(node => node.type === 'webgl');
    if (webglNodes.length > 0) {
      const node = webglNodes[0];
      const nodeData = editorManager.nodeSystem.nodes.get(node.id);
      if (nodeData?.data?.gl) {
        const gl = nodeData.data.gl;
        const uniformLocation = gl.getUniformLocation(nodeData.data.program, uniforms[index].name);
        if (uniformLocation) {
          gl.useProgram(nodeData.data.program);
          if (Array.isArray(value)) {
            if (value.length === 2) {
              gl.uniform2f(uniformLocation, value[0], value[1]);
            } else if (value.length === 3) {
              gl.uniform3f(uniformLocation, value[0], value[1], value[2]);
            } else if (value.length === 4) {
              gl.uniform4f(uniformLocation, value[0], value[1], value[2], value[3]);
            }
          } else {
            gl.uniform1f(uniformLocation, value);
          }
        }
      }
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

      {uniforms.length > 0 && (
        <div className="mt-4 p-4 bg-gray-800 rounded">
          <h3 className="text-white text-lg font-bold mb-2">Uniforms</h3>
          <div className="grid grid-cols-2 gap-4">
            {uniforms.map((uniform, index) => (
              <div key={uniform.name} className="flex flex-col">
                <label className="text-white mb-1">{uniform.name} ({uniform.type})</label>
                {uniform.type === 'float' && (
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={uniform.value as number}
                    onChange={(e) => handleUniformChange(index, parseFloat(e.target.value))}
                    className="w-full"
                  />
                )}
                {uniform.type === 'vec2' && (
                  <div className="flex gap-2">
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={(uniform.value as number[])[0]}
                      onChange={(e) => {
                        const newValue = [...(uniform.value as number[])];
                        newValue[0] = parseFloat(e.target.value);
                        handleUniformChange(index, newValue);
                      }}
                      className="w-1/2"
                    />
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={(uniform.value as number[])[1]}
                      onChange={(e) => {
                        const newValue = [...(uniform.value as number[])];
                        newValue[1] = parseFloat(e.target.value);
                        handleUniformChange(index, newValue);
                      }}
                      className="w-1/2"
                    />
                  </div>
                )}
                {uniform.type === 'vec3' && (
                  <div className="flex gap-2">
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={(uniform.value as number[])[0]}
                      onChange={(e) => {
                        const newValue = [...(uniform.value as number[])];
                        newValue[0] = parseFloat(e.target.value);
                        handleUniformChange(index, newValue);
                      }}
                      className="w-1/3"
                    />
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={(uniform.value as number[])[1]}
                      onChange={(e) => {
                        const newValue = [...(uniform.value as number[])];
                        newValue[1] = parseFloat(e.target.value);
                        handleUniformChange(index, newValue);
                      }}
                      className="w-1/3"
                    />
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={(uniform.value as number[])[2]}
                      onChange={(e) => {
                        const newValue = [...(uniform.value as number[])];
                        newValue[2] = parseFloat(e.target.value);
                        handleUniformChange(index, newValue);
                      }}
                      className="w-1/3"
                    />
                  </div>
                )}
                {uniform.type === 'vec4' && (
                  <div className="flex gap-2">
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={(uniform.value as number[])[0]}
                      onChange={(e) => {
                        const newValue = [...(uniform.value as number[])];
                        newValue[0] = parseFloat(e.target.value);
                        handleUniformChange(index, newValue);
                      }}
                      className="w-1/4"
                    />
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={(uniform.value as number[])[1]}
                      onChange={(e) => {
                        const newValue = [...(uniform.value as number[])];
                        newValue[1] = parseFloat(e.target.value);
                        handleUniformChange(index, newValue);
                      }}
                      className="w-1/4"
                    />
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={(uniform.value as number[])[2]}
                      onChange={(e) => {
                        const newValue = [...(uniform.value as number[])];
                        newValue[2] = parseFloat(e.target.value);
                        handleUniformChange(index, newValue);
                      }}
                      className="w-1/4"
                    />
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={(uniform.value as number[])[3]}
                      onChange={(e) => {
                        const newValue = [...(uniform.value as number[])];
                        newValue[3] = parseFloat(e.target.value);
                        handleUniformChange(index, newValue);
                      }}
                      className="w-1/4"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 