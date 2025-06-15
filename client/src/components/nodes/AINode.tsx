import React, { memo, useCallback, useState } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';

interface AINodeData {
  onEdit: (nodeId: string) => void;
}

export const AINode = memo(({ id, data, isConnectable }: NodeProps) => {
  const nodeData = data as unknown as AINodeData;
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<'chat' | 'code'>('chat');

  const sendPrompt = useCallback(async () => {
    if (!prompt.trim()) return;
    
    setIsLoading(true);
    try {
      // This would connect to your AI service
      // For now, we'll simulate a response
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (mode === 'code') {
        setResponse(`// Generated code for: ${prompt}\nconsole.log("Hello from AI!");\n// Your code here...`);
      } else {
        setResponse(`AI Response: I understand you want to ${prompt}. Here's what I suggest...`);
      }
    } catch (error) {
      setResponse(`Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  }, [prompt, mode]);

  const handleEdit = useCallback(() => {
    nodeData.onEdit(id);
  }, [nodeData, id]);

  const copyResponse = useCallback(() => {
    if (response) {
      navigator.clipboard.writeText(response);
    }
  }, [response]);

  return (
    <div className="ai-node bg-gray-800 border-2 border-purple-500 rounded-lg shadow-lg shadow-purple-500/20">
      {/* Input handle */}
      <Handle 
        type="target" 
        position={Position.Left} 
        isConnectable={isConnectable}
        className="w-3 h-3 bg-purple-500 border-2 border-purple-600"
      />
      
      {/* Node header */}
      <div className="node-header bg-gray-800 text-purple-500 px-3 py-2 border-b border-purple-500 flex justify-between items-center">
        <span className="font-bold text-sm">AI Assistant</span>
        <div className="flex gap-2">
          <select 
            value={mode}
            onChange={(e) => setMode(e.target.value as 'chat' | 'code')}
            className="px-1 py-0.5 text-xs bg-gray-700 border border-purple-500 rounded text-purple-400"
          >
            <option value="chat">Chat</option>
            <option value="code">Code</option>
          </select>
          <button
            onClick={handleEdit}
            className="px-2 py-1 text-xs bg-gray-700 border border-purple-500 rounded hover:bg-purple-500 hover:text-gray-800 transition-colors"
          >
            Edit
          </button>
        </div>
      </div>
      
      {/* Content */}
      <div className="node-content p-3 w-80">
        {/* Prompt Input */}
        <div className="mb-3">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={mode === 'code' ? 'Describe the code you want...' : 'Ask me anything...'}
            className="w-full h-20 p-2 bg-gray-900 border border-purple-500 rounded text-purple-400 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-purple-500"
          />
          <button
            onClick={sendPrompt}
            disabled={isLoading || !prompt.trim()}
            className="mt-2 px-3 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Thinking...' : 'Send'}
          </button>
        </div>
        
        {/* Response */}
        {response && (
          <div className="response-container">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs text-purple-400 font-semibold">Response:</span>
              <button
                onClick={copyResponse}
                className="px-1 py-0.5 text-xs bg-gray-700 border border-purple-500 rounded hover:bg-purple-500 hover:text-gray-800 transition-colors"
                title="Copy to clipboard"
              >
                📋
              </button>
            </div>
            <div className="p-2 bg-gray-900 border border-purple-500 rounded text-xs text-purple-300 max-h-32 overflow-y-auto">
              <pre className="whitespace-pre-wrap font-mono">{response}</pre>
            </div>
          </div>
        )}
      </div>
      
      {/* Output handle */}
      <Handle 
        type="source" 
        position={Position.Right} 
        isConnectable={isConnectable}
        className="w-3 h-3 bg-purple-500 border-2 border-purple-600"
      />
    </div>
  );
});

AINode.displayName = 'AINode';
