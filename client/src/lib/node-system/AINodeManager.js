class AINodeManager {
    constructor(nodeSystem) {
        this.nodeSystem = nodeSystem;
        this.socket = null;
        this.isConnected = false;
        this.isEnabled = true; // Always enabled
        console.log('AINodeManager: Initializing...');
        this.initializeSocket();
        this.setupConnectionEvents();
        this.responseDiv = null;
    }

    initializeSocket() {
        console.log('AINodeManager: Attempting to connect to Socket.IO server...');
        
        // Create socket with reconnection options
        this.socket = io('http://localhost:3000', {
            reconnection: true, // Enable automatic reconnection
            timeout: 5000, // Shorter timeout
            autoConnect: true // Connect automatically
        });

        // Always try to connect
        this.connectToServer();
    }

    connectToServer() {
        if (this.socket) {
            this.socket.connect();
        }
    }

    disconnectFromServer() {
        if (this.socket) {
            this.socket.disconnect();
        }
    }

    enableAI() {
        this.isEnabled = true;
        this.connectToServer();
        this.updateConnectionStatus(false, 'Connecting to AI server...');
    }

    disableAI() {
        this.isEnabled = false;
        this.disconnectFromServer();
        this.updateConnectionStatus(false, 'AI functionality disabled');
    }

    setupConnectionEvents() {
        if (!this.socket) return;

        this.socket.on('connect', () => {
            console.log('AINodeManager: Connected to server with ID:', this.socket.id);
            this.isConnected = true;
            this.updateConnectionStatus(true);
        });

        this.socket.on('connect_error', (error) => {
            console.error('AINodeManager: Socket.IO connection error:', error);
            this.isConnected = false;
            this.updateConnectionStatus(false, 'Could not connect to AI server');
        });

        this.socket.on('disconnect', (reason) => {
            console.log('AINodeManager: Disconnected from server. Reason:', reason);
            this.isConnected = false;
            this.updateConnectionStatus(false, 'Disconnected from AI server');
        });

        // Handle AI response events
        this.socket.on('ai-response', (response) => {
            if (!this.isConnected) return;
            
            console.log('AINodeManager: Received AI response:', response);
            
            // Find the active AI node
            const activeNode = document.querySelector('.node[data-type="ai"].active');
            if (!activeNode) {
                console.log('AINodeManager: No active AI node found');
                return;
            }

            const nodeId = activeNode.id;
            const nodeData = this.nodeSystem.nodes.get(nodeId);
            
            // Clean up the response to ensure it's just the code
            let cleanResponse = response.trim();
            
            // Remove CODE markers if present
            if (cleanResponse.startsWith('CODE')) {
                cleanResponse = cleanResponse.substring(4);
            }
            if (cleanResponse.endsWith('CODE')) {
                cleanResponse = cleanResponse.substring(0, cleanResponse.length - 4);
            }
            
            // Remove code block markers (```) if present
            cleanResponse = cleanResponse.replace(/^```\w*\n/, ''); // Remove opening ```
            cleanResponse = cleanResponse.replace(/\n```$/, '');    // Remove closing ```
            
            cleanResponse = cleanResponse.trim();
            
            // Update the response text box
            const responseDiv = activeNode.querySelector('.ai-response');
            if (responseDiv) {
                responseDiv.textContent = cleanResponse;
                responseDiv.style.display = 'block';
            } else {
                console.log('AINodeManager: No response div found in active node');
            }
            
            // Only update code if in code replacement mode
            if (nodeData.mode === 'code' && nodeData.connectedNodeId) {
                console.log('AINodeManager: Updating code for connected node:', nodeData.connectedNodeId);
                
                // Update the node's code in the system
                const targetNodeData = this.nodeSystem.nodes.get(nodeData.connectedNodeId);
                if (targetNodeData) {
                    // Update the node's code
                    targetNodeData.code = cleanResponse;
                    
                    // Update the editor if it's open
                    if (this.nodeSystem.editorManager) {
                        this.nodeSystem.editorManager.updateNodeCode(nodeData.connectedNodeId, cleanResponse);
                    }
                }
            }
        });

        // Add handler for code updates
        this.socket.on('code-update', (data) => {
            if (!this.isConnected) return;
            
            const { nodeId, code } = data;
            this.handleCodeUpdate(nodeId, code);
        });
    }

    updateConnectionStatus(connected, message = '') {
        // Update the status indicator in all AI nodes
        document.querySelectorAll('.node[data-type="ai"]').forEach(node => {
            const statusIndicator = node.querySelector('.connection-status') || 
                this.createStatusIndicator(node);
            
            statusIndicator.className = `connection-status ${connected ? 'connected' : 'disconnected'}`;
            statusIndicator.title = message || (connected ? 'Connected to AI server' : 'Disconnected from AI server');
            
            // Update the response div with the status message
            const responseDiv = node.querySelector('.ai-response');
            if (responseDiv) {
                if (!connected) {
                    responseDiv.textContent = message || 'Disconnected from AI server';
                    responseDiv.style.display = 'block';
                } else {
                    responseDiv.textContent = '';
                }
            }
        });
    }

    createStatusIndicator(node) {
        const statusIndicator = document.createElement('div');
        statusIndicator.className = 'connection-status disconnected';
        statusIndicator.style.position = 'absolute';
        statusIndicator.style.top = '5px';
        statusIndicator.style.right = '5px';
        statusIndicator.style.width = '10px';
        statusIndicator.style.height = '10px';
        statusIndicator.style.borderRadius = '50%';
        statusIndicator.style.backgroundColor = 'red';
        statusIndicator.title = 'Disconnected from AI server';
        
        node.appendChild(statusIndicator);
        return statusIndicator;
    }

    getNodeTemplate() {
        return `
            <div class="node-header">
                <span>AI Assistant</span>
                <div class="header-buttons">
                    <button class="expand-button">Edit</button>
                    <button class="mode-toggle-button" title="Toggle between code replacement and chat modes">💬</button>
                </div>
            </div>
            <div class="node-content">
                <div class="ai-input-container">
                    <textarea class="ai-input" placeholder="Type your message here..."></textarea>
                    <button class="ai-send-button">Send</button>
                </div>
                <div class="ai-response" style="
                    margin-top: 10px;
                    padding: 10px;
                    background: #1e1e1e;
                    color: #fff;
                    border-radius: 4px;
                    min-height: 100px;
                    max-height: 200px;
                    overflow-y: auto;
                    white-space: pre-wrap;
                    font-family: monospace;
                "></div>
            </div>
            <div class="node-ports">
                <div class="input-port"></div>
                <div class="output-port"></div>
            </div>`;
    }

    initializeAI(node) {
        const input = node.querySelector('.ai-input');
        const sendButton = node.querySelector('.ai-send-button');
        const responseDiv = node.querySelector('.ai-response');
        const modeToggle = node.querySelector('.mode-toggle-button');
        
        // Add mode state to node data
        const nodeData = this.nodeSystem.nodes.get(node.id);
        nodeData.mode = 'code'; // Default to code replacement mode

        // Add click handler to make this node active
        node.addEventListener('click', () => {
            // Remove active class from all AI nodes
            document.querySelectorAll('.node[data-type="ai"]').forEach(n => {
                n.classList.remove('active');
            });
            // Add active class to this node
            node.classList.add('active');
        });

        // Add mode toggle handler
        modeToggle.addEventListener('click', () => {
            const nodeData = this.nodeSystem.nodes.get(node.id);
            nodeData.mode = nodeData.mode === 'code' ? 'chat' : 'code';
            modeToggle.textContent = nodeData.mode === 'code' ? '💬' : '✏️';
            modeToggle.title = nodeData.mode === 'code' ? 'Chat mode (click to switch to code replacement)' : 'Code replacement mode (click to switch to chat)';
        });

        sendButton.addEventListener('click', () => {
            if (!this.isEnabled || !this.isConnected) {
                responseDiv.textContent = 'AI functionality is disabled. Please enable it using the toolbar.';
                responseDiv.style.display = 'block';
                return;
            }

            const message = input.value.trim();
            if (message) {
                responseDiv.textContent = 'Thinking...';
                
                // Get connected node's code from the AI node's data
                const nodeId = node.id;
                const nodeData = this.nodeSystem.nodes.get(nodeId);
                let context = '';
                
                if (nodeData && nodeData.connectedCode) {
                    console.log('AINodeManager: Using stored code from connected node:', nodeData.connectedNodeId);
                    context = `Here is the ${nodeData.connectedNodeType} code that needs to be modified:\n${nodeData.connectedCode}`;
                } else {
                    console.log('AINodeManager: No connected code found');
                }

                // Combine context with user message based on mode
                let fullMessage;
                if (nodeData.mode === 'code') {
                    fullMessage = context ? 
                        `${context}\n\nPlease ${message} this code. Return ONLY the modified code, also include all the code so it can compile, dont skip any code that is essential like percision, starting with the code and ending with the code. Do not include any explanations or other text.` :
                        `${message}\n\nPlease return ONLY the code, starting with the code and ending with the code. Do not include any explanations or other text.`;
                } else {
                    // Chat mode - just send the message with context if available
                    fullMessage = context ? 
                        `${context}\n\n${message}` :
                        message;
                }

                console.log('AINodeManager: Sending query with context:', fullMessage);
                this.socket.emit('ai-query', fullMessage);
            }
        });

        // Add Enter key support
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendButton.click();
            }
        });
    }

    handleCodeUpdate(nodeId, newCode) {
        const node = document.getElementById(nodeId);
        if (!node || !node.classList.contains('active')) return;

        const nodeData = this.nodeSystem.nodes.get(nodeId);
        if (!nodeData || !nodeData.connectedNodeId) return;

        // Get the connected node's data
        const connectedNodeData = this.nodeSystem.nodes.get(nodeData.connectedNodeId);
        if (!connectedNodeData) return;

        // Store the new code
        nodeData.connectedCode = newCode;

        // If we have a previous prompt, resend it with the updated code
        const input = node.querySelector('.ai-input');
        if (input && input.value.trim()) {
            // Simulate a click on the send button
            const sendButton = node.querySelector('.ai-send-button');
            if (sendButton) {
                sendButton.click();
            }
        }
    }
}

export default AINodeManager; 