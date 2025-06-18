import React, { memo, useEffect, useRef, useCallback, useState } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';

interface HDMINodeData {
  onEdit: (nodeId: string) => void;
}

export const HDMINode = memo(({ id, data, isConnectable }: NodeProps) => {
  const nodeData = data as unknown as HDMINodeData;
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const [showDeviceSelect, setShowDeviceSelect] = useState(false);

  // Enumerate HDMI/capture devices
  const enumerateDevices = useCallback(async () => {
    try {
      const deviceList = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = deviceList.filter(device => 
        device.kind === 'videoinput' && 
        // Look for capture cards, HDMI devices, or external sources
        (device.label.toLowerCase().includes('capture') ||
         device.label.toLowerCase().includes('hdmi') ||
         device.label.toLowerCase().includes('cam link') ||
         device.label.toLowerCase().includes('elgato') ||
         device.label.toLowerCase().includes('usb video') ||
         device.label.toLowerCase().includes('obs virtual'))
      );
      setDevices(videoInputs);
      
      // If no specific capture devices found, show all video inputs
      if (videoInputs.length === 0) {
        const allVideoInputs = deviceList.filter(device => device.kind === 'videoinput');
        setDevices(allVideoInputs);
      }
    } catch (err) {
      console.error('Error enumerating devices:', err);
      setError('Failed to enumerate devices');
    }
  }, []);

  const startHDMICapture = useCallback(async (deviceId?: string) => {
    try {
      const constraints: MediaStreamConstraints = {
        video: {
          width: { ideal: 1920, max: 1920 },
          height: { ideal: 1080, max: 1080 },
          frameRate: { ideal: 60, max: 60 }
        }
      };

      // Use specific device if provided
      if (deviceId) {
        (constraints.video as MediaTrackConstraints).deviceId = { exact: deviceId };
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsStreaming(true);
        setError(null);
        
        // Notify connected nodes about the video stream
        const nodeElement = document.querySelector(`[data-id="${id}"]`);
        if (nodeElement) {
          const event = new CustomEvent('nodeDataUpdate', {
            detail: {
              sourceNodeId: id,
              sourceType: 'hdmi',
              data: {
                stream,
                video: videoRef.current,
                width: 1920,
                height: 1080
              }
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
      }
    } catch (err) {
      console.error('Error accessing HDMI capture:', err);
      setError('Failed to access HDMI capture device. Please check if a capture card is connected.');
      setIsStreaming(false);
    }
  }, [id]);

  const stopHDMICapture = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setIsStreaming(false);
    }
  }, []);

  useEffect(() => {
    enumerateDevices();
    
    // Try to start with the first available capture device
    if (devices.length > 0) {
      startHDMICapture(devices[0].deviceId);
    }
    
    return () => {
      stopHDMICapture();
    };
  }, [enumerateDevices, startHDMICapture, stopHDMICapture]);

  const handleEdit = useCallback(() => {
    nodeData.onEdit(id);
  }, [nodeData, id]);

  const toggleHDMICapture = useCallback(() => {
    if (isStreaming) {
      stopHDMICapture();
    } else {
      startHDMICapture(selectedDevice);
    }
  }, [isStreaming, startHDMICapture, stopHDMICapture, selectedDevice]);

  const handleDeviceChange = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
    const deviceId = event.target.value;
    setSelectedDevice(deviceId);
    if (deviceId) {
      stopHDMICapture();
      setTimeout(() => startHDMICapture(deviceId), 100);
    }
  }, [startHDMICapture, stopHDMICapture]);

  return (
    <div style={{
      background: '#1e1e1e',
      border: '1px solid #ff8800',
      borderRadius: '12px',
      boxShadow: '0 4px 6px rgba(255,136,0,0.2)',
      userSelect: 'none',
      fontFamily: 'Bianzhidai, monospace',
      width: 'fit-content',
      height: 'fit-content',
      transition: 'all 0.3s ease-out',
      paddingBottom: '32px' // Ensure enough space for handles
    }}>
      {/* Node header */}
      <div style={{
        background: '#1e1e1e',
        color: '#ff8800',
        padding: '8px 12px',
        borderRadius: '12px 12px 0 0',
        cursor: 'move',
        fontWeight: 'bold',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid #ff8800'
      }}>
        <span>HDMI</span>
        <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
          <button
            onClick={() => setShowDeviceSelect(!showDeviceSelect)}
            style={{
              background: '#1e1e1e',
              border: '1px solid #ff8800',
              borderRadius: '4px',
              padding: '2px 6px',
              cursor: 'pointer',
              fontFamily: 'Bianzhidai, monospace',
              fontSize: '12px',
              color: '#ffffff'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = '#ff8800';
              e.currentTarget.style.color = '#1e1e1e';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = '#1e1e1e';
              e.currentTarget.style.color = '#ffffff';
            }}
          >
            📺
          </button>
          <button
            onClick={toggleHDMICapture}
            style={{
              background: '#1e1e1e',
              border: '1px solid #ff8800',
              borderRadius: '4px',
              padding: '2px 8px',
              cursor: 'pointer',
              fontFamily: 'Bianzhidai, monospace',
              fontSize: '12px',
              color: '#ffffff'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = '#ff8800';
              e.currentTarget.style.color = '#1e1e1e';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = '#1e1e1e';
              e.currentTarget.style.color = '#ffffff';
            }}
          >
            {isStreaming ? 'Stop' : 'Start'}
          </button>
        </div>
      </div>
      
      {/* Content area */}
      <div style={{ padding: '12px', position: 'relative' }}>
        {/* Device selector dropdown */}
        {showDeviceSelect && (
          <select
            value={selectedDevice}
            onChange={handleDeviceChange}
            style={{
              position: 'absolute',
              top: '5px',
              right: '5px',
              zIndex: 100,
              background: '#1e1e1e',
              border: '1px solid #ff8800',
              borderRadius: '4px',
              color: '#ff8800',
              fontFamily: 'Bianzhidai, monospace',
              fontSize: '12px',
              padding: '2px'
            }}
          >
            <option value="">Select device...</option>
            {devices.map((device) => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label || `Device ${device.deviceId.slice(0, 8)}...`}
              </option>
            ))}
          </select>
        )}
        
        {error ? (
          <div style={{
            width: '320px',
            height: '240px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#2a2a2a',
            border: '1px solid #ff8800',
            borderRadius: '4px',
            color: '#ff4444',
            fontSize: '12px',
            textAlign: 'center',
            padding: '10px'
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
              border: '1px solid #ff8800',
              borderRadius: '4px',
              objectFit: 'cover',
              background: '#2a2a2a'
            }}
          />
        )}
        
        {!isStreaming && !error && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            color: '#ff8800',
            fontSize: '12px',
            textAlign: 'center',
            pointerEvents: 'none'
          }}>
            Click Start to capture HDMI input
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
          background: '#ff8800',
          borderRadius: '50%',
          border: '2px solid #ff8800',
          zIndex: 1
        }}
      />
    </div>
  );
});

HDMINode.displayName = 'HDMINode';
