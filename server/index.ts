import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { pool, checkDatabaseConnection } from "./db";

// Initialize express app
const app = express();
app.use(express.json({ limit: '5mb' })); // Increase JSON size limit
app.use(express.urlencoded({ extended: false, limit: '5mb' }));

// Request logging middleware
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
        // Only log response body for non-error responses to reduce log noise
        if (res.statusCode < 400) {
          logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
        } else {
          logLine += ` :: Error response`;
        }
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// Initialize server
(async () => {
  try {
    // Check database connection before starting
    const dbConnected = await checkDatabaseConnection();
    if (!dbConnected) {
      log("WARNING: Database connection check failed. The application may not function correctly.");
    } else {
      log("Database connection successful");
    }

    // Set up routes and get HTTP server
    const server = await registerRoutes(app);

    // Error handling middleware
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      const details = err.details || {};
      
      // Enhanced error logging
      console.error(`ERROR [${status}]: ${message}`, { 
        stack: err.stack,
        details
      });

      // Send response but don't throw - that would crash the server
      res.status(status).json({ 
        message,
        details,
        timestamp: new Date().toISOString()
      });
    });

    // Set up static file serving or Vite dev server
    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // Start the server
    const port = 5000;
    server.listen({
      port,
      host: "0.0.0.0",
      reusePort: true,
    }, () => {
      log(`Server started successfully on port ${port}`);
    });

    // Set up graceful shutdown
    const gracefulShutdown = async (signal: string) => {
      log(`${signal} received. Shutting down gracefully...`);
      
      // Give existing connections 10 seconds to complete
      server.close(() => {
        log('HTTP server closed');
        
        // Close database pool
        pool.end().then(() => {
          log('Database pool closed');
          process.exit(0);
        }).catch(err => {
          console.error('Error closing database pool:', err);
          process.exit(1);
        });
      });
      
      // Force shutdown after 30 seconds
      setTimeout(() => {
        console.error('Forced shutdown after timeout');
        process.exit(1);
      }, 30000);
    };
    
    // Listen for termination signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    
    // Handle uncaught exceptions
    process.on('uncaughtException', (err) => {
      console.error('Uncaught Exception:', err);
      gracefulShutdown('Uncaught Exception');
    });
    
    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason) => {
      console.error('Unhandled Rejection:', reason);
      // Don't shut down for unhandled rejections, but log them
    });
    
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
})();
