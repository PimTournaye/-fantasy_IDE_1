export class WebGPURenderer {
  device: GPUDevice | null = null;
  context: GPUCanvasContext | null = null;
  canvas: HTMLCanvasElement | null = null;
  error: string | null = null;
  fallbackContext: CanvasRenderingContext2D | null = null;

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

  async compileShader(code: string): Promise<{ success: boolean; error?: string }> {
    if (!this.device) {
      return { 
        success: false, 
        error: "WebGPU device not initialized. Check console for detailed diagnostics." 
      };
    }

    try {
      const shaderModule = this.device.createShaderModule({
        code,
        label: "User shader"  // Adding a label helps with debugging
      });

      // We can't actually get compilation info synchronously in current WebGPU spec
      // The compilation happens asynchronously when the shader is first used
      return { success: true };
    } catch (e) {
      const error = e instanceof Error ? e.message : String(e);
      console.error("Detailed shader compilation error:", e);
      return { success: false, error };
    }
  }
}

export const renderer = new WebGPURenderer();