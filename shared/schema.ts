import { pgTable, text, serial, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const nodes = pgTable("nodes", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(), // "javascript" | "wgsl"
  code: text("code").notNull(),
  position: jsonb("position").notNull(),
  connections: jsonb("connections").notNull()
});

export const insertNodeSchema = createInsertSchema(nodes).pick({
  type: true,
  code: true,
  position: true,
  connections: true
});

export type InsertNode = z.infer<typeof insertNodeSchema>;
export type Node = typeof nodes.$inferSelect;

export const nodeSchema = z.object({
  type: z.enum(["javascript", "wgsl"]),
  code: z.string(),
  position: z.object({
    x: z.number(),
    y: z.number()
  }),
  connections: z.array(z.object({
    from: z.number(),
    to: z.number(),
    port: z.string()
  }))
});
