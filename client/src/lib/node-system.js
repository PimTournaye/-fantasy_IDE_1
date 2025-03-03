// Import CodeMirror packages at the top
import { EditorView } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { basicSetup } from '@codemirror/basic-setup';
import { javascript } from '@codemirror/lang-javascript';

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

    const shaderCode = type === 'webgl' ? this.getDefaultShaderCode() : '';

    node.innerHTML = `
      <div class="node-header">
        <span>${type}</span>
        ${type === 'webgl' ? '<div class="header-buttons"><button class="expand-button">Edit</button></div>' : ''}
      </div>
      <div class="node-content">
        ${type === 'webcam' ? '<video autoplay playsinline></video>' : ''}
        ${type === 'webgl' ? `
          <canvas></canvas>
          <div class="code-editor"></div>
        ` : ''}
        ${type === 'checkbox' ? '<div class="checkbox-grid"></div>' : ''}
      </div>
      <div class="node-ports">
        <div class="input-port"></div>
        <div class="output-port"></div>
      </div>
    `;

    node.style.left = `${x}px`;
    node.style.top = `${y}px`;

    node.querySelector('.node-header').addEventListener('mousedown', (e) => {
      if (e.target.matches('.node-header, .node-header span')) {
        this.draggedNode = { id, element: node };
        const rect = node.getBoundingClientRect();
        this.dragOffset = {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top
        };
        e.preventDefault();
      }
    });

    if (type === 'webgl') {
      node.querySelector('.expand-button').addEventListener('click', () => {
        this.toggleNodeExpansion(id);
      });
    }

    this.container.appendChild(node);
    this.nodes.set(id, {
      type,
      element: node,
      data: null,
      code: shaderCode,
      lastWorkingCode: shaderCode,
      editor: null,
      isDirty: false
    });

    this.initializeNode(id, type);
    return id;
  }

  getDefaultShaderCode() {
    return `precision mediump float;
varying vec2 texCoord;
uniform sampler2D texture;
void main() {
  vec4 color = texture2D(texture, texCoord);
  float gray = dot(color.rgb, vec3(0.299, 0.587, 0.114));
  float posterized = step(0.5, gray);
  gl_FragColor = vec4(vec3(posterized), 1.0);
}`;
  }

  initializeCodeEditor(node) {
    const editorContainer = node.element.querySelector('.code-editor');
    if (!editorContainer) return;

    // Create a new editor instance
    const editor = new EditorView({
      state: EditorState.create({
        doc: node.code,
        extensions: [
          basicSetup,
          javascript(),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              const newCode = update.state.doc.toString();
              this.updateShader(node, newCode);
            }
          })
        ]
      }),
      parent: editorContainer
    });

    node.editor = editor;
  }

  updateShader(node, fragmentCode) {
    if (!node.data || !node.data.gl) return;

    const errors = this.checkFragmentShader(node.data.gl, fragmentCode);
    if (errors.length > 0) {
      console.log("Shader compilation errors:", errors);
      return;
    }

    node.code = fragmentCode;
    node.isDirty = true;
    this.updateShaderProgram(node);
  }

  checkFragmentShader(gl, shaderCode) {
    const shader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(shader, shaderCode);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const infoLog = gl.getShaderInfoLog(shader);
      const errors = infoLog.split(/\r|\n/);
      const ret = [];

      for (let error of errors) {
        if (!error) continue;
        const splitResult = error.split(":");
        if (splitResult.length >= 4) {
          ret.push({
            message: splitResult[3] + (splitResult[4] || ""),
            character: splitResult[1],
            line: splitResult[2]
          });
        }
      }
      gl.deleteShader(shader);
      return ret;
    }

    gl.deleteShader(shader);
    return [];
  }

  toggleNodeExpansion(id) {
    const node = this.nodes.get(id);
    if (!node || node.type !== 'webgl') return;

    const isExpanded = node.element.classList.toggle('expanded');

    if (isExpanded && !node.editor) {
      // Short delay to ensure DOM is updated
      requestAnimationFrame(() => {
        this.initializeCodeEditor(node);
      });
    }
  }

  updateShaderProgram(node) {
    const { gl } = node.data;

    // Create vertex shader
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

    // Create fragment shader
    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragmentShader, node.code);
    gl.compileShader(fragmentShader);

    // Create and link program
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    // Update node's program
    if (node.data.program) {
      gl.deleteProgram(node.data.program);
    }
    node.data.program = program;
    node.data.positionLocation = gl.getAttribLocation(program, 'position');
    node.data.textureLocation = gl.getUniformLocation(program, 'texture');
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
        content.innerHTML = ''; 
        content.appendChild(video);
        node.data = video;
        video.play(); 
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
      gl.shaderSource(fragmentShader, node.lastWorkingCode); 
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
    const size = 32; 
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

      // Process any connected nodes (like checkbox)
      const checkboxConnections = Array.from(this.connections.values())
        .filter(conn => conn.from === webglNode.element.id)
        .map(conn => this.nodes.get(conn.to))
        .filter(node => node && node.type === 'checkbox');

      checkboxConnections.forEach(checkboxNode => {
        this.processCheckboxNode(webglNode, checkboxNode);
      });

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
    const imageData = tempCtx.getImageData(0, 0, canvas.width, canvas.height).data;

    // Calculate step sizes to sample the image
    const sampleWidth = Math.floor(canvas.width / 32);
    const sampleHeight = Math.floor(canvas.height / 32);

    checkboxes.forEach((checkbox, i) => {
      const gridX = i % 32;
      const gridY = Math.floor(i / 32);

      // Sample from the center of each grid cell
      const x = gridX * sampleWidth + Math.floor(sampleWidth / 2);
      const y = gridY * sampleHeight + Math.floor(sampleHeight / 2);

      // Get the pixel index in the image data array (RGBA format)
      const pixelIndex = (y * canvas.width + x) * 4;

      // Use the red channel since our WebGL shader outputs black/white
      const brightness = imageData[pixelIndex];

      // Update checkbox state - checked if dark, unchecked if bright
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