export class WebGPURenderer {
  device: GPUDevice | null = null;
  context: GPUCanvasContext | null = null;
  canvas: HTMLCanvasElement | null = null;
  error: string | null = null;
  fallbackContext: CanvasRenderingContext2D | null = null;
  uniformBuffer: GPUBuffer | null = null;
  bindGroup: GPUBindGroup | null = null;
  pipeline: GPURenderPipeline | null = null;

  async init(canvas: HTMLCanvasElement): Promise<boolean> {
    this.canvas = canvas;

    try {
      // Browser detection
      const userAgent = navigator.userAgent;
      const browserInfo = {
        isChrome: userAgent.includes('Chrome'),
        isEdge: userAgent.includes('Edg'),
        version: userAgent.match(/(?:Chrome|Edg)\/(\d+)/)?.at(1) || 'unknown'
      };

      if (!navigator.gpu) {
        console.log("WebGPU API not available in current browser", browserInfo);
        this.error = `WebGPU is not supported in your browser (${browserInfo.isChrome ? 'Chrome' : browserInfo.isEdge ? 'Edge' : 'Other'} ${browserInfo.version}). 
          Please use Chrome Canary or Edge Canary with WebGPU flags enabled.`;
        return this.initFallback();
      }

      const format = navigator.gpu.getPreferredCanvasFormat();
      console.log("Preferred WebGPU format:", format);

      const adapter = await navigator.gpu.requestAdapter({
        powerPreference: "high-performance"
      });

      if (!adapter) {
        console.log("No WebGPU adapter found");
        this.error = "No suitable GPU adapter found. Please check if your GPU supports WebGPU and your drivers are up to date.";
        return this.initFallback();
      }

      // Log adapter features and limits
      console.log("Available GPU features:", Array.from(adapter.features.values()));
      console.log("GPU Adapter Limits:", adapter.limits);

      this.device = await adapter.requestDevice({
        requiredLimits: {
          maxBufferSize: adapter.limits.maxBufferSize,
          maxStorageBufferBindingSize: adapter.limits.maxStorageBufferBindingSize,
        }
      });

      this.context = canvas.getContext("webgpu");
      if (!this.context) {
        console.log("Failed to get WebGPU context");
        this.error = "Failed to get WebGPU context. This might be a browser configuration issue.";
        return this.initFallback();
      }

      this.context.configure({
        device: this.device,
        format,
        alphaMode: "premultiplied",
      });

      // Create uniform buffer for time
      this.uniformBuffer = this.device.createBuffer({
        size: 4, // size of a float32
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      });

      console.log("WebGPU initialized successfully");
      return true;
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      this.error = `WebGPU initialization failed: ${errorMessage}`;
      console.error("Detailed WebGPU error:", e);
      return this.initFallback();
    }
  }

  private initFallback(): boolean {
    console.log("Initializing Canvas2D fallback");
    if (!this.canvas) return false;

    this.fallbackContext = this.canvas.getContext('2d');
    if (!this.fallbackContext) {
      this.error = "Failed to initialize both WebGPU and Canvas2D fallback";
      return false;
    }

    // Draw something to indicate fallback mode is active
    this.fallbackContext.fillStyle = '#333';
    this.fallbackContext.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.fallbackContext.fillStyle = '#666';
    this.fallbackContext.font = '14px monospace';
    this.fallbackContext.fillText('Running in Canvas2D fallback mode', 10, 30);

    return true;
  }

  // Setup rendering pipeline and bind groups
  private setupPipeline(shader: string): boolean {
    if (!this.device || !this.context) return false;

    try {
      const shaderModule = this.device.createShaderModule({
        code: shader,
        label: "Main shader module"
      });

      const bindGroupLayout = this.device.createBindGroupLayout({
        entries: [{
          binding: 0,
          visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
          buffer: { type: "uniform" }
        }]
      });

      this.bindGroup = this.device.createBindGroup({
        layout: bindGroupLayout,
        entries: [{
          binding: 0,
          resource: { buffer: this.uniformBuffer! }
        }]
      });

      this.pipeline = this.device.createRenderPipeline({
        layout: this.device.createPipelineLayout({
          bindGroupLayouts: [bindGroupLayout]
        }),
        vertex: {
          module: shaderModule,
          entryPoint: 'vs_main',
          buffers: []
        },
        fragment: {
          module: shaderModule,
          entryPoint: 'fs_main',
          targets: [{
            format: navigator.gpu.getPreferredCanvasFormat()
          }]
        },
        primitive: {
          topology: 'triangle-list'
        }
      });

      return true;
    } catch (e) {
      console.error('Pipeline setup error:', e);
      return false;
    }
  }

  // Render a frame
  render(shader: string, time: number) {
    if (!this.device || !this.context) return;

    try {
      // Set up pipeline if not already done
      if (!this.pipeline || !this.bindGroup) {
        if (!this.setupPipeline(shader)) {
          console.error('Failed to setup pipeline');
          return;
        }
      }

      // Update time uniform
      this.device.queue.writeBuffer(
        this.uniformBuffer!,
        0,
        new Float32Array([time])
      );

      // Begin render pass
      const commandEncoder = this.device.createCommandEncoder();
      const textureView = this.context.getCurrentTexture().createView();

      const renderPass = commandEncoder.beginRenderPass({
        colorAttachments: [{
          view: textureView,
          clearValue: { r: 0.0, g: 0.0, b: 0.0, a: 1.0 },
          loadOp: 'clear',
          storeOp: 'store'
        }]
      });

      renderPass.setPipeline(this.pipeline!);
      renderPass.setBindGroup(0, this.bindGroup);
      renderPass.draw(3, 1, 0, 0);
      renderPass.end();

      // Submit the frame
      this.device.queue.submit([commandEncoder.finish()]);
    } catch (e) {
      console.error('Render error:', e);
    }
  }
}

export const renderer = new WebGPURenderer();