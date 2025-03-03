// Node management and rendering system
class NodeSystem {
  constructor() {
    this.container = document.getElementById('node-container');
    this.nodes = new Map();
    this.connections = new Map();
    this.draggedNode = null;
    this.dragOffset = { x: 0, y: 0 };
    this.setupEventListeners();
  }

  setupEventListeners() {
    document.addEventListener('mousemove', (e) => {
      if (this.draggedNode) {
        const x = e.clientX - this.dragOffset.x;
        const y = e.clientY - this.dragOffset.y;
        this.updateNodePosition(this.draggedNode.id, x, y);
      }
    });

    document.addEventListener('mouseup', () => {
      this.draggedNode = null;
    });
  }

  createNode(type, x, y) {
    const id = `node-${Date.now()}`;
    const node = document.createElement('div');
    node.className = 'node';
    node.id = id;

    // Create node structure
    node.innerHTML = `
      <div class="node-header">${type}</div>
      <div class="node-content">
        ${type === 'webcam' ? '<video autoplay playsinline></video>' : ''}
        ${type === 'webgl' ? '<canvas></canvas>' : ''}
        ${type === 'checkbox' ? '<div class="checkbox-grid"></div>' : ''}
      </div>
      <div class="node-ports">
        <div class="input-port"></div>
        <div class="output-port"></div>
      </div>
    `;

    // Set position
    node.style.left = `${x}px`;
    node.style.top = `${y}px`;

    // Add drag functionality
    node.querySelector('.node-header').addEventListener('mousedown', (e) => {
      this.draggedNode = {
        id,
        element: node
      };
      const rect = node.getBoundingClientRect();
      this.dragOffset = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
      e.preventDefault();
    });

    this.container.appendChild(node);
    this.nodes.set(id, {
      type,
      element: node,
      data: null
    });

    // Initialize node-specific functionality
    this.initializeNode(id, type);

    return id;
  }

  initializeNode(id, type) {
    const node = this.nodes.get(id);
    if (!node) return;

    switch (type) {
      case 'webcam':
        this.initializeWebcam(node);
        break;
      case 'webgl':
        this.initializeWebGL(node);
        break;
      case 'checkbox':
        this.initializeCheckboxGrid(node);
        break;
    }
  }

