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
        toolbar.style.position = 'fixed';
        toolbar.style.top = '10px';
        toolbar.style.left = '10px';
        toolbar.style.zIndex = '1000';
        toolbar.style.padding = '10px';
        toolbar.style.background = 'rgba(30, 30, 30, 0.8)';
        toolbar.style.borderRadius = '5px';
        
        // Add WebGL node button
        const webglButton = document.createElement('button');
        webglButton.textContent = 'Add WebGL Node';
        webglButton.style.padding = '8px 16px';
        webglButton.style.margin = '0 5px';
        webglButton.style.background = '#4CAF50';
        webglButton.style.color = 'white';
        webglButton.style.border = 'none';
        webglButton.style.borderRadius = '4px';
        webglButton.style.cursor = 'pointer';
        webglButton.style.fontSize = '14px';
        
        webglButton.onclick = () => {
            console.log('WebGL button clicked');
            this.createNode('webgl', 50, 50);
        };
        
        toolbar.appendChild(webglButton);
        document.body.appendChild(toolbar);
        
        console.log('Toolbar created with button');
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

        if (type === 'webgl') {
            console.log('Initializing WebGL for node:', id);
            this.shaderManager.initializeWebGL(node);
            this.shaderManager.updateShader(node, "");
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
        return `
            <div class="node-header">
                <span>${type}</span>
                <div class="header-buttons">
                    <button class="expand-button">Edit</button>
                </div>
            </div>
            <div class="node-content">
                ${type === 'webgl' ? '<canvas width="320" height="240"></canvas>' : ''}
            </div>
            <div class="node-ports">
                <div class="input-port"></div>
                <div class="output-port"></div>
            </div>
        `;
    }

    initializeSystem() {
        console.log('Initializing system...');
        this.connectionManager.initializeSVG();
        this.eventHandler.initializeEventListeners();
        this.editorManager.initializeEditor();
    }

    static get expandedNode() {
        return NodeSystem.#expandedNode;
    }

    static set expandedNode(value) {
        NodeSystem.#expandedNode = value;
    }
}

export default NodeSystem;