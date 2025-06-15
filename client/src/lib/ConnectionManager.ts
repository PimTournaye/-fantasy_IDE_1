import { Node, Edge } from '@xyflow/react';

export interface ConnectionData {
  id: string;
  sourceNode: Node;
  targetNode: Node;
  edge: Edge;
  active: boolean;
}

export class ConnectionManager {
  private connections: Map<string, ConnectionData> = new Map();
  private nodeDataStore: Map<string, any> = new Map();

  addConnection(sourceNode: Node, targetNode: Node, edge: Edge): void {
    const connectionId = `${sourceNode.id}-${targetNode.id}`;
    
    this.connections.set(connectionId, {
      id: connectionId,
      sourceNode,
      targetNode,
      edge,
      active: true
    });

    console.log(`Connection added: ${sourceNode.type} -> ${targetNode.type}`);
    this.setupDataFlow(sourceNode, targetNode);
  }

  removeConnection(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (connection) {
      connection.active = false;
      this.connections.delete(connectionId);
      console.log(`Connection removed: ${connectionId}`);
    }
  }

  getConnectionsForNode(nodeId: string): ConnectionData[] {
    return Array.from(this.connections.values()).filter(
      conn => conn.sourceNode.id === nodeId || conn.targetNode.id === nodeId
    );
  }

  getInputConnections(nodeId: string): ConnectionData[] {
    return Array.from(this.connections.values()).filter(
      conn => conn.targetNode.id === nodeId && conn.active
    );
  }

  getOutputConnections(nodeId: string): ConnectionData[] {
    return Array.from(this.connections.values()).filter(
      conn => conn.sourceNode.id === nodeId && conn.active
    );
  }

  setNodeData(nodeId: string, data: any): void {
    this.nodeDataStore.set(nodeId, data);
  }

  getNodeData(nodeId: string): any {
    return this.nodeDataStore.get(nodeId);
  }

  private setupDataFlow(sourceNode: Node, targetNode: Node): void {
    const sourceType = sourceNode.type || 'unknown';
    const targetType = targetNode.type || 'unknown';

    switch (`${sourceType}->${targetType}`) {
      case 'webcam->webgl':
        this.setupWebcamToWebGL(sourceNode, targetNode);
        break;
      case 'webgl->webgl':
        this.setupWebGLToWebGL(sourceNode, targetNode);
        break;
      case 'javascript->webgl':
        this.setupJavaScriptToWebGL(sourceNode, targetNode);
        break;
      case 'ai->webgl':
        this.setupAIToWebGL(sourceNode, targetNode);
        break;
      default:
        console.warn(`Unsupported connection type: ${sourceType} -> ${targetType}`);
    }
  }

  private setupWebcamToWebGL(webcamNode: Node, webglNode: Node): void {
    console.log('Setting up webcam to WebGL data flow');
    
    // Store connection info for WebGL node to access webcam data
    const webglData = this.getNodeData(webglNode.id) || {};
    webglData.webcamInput = {
      nodeId: webcamNode.id,
      type: 'webcam'
    };
    this.setNodeData(webglNode.id, webglData);
  }

  private setupWebGLToWebGL(sourceNode: Node, targetNode: Node): void {
    console.log('Setting up WebGL to WebGL data flow');
    
    // Setup framebuffer texture passing
    const targetData = this.getNodeData(targetNode.id) || {};
    targetData.textureInput = {
      nodeId: sourceNode.id,
      type: 'webgl'
    };
    this.setNodeData(targetNode.id, targetData);
  }

  private setupJavaScriptToWebGL(jsNode: Node, webglNode: Node): void {
    console.log('Setting up JavaScript to WebGL data flow');
    
    // Setup uniform data passing
    const webglData = this.getNodeData(webglNode.id) || {};
    webglData.uniformInput = {
      nodeId: jsNode.id,
      type: 'javascript'
    };
    this.setNodeData(webglNode.id, webglData);
  }

  private setupAIToWebGL(aiNode: Node, webglNode: Node): void {
    console.log('Setting up AI to WebGL data flow');
    
    // Setup AI output to shader uniforms
    const webglData = this.getNodeData(webglNode.id) || {};
    webglData.aiInput = {
      nodeId: aiNode.id,
      type: 'ai'
    };
    this.setNodeData(webglNode.id, webglData);
  }

  // Public method to update data flow when node data changes
  updateDataFlow(nodeId: string, data: any): void {
    this.setNodeData(nodeId, data);
    
    // Propagate changes to connected nodes
    const outputConnections = this.getOutputConnections(nodeId);
    outputConnections.forEach(connection => {
      this.propagateDataToNode(connection.sourceNode, connection.targetNode, data);
    });
  }

  private propagateDataToNode(sourceNode: Node, targetNode: Node, data: any): void {
    const sourceType = sourceNode.type || 'unknown';
    const targetType = targetNode.type || 'unknown';

    // Emit custom events for nodes to handle data updates
    const event = new CustomEvent('nodeDataUpdate', {
      detail: {
        sourceNodeId: sourceNode.id,
        sourceType,
        targetNodeId: targetNode.id,
        targetType,
        data
      }
    });

    // Dispatch to the target node's DOM element
    const targetElement = document.querySelector(`[data-id="${targetNode.id}"]`);
    if (targetElement) {
      targetElement.dispatchEvent(event);
    }
  }
}

// Global connection manager instance
export const connectionManager = new ConnectionManager();
