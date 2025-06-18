import { useState, useCallback, useEffect, useRef } from "react";
import NodeGraphWithProvider from "@/components/NodeGraph.tsx";
import { EditorView, basicSetup } from 'codemirror';
import { EditorState } from '@codemirror/state';
import { javascript } from '@codemirror/lang-javascript';
import { StreamLanguage } from '@codemirror/language';
import { shader } from '@codemirror/legacy-modes/mode/clike';
import { oneDark } from '@codemirror/theme-one-dark';
import "@/styles/react-flow.css";

interface SelectedNode {
  id: string;
  type: string;
  code: string;
}

export default function NodeEditor() {
  const [selectedNode, setSelectedNode] = useState<SelectedNode | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editorPosition, setEditorPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const editorRef = useRef<HTMLDivElement>(null);
  const editorViewRef = useRef<EditorView | null>(null);
  const windowRef = useRef<HTMLDivElement>(null);

  const handleNodeSelect = useCallback((node: any) => {
    console.log('Node selected:', node);
    setSelectedNode({
      id: node.id,
      type: node.type,
      code: node.data?.code || getDefaultCode(node.type)
    });
    setIsEditorOpen(true);
  }, []);

  const getDefaultCode = (nodeType: string): string => {
    switch (nodeType) {
      case 'webgl':
        return `// Default WebGL shader
precision mediump float;
uniform float u_time;
uniform vec2 u_resolution;

void main() {
  vec2 st = gl_FragCoord.xy / u_resolution.xy;
  float t = u_time * 0.5;
  vec3 color = vec3(
    sin(st.x * 10.0 + t),
    sin(st.y * 10.0 + t * 1.1),
    sin(st.x + st.y) * 10.0 + t + 0.9
  ) * 0.5 + 0.5;
  gl_FragColor = vec4(color, 1.0);
}`;
      case 'javascript':
        return `// JavaScript code
console.log('Hello from JavaScript node!');`;
      case 'webgpu':
        return `// WebGPU compute shader
@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
  // WebGPU code here
}`;
      default:
        return '// Enter your code here';
    }
  };

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
    setEditorPosition({ x: 0, y: 0 });
    if (editorViewRef.current) {
      editorViewRef.current.destroy();
      editorViewRef.current = null;
    }
  }, []);

  // Drag functionality
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (windowRef.current) {
      setIsDragging(true);
      const rect = windowRef.current.getBoundingClientRect();
      setDragStart({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    }
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging) {
      setEditorPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Initialize CodeMirror when editor opens
  useEffect(() => {
    if (isEditorOpen && selectedNode && editorRef.current && !editorViewRef.current) {
      const getLanguage = () => {
        switch (selectedNode.type) {
          case 'javascript':
            return javascript();
          case 'webgl':
          case 'webgpu':
            return StreamLanguage.define(shader);
          default:
            return javascript();
        }
      };

      const getThemeColor = (type: string) => {
        switch (type) {
          case 'webgl': return '#ff69b4';
          case 'webgpu': return '#00ff88';
          case 'javascript': return '#eab308';
          case 'ai': return '#a855f7';
          default: return '#ff69b4';
        }
      };

      const themeColor = getThemeColor(selectedNode.type);

      // TODO: Fix CodeMirror transparent background - current approach not working
      // Need to properly override oneDark theme background colors
      // See: https://codemirror.net/examples/styling/

      // Transparent background override for oneDark theme
      const transparentOverride = EditorView.theme({
        "&": {
          backgroundColor: "transparent"
        },
        ".cm-content": {
          backgroundColor: "transparent",
          padding: '20px',
          minHeight: '100%',
          color: themeColor
        },
        ".cm-scroller": {
          backgroundColor: "transparent"
        },
        ".cm-gutters": {
          backgroundColor: "transparent",
          borderRight: `1px solid ${themeColor}`,
        },
        ".cm-focused": {
          outline: 'none',
        },
        ".cm-line": {
          color: themeColor,
        },
        ".cm-cursor": {
          borderLeftColor: themeColor
        }
      });

      const startState = EditorState.create({
        doc: selectedNode.code,
        extensions: [
          basicSetup,
          getLanguage(),
          oneDark,
          transparentOverride, // This overrides oneDark's background
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              const newCode = update.state.doc.toString();
              handleCodeChange(newCode);
            }
          })
        ]
      });

      editorViewRef.current = new EditorView({
        state: startState,
        parent: editorRef.current
      });

      // Focus the editor
      setTimeout(() => {
        editorViewRef.current?.focus();
      }, 100);
    }
  }, [isEditorOpen, selectedNode, handleCodeChange]);

  // Handle escape key to close editor
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isEditorOpen) {
        e.preventDefault();
        closeEditor();
      }
    };

    if (isEditorOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isEditorOpen, closeEditor]);

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
      <NodeGraphWithProvider
        nodes={[]}
        onNodeSelect={handleNodeSelect}
      />
      
      {/* Floating Code Editor - Bigger, Centered, Opaque */}
      {isEditorOpen && selectedNode && (
        <div
          ref={windowRef}
          style={{
            position: 'absolute',
            top: editorPosition.y || '50%',
            left: editorPosition.x || '50%',
            transform: editorPosition.x || editorPosition.y ? 'none' : 'translate(-50%, -50%)',
            width: '800px',
            height: '600px',
            zIndex: 999,
            backgroundColor: '#272822',
            borderRadius: '8px',
            boxShadow: '0 0 20px rgba(0, 0, 0, 0.5)',
            fontFamily: 'Bianzhidai, monospace',
            display: 'flex',
            flexDirection: 'column',
            border: `2px solid ${getNodeTypeColor(selectedNode.type)}`,
            cursor: isDragging ? 'grabbing' : 'default'
          }}
        >
          {/* Header - Draggable */}
          <div
            onMouseDown={handleMouseDown}
            style={{
              padding: '10px 15px',
              borderBottom: `1px solid ${getNodeTypeColor(selectedNode.type)}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              color: getNodeTypeColor(selectedNode.type),
              backgroundColor: '#272822',
              borderRadius: '8px 8px 0 0',
              fontSize: '14px',
              cursor: 'grab',
              userSelect: 'none'
            }}
          >
            <span>{selectedNode.type.toUpperCase()} Editor</span>
            <button
              onClick={closeEditor}
              style={{
                background: 'transparent',
                border: `1px solid ${getNodeTypeColor(selectedNode.type)}`,
                borderRadius: '4px',
                color: getNodeTypeColor(selectedNode.type),
                padding: '4px 8px',
                cursor: 'pointer',
                fontSize: '12px',
                fontFamily: 'Bianzhidai, monospace'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = getNodeTypeColor(selectedNode.type);
                e.currentTarget.style.color = '#272822';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = getNodeTypeColor(selectedNode.type);
              }}
            >
              ✕
            </button>
          </div>

          {/* CodeMirror Container */}
          <div
            ref={editorRef}
            style={{
              flex: 1,
              overflow: 'hidden',
              backgroundColor: '#272822',
              borderRadius: '0 0 8px 8px'
            }}
          />
        </div>
      )}
    </div>
  );

  function getNodeTypeColor(type: string) {
    switch (type) {
      case 'webgl': return '#ff69b4';
      case 'webgpu': return '#00ff88';
      case 'javascript': return '#eab308';
      case 'ai': return '#a855f7';
      case 'webcam': return '#06b6d4';
      case 'hdmi': return '#f59e0b';
      case 'checkbox-grid': return '#ef4444';
      default: return '#ff69b4';
    }
  }
}
