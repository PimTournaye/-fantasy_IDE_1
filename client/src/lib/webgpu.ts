export class WebGPURenderer {
  device: GPUDevice | null = null;
  context: GPUCanvasContext | null = null;
  canvas: HTMLCanvasElement | null = null;
  error: string | null = null;

  async init(canvas: HTMLCanvasElement): Promise<boolean> {
    this.canvas = canvas;

    try {
      if (!navigator.gpu) {
        this.error = "WebGPU is not supported in your browser";
        return false;
      }

      const adapter = await navigator.gpu.requestAdapter({
        powerPreference: "high-performance"
      });

      if (!adapter) {
        this.error = "No suitable GPU adapter found";
        return false;
      }

      this.device = await adapter.requestDevice();
      this.context = canvas.getContext("webgpu") as GPUCanvasContext;

      if (!this.context) {
        this.error = "Failed to get WebGPU context";
        return false;
      }

      const format = navigator.gpu.getPreferredCanvasFormat();
      this.context.configure({
        device: this.device,
        format,
        alphaMode: "premultiplied",
      });

      return true;
    } catch (e) {
      this.error = `WebGPU initialization failed: ${e instanceof Error ? e.message : String(e)}`;
      console.error(this.error);
      return false;
    }
  }

  async compileShader(code: string): Promise<{ success: boolean; error?: string }> {
    if (!this.device) {
      return { success: false, error: "WebGPU device not initialized" };
    }

    try {
      await this.device.createShaderModule({
        code,
      });
      return { success: true };
    } catch (e) {
      const error = e instanceof Error ? e.message : String(e);
      console.error("Shader compilation error:", error);
      return { success: false, error };
    }
  }

  // Additional WebGPU setup and rendering methods will go here
}

export const renderer = new WebGPURenderer();