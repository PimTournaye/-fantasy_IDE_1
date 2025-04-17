class EditorManager {
    constructor(nodeSystem) {
        this.nodeSystem = nodeSystem;
        this._editor = null;
        this._activeEditor = null;
        this._activeNodeId = null;
        this._isExpanded = false;
        this._isDirty = false;
        this._nodeMap = new Map();
        this.isFullscreen = false;
        this.currentCode = '';
        this._isUpdating = false;
    }

    initializeEditor() {
        console.log('Initializing editor...');
        
        // Create editor container
        const editorContainer = document.createElement('div');
        editorContainer.id = 'editor-container';
        editorContainer.style.position = 'fixed';
        editorContainer.style.top = '0';
        editorContainer.style.left = '0';
        editorContainer.style.width = '100%';
        editorContainer.style.height = '100%';
        editorContainer.style.backgroundColor = '#1e1e1e';
        editorContainer.style.zIndex = '1000';
        editorContainer.style.display = 'none';
        editorContainer.style.padding = '20px';
        editorContainer.style.boxSizing = 'border-box';
        document.body.appendChild(editorContainer);

        // Create editor div
        const editorDiv = document.createElement('div');
        editorDiv.style.width = '100%';
        editorDiv.style.height = 'calc(100% - 100px)'; // Account for buttons
        editorDiv.style.marginTop = '60px'; // Space for buttons
        editorContainer.appendChild(editorDiv);

        // Initialize CodeMirror
        this._editor = CodeMirror(editorDiv, {
            mode: 'javascript',
            theme: 'monokai',
            lineNumbers: true,
            autoCloseBrackets: true,
            matchBrackets: true,
            indentUnit: 4,
            lineWrapping: true,
            extraKeys: {
                'Ctrl-Enter': () => this.runCode(),
                'Cmd-Enter': () => this.runCode(),
                'Esc': () => this.toggleFullscreen()
            }
        });

        console.log('CodeMirror editor initialized:', this._editor);

        // Listen for changes in the editor
        this._editor.on('change', () => {
            this.updateNodesFromEditor();
        });

        // Add close button
        const closeButton = document.createElement('button');
        closeButton.textContent = '×';
        closeButton.style.position = 'absolute';
        closeButton.style.right = '20px';
        closeButton.style.top = '20px';
        closeButton.style.width = '40px';
        closeButton.style.height = '40px';
        closeButton.style.borderRadius = '50%';
        closeButton.style.backgroundColor = '#333';
        closeButton.style.color = 'white';
        closeButton.style.border = 'none';
        closeButton.style.cursor = 'pointer';
        closeButton.style.fontSize = '24px';
        closeButton.style.zIndex = '1001';
        closeButton.onclick = () => this.toggleFullscreen();
        editorContainer.appendChild(closeButton);

        // Add run button
        const runButton = document.createElement('button');
        runButton.textContent = '▶ Run (Ctrl+Enter)';
        runButton.style.position = 'absolute';
        runButton.style.right = '80px';
        runButton.style.top = '20px';
        runButton.style.padding = '10px 20px';
        runButton.style.backgroundColor = '#4CAF50';
        runButton.style.color = 'white';
        runButton.style.border = 'none';
        runButton.style.borderRadius = '4px';
        runButton.style.cursor = 'pointer';
        runButton.style.zIndex = '1001';
        runButton.onclick = () => this.runCode();
        editorContainer.appendChild(runButton);

        console.log('Editor initialization complete');
    }

    toggleFullscreen() {
        const container = document.getElementById('editor-container');
        if (!container) return;

        this.isFullscreen = !this.isFullscreen;
        container.style.display = this.isFullscreen ? 'block' : 'none';

        if (this.isFullscreen) {
            // Set the code in the editor
            this._editor.setValue(this.currentCode);
            this._editor.refresh();
            this._editor.focus();
        }
    }

    setCode(code) {
        if (!this._editor) return;
        
        this._editor.setValue(code);
        this._isDirty = true;
        
        // Emit code update event
        if (this._activeNodeId) {
            const event = new CustomEvent('code-update', {
                detail: {
                    nodeId: this._activeNodeId,
                    code: code
                }
            });
            document.dispatchEvent(event);
        }
    }

    parseNodeCode(code) {
        console.log('Parsing node code:', code);
        // Clear previous node map
        this._nodeMap.clear();

        try {
            // Parse the JSON structure
            const nodes = JSON.parse(code);
            if (Array.isArray(nodes)) {
                nodes.forEach(node => {
                    if (node.id && node.type) {
                        this._nodeMap.set(node.id, node);
                    }
                });
            }
            console.log('Node map updated:', this._nodeMap);
        } catch (error) {
            console.error('Error parsing node code:', error);
        }
    }

    updateNodesFromEditor() {
        if (this._isUpdating) return;

        try {
            const code = this._editor.getValue();
            console.log('Updating nodes from editor with code:', code);
            
            // Create a sandboxed environment with access to node manipulation functions
            const sandbox = {
                nodes: this.nodeSystem.nodes,
                getNode: (id) => {
                    const node = document.getElementById(id);
                    const nodeData = this.nodeSystem.nodes.get(id);
                    return {
                        element: node,
                        data: nodeData,
                        setPosition: (x, y) => {
                            if (node) {
                                node.style.left = `${x}px`;
                                node.style.top = `${y}px`;
                            }
                            if (nodeData) {
                                nodeData.position = { x, y };
                            }
                        },
                        setCode: (code) => {
                            if (nodeData) {
                                nodeData.code = code;
                                if (nodeData.type === 'webgl') {
                                    this.nodeSystem.shaderManager.updateShader(id, code);
                                } else if (nodeData.type === 'webgpu') {
                                    this.nodeSystem.webgpuManager.updateShader(id, code);
                                } else if (nodeData.type === 'javascript') {
                                    this.nodeSystem.javaScriptNodeManager.executeCode(id, code);
                                }
                            }
                        },
                        getConnections: () => {
                            return Array.from(this.nodeSystem.connectionManager.connections.entries())
                                .filter(([_, conn]) => conn.from === id || conn.to === id)
                                .map(([_, conn]) => ({
                                    from: conn.from,
                                    to: conn.to
                                }));
                        }
                    };
                },
                animate: (duration, callback) => {
                    const start = performance.now();
                    const animate = (currentTime) => {
                        const elapsed = currentTime - start;
                        const progress = Math.min(elapsed / duration, 1);
                        callback(progress);
                        if (progress < 1) {
                            requestAnimationFrame(animate);
                        }
                    };
                    requestAnimationFrame(animate);
                },
                console: {
                    log: (...args) => console.log(...args),
                    error: (...args) => console.error(...args),
                    warn: (...args) => console.warn(...args)
                }
            };

            const func = new Function('sandbox', `
                with(sandbox) {
                    ${code}
                }
            `);
            func(sandbox);
            console.log('Code executed successfully');
        } catch (error) {
            console.error('Error executing code:', error);
        }
    }

    runCode() {
        try {
            const code = this._editor.getValue();
            
            // Create a sandboxed environment with access to node manipulation functions
            const sandbox = {
                nodes: this.nodeSystem.nodes,
                getNode: (id) => {
                    const node = document.getElementById(id);
                    const nodeData = this.nodeSystem.nodes.get(id);
                    return {
                        element: node,
                        data: nodeData,
                        setPosition: (x, y) => {
                            if (node) {
                                node.style.left = `${x}px`;
                                node.style.top = `${y}px`;
                            }
                            if (nodeData) {
                                nodeData.position = { x, y }; 
                            }
                        },
                        setCode: (code) => {
                            if (nodeData) {
                                nodeData.code = code;
                                if (nodeData.type === 'webgl') {
                                    this.nodeSystem.shaderManager.updateShader(id, code);
                                } else if (nodeData.type === 'webgpu') {
                                    this.nodeSystem.webgpuManager.updateShader(id, code);
                                } else if (nodeData.type === 'javascript') {
                                    this.nodeSystem.javaScriptNodeManager.executeCode(id, code);
                                }
                            }
                        },
                        getConnections: () => {
                            return Array.from(this.nodeSystem.connectionManager.connections.entries())
                                .filter(([_, conn]) => conn.from === id || conn.to === id)
                                .map(([_, conn]) => ({
                                    from: conn.from,
                                    to: conn.to
                                }));
                        }
                    };
                },
                animate: (duration, callback) => {
                    const start = performance.now();
                    const animate = (currentTime) => {
                        const elapsed = currentTime - start;
                        const progress = Math.min(elapsed / duration, 1);
                        callback(progress);
                        if (progress < 1) {
                            requestAnimationFrame(animate);
                        }
                    };
                    requestAnimationFrame(animate);
                },
                console: {
                    log: (...args) => console.log(...args),
                    error: (...args) => console.error(...args),
                    warn: (...args) => console.warn(...args)
                }
            };

            // Execute the code in the sandbox
            const func = new Function('sandbox', `
                with(sandbox) {
                    ${code}
                }
            `);
            func(sandbox);
        } catch (error) {
            console.error("Error executing code:", error);
        }
    }

    toggleEditor(nodeId, type) {
        if (nodeId === 'text-view') {
            console.log('Initializing text view editor...');
            
            if (!this._editor) {
                console.log('Creating new editor instance...');
                this.initializeEditor();
            }
            
            // Generate JavaScript functions for each node
            const nodeFunctions = Array.from(this.nodeSystem.nodes.entries())
                .map(([id, nodeData]) => {
                    const node = document.getElementById(id);
                    const rect = node ? node.getBoundingClientRect() : { x: 0, y: 0 };
                    
                    // Get connections for this node
                    const connections = Array.from(this.nodeSystem.connectionManager.connections.entries())
                        .filter(([_, conn]) => conn.from === id || conn.to === id)
                        .map(([_, conn]) => ({
                            from: conn.from,
                            to: conn.to
                        }));

                    return `function update${id.replace(/-/g, '_')}() {
    const node = getNode('${id}');
        if (!node) return;
    
    // Update position
    node.setPosition(${rect.x}, ${rect.y});
    
    // Update code
    node.setCode(\`${nodeData.code || ''}\`);
    
    // Update connections
    const currentConnections = node.getConnections();
    const newConnections = ${JSON.stringify(connections)};
    
    // Remove old connections
    currentConnections.forEach(conn => {
        if (!newConnections.some(c => c.from === conn.from && c.to === conn.to)) {
            // TODO: Add connection removal function
        }
    });
    
    // Add new connections
    newConnections.forEach(conn => {
        if (!currentConnections.some(c => c.from === conn.from && c.to === conn.to)) {
            // TODO: Add connection creation function
        }
    });
}`;
                })
                .join('\n\n');

            // Add example usage
            const exampleUsage = `

// Example: Update all nodes
function updateAllNodes() {
${Array.from(this.nodeSystem.nodes.keys())
    .map(id => `    update${id.replace(/-/g, '_')}();`)
    .join('\n')}
}

// Run the update
updateAllNodes();`;

            const editorContent = nodeFunctions + exampleUsage;
            console.log('Setting editor content:', editorContent);
            
            // Ensure editor is visible
            const editorContainer = document.getElementById('editor-container');
            if (editorContainer) {
                editorContainer.style.display = 'block';
                editorContainer.style.position = 'fixed';
                editorContainer.style.top = '0';
                editorContainer.style.left = '0';
                editorContainer.style.width = '100%';
                editorContainer.style.height = '100%';
                editorContainer.style.backgroundColor = '#1e1e1e';
                editorContainer.style.zIndex = '1000';
                editorContainer.style.padding = '20px';
                editorContainer.style.boxSizing = 'border-box';
            }
            
            // Set the content
            if (this._editor) {
                console.log('Setting editor content:', editorContent);
                this.setCode(editorContent);
            } else {
                console.error('Editor not initialized!');
            }
            
            this.toggleFullscreen();
        } else {
            // Close any existing editor first
            if (this._activeEditor) {
                this.closeEditor(this._activeEditor.nodeId);
            }

            const node = document.getElementById(nodeId);
            if (!node && nodeId !== 'text-view') return;

        const nodeData = this.nodeSystem.nodes.get(nodeId);
            if (!nodeData && nodeId !== 'text-view') return;

        const editorContainer = document.createElement('div');
        editorContainer.className = 'editor-container';
        editorContainer.style.position = 'fixed';
        editorContainer.style.top = '50%';
        editorContainer.style.left = '50%';
        editorContainer.style.transform = 'translate(-50%, -50%)';
        editorContainer.style.zIndex = '1000';
        editorContainer.style.backgroundColor = '#1e1e1e';
        editorContainer.style.padding = '20px';
        editorContainer.style.borderRadius = '5px';
        editorContainer.style.boxShadow = '0 0 10px rgba(0,0,0,0.5)';

        // Add toolbar with appropriate buttons
        const toolbar = document.createElement('div');
        toolbar.style.marginBottom = '10px';
        toolbar.style.display = 'flex';
        toolbar.style.justifyContent = 'space-between';
        toolbar.style.alignItems = 'center';

            if (type === 'javascript' || nodeId === 'text-view') {
            const runButton = document.createElement('button');
            runButton.textContent = '▶ Run (Ctrl+Enter)';
            runButton.style.padding = '5px 10px';
            runButton.style.backgroundColor = '#4CAF50';
            runButton.style.color = 'white';
            runButton.style.border = 'none';
            runButton.style.borderRadius = '3px';
            runButton.style.cursor = 'pointer';
            
            runButton.onclick = () => {
                    const code = this._editor.getValue();
                    if (nodeId === 'text-view') {
                        // Update the text view code
                        const event = new CustomEvent('textViewCodeUpdated', { 
                            detail: { code },
                            bubbles: true,
                            composed: true
                        });
                        document.dispatchEvent(event);
                    } else {
                this.nodeSystem.javaScriptNodeManager.executeCode(nodeId, code);
                    }
            };
            toolbar.appendChild(runButton);
        } else if (type === 'webgl' || type === 'webgpu') {
            const saveButton = document.createElement('button');
            saveButton.textContent = '💾 Save (Ctrl+S)';
            saveButton.style.padding = '5px 10px';
            saveButton.style.backgroundColor = '#4CAF50';
            saveButton.style.color = 'white';
            saveButton.style.border = 'none';
            saveButton.style.borderRadius = '3px';
            saveButton.style.cursor = 'pointer';
            
            saveButton.onclick = () => {
                    const code = this._editor.getValue();
                this.saveChanges(nodeId);
            };
            toolbar.appendChild(saveButton);
        }

        editorContainer.appendChild(toolbar);

        // Create editor div
        const editorDiv = document.createElement('div');
        editorDiv.style.width = '600px';
        editorDiv.style.height = '400px';
        editorContainer.appendChild(editorDiv);

        document.body.appendChild(editorContainer);

        // Initialize CodeMirror
            this._editor = CodeMirror(editorDiv, {
                value: nodeId === 'text-view' ? this._editor?.getValue() || '' : (nodeData?.code || ''),
            mode: type === 'webgl' ? 'x-shader/x-fragment' : 'javascript',
            theme: 'monokai',
            lineNumbers: true,
            autoCloseBrackets: true,
            matchBrackets: true,
            indentUnit: 4
        });

        // Add real-time compilation for WebGL nodes
        if (type === 'webgl' || type === 'webgpu') {
                this._editor.on('change', () => {
                    const code = this._editor.getValue();
                if (type === 'webgl') {
                    this.nodeSystem.shaderManager.updateShader(nodeId, code);
                } else if (type === 'webgpu') {
                    this.nodeSystem.webgpuManager.updateShader(nodeId, code);
                }
            });
        }

        // Add appropriate keyboard shortcuts
            if (type === 'javascript' || nodeId === 'text-view') {
                this._editor.setOption('extraKeys', {
                'Ctrl-Enter': (cm) => {
                    const code = cm.getValue();
                        if (nodeId === 'text-view') {
                            const event = new CustomEvent('textViewCodeUpdated', { 
                                detail: { code },
                                bubbles: true,
                                composed: true
                            });
                            document.dispatchEvent(event);
                        } else {
                    this.nodeSystem.javaScriptNodeManager.executeCode(nodeId, code);
                        }
                },
                'Cmd-Enter': (cm) => {
                    const code = cm.getValue();
                        if (nodeId === 'text-view') {
                            const event = new CustomEvent('textViewCodeUpdated', { 
                                detail: { code },
                                bubbles: true,
                                composed: true
                            });
                            document.dispatchEvent(event);
                        } else {
                    this.nodeSystem.javaScriptNodeManager.executeCode(nodeId, code);
                        }
                },
                'Esc': () => this.closeEditor(nodeId)
            });
        } else {
                this._editor.setOption('extraKeys', {
                'Esc': () => this.closeEditor(nodeId)
            });
        }

        // Remove the save button for WebGL nodes since we're compiling in real-time
        if (type === 'webgl' || type === 'webgpu') {
            toolbar.style.display = 'none';
        }

        // Add close button
        const closeButton = document.createElement('button');
        closeButton.textContent = '×';
        closeButton.style.position = 'absolute';
        closeButton.style.right = '10px';
        closeButton.style.top = '10px';
        closeButton.style.border = 'none';
        closeButton.style.background = 'none';
        closeButton.style.color = 'white';
        closeButton.style.fontSize = '20px';
        closeButton.style.cursor = 'pointer';
        closeButton.onclick = () => this.closeEditor(nodeId);
        editorContainer.appendChild(closeButton);

        // Store editor reference
            this._activeEditor = {
            container: editorContainer,
                editor: this._editor,
            nodeId,
            type
        };

        // Add click-away listener
        const clickAwayListener = (e) => {
            if (!editorContainer.contains(e.target) && 
                !e.target.closest('.edit-button') && 
                !e.target.closest('.expand-button')) {
                this.closeEditor(nodeId);
                document.removeEventListener('mousedown', clickAwayListener);
            }
        };
        document.addEventListener('mousedown', clickAwayListener);

        // Refresh editor to ensure proper rendering
            setTimeout(() => this._editor.refresh(), 0);
        }
    }

    showEditor(nodeId, code, type) {
        const node = document.getElementById(nodeId);
        if (!node) return;

        this._activeNodeId = nodeId;
        this._isExpanded = true;
        this._isDirty = false;

        this._editor.setOption('mode', type === 'webgl' ? 'x-shader/x-fragment' : 'javascript');
        this._editor.setValue(code);
        
        const editorElement = document.getElementById('editor');
        if (editorElement) {
            editorElement.style.display = 'block';
            
            // Check if node is expanded
            if (node.classList.contains('expanded')) {
                const nodeRect = node.getBoundingClientRect();
                editorElement.style.position = 'fixed';
                editorElement.style.left = `${nodeRect.left + (nodeRect.width - editorElement.offsetWidth) / 2}px`;
                editorElement.style.top = `${nodeRect.top + (nodeRect.height - editorElement.offsetHeight) / 2}px`;
                editorElement.classList.add('expanded');
            } else {
                editorElement.classList.remove('expanded');
                const nodeRect = node.getBoundingClientRect();
                editorElement.style.position = 'absolute';
                editorElement.style.left = `${nodeRect.right + 10}px`;
                editorElement.style.top = `${nodeRect.top}px`;
            }
            
            this._editor.refresh();

            // Add Shift+Enter handler for JavaScript nodes
            if (type === 'javascript') {
                this._editor.setOption('extraKeys', {
                    'Shift-Enter': (cm) => this.updateJavaScriptNode(nodeId, cm.getValue()),
                    'Esc': (cm) => this.hideEditor()
                });
            } else {
                this._editor.setOption('extraKeys', {
                    'Ctrl-S': (cm) => this.saveChanges(),
                    'Cmd-S': (cm) => this.saveChanges(),
                    'Esc': (cm) => this.hideEditor()
                });
            }
        }
    }

    hideEditor() {
        this._isExpanded = false;
        this._activeNodeId = null;

        const editorElement = document.getElementById('editor');
        if (editorElement) {
            editorElement.style.display = 'none';
        }
    }

    saveChanges(nodeId) {
        if (!this._activeEditor || this._activeEditor.nodeId !== nodeId) return;

        const code = this._editor.getValue();
        const nodeData = this.nodeSystem.nodes.get(nodeId);

        if (nodeData) {
            if (nodeData.type === 'webgl' || nodeData.type === 'webgpu') {
                if (nodeData.type === 'webgl') {
                    this.nodeSystem.shaderManager.updateShader(nodeId, code);
                } else if (nodeData.type === 'webgpu') {
                    this.nodeSystem.webgpuManager.updateShader(nodeId, code);
                }
            }
            nodeData.code = code;
        }
    }

    updateJavaScriptNode(nodeId, newCode) {
        const nodeData = this.nodeSystem.nodes.get(nodeId);
        if (!nodeData) return;

        try {
            // Get the node element
            const node = document.getElementById(nodeId);
            if (!node) return;

            // Update the node's content
            node.innerHTML = newCode;
            nodeData.code = newCode;

            // Re-add the node type attribute
            node.setAttribute('data-type', 'javascript');

            // Reinitialize the checkbox grid
            const grid = node.querySelector('.checkbox-grid');
            if (grid) {
                this.nodeSystem.initializeCheckboxGrid(nodeData);
            }

            // Reattach edit button listener
            const editButton = node.querySelector('.expand-button');
            if (editButton) {
                editButton.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.toggleEditor(nodeId, 'javascript');
                });
            }

            // Reattach port event listeners
            const ports = node.querySelector('.node-ports');
            if (ports) {
                this.nodeSystem.connectionManager?.updateConnections();
            }

            console.log('JavaScript node updated successfully');
         //   this.hideEditor();
        } catch (error) {
            console.error('Error updating JavaScript node:', error);
        }
    }

    updateNodeCode(nodeId, code) {
        console.log('EditorManager: Updating code for node:', nodeId);
        const nodeData = this.nodeSystem.nodes.get(nodeId);
        if (!nodeData) {
            console.error('EditorManager: Node not found:', nodeId);
            return;
        }

        // Update the node's code
        nodeData.code = code;

        // If the editor is currently showing this node, update it
        if (this._activeEditor && this._activeEditor.nodeId === nodeId) {
            this._editor.setValue(code);
        }

        // If the node is a WebGL or WebGPU node, update the shader
        if (nodeData.type === 'webgl') {
            this.nodeSystem.shaderManager.updateShader(nodeId, code);
        } else if (nodeData.type === 'webgpu') {
            this.nodeSystem.webgpuManager.updateShader(nodeId, code);
        } else if (nodeData.type === 'javascript') {
            this.nodeSystem.javaScriptNodeManager.executeCode(nodeId, code);
        }
    }

    closeEditor(nodeId) {
        if (this._activeEditor && this._activeEditor.nodeId === nodeId) {
            // Save the code before closing
            const code = this._editor.getValue();
            const nodeData = this.nodeSystem.nodes.get(nodeId);
            
            if (nodeData) {
                nodeData.code = code;
                if (nodeData.type === 'webgl' || nodeData.type === 'webgpu') {
                    if (nodeData.type === 'webgl') {
                        this.nodeSystem.shaderManager.updateShader(nodeId, code);
                    } else if (nodeData.type === 'webgpu') {
                        this.nodeSystem.webgpuManager.updateShader(nodeId, code);
                    }
                } else if (nodeData.type === 'javascript') {
                    this.nodeSystem.javaScriptNodeManager.executeCode(nodeId, code);
                }
            }
            
            // Remove the editor container
            this._activeEditor.container.remove();
            this._activeEditor = null;
        }
    }

    get activeNodeId() {
        return this._activeNodeId;
    }

    getEditor() {
        return this._editor;
    }

    // Add a new method to update the editor with all nodes
    updateEditorWithNodes() {
        if (!this._editor || this._isUpdating) return;

        this._isUpdating = true;
        try {
            const nodes = Array.from(this.nodeSystem.nodes.entries()).map(([id, nodeData]) => {
                const node = document.getElementById(id);
                const rect = node ? node.getBoundingClientRect() : { x: 0, y: 0 };
                
                // Get connections for this node
                const connections = Array.from(this.nodeSystem.connectionManager.connections.entries())
                    .filter(([_, conn]) => conn.from === id || conn.to === id)
                    .map(([_, conn]) => ({
                        from: conn.from,
                        to: conn.to
                    }));

                return {
                    id,
                    type: nodeData.type,
                    code: nodeData.code || '',
                    position: {
                        x: rect.x,
                        y: rect.y
                    },
                    connections,
                    data: nodeData.data || {}
                };
            });

            const jsonString = JSON.stringify(nodes, null, 2);
            this._editor.setValue(jsonString);
        } catch (error) {
            console.error('Error updating editor with nodes:', error);
        } finally {
            this._isUpdating = false;
        }
    }

    // Add a method to handle node updates from the editor
    updateNodesFromEditor() {
        if (this._isUpdating) return;

        try {
            // Instead of parsing JSON, just run the JavaScript code
            const code = this._editor.getValue();
            const sandbox = {
                nodes: this.nodeSystem.nodes,
                getNode: (id) => {
                    const node = document.getElementById(id);
                    const nodeData = this.nodeSystem.nodes.get(id);
                    return {
                        element: node,
                        data: nodeData,
                        setPosition: (x, y) => {
                            if (node) {
                                node.style.left = `${x}px`;
                                node.style.top = `${y}px`;
                            }
                            if (nodeData) {
                                nodeData.position = { x, y };
                            }
                        },
                        setCode: (code) => {
                            if (nodeData) {
                                nodeData.code = code;
                                if (nodeData.type === 'webgl') {
                                    this.nodeSystem.shaderManager.updateShader(id, code);
                                } else if (nodeData.type === 'webgpu') {
                                    this.nodeSystem.webgpuManager.updateShader(id, code);
                                } else if (nodeData.type === 'javascript') {
                                    this.nodeSystem.javaScriptNodeManager.executeCode(id, code);
                                }
                            }
                        },
                        getConnections: () => {
                            return Array.from(this.nodeSystem.connectionManager.connections.entries())
                                .filter(([_, conn]) => conn.from === id || conn.to === id)
                                .map(([_, conn]) => ({
                                    from: conn.from,
                                    to: conn.to
                                }));
                        }
                    };
                },
                animate: (duration, callback) => {
                    const start = performance.now();
                    const animate = (currentTime) => {
                        const elapsed = currentTime - start;
                        const progress = Math.min(elapsed / duration, 1);
                        callback(progress);
                        if (progress < 1) {
                            requestAnimationFrame(animate);
                        }
                    };
                    requestAnimationFrame(animate);
                },
                console: {
                    log: (...args) => console.log(...args),
                    error: (...args) => console.error(...args),
                    warn: (...args) => console.warn(...args)
                }
            };

            const func = new Function('sandbox', `
                with(sandbox) {
                    ${code}
                }
            `);
            func(sandbox);
        } catch (error) {
            console.error('Error executing code:', error);
        }
    }

    // Add a method to handle node creation
    handleNodeCreated(nodeId, nodeData) {
        if (this._editor && !this._isUpdating) {
            this._isUpdating = true;
            try {
                this.updateEditorWithNodes();
            } finally {
                this._isUpdating = false;
            }
        }
    }

    // Add a method to handle node deletion
    handleNodeDeleted(nodeId) {
        if (this._editor && !this._isUpdating) {
            this._isUpdating = true;
            try {
                this.updateEditorWithNodes();
            } finally {
                this._isUpdating = false;
            }
        }
    }

    // Add a method to handle connection changes
    handleConnectionChanged() {
        if (this._editor && !this._isUpdating) {
            this._isUpdating = true;
            try {
                this.updateEditorWithNodes();
            } finally {
                this._isUpdating = false;
            }
        }
    }
}

export default EditorManager; 