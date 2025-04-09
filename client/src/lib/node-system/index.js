import NodeEventHandler from './NodeEventHandler.js';
import ShaderManager from './ShaderManager.js';
import ConnectionManager from './ConnectionManager.js';
import EditorManager from './EditorManager.js';
import JavaScriptNodeManager from './JavaScriptNodeManager.js';
import WebGPUManager from './WebGPUManager.js';
///npx vite
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
        this.javaScriptNodeManager = new JavaScriptNodeManager(this);
        this.webgpuManager = new WebGPUManager(this);
        
        // Initialize system
        this.initializeSystem();

        this.originalContainerBackground = null;
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
            { text: 'Add WebGPU Node', onClick: () => {
                const randomX = Math.floor(Math.random() * (window.innerWidth - 400));
                const randomY = Math.floor(Math.random() * (window.innerHeight - 300));
                this.createNode('webgpu', randomX, randomY);
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
            { text: 'Random Background', onClick: () => this.setRandomNodeAsBackground() },
            { text: 'Toggle Bounce', onClick: () => this.eventHandler.toggleBounce() },
            { text: 'Speed Up', onClick: () => this.eventHandler.speedUp() },
            { text: 'Slow Down', onClick: () => this.eventHandler.slowDown() },
            { text: 'CHAOS MODE', onClick: () => this.toggleChaos() }
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

        // Get template based on type
        node.innerHTML = type === 'javascript' ? 
            this.javaScriptNodeManager.getNodeTemplate() : 
            this.getNodeTemplate(type);

        this.container.appendChild(node);

        let codeType = type === 'webgl' ? this.shaderManager.defaultShaderCode : '';
        const nodeData = {
            type,
            element: node,
            code: codeType,
            data: {}
        };

        this.nodes.set(id, nodeData);
        console.log('Node created:', id);

        // Initialize based on type
        switch(type) {
            case 'webgl':
                this.shaderManager.initializeWebGL(node);
                break;
            case 'webgpu':
                this.webgpuManager.initializeWebGPU(node);
                break;
            case 'javascript':
                this.javaScriptNodeManager.initializeJavaScript(node);
                break;
            case 'webcam':
                this.shaderManager.initializeWebcam(node);
                break;
            case 'hdmi':
                this.shaderManager.initializeHDMI(node);
                break;
        }

        return node;
    }

    getNodeTemplate(type) {
        if (type === 'webcam' || type === 'hdmi') {
            return `
                <div class="node-header">
                    <span>${type.toUpperCase()}</span>
                    <div class="header-buttons">
                        <button class="expand-button">Edit</button>
                        ${type === 'webcam' ? '<button class="device-select-button">📹</button>' : ''}
                    </div>
                </div>
                <div class="node-content">
                    <video autoplay playsinline style="width: 320px; height: 240px; object-fit: cover;"></video>
                    ${type === 'webcam' ? `
                        <select class="device-select" style="display: none; position: absolute; top: 30px; right: 5px; z-index: 100;">
                            <option value="">Loading devices...</option>
                        </select>
                    ` : ''}
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

        const fromNode = this.nodes.get(fromId);
        const toNode = this.nodes.get(toId);

        // Only allow connections between valid nodes
        if (!fromNode || !toNode) return;

        // Create the connection
        this.connect(fromId, toId);

        // Handle different connection types
        if (fromNode.type === 'webgl' && toNode.type === 'javascript') {
            this.javaScriptNodeManager.handleConnection(fromNode, toNode);
        } else if (fromNode.type === 'webgl' && toNode.type === 'webgl') {
            this.shaderManager.updateShaderConnection(
                document.getElementById(fromId), 
                document.getElementById(toId)
            );
        }
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

    setRandomNodeAsBackground() {
        // Get all WebGL, webcam, and HDMI nodes
        const validNodes = Array.from(this.nodes.entries()).filter(([_, node]) => 
            node.type === 'webgl' || node.type === 'webcam' || node.type === 'hdmi'
        );

        if (validNodes.length === 0) {
            console.log('No valid nodes to set as background');
            return;
        }

        // Store original background if not already stored
        const container = document.getElementById('node-container');
        if (!this.originalContainerBackground && container) {
            this.originalContainerBackground = window.getComputedStyle(container).backgroundColor;
            container.style.backgroundColor = 'transparent';
        }

        // Select a random node
        const [nodeId, nodeData] = validNodes[Math.floor(Math.random() * validNodes.length)];
        const node = document.getElementById(nodeId);

        if (!node) return;

        console.log('Setting background from node:', nodeData.type, nodeId);

        // Remove previous background if it exists
        const prevBackground = document.querySelector('.background-node');
        if (prevBackground) {
            prevBackground.remove();  // Actually remove the element
            this.nodes.delete('background');
        }

        // Create background container with proper node structure
        const background = document.createElement('div');
        background.className = 'background-node';
        background.id = 'background';

        // Create node content div
        const content = document.createElement('div');
        content.className = 'node-content';
        content.style.width = '100%';
        content.style.height = '100%';
        background.appendChild(content);

        if (nodeData.type === 'webgl') {
            // For WebGL nodes, create a new canvas
            const canvas = document.createElement('canvas');
            // Match the expanded node dimensions (window size minus 40px padding)
            canvas.width = window.innerWidth - 40;
            canvas.height = window.innerHeight - 40;
            canvas.style.width = '100%';
            canvas.style.height = '100%';
            canvas.style.display = 'block';
            // Center the canvas like in expanded mode
            canvas.style.position = 'absolute';
            canvas.style.top = '50%';
            canvas.style.left = '50%';
            canvas.style.transform = 'translate(-50%, -50%)';
            content.appendChild(canvas);
            
            // Register the background as a node in the system
            this.nodes.set('background', {
                type: 'webgl',
                element: background,
                code: nodeData.code,
                data: null
            });
            
            // Initialize WebGL for the background
            this.shaderManager.initializeWebGL(background);
            
            // Copy the shader code
            if (nodeData.code) {
                requestAnimationFrame(() => {
                    this.shaderManager.updateShader('background', nodeData.code);
                });
            }
        } else {
            // For video nodes, clone the video element
            const originalVideo = node.querySelector('video');
            const newVideo = document.createElement('video');
            newVideo.autoplay = true;
            newVideo.playsinline = true;
            newVideo.muted = true;
            newVideo.srcObject = originalVideo.srcObject;
            newVideo.style.width = '100%';
            newVideo.style.height = '100%';
            newVideo.style.objectFit = 'cover';
            content.appendChild(newVideo);
            
            // Register the background as a node
            this.nodes.set('background', {
                type: nodeData.type,
                element: background,
                data: { video: newVideo, stream: originalVideo.srcObject }
            });

            // Ensure video plays
            newVideo.play().catch(console.error);
        }

        // Style the background with matching padding
        Object.assign(background.style, {
            position: 'fixed',
            top: '20px',
            left: '20px',
            width: 'calc(100vw - 40px)',
            height: 'calc(100vh - 40px)',
            zIndex: '-1',
            opacity: '1',
            pointerEvents: 'none',
            overflow: 'hidden',
            backgroundColor: 'transparent'
        });

        // Add to document
        document.body.insertBefore(background, document.body.firstChild);

        console.log(`Set node ${nodeId} as background, type: ${nodeData.type}`);
    }
    

    resetBackground() {
        const background = document.querySelector('.background-node');
        if (background) {
            background.remove();
            this.nodes.delete('background');
        }
        
        // Restore original container background
        const container = document.getElementById('node-container');
        if (this.originalContainerBackground && container) {
            container.style.backgroundColor = this.originalContainerBackground;
            this.originalContainerBackground = null;
        }
    }

    toggleChaos() {
        const container = document.getElementById('node-container');
        container.classList.toggle('chaos-mode');
        
        // Add some extra chaos
        if (container.classList.contains('chaos-mode')) {
            // Only create angel if it doesn't exist yet
           // if (!this.chaosAngel) {
                const angelNode = document.createElement('div');
                angelNode.className = 'node chaos-angel';
                angelNode.style.position = 'absolute';
                angelNode.style.left = `${Math.random() * (window.innerWidth - 400)}px`;
                angelNode.style.top = `${Math.random() * (window.innerHeight - 400)}px`;
                angelNode.style.zIndex = '9999';
                
                const img = document.createElement('img');
                img.src = '/src/SwitchAngel_1_Transparent.png';
                img.style.width = '200px';
                img.style.height = 'auto';
                // img.style.filter = 'hue-rotate(0deg)';
                // img.style.animation = 'chaos-colors 2s infinite';
                
                angelNode.appendChild(img);
                container.appendChild(angelNode);
                
                this.chaosAngel = angelNode;
            //}
            
            // Randomize node positions
            this.nodes.forEach((nodeData) => {
                const node = nodeData.element;
                node.style.transition = 'all 0.5s ease';
                node.style.left = `${Math.random() * (window.innerWidth - 400)}px`;
                node.style.top = `${Math.random() * (window.innerHeight - 300)}px`;
            });

            // Start random color changes for connections
            this.connectionManager?.startChaosMode();
        } else {
            // Reset transitions
            this.nodes.forEach((nodeData) => {
                const node = nodeData.element;
                node.style.transition = '';
            });

            // Stop chaos in connections
            this.connectionManager?.stopChaosMode();
        }
    }
}

export default NodeSystem;