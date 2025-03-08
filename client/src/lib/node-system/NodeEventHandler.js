export class NodeEventHandler {
    constructor(nodeSystem) {
        this.nodeSystem = nodeSystem;
        this.draggedNode = null;
        this.dragOffset = { x: 0, y: 0 };
        this.draggedConnection = null;
        this.tempConnection = null;
        this.animationSpeed = 2;
        this.isAnimating = false;
        this.nodeVelocities = new Map();
        
        // Add animation control buttons
        this.setupAnimationControls();
    }

    initializeEventListeners() {
        this.setupDragEvents();
        this.setupConnectionEvents();
        this.setupResizeEvents();
        this.setupEditorEvents();
    }

    setupDragEvents() {
        this.nodeSystem.container.addEventListener('mousedown', (e) => {
            const node = e.target.closest('.node');
            if (!node) return;

            // Don't initiate drag if clicking canvas or if node is expanded
            if (e.target.tagName === 'CANVAS' || node.classList.contains('expanded')) {
                return;
            }

            this.draggedNode = node;
            const rect = node.getBoundingClientRect();
            this.dragOffset = {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            };
        });

        document.addEventListener('mousemove', (e) => {
            if (this.draggedNode) {
                const x = e.clientX - this.dragOffset.x;
                const y = e.clientY - this.dragOffset.y;
                this.draggedNode.style.left = `${x}px`;
                this.draggedNode.style.top = `${y}px`;
                this.nodeSystem.connectionManager.updateConnections(this.draggedNode.id);
            }
        });

        document.addEventListener('mouseup', () => {
            this.draggedNode = null;
        });
    }

    setupConnectionEvents() {
        this.nodeSystem.container.addEventListener('mousedown', (e) => {
            const port = e.target.closest('.input-port, .output-port');
            if (!port || e.target.closest('.node.expanded')) return;

            const node = port.closest('.node');
            if (!node) return;

            this.draggedConnection = {
                start: port,
                startNode: node,
                isInput: port.classList.contains('input-port')
            };

            // Create temporary connection line
            this.tempConnection = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            this.tempConnection.setAttribute('class', 'connection-line temp');
            this.nodeSystem.connectionManager.svg.appendChild(this.tempConnection);

            // Get starting position
            const startPos = this.getPortPosition(port);
            if (startPos) {
                const mousePos = {
                    x: e.clientX - this.nodeSystem.container.getBoundingClientRect().left,
                    y: e.clientY - this.nodeSystem.container.getBoundingClientRect().top
                };
                this.updateTempConnection(startPos, mousePos);
            }
        });

        document.addEventListener('mousemove', (e) => {
            if (this.draggedConnection && this.tempConnection) {
                const startPos = this.getPortPosition(this.draggedConnection.start);
                if (startPos) {
                    const mousePos = {
                        x: e.clientX - this.nodeSystem.container.getBoundingClientRect().left,
                        y: e.clientY - this.nodeSystem.container.getBoundingClientRect().top
                    };
                    this.updateTempConnection(startPos, mousePos);
                }
            }
        });

        document.addEventListener('mouseup', (e) => {
            if (this.draggedConnection && this.tempConnection) {
                const endPort = e.target.closest('.input-port, .output-port');
                if (endPort && endPort !== this.draggedConnection.start) {
                    const endNode = endPort.closest('.node');
                    if (endNode && this.isValidConnection(this.draggedConnection, endPort, endNode)) {
                        this.createConnection(this.draggedConnection, endPort, endNode);
                    }
                }
                this.tempConnection.remove();
                this.tempConnection = null;
                this.draggedConnection = null;
            }
        });
    }

    setupResizeEvents() {
        window.addEventListener('resize', () => {
            if (this.nodeSystem.constructor.expandedNode) {
                const node = document.getElementById(this.nodeSystem.constructor.expandedNode);
                if (node) {
                    const canvas = node.querySelector('canvas');
                    if (canvas) {
                        const padding = 40;
                        canvas.width = window.innerWidth - padding * 2;
                        canvas.height = window.innerHeight - padding * 2;
                        
                        const nodeData = this.nodeSystem.nodes.get(this.nodeSystem.constructor.expandedNode);
                        if (nodeData?.data?.gl) {
                            const gl = nodeData.data.gl;
                            gl.viewport(0, 0, canvas.width, canvas.height);
                            if (nodeData.data.resolutionLocation) {
                                gl.uniform2f(nodeData.data.resolutionLocation, canvas.width, canvas.height);
                            }
                        }
                    }
                }
            }
        });
    }

    setupEditorEvents() {
        this.nodeSystem.container.addEventListener('click', (e) => {
            const editButton = e.target.closest('.expand-button');
            if (editButton) {
                const node = editButton.closest('.node');
                if (node) {
                    const type = node.getAttribute('data-type');
                    this.nodeSystem.editorManager.toggleEditor(node.id, type);
                }
            }
        });
    }

    toggleCanvasExpand(nodeId) {
        const node = document.getElementById(nodeId);
        const isExpanded = node.classList.contains('expanded');
        const canvas = node.querySelector('canvas');
        
        // Reset previous expanded node if exists
        if (this.nodeSystem.constructor.expandedNode && 
            this.nodeSystem.constructor.expandedNode !== nodeId) {
            const prevNode = document.getElementById(this.nodeSystem.constructor.expandedNode);
            if (prevNode) {
                prevNode.classList.remove('expanded');
                const prevCanvas = prevNode.querySelector('canvas');
                if (prevCanvas) {
                    prevCanvas.width = 320;
                    prevCanvas.height = 240;
                }
                const ports = prevNode.querySelector('.node-ports');
                if (ports) ports.style.display = 'flex';
            }
        }

        if (!isExpanded) {
            node.classList.add('expanded');
            this.nodeSystem.constructor.expandedNode = nodeId;
            
            const ports = node.querySelector('.node-ports');
            if (ports) ports.style.display = 'none';
            
            if (canvas) {
                const padding = 40;
                canvas.width = window.innerWidth - padding * 2;
                canvas.height = window.innerHeight - padding * 2;
                
                const nodeData = this.nodeSystem.nodes.get(nodeId);
                if (nodeData?.data?.gl) {
                    const gl = nodeData.data.gl;
                    gl.viewport(0, 0, canvas.width, canvas.height);
                    if (nodeData.data.resolutionLocation) {
                        gl.uniform2f(nodeData.data.resolutionLocation, canvas.width, canvas.height);
                    }
                }
            }
        } else {
            node.classList.remove('expanded');
            this.nodeSystem.constructor.expandedNode = null;
            
            const ports = node.querySelector('.node-ports');
            if (ports) ports.style.display = 'flex';
            
            if (canvas) {
                canvas.width = 320;
                canvas.height = 240;
                
                const nodeData = this.nodeSystem.nodes.get(nodeId);
                if (nodeData?.data?.gl) {
                    const gl = nodeData.data.gl;
                    gl.viewport(0, 0, canvas.width, canvas.height);
                    if (nodeData.data.resolutionLocation) {
                        gl.uniform2f(nodeData.data.resolutionLocation, canvas.width, canvas.height);
                    }
                }
            }
        }
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

    updateTempConnection(start, end) {
        if (!this.tempConnection || !start || !end) return;
        const path = this.nodeSystem.connectionManager.createConnectionPath(start, end);
        if (path) {
            this.tempConnection.setAttribute('d', path);
        }
    }

    isValidConnection(draggedConnection, endPort, endNode) {
        const isInput = endPort.classList.contains('input-port');
        return draggedConnection.isInput !== isInput && 
               draggedConnection.startNode !== endNode;
    }

    createConnection(draggedConnection, endPort, endNode) {
        const fromNode = draggedConnection.isInput ? endNode : draggedConnection.startNode;
        const toNode = draggedConnection.isInput ? draggedConnection.startNode : endNode;
        
        const connectionId = `connection-${Date.now()}`;
        this.nodeSystem.connectionManager.connections.set(connectionId, {
            from: fromNode.id,
            to: toNode.id
        });

        // If this is a WebGL connection, update shaders
        if (fromNode.getAttribute('data-type') === 'webgl' && 
            toNode.getAttribute('data-type') === 'webgl') {
            this.nodeSystem.shaderManager.updateShaderConnection(fromNode, toNode);
        }
    }

    setupAnimationControls() {
        // Bounce button
        const bounceButton = document.createElement('button');
        bounceButton.className = 'bounce-button';
        bounceButton.textContent = 'Toggle Bounce';
        bounceButton.onclick = () => this.toggleBounce();
        document.body.appendChild(bounceButton);

        // Speed up button
        const speedUpButton = document.createElement('button');
        speedUpButton.className = 'speed-up-button';
        speedUpButton.textContent = 'Speed Up';
        speedUpButton.onclick = () => this.speedUp();
        document.body.appendChild(speedUpButton);

        // Slow down button
        const slowDownButton = document.createElement('button');
        slowDownButton.className = 'slow-down-button';
        slowDownButton.textContent = 'Slow Down';
        slowDownButton.onclick = () => this.slowDown();
        document.body.appendChild(slowDownButton);
    }

    toggleBounce() {
        if (!this.isAnimating) {
            this.startBouncing();
        } else {
            this.stopBouncing();
        }
    }

    startBouncing() {
        this.isAnimating = true;
        
        // Initialize random velocities for each node
        this.nodeSystem.nodes.forEach((nodeData, id) => {
            if (!this.nodeVelocities.has(id)) {
                this.nodeVelocities.set(id, {
                    x: (Math.random() - 0.5) * 5,
                    y: (Math.random() - 0.5) * 5
                });
            }
        });
        
        const animate = () => {
            if (!this.isAnimating) return;
            
            this.nodeSystem.nodes.forEach((nodeData, id) => {
                const node = nodeData.element;
                const velocity = this.nodeVelocities.get(id);
                
                let rect = node.getBoundingClientRect();
                let newX = rect.left + velocity.x * this.animationSpeed;
                let newY = rect.top + velocity.y * this.animationSpeed;
                
                // Bounce off walls
                if (newX <= 0 || newX + rect.width >= window.innerWidth) {
                    velocity.x *= -1;
                    newX = Math.max(0, Math.min(newX, window.innerWidth - rect.width));
                }
                
                if (newY <= 0 || newY + rect.height >= window.innerHeight) {
                    velocity.y *= -1;
                    newY = Math.max(0, Math.min(newY, window.innerHeight - rect.height));
                }
                
                node.style.left = `${newX}px`;
                node.style.top = `${newY}px`;
            });
            
            requestAnimationFrame(animate);
        };
        
        animate();
    }
    
    stopBouncing() {
        this.isAnimating = false;
    }

    speedUp() {
        this.animationSpeed = Math.min(this.animationSpeed + 100, 1000);
    }

    slowDown() {
        this.animationSpeed = Math.max(this.animationSpeed - 100, 1);
    }
} 

export default NodeEventHandler; 