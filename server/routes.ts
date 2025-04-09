import express, { Express, Request, Response, NextFunction } from "express";
import { createServer, Server } from "http";
import { IStorage, storage } from "./storage";
import passport from "passport";
import OpenAI from "openai";
import { handleDynamicAssistantRequest } from "./backend";
import { generateChatSuggestions } from "./assistants";

// Initialize OpenAI client
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function registerRoutes(app: Express): Promise<Server> {
  const apiRouter = express.Router();
  
  // Define routes and middlewares

  // Foundations - List all foundations
  apiRouter.get("/foundations", async (req: Request, res: Response) => {
    try {
      // Use a default user ID of 1 for now since we're not implementing auth in the simplified version
      const foundations = await storage.getFoundations(1);
      return res.json(foundations);
    } catch (error) {
      console.error("Error getting foundations:", error);
      return res.status(500).json({ message: "Failed to get foundations" });
    }
  });

  // Foundations - Get single foundation
  apiRouter.get("/foundations/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID" });
      }
      const foundation = await storage.getFoundation(id);
      if (!foundation) {
        return res.status(404).json({ message: "Foundation not found" });
      }
      return res.json(foundation);
    } catch (error) {
      console.error("Error getting foundation:", error);
      return res.status(500).json({ message: "Failed to get foundation" });
    }
  });

  // Foundations - Create new foundation
  apiRouter.post("/foundations", async (req: Request, res: Response) => {
    try {
      const { name } = req.body;
      // Use a default user ID of 1 for now since we're not implementing auth in the simplified version
      const foundation = await storage.createFoundation({
        name: name || "New Foundation",
        userId: 1, // Required field
        description: "",
        genre: "",
        currentStage: "genre", // Set to genre as the initial stage to avoid UI issues
        genreCompleted: false
      });
      return res.json(foundation);
    } catch (error) {
      console.error("Error creating foundation:", error);
      return res.status(500).json({ message: "Failed to create foundation" });
    }
  });
  
  // Foundations - Get foundation messages
  apiRouter.get("/foundations/:foundationId/messages", async (req: Request, res: Response) => {
    try {
      const foundationId = parseInt(req.params.foundationId);
      if (isNaN(foundationId)) {
        return res.status(400).json({ message: "Invalid foundation ID" });
      }
      const messages = await storage.getFoundationMessages(foundationId);
      return res.json(messages || []);
    } catch (error) {
      console.error("Error getting foundation messages:", error);
      return res.status(500).json({ message: "Failed to get foundation messages" });
    }
  });
  
  // Foundations - Create foundation message
  apiRouter.post("/foundations/:foundationId/messages", async (req: Request, res: Response) => {
    try {
      const foundationId = parseInt(req.params.foundationId);
      if (isNaN(foundationId)) {
        return res.status(400).json({ message: "Invalid foundation ID" });
      }
      
      const { role, content } = req.body;
      
      if (!role || !content) {
        return res.status(400).json({ message: "Role and content are required" });
      }
      
      if (role !== 'user' && role !== 'assistant') {
        return res.status(400).json({ message: "Role must be 'user' or 'assistant'" });
      }
      
      const message = await storage.createFoundationMessage({
        foundationId,
        role,
        content
      });
      
      return res.json(message);
    } catch (error) {
      console.error("Error creating foundation message:", error);
      return res.status(500).json({ message: "Failed to create foundation message" });
    }
  });

  // Foundations - Get foundation characters
  apiRouter.get("/foundations/:foundationId/characters", async (req: Request, res: Response) => {
    try {
      const foundationId = parseInt(req.params.foundationId);
      if (isNaN(foundationId)) {
        return res.status(400).json({ message: "Invalid foundation ID" });
      }
      const characters = await storage.getCharactersByFoundation(foundationId);
      return res.json(characters || []);
    } catch (error) {
      console.error("Error getting foundation characters:", error);
      return res.status(500).json({ message: "Failed to get foundation characters" });
    }
  });

  // Foundations - Get foundation genre details
  apiRouter.get("/foundations/:foundationId/genre", async (req: Request, res: Response) => {
    try {
      const foundationId = parseInt(req.params.foundationId);
      if (isNaN(foundationId)) {
        return res.status(400).json({ message: "Invalid foundation ID" });
      }
      const genreDetails = await storage.getGenreDetailsByFoundation(foundationId);
      return res.json(genreDetails || null);
    } catch (error) {
      console.error("Error getting foundation genre details:", error);
      return res.status(500).json({ message: "Failed to get foundation genre details" });
    }
  });

  // Dynamic assistant endpoint - uses completion flags to enforce strict stage progression:
  // 1. If genreCompleted is not TRUE → Genre Stage
  // 2. If genreCompleted=TRUE and environmentCompleted is not TRUE → Environment Stage
  // 3. If genreCompleted=TRUE and environmentCompleted=TRUE and worldCompleted is not TRUE → World Stage
  // 4. If genreCompleted=TRUE and environmentCompleted=TRUE and worldCompleted=TRUE → Character Stage
  apiRouter.post("/foundations/:foundationId/dynamic-assistant", async (req: Request, res: Response) => {
    return await handleDynamicAssistantRequest(req, res);
  });
  
  // Foundations - Delete a foundation
  apiRouter.delete("/foundations/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID" });
      }
      
      // Check if force delete is requested
      const force = req.query.force === 'true';
      
      // First check if foundation exists
      const foundation = await storage.getFoundation(id);
      if (!foundation) {
        return res.status(404).json({ message: "Foundation not found" });
      }
      
      // If force delete, delete related stories as well
      if (force) {
        const stories = await storage.getStoriesByFoundation(id);
        for (const story of stories) {
          await storage.deleteStory(story.id);
        }
      }
      
      // Delete the foundation
      const deleted = await storage.deleteFoundation(id);
      if (!deleted) {
        return res.status(500).json({ message: "Failed to delete foundation" });
      }
      
      return res.status(204).send();
    } catch (error) {
      console.error("Error deleting foundation:", error);
      return res.status(500).json({ message: "Failed to delete foundation" });
    }
  });
  
  // Chat suggestions endpoint
  apiRouter.post("/ai/chat-suggestions", async (req: Request, res: Response) => {
    try {
      const { userMessage, assistantReply } = req.body;
      
      if (!assistantReply) {
        return res.status(400).json({ message: "Missing assistant reply" });
      }
      
      // For welcome messages, user message might be missing
      const isWelcomeMessage = assistantReply && (
        assistantReply.includes("Welcome to Foundation Builder") || 
        assistantReply.includes("What type of genre would you like to explore")
      );
      
      if (!isWelcomeMessage && !userMessage) {
        return res.status(400).json({ message: "Missing user message" });
      }
      
      console.log("Generating chat suggestions for conversation");
      console.log(`User: ${userMessage?.substring(0, 50) || "(none)"}`);
      console.log(`Assistant: ${assistantReply.substring(0, 50)}`);
      
      const suggestions = await generateChatSuggestions(
        userMessage || "",
        assistantReply
      );
      
      return res.json({ suggestions });
    } catch (error) {
      console.error("Error generating chat suggestions:", error);
      return res.status(500).json({ 
        message: "Failed to generate chat suggestions",
        suggestions: [] 
      });
    }
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
  
  // Special test endpoint to verify the genre assistant ID directly
  apiRouter.post("/test-genre-assistant", async (req: Request, res: Response) => {
    try {
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const { message } = req.body;
      
      if (!message) {
        return res.status(400).json({
          message: "Message is required"
        });
      }
      
      // Create a new thread
      const thread = await openai.beta.threads.create();
      console.log(`Created test thread: ${thread.id}`);
      
      // Add the message to the thread
      await openai.beta.threads.messages.create(thread.id, {
        role: "user",
        content: message
      });
      
      // Use the SPECIFIC assistant ID that we want to verify
      const StoryFlow_GenreCreator_ID = "asst_Hc5VyWr5mXgNL86DvT1m4cim";
      console.log(`Using explicit genre assistant ID: ${StoryFlow_GenreCreator_ID}`);
      
      // Run the assistant
      const run = await openai.beta.threads.runs.create(thread.id, {
        assistant_id: StoryFlow_GenreCreator_ID
      });
      
      // Wait for completion
      let completedRun;
      let attempts = 0;
      const maxAttempts = 30;
      
      while (attempts < maxAttempts) {
        const runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
        console.log(`Test run status (attempt ${attempts + 1}/${maxAttempts}): ${runStatus.status}`);
        
        if (runStatus.status === "completed") {
          completedRun = runStatus;
          break;
        }
        
        if (["failed", "cancelled", "expired"].includes(runStatus.status)) {
          return res.status(500).json({
            message: `Run failed with status: ${runStatus.status}`
          });
        }
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;
      }
      
      if (!completedRun) {
        return res.status(500).json({
          message: "Run timed out"
        });
      }
      
      // Get the assistant's response
      const messages = await openai.beta.threads.messages.list(thread.id);
      const assistantMessages = messages.data.filter(msg => msg.role === "assistant");
      
      if (assistantMessages.length === 0) {
        return res.status(500).json({
          message: "No response from assistant"
        });
      }
      
      // Extract the response content
      const assistantMessage = assistantMessages[0];
      let responseContent = "";
      
      for (const content of assistantMessage.content) {
        if (content.type === "text") {
          responseContent = content.text.value;
          break;
        }
      }
      
      return res.json({
        success: true,
        threadId: thread.id,
        content: responseContent,
        assistantId: StoryFlow_GenreCreator_ID
      });
      
    } catch (error: any) {
      console.error("Error in test-genre-assistant endpoint:", error);
      return res.status(500).json({
        message: "Error testing assistant",
        details: error.message
      });
    }
  });
  
  // Mount the API router
  app.use("/api", apiRouter);
  
  // Create and return HTTP server
  const httpServer = createServer(app);
  return httpServer;
}