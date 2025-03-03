import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { nodeSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  app.get("/api/nodes", async (_req, res) => {
    const nodes = await storage.getAllNodes();
    res.json(nodes);
  });

  app.post("/api/nodes", async (req, res) => {
    const result = nodeSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }
    const node = await storage.createNode(result.data);
    res.json(node);
  });

  app.put("/api/nodes/:id", async (req, res) => {
    const result = nodeSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }
    const node = await storage.updateNode(parseInt(req.params.id), result.data);
    if (!node) {
      res.status(404).json({ error: "Node not found" });
      return;
    }
    res.json(node);
  });

  return httpServer;
}
