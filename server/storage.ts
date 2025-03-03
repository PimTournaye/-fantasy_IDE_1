import { type Node, type InsertNode } from "@shared/schema";

export interface IStorage {
  getAllNodes(): Promise<Node[]>;
  getNode(id: number): Promise<Node | undefined>;
  createNode(node: InsertNode): Promise<Node>;
  updateNode(id: number, node: InsertNode): Promise<Node | undefined>;
}

export class MemStorage implements IStorage {
  private nodes: Map<number, Node>;
  private currentIdNodes: number;

  constructor() {
    this.nodes = new Map();
    this.currentIdNodes = 1;
  }

  async getAllNodes(): Promise<Node[]> {
    return Array.from(this.nodes.values());
  }

  async getNode(id: number): Promise<Node | undefined> {
    return this.nodes.get(id);
  }

  async createNode(node: InsertNode): Promise<Node> {
    const id = this.currentIdNodes++;
    const newNode = { ...node, id };
    this.nodes.set(id, newNode);
    return newNode;
  }

  async updateNode(id: number, updates: InsertNode): Promise<Node | undefined> {
    const existing = this.nodes.get(id);
    if (!existing) return undefined;

    const updated = { ...updates, id };
    this.nodes.set(id, updated);
    return updated;
  }
}

export const storage = new MemStorage();