  async initializeWebcam(node) {
    try {
      console.log('Requesting webcam access...');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: 320,
          height: 240
        } 
      });

      const video = node.element.querySelector('video');
      video.srcObject = stream;

      // Show loading state
      const content = node.element.querySelector('.node-content');
      content.innerHTML = '<div class="loading">Initializing webcam...</div>';

      video.onloadedmetadata = () => {
        console.log('Webcam stream loaded');
        content.innerHTML = ''; // Clear loading
        content.appendChild(video);
        node.data = video;
        video.play(); // Ensure video starts playing
        this.processNode(node);
      };

      video.onerror = (err) => {
        console.error('Video element error:', err);
        content.innerHTML = `<div class="error">Video error: ${err.message}</div>`;
      };

    } catch (error) {
      console.error('Webcam initialization error:', error);
      let errorMessage = 'Failed to access webcam';

      if (error.name === 'NotAllowedError') {
        errorMessage = 'Webcam access denied. Please allow camera access.';
      } else if (error.name === 'NotFoundError') {
        errorMessage = 'No webcam found. Please connect a camera.';
      } else if (error.name === 'NotReadableError') {
        errorMessage = 'Webcam is already in use by another application.';
      }

      node.element.querySelector('.node-content').innerHTML = 
        `<div class="error">${errorMessage}</div>`;
    }
  }

  initializeWebGL(node) {
    const content = node.element.querySelector('.node-content');
    const canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = 240;

    try {
      console.log('Initializing WebGL context...');
      const gl = canvas.getContext('webgl');

      if (!gl) {
        throw new Error('WebGL not supported');
      }

      // Create shader program for black and white posterization
      const vertexShader = gl.createShader(gl.VERTEX_SHADER);
      gl.shaderSource(vertexShader, `
        attribute vec2 position;
        varying vec2 texCoord;
        void main() {
          texCoord = vec2(position.x * 0.5 + 0.5, position.y * -0.5 + 0.5);
          gl_Position = vec4(position, 0.0, 1.0);
        }
      `);
      gl.compileShader(vertexShader);

      if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
        throw new Error(`Vertex shader compilation failed: ${gl.getShaderInfoLog(vertexShader)}`);
      }

      const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
      gl.shaderSource(fragmentShader, `
        precision mediump float;
        varying vec2 texCoord;
        uniform sampler2D texture;
        void main() {
          vec4 color = texture2D(texture, texCoord);
          float gray = dot(color.rgb, vec3(0.299, 0.587, 0.114));
          float posterized = step(0.5, gray);
          gl_FragColor = vec4(vec3(posterized), 1.0);
        }
      `);
      gl.compileShader(fragmentShader);

      if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
        throw new Error(`Fragment shader compilation failed: ${gl.getShaderInfoLog(fragmentShader)}`);
      }

      const program = gl.createProgram();
      gl.attachShader(program, vertexShader);
      gl.attachShader(program, fragmentShader);
      gl.linkProgram(program);

      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        throw new Error(`Program linking failed: ${gl.getProgramInfoLog(program)}`);
      }

      // Create buffers
      const buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        -1, -1,  // Bottom left
         1, -1,  // Bottom right
        -1,  1,  // Top left
         1,  1   // Top right
      ]), gl.STATIC_DRAW);

      // Create and set up texture
      console.log('Setting up WebGL texture...');
      const texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

      // Clear content and add canvas
      content.innerHTML = '';
      content.appendChild(canvas);

      node.data = {
        gl,
        program,
        texture,
        canvas,
        positionLocation: gl.getAttribLocation(program, 'position'),
        textureLocation: gl.getUniformLocation(program, 'texture')
      };

      console.log('WebGL initialization complete');

    } catch (error) {
      console.error('WebGL initialization error:', error);
      content.innerHTML = `<div class="error">${error.message}</div>`;
    }
  }

  initializeCheckboxGrid(node) {
    const grid = node.element.querySelector('.checkbox-grid');
    const size = 32; // 32x32 grid
    for (let i = 0; i < size * size; i++) {
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      grid.appendChild(checkbox);
    }
    grid.style.gridTemplateColumns = `repeat(${size}, 1fr)`;
    node.data = grid;
  }

  updateNodePosition(id, x, y) {
    const node = this.nodes.get(id);
    if (!node) return;

    node.element.style.left = `${x}px`;
    node.element.style.top = `${y}px`;
    this.updateConnections();
  }

  processNode(sourceNode) {
    if (!sourceNode || !sourceNode.data) return;

    // Find connected nodes
    const connections = Array.from(this.connections.values())
      .filter(conn => conn.from === sourceNode.element.id)
      .map(conn => this.nodes.get(conn.to))
      .filter(Boolean);

    connections.forEach(targetNode => {
      if (targetNode.type === 'webgl' && sourceNode.type === 'webcam') {
        this.processWebGLNode(sourceNode, targetNode);
      } else if (targetNode.type === 'checkbox' && sourceNode.type === 'webgl') {
        this.processCheckboxNode(sourceNode, targetNode);
      }
    });

    // Continue processing in animation loop
    requestAnimationFrame(() => this.processNode(sourceNode));
  }

  processWebGLNode(webcamNode, webglNode) {
    try {
      const { gl, program, texture, canvas, positionLocation, textureLocation } = webglNode.data;
      const video = webcamNode.data;

      gl.useProgram(program);

      // Update texture with video frame
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);

      // Set texture uniform
      gl.uniform1i(textureLocation, 0);

      // Draw
      gl.enableVertexAttribArray(positionLocation);
      gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    } catch (error) {
      console.error('WebGL processing error:', error);
      webglNode.element.querySelector('.node-content').innerHTML = 
        `<div class="error">Processing error: ${error.message}</div>`;
    }
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
    const imageData = tempCtx.getImageData(0, 0, canvas.width, canvas.height);

    const stepX = canvas.width / 32;
    const stepY = canvas.height / 32;

    checkboxes.forEach((checkbox, i) => {
      const x = Math.floor((i % 32) * stepX);
      const y = Math.floor(Math.floor(i / 32) * stepY);

      // Get pixel data at the center of each grid cell
      const pixelIndex = (y * canvas.width + x) * 4;
      const brightness = imageData.data[pixelIndex]; // Red channel is sufficient since image is B&W

      // Update checkbox based on brightness threshold
      checkbox.checked = brightness < 128;
    });
  }

  connect(fromId, toId) {
    const connectionId = `${fromId}-${toId}`;
    this.connections.set(connectionId, { from: fromId, to: toId });
    this.updateConnections();
  }

  updateConnections() {
    const svg = document.getElementById('connections');
    svg.innerHTML = '';

    this.connections.forEach(({ from, to }) => {
      const fromNode = document.getElementById(from);
      const toNode = document.getElementById(to);

      if (!fromNode || !toNode) return;

      const fromRect = fromNode.getBoundingClientRect();
      const toRect = toNode.getBoundingClientRect();

      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      const fromX = fromRect.left + fromRect.width;
      const fromY = fromRect.top + fromRect.height / 2;
      const toX = toRect.left;
      const toY = toRect.top + toRect.height / 2;

      path.setAttribute('d', `M ${fromX} ${fromY} C ${fromX + 50} ${fromY}, ${toX - 50} ${toY}, ${toX} ${toY}`);
      path.setAttribute('stroke', '#666');
      path.setAttribute('stroke-width', '2');
      path.setAttribute('fill', 'none');

      svg.appendChild(path);
    });
  }
}

// Initialize the system and create test nodes
const nodeSystem = new NodeSystem();

// Create nodes
const webcamNode = nodeSystem.createNode('webcam', 50, 50);
const webglNode = nodeSystem.createNode('webgl', 300, 50);
const checkboxNode = nodeSystem.createNode('checkbox', 550, 50);

// Connect nodes
nodeSystem.connect(webcamNode, webglNode);
nodeSystem.connect(webglNode, checkboxNode);