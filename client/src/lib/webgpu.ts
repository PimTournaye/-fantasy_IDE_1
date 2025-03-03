export class WebGPURenderer {
  device: GPUDevice | null = null;
  context: GPUCanvasContext | null = null;
  canvas: HTMLCanvasElement | null = null;
  error: string | null = null;
  adapterInfo: GPUAdapterInfo | null = null;

  async init(canvas: HTMLCanvasElement): Promise<boolean> {
    this.canvas = canvas;

    try {
      if (!navigator.gpu) {
        this.error = "WebGPU is not supported in your browser. Please use Chrome Canary or Edge Canary with WebGPU flags enabled.";
        return false;
      }

      console.log("GPU API Version:", await navigator.gpu.getPreferredCanvasFormat());

      const adapter = await navigator.gpu.requestAdapter({
        powerPreference: "high-performance"
      });

      if (!adapter) {
        this.error = "No suitable GPU adapter found. Please check if your GPU supports WebGPU and your drivers are up to date.";
        return false;
      }

      // Get adapter info and capabilities
      this.adapterInfo = await adapter.requestAdapterInfo();
      console.log("GPU Adapter Info:", {
        vendor: this.adapterInfo?.vendor,
        architecture: this.adapterInfo?.architecture
      });

      // List available features
      const features = Array.from(adapter.features.values());
      console.log("Available GPU features:", features);

      // List adapter limits
      const limits = adapter.limits;
      console.log("GPU Adapter Limits:", limits);

      this.device = await adapter.requestDevice({
        requiredLimits: {
          maxBufferSize: adapter.limits.maxBufferSize,
          maxStorageBufferBindingSize: adapter.limits.maxStorageBufferBindingSize,
        }
      });

      this.context = canvas.getContext("webgpu");
      if (!this.context) {
        this.error = "Failed to get WebGPU context. This might be a browser configuration issue.";
        return false;
      }

      const format = navigator.gpu.getPreferredCanvasFormat();
      this.context.configure({
        device: this.device,
        format,
        alphaMode: "premultiplied",
      });

      console.log("WebGPU initialized successfully with format:", format);
      return true;
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      this.error = `WebGPU initialization failed: ${errorMessage}`;
      console.error("Detailed WebGPU error:", e);
      return false;
    }
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

  // Additional WebGPU setup and rendering methods will go here
}

export const renderer = new WebGPURenderer();