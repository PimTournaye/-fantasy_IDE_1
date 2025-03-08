class ConnectionManager {
    constructor(nodeSystem) {
        this.nodeSystem = nodeSystem;
        this.connections = new Map();
        this.svg = null;
    }

    initializeSVG() {
        this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        this.svg.id = 'connection-svg';
        this.nodeSystem.container.appendChild(this.svg);
    }

    createConnectionPath(from, to) {
        // Validate input points
        if (!from || !to || typeof from.x === 'undefined' || typeof to.x === 'undefined') {
            console.warn('Invalid points for connection path:', from, to);
            return '';
        }

        // Create a curved path between points
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const curve = Math.min(Math.abs(dx) / 2, 100); // Control point offset

        return `M ${from.x},${from.y} 
                C ${from.x + curve},${from.y} 
                  ${to.x - curve},${to.y} 
                  ${to.x},${to.y}`;
    }

    updateConnections(nodeId) {
        // Update all connections involving this node
        this.connections.forEach((connection, id) => {
            if (connection.from === nodeId || connection.to === nodeId) {
                this.updateConnection(id);
            }
        });
    }

    updateConnection(connectionId) {
        const connection = this.connections.get(connectionId);
        if (!connection) return;

        const fromNode = document.getElementById(connection.from);
        const toNode = document.getElementById(connection.to);
        if (!fromNode || !toNode) {
            this.removeConnection(connectionId);
            return;
        }

        const fromPort = fromNode.querySelector('.output-port');
        const toPort = toNode.querySelector('.input-port');
        if (!fromPort || !toPort) {
            this.removeConnection(connectionId);
            return;
        }

        const fromPos = this.getPortPosition(fromPort);
        const toPos = this.getPortPosition(toPort);
        
        let path = this.svg.querySelector(`path[data-connection-id="${connectionId}"]`);
        if (!path) {
            path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('class', 'connection-line');
            path.setAttribute('data-connection-id', connectionId);
            this.svg.appendChild(path);
        }

        const pathData = this.createConnectionPath(fromPos, toPos);
        path.setAttribute('d', pathData);
    }

    removeConnection(connectionId) {
        const path = this.svg.querySelector(`path[data-connection-id="${connectionId}"]`);
        if (path) {
            path.remove();
        }
        this.connections.delete(connectionId);
    }

    getPortPosition(port) {
        if (!port) return null;
        const rect = port.getBoundingClientRect();
        const containerRect = this.nodeSystem.container.getBoundingClientRect();
        return {
            x: rect.left + rect.width / 2 - containerRect.left,
            y: rect.top + rect.height / 2 - containerRect.top
        };
    }

    createConnection(fromNodeId, toNodeId) {
        const connectionId = `connection-${Date.now()}`;
        this.connections.set(connectionId, {
            from: fromNodeId,
            to: toNodeId
        });

        this.updateConnection(connectionId);
        return connectionId;
    }

    removeConnectionsForNode(nodeId) {
        // Remove all connections involving this node
        this.connections.forEach((connection, id) => {
            if (connection.from === nodeId || connection.to === nodeId) {
                this.removeConnection(id);
            }
        });
    }

    getConnections(nodeId) {
        // Get all connections involving this node
        const nodeConnections = new Map();
        this.connections.forEach((connection, id) => {
            if (connection.from === nodeId || connection.to === nodeId) {
                nodeConnections.set(id, connection);
            }
        });
        return nodeConnections;
    }

    getInputConnections(nodeId) {
        // Get connections where this node is the target
        const inputConnections = new Map();
        this.connections.forEach((connection, id) => {
            if (connection.to === nodeId) {
                inputConnections.set(id, connection);
            }
        });
        return inputConnections;
    }

    getOutputConnections(nodeId) {
        // Get connections where this node is the source
        const outputConnections = new Map();
        this.connections.forEach((connection, id) => {
            if (connection.from === nodeId) {
                outputConnections.set(id, connection);
            }
        });
        return outputConnections;
    }

    updateSVGSize() {
        // Update SVG size to match container
        const rect = this.nodeSystem.container.getBoundingClientRect();
        this.svg.setAttribute('width', rect.width);
        this.svg.setAttribute('height', rect.height);
    }

    clearAllConnections() {
        // Remove all connection paths
        while (this.svg.firstChild) {
            this.svg.removeChild(this.svg.firstChild);
        }
        this.connections.clear();
    }

    serializeConnections() {
        // Convert connections to a serializable format
        const serialized = {};
        this.connections.forEach((connection, id) => {
            serialized[id] = {
                from: connection.from,
                to: connection.to
            };
        });
        return serialized;
    }

    deserializeConnections(serialized) {
        // Restore connections from serialized data
        this.clearAllConnections();
        Object.entries(serialized).forEach(([id, connection]) => {
            this.connections.set(id, connection);
            this.updateConnection(id);
        });
    }
}

export default ConnectionManager; 