import React, { memo, useCallback, useState, useRef, useEffect } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { connectionManager } from '../../lib/ConnectionManager.ts';

interface JavaScriptNodeData {
  code: string;
  onEdit: (nodeId: string) => void;
}

export const JavaScriptNode = memo(({ id, data, isConnectable }: NodeProps) => {
  const nodeData = data as unknown as JavaScriptNodeData;
  const gridRef = useRef<HTMLDivElement>(null);
  const [output, setOutput] = useState<string>('');
  const [outputData, setOutputData] = useState<any>({ x: 0, y: 0, z: 0, w: 0 });

  // Propagate data to connected nodes when checkbox state changes
  const propagateOutputData = useCallback(() => {
    if (!gridRef.current) return;
    
    const checkboxes = gridRef.current.querySelectorAll('input[type="checkbox"]');
    const checkedCount = Array.from(checkboxes).filter(cb => (cb as HTMLInputElement).checked).length;
    const totalCount = checkboxes.length;
    
    // Create output data based on checkbox state
    const newData = {
      x: checkedCount / totalCount,  // Density of checked boxes
      y: Math.sin(checkedCount * 0.1), // Sine wave based on count
      z: Math.cos(checkedCount * 0.1), // Cosine wave based on count
      w: checkedCount > 0 ? 1.0 : 0.0   // Binary flag for any checked
    };
    
    setOutputData(newData);
    
    // Propagate to connected nodes
    connectionManager.updateDataFlow(id, newData);
    
    console.log(`JavaScript node ${id} propagating data:`, newData);
  }, [id]);

  // Create checkbox grid (32x32)
  useEffect(() => {
    if (!gridRef.current) return;
    
    const grid = gridRef.current;
    grid.innerHTML = ''; // Clear existing content
    
    const size = 32;
    for (let i = 0; i < size * size; i++) {
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'w-3 h-3 accent-yellow-500';
      checkbox.style.margin = '0';
      checkbox.addEventListener('change', propagateOutputData); // Add change listener
      grid.appendChild(checkbox);
    }
    
    grid.style.gridTemplateColumns = `repeat(${size}, 1fr)`;
  }, [propagateOutputData]);

  const executeCode = useCallback(() => {
    try {
      // Create a sandboxed environment for code execution
      const sandbox = {
        grid: gridRef.current,
        console: {
          log: (...args: any[]) => {
            setOutput(prev => prev + args.join(' ') + '\n');
          }
        },
        // Add utilities for checkbox manipulation
        getCheckboxes: () => gridRef.current?.querySelectorAll('input[type="checkbox"]'),
        setCheckbox: (index: number, checked: boolean) => {
          const checkboxes = gridRef.current?.querySelectorAll('input[type="checkbox"]');
          if (checkboxes && checkboxes[index]) {
            (checkboxes[index] as HTMLInputElement).checked = checked;
          }
        },
        clearGrid: () => {
          const checkboxes = gridRef.current?.querySelectorAll('input[type="checkbox"]');
          checkboxes?.forEach(cb => (cb as HTMLInputElement).checked = false);
        }
      };

      // Clear previous output
      setOutput('');

      // Execute the code in the sandbox
      const func = new Function('grid', 'console', 'getCheckboxes', 'setCheckbox', 'clearGrid', nodeData.code);
      func(sandbox.grid, sandbox.console, sandbox.getCheckboxes, sandbox.setCheckbox, sandbox.clearGrid);
      
    } catch (error) {
      setOutput(`Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }, [nodeData.code]);

  const handleEdit = useCallback(() => {
    nodeData.onEdit(id);
  }, [nodeData, id]);

  return (
    <div className="javascript-node bg-gray-800 border-2 border-yellow-500 rounded-lg shadow-lg shadow-yellow-500/20" style={{ paddingBottom: '32px' }}>
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
          background: '#ff69b4',
          borderRadius: '50%',
          border: '2px solid #ff69b4',
          zIndex: 1
        }}
      />
      
      {/* Node header */}
      <div className="node-header bg-gray-800 text-yellow-500 px-3 py-2 border-b border-yellow-500 flex justify-between items-center">
        <span className="font-bold text-sm">JavaScript</span>
        <div className="flex gap-2">
          <button
            onClick={executeCode}
            className="px-2 py-1 text-xs bg-gray-700 border border-yellow-500 rounded hover:bg-yellow-500 hover:text-gray-800 transition-colors"
          >
            ▶ Run
          </button>
          <button
            onClick={handleEdit}
            className="px-2 py-1 text-xs bg-gray-700 border border-yellow-500 rounded hover:bg-yellow-500 hover:text-gray-800 transition-colors"
          >
            Edit
          </button>
        </div>
      </div>
      
      {/* Content */}
      <div className="node-content p-3">
        {/* Checkbox Grid */}
        <div 
          ref={gridRef}
          className="checkbox-grid w-80 h-60 grid gap-px bg-gray-700 p-2 border border-yellow-500 rounded overflow-hidden"
          style={{ gridTemplateColumns: 'repeat(32, 1fr)' }}
        />
        
        {/* Output */}
        {output && (
          <div className="mt-2 p-2 bg-gray-900 border border-yellow-500 rounded text-xs text-yellow-400 font-mono max-h-20 overflow-y-auto">
            <pre className="whitespace-pre-wrap">{output}</pre>
          </div>
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
          background: '#ff69b4',
          borderRadius: '50%',
          border: '2px solid #ff69b4',
          zIndex: 1
        }}
      />
    </div>
  );
});

JavaScriptNode.displayName = 'JavaScriptNode';
