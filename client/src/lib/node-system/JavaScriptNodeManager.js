class JavaScriptNodeManager {
    constructor(nodeSystem) {
        this.nodeSystem = nodeSystem;
    }

    initializeJavaScript(node) {
        console.log('Initializing JavaScript node:', node.id);
        const nodeData = this.nodeSystem.nodes.get(node.id);
        
        // Create the checkbox grid container
        const content = node.querySelector('.node-content');
        const grid = document.createElement('div');
        grid.className = 'checkbox-grid';
        grid.style.display = 'grid';
        grid.style.gridTemplateColumns = 'repeat(32, 13px)';
        grid.style.width = '416px';
        grid.style.height = '480px';
        grid.style.gap = '0';
        content.appendChild(grid);

        // Store initial node data
        nodeData.data = {
            grid: grid
        };

        // Add event listeners for the edit button
        const editButton = node.querySelector('.expand-button');
        if (editButton) {
            editButton.addEventListener('click', (e) => {
                e.stopPropagation();
                this.nodeSystem.editorManager.toggleEditor(node.id, 'javascript');
            });
        }

        // Add event listener for run button
        const runButton = node.querySelector('.run-button');
        if (runButton) {
            runButton.addEventListener('click', (e) => {
                e.stopPropagation();
                this.executeCode(node.id, nodeData.code);
            });
        }

        // Set default code and execute it
        nodeData.code = this.getDefaultCode();
        this.executeCode(node.id, nodeData.code);
    }

    getDefaultCode() {
        return `// Initialize checkbox grid
const grid = nodeData.data.grid;
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

grid.style.gridTemplateColumns = \`repeat(\${size}, 1fr)\`;

// Function to update checkboxes from WebGL input
function updateFromWebGL(glCanvas) {
    const checkboxes = grid.querySelectorAll('input');
    if (checkboxes.length === 0) return;

    // Create a temporary canvas for scaling
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    tempCanvas.width = size;
    tempCanvas.height = size;

    // Draw the WebGL canvas to temp canvas, scaling it down
    tempCtx.drawImage(glCanvas, 0, 0, glCanvas.width, glCanvas.height, 0, 0, size, size);
    
    // Read the scaled pixels
    const imageData = tempCtx.getImageData(0, 0, size, size).data;

    // Update checkboxes based on scaled pixel data
    checkboxes.forEach((checkbox, i) => {
        const r = imageData[i * 4];
        const g = imageData[i * 4 + 1];
        const b = imageData[i * 4 + 2];
        const brightness = (r + g + b) / 3;
        checkbox.checked = brightness < 127;
    });
}

// Export the update function for connections
nodeData.updateFromWebGL = updateFromWebGL;`;
    }

    getNodeTemplate() {
        return `
            <div class="node-header">
                <span>JavaScript</span>
                <div class="header-buttons">
                    <button class="expand-button">Edit</button>
                    <button class="run-button" style="margin-left: 5px;">▶ Run</button>
                </div>
            </div>
            <div class="node-content">
            </div>
            <div class="node-ports">
                <div class="input-port"></div>
                <div class="output-port"></div>
            </div>`;
    }

    executeCode(nodeId, code) {
        const nodeData = this.nodeSystem.nodes.get(nodeId);
        if (!nodeData || !nodeData.data) return;

        try {
            // Create a safe execution context
            const executionContext = `
                const nodeData = {
                    data: {
                        grid: document.querySelector('#${nodeId} .checkbox-grid')
                    },
                    element: document.getElementById('${nodeId}')
                };
                ${code}
            `;
            
            // Execute the code
            new Function(executionContext)();

        } catch (err) {
            console.error('Error executing JavaScript node code:', err);
        }
    }

    handleConnection(fromNode, toNode) {
        if (fromNode.type === 'webgl' && toNode.type === 'javascript') {
            this.connectShaderToCheckboxGrid(fromNode, toNode);
        }
    }

    connectShaderToCheckboxGrid(fromNode, toNode) {
        const canvas = fromNode.element.querySelector('canvas');
        const nodeData = this.nodeSystem.nodes.get(toNode.element.id);
        
        if (!canvas || !nodeData || !nodeData.updateFromWebGL) return;

        // Update function to process shader output
        const updateCheckboxes = () => {
            nodeData.updateFromWebGL(canvas);

            // Continue animation if connection still exists
            if (this.nodeSystem.connections.has(`${fromNode.element.id}-${toNode.element.id}`)) {
                requestAnimationFrame(updateCheckboxes);
            }
        };

        // Start the update loop
        updateCheckboxes();
    }
}

export default JavaScriptNodeManager; 