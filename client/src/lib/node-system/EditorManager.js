class EditorManager {
    static #editor = null;
    static #isExpanded = false;
    static #isDirty = false;
    static #activeNodeId = null;

    constructor(nodeSystem) {
        this.nodeSystem = nodeSystem;
    }

    initializeEditor() {
        const editorContainer = document.getElementById('editor') || document.createElement('div');
        editorContainer.id = 'editor';
        document.body.appendChild(editorContainer);

        EditorManager.#editor = CodeMirror(editorContainer, {
            mode: 'x-shader/x-fragment',
            theme: 'monokai',
            lineNumbers: true,
            autoCloseBrackets: true,
            matchBrackets: true,
            indentUnit: 4,
            value: ''
        });

        EditorManager.#editor.on('change', () => {
            EditorManager.#isDirty = true;
            if (EditorManager.#activeNodeId) {
                const nodeData = this.nodeSystem.nodes.get(EditorManager.#activeNodeId);
                if (nodeData && nodeData.type === 'webgl') {
                    const code = EditorManager.#editor.getValue();
                    this.nodeSystem.shaderManager.updateShader(EditorManager.#activeNodeId, code);
                }
            }
        });

        document.addEventListener('mousedown', (e) => {
            if (EditorManager.#isExpanded && !editorContainer.contains(e.target)) {
                this.hideEditor();
            }
        });

        EditorManager.#editor.setOption('extraKeys', {
            'Ctrl-S': (cm) => this.saveChanges(),
            'Cmd-S': (cm) => this.saveChanges(),
            'Esc': (cm) => this.hideEditor()
        });
    }

    toggleEditor(nodeId, type) {
        const node = document.getElementById(nodeId);
        if (!node) return;

        const nodeData = this.nodeSystem.nodes.get(nodeId);
        if (!nodeData) return;

        if (EditorManager.#isExpanded && EditorManager.#activeNodeId === nodeId) {
            this.hideEditor();
        } else {
            this.showEditor(nodeId, nodeData.code || '', type);
        }
    }

    showEditor(nodeId, code, type) {
        const node = document.getElementById(nodeId);
        if (!node) return;

        EditorManager.#activeNodeId = nodeId;
        EditorManager.#isExpanded = true;
        EditorManager.#isDirty = false;

        EditorManager.#editor.setOption('mode', type === 'webgl' ? 'x-shader/x-fragment' : 'javascript');
        EditorManager.#editor.setValue(code);
        
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
            
            EditorManager.#editor.refresh();
        }
    }

    hideEditor() {
        EditorManager.#isExpanded = false;
        EditorManager.#activeNodeId = null;

        const editorElement = document.getElementById('editor');
        if (editorElement) {
            editorElement.style.display = 'none';
        }
    }

    saveChanges() {
        if (!EditorManager.#isDirty || !EditorManager.#activeNodeId) return;

        const code = EditorManager.#editor.getValue();
        const nodeId = EditorManager.#activeNodeId;
        const nodeData = this.nodeSystem.nodes.get(nodeId);

        if (nodeData) {
            if (nodeData.type === 'webgl') {
                this.nodeSystem.shaderManager.updateShader(nodeId, code);
            }
            nodeData.code = code;
            EditorManager.#isDirty = false;
        }
    }

    static get activeNodeId() {
        return EditorManager.#activeNodeId;
    }
}

export default EditorManager; 