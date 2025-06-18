import React, { memo, useCallback, useState, useEffect } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';

interface CheckboxGridNodeData {
  onEdit: (nodeId: string) => void;
}

export const CheckboxGridNode = memo(({ id, data, isConnectable }: NodeProps) => {
  const nodeData = data as unknown as CheckboxGridNodeData;
  const [gridState, setGridState] = useState<boolean[]>(new Array(32 * 15).fill(false)); // 32 columns, 15 rows
  const [isClearing, setIsClearing] = useState(false);

  // Generate pattern data from checkbox grid
  const generatePatternData = useCallback((state: boolean[]) => {
    const width = 32;
    const height = 15;
    const patternData = new Uint8Array(width * height * 4); // RGBA
    
    for (let i = 0; i < state.length; i++) {
      const pixelIndex = i * 4;
      const value = state[i] ? 255 : 0;
      patternData[pixelIndex] = value;     // R
      patternData[pixelIndex + 1] = value; // G  
      patternData[pixelIndex + 2] = value; // B
      patternData[pixelIndex + 3] = 255;   // A
    }
    
    return {
      data: patternData,
      width,
      height,
      pattern: state
    };
  }, []);

  // Notify connected nodes when grid changes
  useEffect(() => {
    const patternData = generatePatternData(gridState);
    
    // Notify connected nodes about the pattern data
    const nodeElement = document.querySelector(`[data-id="${id}"]`);
    if (nodeElement) {
      const event = new CustomEvent('nodeDataUpdate', {
        detail: {
          sourceNodeId: id,
          sourceType: 'checkbox',
          data: patternData
        }
      });
      
      // Find connected target nodes and dispatch the event
      const edges = document.querySelectorAll(`[data-source="${id}"]`);
      edges.forEach(edge => {
        const targetId = edge.getAttribute('data-target');
        if (targetId) {
          const targetElement = document.querySelector(`[data-id="${targetId}"]`);
          if (targetElement) {
            targetElement.dispatchEvent(event);
          }
        }
      });
    }
  }, [gridState, generatePatternData, id]);

  const handleCheckboxChange = useCallback((index: number) => {
    setGridState(prev => {
      const newState = [...prev];
      newState[index] = !newState[index];
      return newState;
    });
  }, []);

  const handleEdit = useCallback(() => {
    nodeData.onEdit(id);
  }, [nodeData, id]);

  const clearGrid = useCallback(() => {
    setIsClearing(true);
    setGridState(new Array(32 * 15).fill(false));
    setTimeout(() => setIsClearing(false), 200);
  }, []);

  const randomizeGrid = useCallback(() => {
    setGridState(prev => prev.map(() => Math.random() > 0.5));
  }, []);

  const createPattern = useCallback((pattern: 'diagonal' | 'stripes' | 'checkerboard') => {
    const width = 32;
    const height = 15;
    const newState = new Array(width * height).fill(false);
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const index = y * width + x;
        
        switch (pattern) {
          case 'diagonal':
            newState[index] = (x + y) % 3 === 0;
            break;
          case 'stripes':
            newState[index] = x % 3 === 0;
            break;
          case 'checkerboard':
            newState[index] = (x + y) % 2 === 0;
            break;
        }
      }
    }
    
    setGridState(newState);
  }, []);

  return (
    <div style={{
      background: '#1e1e1e',
      border: '1px solid #ffff00',
      borderRadius: '12px',
      boxShadow: '0 4px 6px rgba(255,255,0,0.2)',
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
          background: '#ffff00',
          borderRadius: '50%',
          border: '2px solid #ffff00',
          zIndex: 1
        }}
      />
      
      {/* Node header */}
      <div style={{
        background: '#1e1e1e',
        color: '#ffff00',
        padding: '8px 12px',
        borderRadius: '12px 12px 0 0',
        cursor: 'move',
        fontWeight: 'bold',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid #ffff00'
      }}>
        <span>GRID</span>
        <div style={{ display: 'flex', gap: '3px' }}>
          <button
            onClick={() => createPattern('checkerboard')}
            style={{
              background: '#1e1e1e',
              border: '1px solid #ffff00',
              borderRadius: '3px',
              padding: '1px 4px',
              cursor: 'pointer',
              fontFamily: 'Bianzhidai, monospace',
              fontSize: '10px',
              color: '#ffffff'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = '#ffff00';
              e.currentTarget.style.color = '#1e1e1e';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = '#1e1e1e';
              e.currentTarget.style.color = '#ffffff';
            }}
            title="Checkerboard"
          >
            ⊞
          </button>
          <button
            onClick={() => createPattern('stripes')}
            style={{
              background: '#1e1e1e',
              border: '1px solid #ffff00',
              borderRadius: '3px',
              padding: '1px 4px',
              cursor: 'pointer',
              fontFamily: 'Bianzhidai, monospace',
              fontSize: '10px',
              color: '#ffffff'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = '#ffff00';
              e.currentTarget.style.color = '#1e1e1e';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = '#1e1e1e';
              e.currentTarget.style.color = '#ffffff';
            }}
            title="Stripes"
          >
            ▦
          </button>
          <button
            onClick={randomizeGrid}
            style={{
              background: '#1e1e1e',
              border: '1px solid #ffff00',
              borderRadius: '3px',
              padding: '1px 4px',
              cursor: 'pointer',
              fontFamily: 'Bianzhidai, monospace',
              fontSize: '10px',
              color: '#ffffff'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = '#ffff00';
              e.currentTarget.style.color = '#1e1e1e';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = '#1e1e1e';
              e.currentTarget.style.color = '#ffffff';
            }}
            title="Random"
          >
            ⚀
          </button>
          <button
            onClick={clearGrid}
            style={{
              background: '#1e1e1e',
              border: '1px solid #ffff00',
              borderRadius: '3px',
              padding: '1px 4px',
              cursor: 'pointer',
              fontFamily: 'Bianzhidai, monospace',
              fontSize: '10px',
              color: '#ffffff'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = '#ffff00';
              e.currentTarget.style.color = '#1e1e1e';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = '#1e1e1e';
              e.currentTarget.style.color = '#ffffff';
            }}
            title="Clear"
          >
            ✕
          </button>
        </div>
      </div>
      
      {/* Checkbox grid */}
      <div style={{ 
        padding: '12px',
        display: 'grid',
        gridTemplateColumns: 'repeat(32, 12px)',
        gap: '2px',
        width: 'fit-content',
        background: '#1e1e1e',
        borderRadius: '0 0 12px 12px',
        opacity: isClearing ? 0.5 : 1,
        transition: 'opacity 0.2s ease'
      }}>
        {gridState.map((checked, index) => (
          <input
            key={index}
            type="checkbox"
            checked={checked}
            onChange={() => handleCheckboxChange(index)}
            style={{
              width: '12px',
              height: '12px',
              margin: 0,
              accentColor: '#ffff00',
              cursor: 'pointer'
            }}
          />
        ))}
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
          background: '#ffff00',
          borderRadius: '50%',
          border: '2px solid #ffff00',
          zIndex: 1
        }}
      />
    </div>
  );
});

CheckboxGridNode.displayName = 'CheckboxGridNode';
