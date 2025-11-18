import 'dotenv/config';

// Add global error handlers at the BEGINNING of the file
process.on('uncaughtException', (err, origin) => {
  console.error(`\n💥 UNCAUGHT EXCEPTION 💥`);
  console.error(`Origem: ${origin}`);
  console.error(err);
  // Consider terminating the process here in a more controlled way if necessary,
  // but for now, just log for diagnosis.
  // process.exit(1); // Uncomment if you want the server to stop on uncaught exceptions
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('\n🚫 UNHANDLED REJECTION 🚫');
  console.error('Promise:', promise);
  console.error('Reason:', reason);
  // Similarly, consider terminating the process or taking other actions.
  // process.exit(1); // Uncomment if you want the server to stop on unhandled rejections
});

import express, { type Request, Response, NextFunction, Express } from "express";
import { registerRoutes } from "./routes.js";
import { setupVite, serveStatic } from "./vite.js";
import { connection } from "./db.js";
import http from 'http';

// Express configuration
const app: Express = express();

// Configuration to ensure UTF-8 characters are handled correctly
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false, limit: '50mb' }));

// CORS for API when frontend calls directly (bypassing Vite proxy)
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';
app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.path.startsWith('/api')) {
    res.header('Access-Control-Allow-Origin', FRONTEND_ORIGIN);
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.header('Access-Control-Allow-Credentials', 'true');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }
  }
  next();
});

// Set headers for UTF-8 only for API responses to avoid breaking HTML
app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.path.startsWith('/api')) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
  }
  next();
});

// Middleware for request logging
app.use((req: Request, res: Response, next: NextFunction) => {
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
      let logLine = `${new Date().toISOString()} ${req.method} ${req.url} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 150) {
        logLine = logLine.slice(0, 149) + "…";
      }

      console.log(logLine); // Replaced log with console.log
    }
  });

  next();
});

// Error handling middleware
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  
  console.error('Application error:', { 
    message: err.message, 
    stack: err.stack,
    status
  });

  res.status(status).json({ 
    status: 'error',
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Function to initialize the server
async function startServer() {
  try {
    // Test database connection
    const testConn = await connection.getConnection();
    testConn.release();
    
    console.log('✅ Database connection established successfully!');
    
    // Create HTTP server
    const server = http.createServer(app);
    
    // Register application routes FIRST
    registerRoutes(app);

    // Configure SPA fallback AFTER API routes
    if (process.env.NODE_ENV === 'development') {
      await setupVite(app, server);
    } else {
      const staticMiddleware = serveStatic();
      app.use(staticMiddleware);
    }

    // Test root route
    app.get('/', (_req: Request, res: Response) => {
      res.status(200).send('Server is alive!');
    });
    
    // Start the server
    const port = process.env.PORT || 3001;
    server.listen(port, () => {
      console.log(`🚀 Server running at http://localhost:${port}`);
    });
    
    // Configure graceful shutdown
    const gracefulShutdown = (signal?: string) => {
      console.log(`
🛑 Shutting down server... Signal received: ${signal || 'N/A (direct call or unknown error)'}`);
      // Add a small delay to ensure logs are processed before exit
      setTimeout(() => {
      server.close((err) => {
        if (err) {
            console.error('❌ Error closing server:', err);
            process.exit(1); // Exit with error if server close fails
          } else {
            console.log('✅ Server closed successfully');
            process.exit(0);
          }
      });
      }, 100); // 100ms delay
    };
    
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();
