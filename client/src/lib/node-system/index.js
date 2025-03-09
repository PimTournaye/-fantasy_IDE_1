import NodeEventHandler from './NodeEventHandler.js';
import ShaderManager from './ShaderManager.js';
import ConnectionManager from './ConnectionManager.js';
import EditorManager from './EditorManager.js';

class NodeSystem {
    static #expandedNode = null;

    constructor() {
        console.log('NodeSystem constructor called');
        
        // Create toolbar first
        this.createToolbar();
        
        // Then create container if it doesn't exist
        this.container = document.getElementById('node-container');
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.id = 'node-container';
            document.body.appendChild(this.container);
        }
        
        this.nodes = new Map();
        
        // Initialize managers
        this.shaderManager = new ShaderManager(this);
        this.connectionManager = new ConnectionManager(this);
        this.editorManager = new EditorManager(this);
        this.eventHandler = new NodeEventHandler(this);
        
        // Initialize system
        this.initializeSystem();
    }

    createToolbar() {
        console.log('Creating toolbar...');
        let toolbar = document.getElementById('toolbar');
        
        // Always create a new toolbar
        if (toolbar) {
            toolbar.remove();
        }
        
        toolbar = document.createElement('div');
        toolbar.id = 'toolbar';
        
        // Basic toolbar styles
        Object.assign(toolbar.style, {
            position: 'fixed',
            bottom: '20px',
            left: '0',
            right: '0',
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '10px',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: '1000'
        });

        const buttonStyle = {
            padding: '8px 16px',
            margin: '0 10px',
            cursor: 'pointer',
            border: 'none',
            borderRadius: '4px',
            backgroundColor: '#444',
            color: 'white',
            fontSize: '14px',
            flexShrink: '0',
            fontFamily: "'Bianzhidai', monospace"
        };

        const buttons = [
            { text: 'Add JS Node', onClick: () => {
                const randomX = Math.floor(Math.random() * (window.innerWidth - 400));
                const randomY = Math.floor(Math.random() * (window.innerHeight - 300));
                this.createNode('javascript', randomX, randomY);
            }},
            { text: 'Add WebGL Node', onClick: () => {
                const randomX = Math.floor(Math.random() * (window.innerWidth - 400));
                const randomY = Math.floor(Math.random() * (window.innerHeight - 300));
                this.createNode('webgl', randomX, randomY);
            }},
            { text: 'Add Webcam Node', onClick: () => {
                const randomX = Math.floor(Math.random() * (window.innerWidth - 400));
                const randomY = Math.floor(Math.random() * (window.innerHeight - 300));
                this.createNode('webcam', randomX, randomY);
            }},
            { text: 'Add HDMI Node', onClick: () => {
                const randomX = Math.floor(Math.random() * (window.innerWidth - 400));
                const randomY = Math.floor(Math.random() * (window.innerHeight - 300));
                this.createNode('hdmi', randomX, randomY);
            }},
            { text: 'Toggle Bounce', onClick: () => this.eventHandler.toggleBounce() },
            { text: 'Speed Up', onClick: () => this.eventHandler.speedUp() },
            { text: 'Slow Down', onClick: () => this.eventHandler.slowDown() }
        ];

        buttons.forEach(({ text, onClick }) => {
            const button = document.createElement('button');
            button.textContent = text;
            button.onclick = onClick;
            Object.assign(button.style, buttonStyle);
            toolbar.appendChild(button);
        });

        document.body.appendChild(toolbar);
        console.log('Toolbar created with buttons:', buttons.length, 'buttons');
        return toolbar;
    }

    createNode(type, x, y) {
        console.log('Creating node of type:', type);
        const id = `node-${Date.now()}`;
        const node = document.createElement('div');
        node.className = 'node';
        node.id = id;
        node.setAttribute('data-type', type);

        node.style.position = 'absolute';
        node.style.left = `${x}px`;
        node.style.top = `${y}px`;

        node.innerHTML = this.getNodeTemplate(type);
        this.container.appendChild(node);

        const nodeData = {
            type,
            element: node,
            code: type === 'webgl' ? this.shaderManager.defaultShaderCode : '',
            data: {}
        };

        this.nodes.set(id, nodeData);
        console.log('Node created:', id);

        // Initialize based on type
        switch(type) {
            case 'webgl':
                console.log('Initializing WebGL for node:', id);
                this.shaderManager.initializeWebGL(node);
                break;
            case 'javascript':
                console.log('Initializing checkbox grid for node:', id);
                this.initializeCheckboxGrid(nodeData);
                break;
            case 'webcam':
                console.log('Initializing webcam for node:', id);
                this.shaderManager.initializeWebcam(node);
                break;
            case 'hdmi':
                console.log('Initializing HDMI for node:', id);
                this.shaderManager.initializeHDMI(node);
                break;
        }

        // Add event listeners for the edit button
        const editButton = node.querySelector('.expand-button');
        if (editButton) {
            editButton.addEventListener('click', (e) => {
                e.stopPropagation();
                this.editorManager.toggleEditor(id, type);
            });
        }

        return node;
    }

    getNodeTemplate(type) {
        if (type === 'javascript') {
            // 32 checkboxes * 13px width = 416px total width
            // 32 checkboxes * 15px height = 480px total height
            return `
                <div class="node-header">
                    <span>JavaScript</span>
                    <div class="header-buttons">
                        <button class="expand-button">Edit</button>
                    </div>
                </div>
                <div class="node-content">
                    <div class="checkbox-grid" style="display: grid; grid-template-columns: repeat(32, 13px); width: 416px; height: 480px; gap: 0;"></div>
                </div>
                <div class="node-ports">
                    <div class="input-port"></div>
                    <div class="output-port"></div>
                </div>
            `;
        } else if (type === 'webcam' || type === 'hdmi') {
            return `
                <div class="node-header">
                    <span>${type.toUpperCase()}</span>
                    <div class="header-buttons">
                        <button class="expand-button">Edit</button>
                    </div>
                </div>
                <div class="node-content">
                    <video autoplay playsinline style="width: 320px; height: 240px;"></video>
                </div>
                <div class="node-ports">
                    <div class="output-port"></div>
                </div>
            `;
        }
        
        // WebGL node template
        return `
            <div class="node-header">
                <span>${type}</span>
                <div class="header-buttons">
                    <button class="expand-button">Edit</button>
                </div>
            </div>
            <div class="node-content">
                <canvas width="320" height="240"></canvas>
            </div>
            <div class="node-ports">
                <div class="input-port"></div>
                <div class="output-port"></div>
            </div>
        `;
    }

    initializeSystem() {
        console.log('Initializing system...');
        this.eventHandler.initializeEventListeners();
        this.editorManager.initializeEditor();
    }

    static get expandedNode() {
        return NodeSystem.#expandedNode;
    }

    static set expandedNode(value) {
        NodeSystem.#expandedNode = value;
    }

    completeConnection(fromId, toId) {
        // Check if connection already exists
        const connectionId = `${fromId}-${toId}`;
        if (this.connections.has(connectionId)) return;

        const fromNode = document.getElementById(fromId);
        const toNode = document.getElementById(toId);

        // Only allow connections between valid nodes
        if (!fromNode || !toNode) return;

        // Create the connection
        this.connect(fromId, toId);

        // Get node data
        const fromNodeData = this.nodes.get(fromId);
        const toNodeData = this.nodes.get(toId);

        // Handle different connection types
        if (fromNodeData.type === 'webgl' && toNodeData.type === 'javascript') {
            this.connectShaderToCheckboxGrid(fromNodeData, toNodeData);
        } else if (fromNodeData.type === 'webgl' && toNodeData.type === 'webgl') {
            this.shaderManager.updateShaderConnection(fromNode, toNode);
        }
    }

    connectShaderToCheckboxGrid(fromNode, toNode) {
        const canvas = fromNode.element.querySelector('canvas');
        const grid = toNode.element.querySelector('.checkbox-grid');
        const checkboxes = grid.querySelectorAll('input[type="checkbox"]');
        const size = Math.sqrt(checkboxes.length);

        // Create temporary canvas for reading pixels
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = size;
        tempCanvas.height = size;

        // Update function to process shader output
        const updateCheckboxes = () => {
            // Draw WebGL canvas to temp canvas
            tempCtx.drawImage(canvas, 0, 0, size, size);
            
            // Read pixel data
            const imageData = tempCtx.getImageData(0, 0, size, size);
            const pixels = imageData.data;

            // Update checkboxes based on brightness
            checkboxes.forEach((checkbox, i) => {
                const pixelIndex = i * 4;
                const brightness = (pixels[pixelIndex] + pixels[pixelIndex + 1] + pixels[pixelIndex + 2]) / 3;
                checkbox.checked = brightness > 127;
            });

            // Continue animation
            if (this.connections.has(`${fromNode.element.id}-${toNode.element.id}`)) {
                requestAnimationFrame(updateCheckboxes);
            }
        };

        // Start the update loop
        updateCheckboxes();
    }

    initializeCheckboxGrid(nodeData) {
        const grid = nodeData.element.querySelector('.checkbox-grid');
        const size = 32;
        
        // Create checkboxes
        for (let i = 0; i < size * size; i++) {
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.style.width = '100%';
            checkbox.style.height = '100%';
            checkbox.style.margin = '0';
            grid.appendChild(checkbox);
        }
        
        grid.style.gridTemplateColumns = `repeat(${size}, 1fr)`;
        nodeData.data = grid;
    }

    processNode(sourceNode) {
        if (!sourceNode || !sourceNode.data) return;

        // Find connected nodes
        const connections = Array.from(this.connections.values())
            .filter(conn => conn.from === sourceNode.element.id)
            .map(conn => this.nodes.get(conn.to))
            .filter(Boolean);

        connections.forEach(targetNode => {
            if (targetNode.type === 'javascript' && sourceNode.type === 'webgl') {
                this.processCheckboxNode(sourceNode, targetNode);
            }
        });

        // Continue processing in animation loop
        requestAnimationFrame(() => this.processNode(sourceNode));
    }

    processCheckboxNode(webglNode, checkboxNode) {
        const { gl, canvas } = webglNode.data;
        const grid = checkboxNode.data;
        const checkboxes = grid.querySelectorAll('input');

        // Create a temporary canvas to read pixels from WebGL
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;

        // Copy WebGL canvas to temp canvas
        tempCtx.drawImage(canvas, 0, 0);
        const imageData = tempCtx.getImageData(0, 0, canvas.width, canvas.height).data;

        // Calculate step sizes to sample the image
        const sampleWidth = Math.floor(canvas.width / 32);
        const sampleHeight = Math.floor(canvas.height / 32);

        checkboxes.forEach((checkbox, i) => {
            const gridX = i % 32;
            const gridY = Math.floor(i / 32);

            // Sample from the center of each grid cell
            const x = gridX * sampleWidth + Math.floor(sampleWidth / 2);
            const y = gridY * sampleHeight + Math.floor(sampleHeight / 2);

            // Get the pixel index in the image data array (RGBA format)
            const pixelIndex = (y * canvas.width + x) * 4;

            // Use the red channel since our WebGL shader outputs black/white
            const brightness = imageData[pixelIndex];

            // Update checkbox state - checked if dark, unchecked if bright
            checkbox.checked = brightness < 128;
        });
    }

    connect(fromId, toId) {
        const connectionId = `${fromId}-${toId}`;
        this.connections.set(connectionId, { from: fromId, to: toId });
        
        // Start processing the source node
        const sourceNode = this.nodes.get(fromId);
        if (sourceNode) {
            this.processNode(sourceNode);
        }
        
        this.updateConnections();
    }
}

export default NodeSystem;