import { fragmentShaders } from '../defaultShaders.js';

class ShaderManager {
    constructor(nodeSystem) {
        this.nodeSystem = nodeSystem;
        this.defaultShaderCode = fragmentShaders[0];
    }

    initializeWebGL(node) {
        this.defaultShaderCode = fragmentShaders[Math.floor(Math.random() * fragmentShaders.length)];
        console.log('Initializing WebGL for node:', node.id);
        const content = node.querySelector('.node-content');
        const canvas = content.querySelector('canvas');
        if (!canvas) return;

        canvas.width = 320;
        canvas.height = 240;

        const gl = canvas.getContext('webgl');
        if (!gl) return;

        // Store node data first
        const nodeData = this.nodeSystem.nodes.get(node.id);
        if (!nodeData) return;

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

        // Get locations - same as in updateShader
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
        };
        nodeData.code = this.defaultShaderCode;

        // Initial setup - same as in updateShader
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
        const nodeData = this.nodeSystem.nodes.get(nodeId);
        if (!nodeData || !nodeData.data || !nodeData.data.gl) return;

        const { gl } = nodeData.data;
        
        // Create new program
        const newProgram = this.createShaderProgram(gl, code);
        if (!newProgram) return;

        // Get new locations
        const positionLocation = gl.getAttribLocation(newProgram, 'position');
        const timeLocation = gl.getUniformLocation(newProgram, 'u_time');
        const resolutionLocation = gl.getUniformLocation(newProgram, 'u_resolution');

        // Only after successful creation, update the node data
        const oldProgram = nodeData.data.program;
        nodeData.data.program = newProgram;
        nodeData.data.positionLocation = positionLocation;
        nodeData.data.timeLocation = timeLocation;
        nodeData.data.resolutionLocation = resolutionLocation;
        nodeData.code = code;

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
    }
}

export default ShaderManager; 