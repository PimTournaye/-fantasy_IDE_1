class EditorManager {
    // Declare private fields at the class level
    #editor = null;
    #isExpanded = false;
    #isDirty = false;
    #activeNodeId = null;
    #activeEditor = null;

    constructor(nodeSystem) {
        this.nodeSystem = nodeSystem;
    }

    initializeEditor() {
        const editorContainer = document.getElementById('editor') || document.createElement('div');
        editorContainer.id = 'editor';
        document.body.appendChild(editorContainer);

        this.#editor = CodeMirror(editorContainer, {
            mode: 'x-shader/x-fragment',
            theme: 'monokai',
            lineNumbers: true,
            autoCloseBrackets: true,
            matchBrackets: true,
            indentUnit: 4,
            value: ''
        });

        this.#editor.on('change', () => {
            this.#isDirty = true;
            if (this.#activeNodeId) {
                const nodeData = this.nodeSystem.nodes.get(this.#activeNodeId);
                if (nodeData && nodeData.type === 'webgl') {
                    const code = this.#editor.getValue();
                    this.nodeSystem.shaderManager.updateShader(this.#activeNodeId, code);
                }
            }
        });

        document.addEventListener('mousedown', (e) => {
            if (this.#isExpanded && !editorContainer.contains(e.target)) {
                this.hideEditor();
            }
        });

        this.#editor.setOption('extraKeys', {
            'Ctrl-S': (cm) => this.saveChanges(),
            'Cmd-S': (cm) => this.saveChanges(),
            'Esc': (cm) => this.hideEditor()
        });
    }

    toggleEditor(nodeId, type) {
        // Close any existing editor first
        if (this.#activeEditor) {
            this.closeEditor(this.#activeEditor.nodeId);
        }

        const node = document.getElementById(nodeId);
        if (!node) return;

        const nodeData = this.nodeSystem.nodes.get(nodeId);
        if (!nodeData) return;

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

        if (type === 'javascript') {
            const runButton = document.createElement('button');
            runButton.textContent = '▶ Run (Ctrl+Enter)';
            runButton.style.padding = '5px 10px';
            runButton.style.backgroundColor = '#4CAF50';
            runButton.style.color = 'white';
            runButton.style.border = 'none';
            runButton.style.borderRadius = '3px';
            runButton.style.cursor = 'pointer';
            
            runButton.onclick = () => {
                const code = this.#editor.getValue();
                this.nodeSystem.javaScriptNodeManager.executeCode(nodeId, code);
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
                const code = this.#editor.getValue();
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
        this.#editor = CodeMirror(editorDiv, {
            value: nodeData.code || '',
            mode: type === 'webgl' ? 'x-shader/x-fragment' : 'javascript',
            theme: 'monokai',
            lineNumbers: true,
            autoCloseBrackets: true,
            matchBrackets: true,
            indentUnit: 4
        });

        // Add real-time compilation for WebGL nodes
        if (type === 'webgl' || type === 'webgpu') {
            this.#editor.on('change', () => {
                const code = this.#editor.getValue();
                if (type === 'webgl') {
                    this.nodeSystem.shaderManager.updateShader(nodeId, code);
                } else if (type === 'webgpu') {
                    this.nodeSystem.webgpuManager.updateShader(nodeId, code);
                }
            });
        }

        // Add appropriate keyboard shortcuts
        if (type === 'javascript') {
            this.#editor.setOption('extraKeys', {
                'Ctrl-Enter': (cm) => {
                    const code = cm.getValue();
                    this.nodeSystem.javaScriptNodeManager.executeCode(nodeId, code);
                },
                'Cmd-Enter': (cm) => {
                    const code = cm.getValue();
                    this.nodeSystem.javaScriptNodeManager.executeCode(nodeId, code);
                },
                'Esc': () => this.closeEditor(nodeId)
            });
        } else {
            this.#editor.setOption('extraKeys', {
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
        this.#activeEditor = {
            container: editorContainer,
            editor: this.#editor,
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
        setTimeout(() => this.#editor.refresh(), 0);
    }

    showEditor(nodeId, code, type) {
        const node = document.getElementById(nodeId);
        if (!node) return;

        this.#activeNodeId = nodeId;
        this.#isExpanded = true;
        this.#isDirty = false;

        this.#editor.setOption('mode', type === 'webgl' ? 'x-shader/x-fragment' : 'javascript');
        this.#editor.setValue(code);
        
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
            
            this.#editor.refresh();

            // Add Shift+Enter handler for JavaScript nodes
            if (type === 'javascript') {
                this.#editor.setOption('extraKeys', {
                    'Shift-Enter': (cm) => this.updateJavaScriptNode(nodeId, cm.getValue()),
                    'Esc': (cm) => this.hideEditor()
                });
            } else {
                this.#editor.setOption('extraKeys', {
                    'Ctrl-S': (cm) => this.saveChanges(),
                    'Cmd-S': (cm) => this.saveChanges(),
                    'Esc': (cm) => this.hideEditor()
                });
            }
        }
    }

    hideEditor() {
        this.#isExpanded = false;
        this.#activeNodeId = null;

        const editorElement = document.getElementById('editor');
        if (editorElement) {
            editorElement.style.display = 'none';
        }
    }

    saveChanges(nodeId) {
        if (!this.#activeEditor || this.#activeEditor.nodeId !== nodeId) return;

        const code = this.#editor.getValue();
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
        const nodeData = this.nodeSystem.nodes.get(nodeId);
        if (!nodeData) return;

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

    closeEditor(nodeId) {
        if (this.#activeEditor && this.#activeEditor.nodeId === nodeId) {
            // Save the code before closing
            const code = this.#editor.getValue();
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
            this.#activeEditor.container.remove();
            this.#activeEditor = null;
        }
    }

    get activeNodeId() {
        return this.#activeNodeId;
    }
}

export default EditorManager; 