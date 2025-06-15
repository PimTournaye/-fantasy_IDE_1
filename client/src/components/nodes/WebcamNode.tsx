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
    <div style={{
      background: '#1e1e1e',
      border: '1px solid #ff69b4',
      borderRadius: '12px',
      boxShadow: '0 4px 6px rgba(255,105,180,0.2)',
      userSelect: 'none',
      fontFamily: 'Bianzhidai, monospace',
      width: 'fit-content',
      transition: 'all 0.3s ease-out'
    }}>
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
        <span>WEBCAM</span>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={toggleWebcam}
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
            📹
          </button>
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
      </div>
      
      {/* Video content */}
      <div style={{ padding: '12px', position: 'relative' }}>
        {error ? (
          <div style={{
            width: '320px',
            height: '240px',
            background: 'rgba(139, 0, 0, 0.2)',
            border: '1px solid #8b0000',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ff6b6b',
            fontSize: '14px'
          }}>
            {error}
          </div>
        ) : (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{
              width: '320px',
              height: '240px',
              border: '1px solid #ff69b4',
              borderRadius: '4px',
              objectFit: 'cover'
            }}
          />
        )}
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

WebcamNode.displayName = 'WebcamNode';
