import type { Node } from "@shared/schema";

export class NodeEngine {
  nodes: Map<number, Node> = new Map();

  addNode(node: Node) {
    this.nodes.set(node.id, node);
  }

  removeNode(id: number) {
    this.nodes.delete(id);
  }

  updateNode(id: number, updates: Partial<Node>) {
    const node = this.nodes.get(id);
    if (node) {
      this.nodes.set(id, { ...node, ...updates });
    }
  }

  getConnectedNodes(nodeId: number): Node[] {
    const node = this.nodes.get(nodeId);
    if (!node || !node.connections) return [];

    return (node.connections as { to: number }[])
      .map(conn => this.nodes.get(conn.to))
      .filter((n): n is Node => n !== undefined);
  }

  evaluate(startNodeId: number) {
    const node = this.nodes.get(startNodeId);
    if (!node) return;

    if (node.type === "javascript") {
      try {
        const fn = new Function(node.code);
        return fn();
      } catch (e) {
        console.error("JavaScript evaluation error:", e);
      }
    } else if (node.type === "wgsl") {
      // WGSL compilation handled by WebGPU renderer
    }
  }
}

export const nodeEngine = new NodeEngine();