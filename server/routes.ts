import express, { Express, Request, Response, NextFunction } from "express";
import { createServer, Server } from "http";
import { IStorage, storage } from "./storage";
import passport from "passport";
import OpenAI from "openai";
import { handleDynamicAssistantRequest } from "./backend";

// Initialize OpenAI client
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function registerRoutes(app: Express): Promise<Server> {
  const apiRouter = express.Router();
  
  // Define routes and middlewares
  
  // Use simplified implementation for dynamic assistant
  apiRouter.post("/foundations/:foundationId/dynamic-assistant", async (req: Request, res: Response) => {
    return await handleDynamicAssistantRequest(req, res);
  });
  
  // Health check endpoint
  apiRouter.get("/health", async (req: Request, res: Response) => {
    try {
      return res.json({
        status: "healthy",
        timestamp: new Date().toISOString(),
        version: "1.0"
      });
    } catch (error) {
      console.error("Health check error:", error);
      return res.status(500).json({ status: "unhealthy", error: "Failed to perform health check" });
    }
  });
  
  // Mount the API router
  app.use("/api", apiRouter);
  
  // Create and return HTTP server
  const httpServer = createServer(app);
  return httpServer;
}