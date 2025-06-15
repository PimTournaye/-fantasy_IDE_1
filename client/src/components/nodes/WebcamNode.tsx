import React, { memo, useEffect, useRef, useCallback, useState } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';

interface WebcamNodeData {
  onEdit: (nodeId: string) => void;
}

export const WebcamNode = memo(({ id, data, isConnectable }: NodeProps) => {
  const nodeData = data as unknown as WebcamNodeData;
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startWebcam = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 320, height: 240 } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsStreaming(true);
        setError(null);
      }
    } catch (err) {
      console.error('Error accessing webcam:', err);
      setError('Failed to access webcam');
      setIsStreaming(false);
    }
  }, []);

  const stopWebcam = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setIsStreaming(false);
    }
  }, []);

  useEffect(() => {
    startWebcam();
    
    return () => {
      stopWebcam();
    };
  }, [startWebcam, stopWebcam]);

  const handleEdit = useCallback(() => {
    nodeData.onEdit(id);
  }, [nodeData, id]);

  const toggleWebcam = useCallback(() => {
    if (isStreaming) {
      stopWebcam();
    } else {
      startWebcam();
    }
  }, [isStreaming, startWebcam, stopWebcam]);

  return (
    <div className="webcam-node bg-gray-800 border-2 border-blue-500 rounded-lg shadow-lg shadow-blue-500/20">
      {/* Node header */}
      <div className="node-header bg-gray-800 text-blue-500 px-3 py-2 border-b border-blue-500 flex justify-between items-center">
        <span className="font-bold text-sm">WEBCAM</span>
        <div className="flex gap-2">
          <button
            onClick={toggleWebcam}
            className="px-2 py-1 text-xs bg-gray-700 border border-blue-500 rounded hover:bg-blue-500 hover:text-gray-800 transition-colors"
          >
            {isStreaming ? '⏹️' : '▶️'}
          </button>
          <button
            onClick={handleEdit}
            className="px-2 py-1 text-xs bg-gray-700 border border-blue-500 rounded hover:bg-blue-500 hover:text-gray-800 transition-colors"
          >
            Edit
          </button>
        </div>
      </div>
      
      {/* Video content */}
      <div className="node-content p-3">
        {error ? (
          <div className="w-80 h-60 bg-red-900/20 border border-red-500 rounded flex items-center justify-center text-red-400 text-sm">
            {error}
          </div>
        ) : (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-80 h-60 border border-blue-500 rounded object-cover"
          />
        )}
      </div>
      
      {/* Output handle */}
      <Handle 
        type="source" 
        position={Position.Right} 
        isConnectable={isConnectable}
        className="w-3 h-3 bg-blue-500 border-2 border-blue-600"
      />
    </div>
  );
});

WebcamNode.displayName = 'WebcamNode';
