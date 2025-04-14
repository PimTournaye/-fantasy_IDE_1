import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { Server } from "socket.io";
import { createServer } from "http";
import { sendMessage } from "./services/gpt";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "http://localhost:5173",
      methods: ["GET", "POST"]
    }
  });

  // Socket.IO connection handling
  io.on('connection', (socket) => {
    console.log('Socket.IO: Client connected with ID:', socket.id);
    console.log('Socket.IO: Total connected clients:', io.engine.clientsCount);

    socket.on('ai-query', async (message) => {
      try {
        console.log('Socket.IO: Received AI query from client:', socket.id);
        console.log('Socket.IO: Query content:', message);
        
        const response = await sendMessage(message);
        console.log('Socket.IO: AI response received:', response);
        
        socket.emit('ai-response', response);
        console.log('Socket.IO: Response sent to client:', socket.id);
      } catch (error) {
        console.error('Socket.IO: Error processing AI query:', error);
        console.error('Socket.IO: Error details:', {
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined
        });
        socket.emit('ai-response', "Sorry, there was an error processing your request.");
      }
    });

    socket.on('disconnect', (reason) => {
      console.log('Socket.IO: Client disconnected:', socket.id);
      console.log('Socket.IO: Disconnect reason:', reason);
      console.log('Socket.IO: Remaining connected clients:', io.engine.clientsCount);
    });
  });

  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 3000
  // this serves both the API and the client
  const port = 3000;
  httpServer.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
