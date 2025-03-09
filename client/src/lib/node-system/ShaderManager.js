import { fragmentShaders } from '../defaultShaders.js';

class ShaderManager {
    constructor(nodeSystem) {
        this.nodeSystem = nodeSystem;
        this.defaultShaderCode = fragmentShaders[3];
    }

    initializeWebGL(node) {
        console.log('Initializing WebGL for node:', node.id);
        const content = node.querySelector('.node-content');
        const canvas = content.querySelector('canvas');
        if (!canvas) {
            console.error('No canvas found');
            return;
        }

        // Set back to original size
        canvas.width = 320;
        canvas.height = 240;
        canvas.style.width = '320px';
        canvas.style.height = '240px';

        const gl = canvas.getContext('webgl');
        if (!gl) {
            console.error('WebGL context creation failed');
            return;
        }

        // Store node data first
        const nodeData = this.nodeSystem.nodes.get(node.id);
        if (!nodeData) {
            console.error('No node data found');
            return;
        }

        // Add click handler for expanding
        node.addEventListener('click', (e) => {
            // Don't trigger on edit button click
            if (e.target.closest('.edit-button')) return;
            
            const isExpanded = node.classList.contains('expanded');
            if (!isExpanded) {
                node.classList.add('expanded');
                // Wait for animation to complete before resizing
                setTimeout(() => {
                    this.resizeCanvas(node.id, window.innerWidth - 40, window.innerHeight - 40);
                }, 300);
            } else {
                node.classList.remove('expanded');
                this.resizeCanvas(node.id, 320, 240);
            }
        });

        // Create initial program
        const program = this.createShaderProgram(gl, this.defaultShaderCode);
        if (!program) return;

        // Create buffer
        const positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
            -1, -1,
            1, -1,
            -1, 1,
            1, 1,
        ]), gl.STATIC_DRAW);

        // Get locations
        const positionLocation = gl.getAttribLocation(program, 'position');
        const timeLocation = gl.getUniformLocation(program, 'u_time');
        const resolutionLocation = gl.getUniformLocation(program, 'u_resolution');

        // Store WebGL context and program
        nodeData.data = {
            gl,
            program,
            positionBuffer,
            positionLocation,
            timeLocation,
            resolutionLocation,
            startTime: performance.now(),
            connectedNodes: new Set()  // Add this to track connections
        };
        nodeData.code = this.defaultShaderCode;

        // Initial setup
        gl.useProgram(program);
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.enableVertexAttribArray(positionLocation);
        gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

        // Start render loop
        const render = () => {
            if (!nodeData.data || !nodeData.data.program) return;

            gl.viewport(0, 0, canvas.width, canvas.height);
            gl.useProgram(nodeData.data.program);

            gl.bindBuffer(gl.ARRAY_BUFFER, nodeData.data.positionBuffer);
            gl.enableVertexAttribArray(nodeData.data.positionLocation);
            gl.vertexAttribPointer(nodeData.data.positionLocation, 2, gl.FLOAT, false, 0, 0);

            if (nodeData.data.timeLocation !== null) {
                const time = (performance.now() - nodeData.data.startTime) / 1000;
                gl.uniform1f(nodeData.data.timeLocation, time);
            }
            if (nodeData.data.resolutionLocation !== null) {
                gl.uniform2f(nodeData.data.resolutionLocation, canvas.width, canvas.height);
            }

            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

            // Check for connected nodes after each render
            const connections = Array.from(this.nodeSystem.connectionManager.connections.values())
                .filter(conn => conn.from === node.id);

            connections.forEach(connection => {
                const targetNode = document.getElementById(connection.to);
                if (targetNode) {
                    console.log('Updating connected node:', connection.to);
                    this.updateCheckboxGrid(gl, targetNode);
                }
            });

            nodeData.data.animationFrame = requestAnimationFrame(render);
        };

        render();
    }

    resizeCanvas(nodeId, width, height) {
        const nodeData = this.nodeSystem.nodes.get(nodeId);
        if (!nodeData || !nodeData.data || !nodeData.data.gl) return;

        const canvas = nodeData.data.gl.canvas;
        canvas.width = width;
        canvas.height = height;
        nodeData.data.gl.viewport(0, 0, width, height);
    }

    createShaderProgram(gl, shaderCode) {
        // Create vertex shader
        const vertexShader = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(vertexShader, `
            attribute vec2 position;
            void main() {
                gl_Position = vec4(position, 0.0, 1.0);
            }
        `);
        gl.compileShader(vertexShader);

        if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
            console.error('Vertex shader compilation failed:', gl.getShaderInfoLog(vertexShader));
            return null;
        }

        // Create fragment shader
        const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(fragmentShader, shaderCode);
        gl.compileShader(fragmentShader);

        if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
            console.error('Fragment shader compilation failed:', gl.getShaderInfoLog(fragmentShader));
            return null;
        }

        // Create program
        const program = gl.createProgram();
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);

        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            console.error('Program linking failed:', gl.getProgramInfoLog(program));
            return null;
        }

        // Clean up shaders
        gl.deleteShader(vertexShader);
        gl.deleteShader(fragmentShader);

        return program;
    }

    updateShader(nodeId, code) {
        console.log('Updating shader for node:', nodeId);
        const nodeData = this.nodeSystem.nodes.get(nodeId);
        if (!nodeData || !nodeData.data || !nodeData.data.gl) {
            console.error('No node data found for shader update');
            return;
        }

        const { gl } = nodeData.data;
        console.log('Creating new shader program with code:', code);
        
        // Create new program
        const newProgram = this.createShaderProgram(gl, code);
        if (!newProgram) {
            console.error('Failed to create new shader program');
            return;
        }

        // Get new locations
        const positionLocation = gl.getAttribLocation(newProgram, 'position');
        const timeLocation = gl.getUniformLocation(newProgram, 'u_time');
        const resolutionLocation = gl.getUniformLocation(newProgram, 'u_resolution');
        const webcamLocation = gl.getUniformLocation(newProgram, 'u_webcam');

        // Only after successful creation, update the node data
        const oldProgram = nodeData.data.program;
        nodeData.data.program = newProgram;
        nodeData.data.positionLocation = positionLocation;
        nodeData.data.timeLocation = timeLocation;
        nodeData.data.resolutionLocation = resolutionLocation;
        
        // Preserve webcam connection if it exists
        if (webcamLocation !== null) {
            gl.useProgram(newProgram);
            gl.uniform1i(webcamLocation, 2);
            nodeData.data.webcamLocation = webcamLocation;
        }
        
        nodeData.code = code;

        console.log('Shader updated successfully');

        // Clean up old program after setting the new one
        if (oldProgram) {
            gl.deleteProgram(oldProgram);
        }
    }

    createWebGLButton() {
        const button = document.createElement('button');
        button.textContent = 'Add WebGL Node';
        button.addEventListener('click', () => {
            this.nodeSystem.createNode('webgl', 50, 50);
        });
        document.getElementById('toolbar').appendChild(button);

        // Add HDMI capture button
        const hdmiButton = document.createElement('button');
        hdmiButton.textContent = 'Add HDMI Input';
        hdmiButton.addEventListener('click', () => {
            this.nodeSystem.createNode('hdmi', 50, 50);
        });
        document.getElementById('toolbar').appendChild(hdmiButton);
    }

    updateShaderConnection(fromNode, toNode) {
        console.log('Setting up shader connection between:', fromNode.id, 'and', toNode.id);
        
        const fromNodeData = this.nodeSystem.nodes.get(fromNode.id);
        const toNodeData = this.nodeSystem.nodes.get(toNode.id);
        
        if (!fromNodeData || !toNodeData) return;

        if (fromNodeData.type === 'webcam' && toNodeData.type === 'webgl') {
            const gl = toNodeData.data.gl;
            const video = fromNodeData.data.video;
            
            // First, let's verify we have a valid video element
            console.log('Video element:', video);
            console.log('Video ready state:', video.readyState);
            console.log('Video dimensions:', video.videoWidth, video.videoHeight);

            // Create and setup texture
            const texture = gl.createTexture();
            gl.activeTexture(gl.TEXTURE2);
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

            // Get the current shader code
            let shaderCode = toNodeData.code;
            if (!shaderCode.includes('uniform sampler2D u_webcam;')) {
                const uniformIndex = shaderCode.lastIndexOf('uniform');
                const insertPosition = uniformIndex !== -1 ? 
                    shaderCode.indexOf(';', uniformIndex) + 1 : 
                    shaderCode.indexOf('void main()');
                
                const webcamUniform = '\nuniform sampler2D u_webcam;\n// vec4 s = texture2D(u_webcam, normCoord);';
                shaderCode = shaderCode.slice(0, insertPosition) + 
                           webcamUniform +
                           shaderCode.slice(insertPosition);
            }
            
            this.updateShader(toNode.id, shaderCode);

            // Get the new program
            const program = toNodeData.data.program;
            gl.useProgram(program);

            // Get uniform location
            const webcamLocation = gl.getUniformLocation(program, 'u_webcam');
            console.log('Webcam uniform location:', webcamLocation);
            gl.uniform1i(webcamLocation, 2);  // Use texture unit 2

            // Update texture in render loop
            const updateTexture = () => {
                if (video.readyState >= video.HAVE_CURRENT_DATA) {
                    console.log('Updating texture with video frame');
                    gl.activeTexture(gl.TEXTURE2);
                    gl.bindTexture(gl.TEXTURE_2D, texture);
                    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
                }
                requestAnimationFrame(updateTexture);
            };
            updateTexture();

            console.log('Webcam setup complete');
        } else if (fromNodeData.type === 'hdmi' && toNodeData.type === 'webgl') {
            const gl = toNodeData.data.gl;
            const video = fromNodeData.data.video;
            
            console.log('Setting up HDMI connection');
            console.log('Video element:', video);
            console.log('Video ready state:', video.readyState);

            // Create and setup texture for HDMI
            const texture = gl.createTexture();
            gl.activeTexture(gl.TEXTURE2);
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

            // Get the current shader code
            let shaderCode = toNodeData.code;
            if (!shaderCode.includes('uniform sampler2D u_webcam;')) {
                const uniformIndex = shaderCode.lastIndexOf('uniform');
                const insertPosition = uniformIndex !== -1 ? 
                    shaderCode.indexOf(';', uniformIndex) + 1 : 
                    shaderCode.indexOf('void main()');
                
                const webcamUniform = '\nuniform sampler2D u_webcam;\n// vec4 s = texture2D(u_webcam, normCoord);';
                shaderCode = shaderCode.slice(0, insertPosition) + 
                           webcamUniform +
                           shaderCode.slice(insertPosition);
            }
            
            this.updateShader(toNode.id, shaderCode);

            // Get the new program
            const program = toNodeData.data.program;
            gl.useProgram(program);

            // Get uniform location
            const webcamLocation = gl.getUniformLocation(program, 'u_webcam');
            console.log('HDMI uniform location:', webcamLocation);
            gl.uniform1i(webcamLocation, 2);  // Use texture unit 2

            // Update texture in render loop
            const updateTexture = () => {
                if (video.readyState >= video.HAVE_CURRENT_DATA) {
                    console.log('Updating texture with HDMI frame');
                    gl.activeTexture(gl.TEXTURE2);
                    gl.bindTexture(gl.TEXTURE_2D, texture);
                    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
                }
                requestAnimationFrame(updateTexture);
            };
            updateTexture();

            console.log('HDMI setup complete');
        }
    }

    updateCheckboxGrid(gl, targetNode) {
        const grid = targetNode.querySelector('.checkbox-grid');
        if (!grid) return;
        
        const checkboxes = grid.querySelectorAll('input');
        if (checkboxes.length === 0) return;

        // Create a temporary canvas for scaling
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = 32;
        tempCanvas.height = 32;

        // Draw the WebGL canvas to temp canvas, scaling it down
        tempCtx.drawImage(gl.canvas, 0, 0, gl.canvas.width, gl.canvas.height, 0, 0, 32, 32);
        
        // Read the scaled pixels
        const imageData = tempCtx.getImageData(0, 0, 32, 32).data;

        // Update checkboxes based on scaled pixel data
        checkboxes.forEach((checkbox, i) => {
            const r = imageData[i * 4];
            const g = imageData[i * 4 + 1];
            const b = imageData[i * 4 + 2];
            const brightness = (r + g + b) / 3;
            checkbox.checked = brightness > 127;
        });
    }

    initializeWebcam(node) {
        console.log('Initializing webcam...');
        const video = node.querySelector('video');
        if (!video) {
            console.error('No video element found');
            return;
        }

        // Add autoplay and playsinline attributes
        video.autoplay = true;
        video.playsinline = true;
        video.muted = true;

        // Request webcam with specific constraints
        navigator.mediaDevices.getUserMedia({
            video: {
                width: { ideal: 320 },
                height: { ideal: 240 }
            }
        })
        .then(stream => {
            console.log('Webcam stream acquired');
            video.srcObject = stream;
            
            // Make sure video plays
            video.play()
                .then(() => console.log('Video playback started'))
                .catch(e => console.error('Error playing video:', e));

            const nodeData = this.nodeSystem.nodes.get(node.id);
            if (nodeData) {
                nodeData.data = { stream, video };
                console.log('Webcam data stored in node:', nodeData);
            }
        })
        .catch(err => {
            console.error('Error accessing webcam:', err);
            node.querySelector('.node-content').innerHTML = `
                <div style="color: red; padding: 10px;">
                    Webcam access failed: ${err.message}
                </div>
            `;
        });
    }

    initializeHDMI(node) {
        console.log('Initializing HDMI capture...');
        const video = node.querySelector('video');
        if (!video) {
            console.error('No video element found');
            return;
        }

        // Add autoplay and playsinline attributes
        video.autoplay = true;
        video.playsinline = true;
        video.muted = true;

        // Request HDMI capture with specific constraints
        navigator.mediaDevices.getDisplayMedia({
            video: {
                width: { ideal: 320 },
                height: { ideal: 240 },
                frameRate: { ideal: 60 }
            }
        })
        .then(stream => {
            console.log('HDMI stream acquired');
            video.srcObject = stream;
            
            // Make sure video plays
            video.play()
                .then(() => console.log('Video playback started'))
                .catch(e => console.error('Error playing video:', e));

            const nodeData = this.nodeSystem.nodes.get(node.id);
            if (nodeData) {
                nodeData.data = { stream, video };
                console.log('HDMI data stored in node:', nodeData);
            }
        })
        .catch(err => {
            console.error('Error accessing HDMI:', err);
            node.querySelector('.node-content').innerHTML = `
                <div style="color: red; padding: 10px;">
                    HDMI access failed: ${err.message}
                </div>
            `;
        });
    }
}

// export default ShaderManager; 
export default ShaderManager; 