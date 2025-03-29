import express, { type Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import {
  insertUserSchema,
  insertFoundationSchema,
  insertStorySchema,
  insertChapterSchema,
  insertCharacterSchema,
  insertCharacterDetailsSchema,
  insertVersionSchema,
  insertSuggestionSchema,
  insertEnvironmentDetailsSchema,
  insertGenreDetailsSchema,
  insertWorldDetailsSchema
} from "@shared/schema";
import {
  getAISuggestions,
  generateCharacterResponse,
  continueStory,
  analyzeTextSentiment,
  generateInteractiveStoryResponse
} from "./ai";
import { createDetailedCharacter, createGenreDetails, createWorldDetails, createEnvironmentDetails, generateChatSuggestions, getAppropriateAssistant, waitForRunCompletion } from "./assistants";
import OpenAI from "openai";

import { generateSpeech, getAvailableVoices, VoiceOption } from "./tts";
import { generateImage, generateCharacterPortrait, generateCharacterScene, ImageGenerationRequest } from "./image-generation";

// Initialize OpenAI client for dynamic assistant API
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function registerRoutes(app: Express): Promise<Server> {
  const apiRouter = express.Router();
  
  // Auth routes
  apiRouter.post("/auth/login", async (req: Request, res: Response) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ message: "Username and password are required" });
    }
    
    try {
      const user = await storage.getUserByUsername(username);
      
      if (!user || user.password !== password) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      // In a real app, we'd generate a JWT token here
      const { password: _, ...userWithoutPassword } = user;
      
      return res.status(200).json({
        user: userWithoutPassword
      });
    } catch (error) {
      console.error("Login error:", error);
      return res.status(500).json({ message: "Server error" });
    }
  });
  
  apiRouter.post("/auth/register", async (req: Request, res: Response) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const existingUser = await storage.getUserByUsername(userData.username);
      
      if (existingUser) {
        // Just return the existing user instead of an error
        const { password: _, ...userWithoutPassword } = existingUser;
        return res.status(200).json({
          user: userWithoutPassword
        });
      }
      
      const newUser = await storage.createUser(userData);
      const { password: _, ...userWithoutPassword } = newUser;
      
      return res.status(201).json({
        user: userWithoutPassword
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid data", 
          errors: error.errors 
        });
      }
      
      console.error("Registration error:", error);
      return res.status(500).json({ message: "Server error" });
    }
  });
  
  // Foundation routes
  apiRouter.get("/foundations", async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.query.userId as string);
      
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Valid userId is required" });
      }
      
      const foundations = await storage.getFoundations(userId);
      return res.status(200).json(foundations);
    } catch (error) {
      console.error("Error fetching foundations:", error);
      return res.status(500).json({ message: "Server error" });
    }
  });
  
  apiRouter.get("/foundations/:id", async (req: Request, res: Response) => {
    try {
      console.log(`GET foundation by ID: ${req.params.id}, type: ${typeof req.params.id}`);
      
      if (!req.params.id || isNaN(parseInt(req.params.id))) {
        console.error(`Invalid foundation ID format: ${req.params.id}`);
        return res.status(400).json({ message: "Invalid foundation ID format" });
      }
      
      const id = parseInt(req.params.id);
      console.log(`Parsed foundation ID: ${id}, type: ${typeof id}`);
      
      const foundation = await storage.getFoundation(id);
      console.log(`Foundation lookup result:`, foundation ? `Found foundation ${foundation.id}` : 'Not found');
      
      if (!foundation) {
        return res.status(404).json({ message: "Foundation not found" });
      }
      
      return res.status(200).json(foundation);
    } catch (error) {
      console.error("Error fetching foundation:", error);
      return res.status(500).json({ message: "Server error" });
    }
  });
  
  apiRouter.post("/foundations", async (req: Request, res: Response) => {
    try {
      const foundationData = insertFoundationSchema.parse(req.body);
      const newFoundation = await storage.createFoundation(foundationData);
      return res.status(201).json(newFoundation);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid data", 
          errors: error.errors 
        });
      }
      
      console.error("Error creating foundation:", error);
      return res.status(500).json({ message: "Server error" });
    }
  });
  
  apiRouter.put("/foundations/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const foundationData = insertFoundationSchema.partial().parse(req.body);
      
      const updatedFoundation = await storage.updateFoundation(id, foundationData);
      
      if (!updatedFoundation) {
        return res.status(404).json({ message: "Foundation not found" });
      }
      
      return res.status(200).json(updatedFoundation);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid data", 
          errors: error.errors 
        });
      }
      
      console.error("Error updating foundation:", error);
      return res.status(500).json({ message: "Server error" });
    }
  });
  
  apiRouter.delete("/foundations/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const forceDelete = req.query.force === 'true';
      
      console.log(`Attempting to delete foundation ${id}, force=${forceDelete}`);
      console.log('Query parameters:', req.query);
      
      // First, check if this foundation has any stories associated with it
      const storiesForFoundation = await storage.getStoriesByFoundation(id);
      console.log(`Foundation ${id} has ${storiesForFoundation.length} stories associated with it`);
      
      // If there are stories and force is not true, we don't delete the foundation directly
      if (!forceDelete && storiesForFoundation.length > 0) {
        console.log(`Rejecting deletion - stories exist and force=false`);
        return res.status(400).json({ 
          message: "Foundation has stories associated with it", 
          hasStories: true,
          storyCount: storiesForFoundation.length
        });
      }
      
      console.log(`Proceeding with foundation deletion for ID ${id}`);
      
      // Delete associated stories first if force is true
      if (forceDelete && storiesForFoundation.length > 0) {
        console.log(`Force deleting ${storiesForFoundation.length} stories for foundation ${id}`);
        for (const story of storiesForFoundation) {
          await storage.deleteStory(story.id);
        }
      }
      
      // Delete foundation messages
      console.log(`Deleting chat messages for foundation ${id}`);
      await storage.deleteFoundationMessagesByFoundationId(id);
      
      // Now delete the foundation
      const success = await storage.deleteFoundation(id);
      console.log(`Foundation deletion result: ${success ? 'success' : 'failed'}`);
      
      if (!success) {
        return res.status(404).json({ message: "Foundation not found" });
      }
      
      return res.status(204).send();
    } catch (error) {
      console.error("Error deleting foundation:", error);
      return res.status(500).json({ message: "Server error" });
    }
  });
  
  // Genre details routes
  apiRouter.get("/foundations/:foundationId/genre", async (req: Request, res: Response) => {
    try {
      const foundationId = parseInt(req.params.foundationId);
      const genreDetails = await storage.getGenreDetailsByFoundation(foundationId);
      
      if (!genreDetails) {
        return res.status(404).json({ message: "Genre details not found" });
      }
      
      return res.status(200).json(genreDetails);
    } catch (error) {
      console.error("Error fetching genre details:", error);
      return res.status(500).json({ message: "Server error" });
    }
  });
  
  // Environment details routes
  apiRouter.get("/foundations/:foundationId/environment", async (req: Request, res: Response) => {
    try {
      const foundationId = parseInt(req.params.foundationId);
      const environmentDetails = await storage.getEnvironmentDetailsByFoundation(foundationId);
      
      if (!environmentDetails) {
        return res.status(404).json({ message: "Environment details not found" });
      }
      
      return res.status(200).json(environmentDetails);
    } catch (error) {
      console.error("Error fetching environment details:", error);
      return res.status(500).json({ message: "Server error" });
    }
  });
  
  // World details routes
  apiRouter.get("/foundations/:foundationId/world", async (req: Request, res: Response) => {
    try {
      const foundationId = parseInt(req.params.foundationId);
      const worldDetails = await storage.getWorldDetailsByFoundation(foundationId);
      
      if (!worldDetails) {
        return res.status(404).json({ message: "World details not found" });
      }
      
      return res.status(200).json(worldDetails);
    } catch (error) {
      console.error("Error fetching world details:", error);
      return res.status(500).json({ message: "Server error" });
    }
  });
  
  apiRouter.get("/world-details/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const worldDetails = await storage.getWorldDetails(id);
      
      if (!worldDetails) {
        return res.status(404).json({ message: "World details not found" });
      }
      
      return res.status(200).json(worldDetails);
    } catch (error) {
      console.error("Error fetching world details:", error);
      return res.status(500).json({ message: "Server error" });
    }
  });
  
  apiRouter.patch("/world-details/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const updateData = insertWorldDetailsSchema.partial().parse(req.body);
      
      const updatedWorldDetails = await storage.updateWorldDetails(id, updateData);
      
      if (!updatedWorldDetails) {
        return res.status(404).json({ message: "World details not found" });
      }
      
      return res.status(200).json(updatedWorldDetails);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid data", 
          errors: error.errors 
        });
      }
      
      console.error("Error updating world details:", error);
      return res.status(500).json({ message: "Server error" });
    }
  });
  
  // Foundation message routes
  apiRouter.get("/foundations/:foundationId/messages", async (req: Request, res: Response) => {
    try {
      const foundationId = parseInt(req.params.foundationId);
      if (isNaN(foundationId)) {
        return res.status(400).json({ 
          message: "Invalid foundation ID",
          details: "The foundation ID must be a valid number"
        });
      }
      
      const foundation = await storage.getFoundation(foundationId);
      if (!foundation) {
        return res.status(404).json({ 
          message: "Foundation not found",
          details: `No foundation exists with ID ${foundationId}`
        });
      }
      
      try {
        const messages = await storage.getFoundationMessages(foundationId);
        return res.status(200).json(messages);
      } catch (dbError) {
        console.error(`Database error retrieving messages for foundation ${foundationId}:`, dbError);
        return res.status(500).json({ 
          message: "Database error retrieving messages",
          details: dbError instanceof Error ? dbError.message : "Unknown database error"
        });
      }
    } catch (error) {
      console.error("Error getting foundation messages:", error);
      return res.status(500).json({ 
        message: "Server error",
        details: error instanceof Error ? error.message : "An unexpected error occurred"
      });
    }
  });
  
  apiRouter.post("/foundations/:foundationId/messages", async (req: Request, res: Response) => {
    try {
      const foundationId = parseInt(req.params.foundationId);
      if (isNaN(foundationId)) {
        return res.status(400).json({ 
          message: "Invalid foundation ID",
          details: "The foundation ID must be a valid number"
        });
      }
      
      const foundation = await storage.getFoundation(foundationId);
      if (!foundation) {
        return res.status(404).json({ 
          message: "Foundation not found",
          details: `No foundation exists with ID ${foundationId}`
        });
      }
      
      const { role, content } = req.body;
      
      // Validate required fields
      if (!role) {
        return res.status(400).json({ 
          message: "Missing required field", 
          details: "The 'role' field is required"
        });
      }
      
      if (!content) {
        return res.status(400).json({ 
          message: "Missing required field", 
          details: "The 'content' field is required"
        });
      }
      
      if (role !== 'user' && role !== 'assistant') {
        return res.status(400).json({ 
          message: "Invalid role value", 
          details: "Role must be either 'user' or 'assistant'"
        });
      }
      
      // Check if content is excessively large (prevent DB issues)
      if (content.length > 100000) { // 100KB limit
        return res.status(400).json({ 
          message: "Content too large", 
          details: "Message content exceeds the maximum allowed size"
        });
      }
      
      try {
        const message = await storage.createFoundationMessage({
          foundationId,
          role,
          content
        });
        
        return res.status(201).json(message);
      } catch (dbError) {
        console.error(`Database error saving message for foundation ${foundationId}:`, dbError);
        return res.status(500).json({ 
          message: "Database error saving message",
          details: dbError instanceof Error ? dbError.message : "Unknown database error"
        });
      }
    } catch (error) {
      console.error("Error creating foundation message:", error);
      return res.status(500).json({ 
        message: "Server error",
        details: error instanceof Error ? error.message : "An unexpected error occurred" 
      });
    }
  });
  
  // Dynamic foundation assistant API endpoint - this is a newer alternative to the regular foundation messages
  // that automatically detects and switches assistants based on the message content
  apiRouter.post("/foundations/:foundationId/dynamic-assistant", async (req: Request, res: Response) => {
    try {
      const foundationId = parseInt(req.params.foundationId);
      if (isNaN(foundationId)) {
        return res.status(400).json({
          message: "Invalid foundation ID",
          details: "The foundation ID must be a valid number"
        });
      }
      
      // Verify foundation exists
      const foundation = await storage.getFoundation(foundationId);
      if (!foundation) {
        return res.status(404).json({
          message: "Foundation not found",
          details: `No foundation exists with ID ${foundationId}`
        });
      }
      
      const { message, currentAssistantType, threadId } = req.body;
      
      if (!message) {
        return res.status(400).json({
          message: "Message is required",
          details: "The message field cannot be empty"
        });
      }
      
      console.log(`Dynamic assistant request for foundation ${foundationId}: "${message.substring(0, 50)}..."`);
      
      // Determine appropriate assistant based on message content and current state
      const { assistantId, contextType, isAutoTransition } = await getAppropriateAssistant(
        message,
        currentAssistantType || null,
        foundationId
      );
      
      console.log(`Selected assistant: ${contextType} (${assistantId.substring(0, 10)}...)`);
      
      // Process the message with the selected assistant
      let conversationThreadId = threadId;
      
      // Create a new thread if none exists
      if (!conversationThreadId) {
        console.log("No thread ID provided, creating a new thread");
        const thread = await openai.beta.threads.create();
        conversationThreadId = thread.id;
        console.log(`Created new thread: ${conversationThreadId}`);
      }
      
      // If we're auto-transitioning between stages, modify the message
      let currentMessage = message;
      
      // Handle stage transitions with context passing
      if (isAutoTransition) {
        console.log(`Auto-transitioning from ${currentAssistantType} to ${contextType}`);
        
        if (currentAssistantType === 'genre' && contextType === 'environment') {
          // Get the genre details to pass as context to environment stage
          try {
            const genreDetails = await storage.getGenreDetailsByFoundation(foundationId);
            if (genreDetails) {
              // Create a transition message with genre context
              currentMessage = `I'd like to create the first environment for my story. Here's the genre context for reference: 
                Genre: ${genreDetails.mainGenre}
                Description: ${genreDetails.description || ''}
                Themes: ${Array.isArray(genreDetails.themes) ? genreDetails.themes.join(', ') : ''}
                Mood/Tone: ${genreDetails.mood || ''}
                Atmosphere: ${genreDetails.atmosphere || ''}
                
                My initial thoughts for an environment: ${message}`;
                
              console.log("Added genre context to environment transition message");
            }
          } catch (contextError) {
            console.error("Error retrieving genre context for transition:", contextError);
          }
        } else if (currentAssistantType === 'environment' && contextType === 'world') {
          // Get both genre and environment details to pass as context to world stage
          try {
            const genreDetails = await storage.getGenreDetailsByFoundation(foundationId);
            const environmentDetails = await storage.getEnvironmentDetailsByFoundation(foundationId);
            
            if (genreDetails && environmentDetails) {
              // Create a transition message with combined context
              currentMessage = `I'd like to create the overall world that contains my environments. Here's the context:
                Genre: ${genreDetails.mainGenre}
                Environment: ${environmentDetails.environment_name || 'Custom Environment'}
                
                Let's develop the broader world that contains this environment. ${message}`;
                
              console.log("Added genre and environment context to world transition message");
            }
          } catch (contextError) {
            console.error("Error retrieving context for world transition:", contextError);
          }
        }
      }
      
      // Add the user message to the thread
      await openai.beta.threads.messages.create(conversationThreadId, {
        role: "user",
        content: currentMessage
      });
      
      // Run the assistant on the thread
      const run = await openai.beta.threads.runs.create(conversationThreadId, {
        assistant_id: assistantId
      });
      
      // Wait for the run to complete
      await waitForRunCompletion(conversationThreadId, run.id);
      
      // Get the latest messages from the thread
      const messages = await openai.beta.threads.messages.list(conversationThreadId);
      
      // Extract the assistant's response (assuming it's the most recent message)
      // Note: messages are in reverse chronological order
      const assistantMessages = messages.data.filter((msg: { role: string }) => msg.role === "assistant");
      
      if (assistantMessages.length === 0) {
        throw new Error("No assistant response found in thread");
      }
      
      const latestAssistantMessage = assistantMessages[0];
      
      // Extract text content from the message
      let content = "";
      if (latestAssistantMessage.content && latestAssistantMessage.content.length > 0) {
        const textParts = latestAssistantMessage.content.filter((part: { type: string }) => part.type === "text");
        if (textParts.length > 0 && 'text' in textParts[0]) {
          content = textParts[0].text.value;
        }
      }
      
      // Save the response in the database if needed
      try {
        await storage.createFoundationMessage({
          foundationId,
          role: "user",
          content: message
        });
        
        await storage.createFoundationMessage({
          foundationId,
          role: "assistant",
          content: content
        });
      } catch (dbError) {
        console.error("Error saving messages to database:", dbError);
        // Continue despite database error
      }
      
      // Update the foundation's thread ID if it changed
      if (threadId !== conversationThreadId || foundation.threadId !== conversationThreadId) {
        console.log(`Updating foundation ${foundationId} with thread ID: ${conversationThreadId}`);
        await storage.updateFoundation(foundationId, {
          threadId: conversationThreadId
        });
      }
      
      // Generate chat suggestions for the response using the dedicated assistant
      console.log(`Generating AI chat suggestions for the dynamic assistant response`);
      let chatSuggestions: string[] = [];
      try {
        // We have both the user message and assistant response, use the proper suggestions generator
        chatSuggestions = await generateChatSuggestions(message, content);
        console.log(`Generated ${chatSuggestions.length} chat suggestions from the assistant`);
      } catch (suggestionError) {
        console.error("Error generating chat suggestions:", suggestionError);
        // Fallback to empty suggestions array if there's an error
        chatSuggestions = [];
      }
      
      // Return the AI response with context details and thread ID
      return res.status(200).json({
        content,
        contextType,
        assistantId,
        threadId: conversationThreadId,
        suggestions: chatSuggestions,
        isAutoTransition: isAutoTransition || false
      });
    } catch (error: unknown) {
      console.error("Error in dynamic assistant processing:", error);
      return res.status(500).json({
        message: "Error processing message with dynamic assistant",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  
  // Story routes
  apiRouter.get("/stories", async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.query.userId as string);
      const foundationId = req.query.foundationId ? parseInt(req.query.foundationId as string) : undefined;
      
      if (isNaN(userId) && !foundationId) {
        return res.status(400).json({ message: "Valid userId or foundationId is required" });
      }
      
      let stories;
      if (foundationId) {
        stories = await storage.getStoriesByFoundation(foundationId);
      } else {
        stories = await storage.getStoriesByUser(userId);
      }
      
      return res.status(200).json(stories);
    } catch (error) {
      console.error("Error fetching stories:", error);
      return res.status(500).json({ message: "Server error" });
    }
  });
  
  apiRouter.get("/stories/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const story = await storage.getStory(id);
      
      if (!story) {
        return res.status(404).json({ message: "Story not found" });
      }
      
      return res.status(200).json(story);
    } catch (error) {
      console.error("Error fetching story:", error);
      return res.status(500).json({ message: "Server error" });
    }
  });
  
  apiRouter.post("/stories", async (req: Request, res: Response) => {
    try {
      const storyData = insertStorySchema.parse(req.body);
      const newStory = await storage.createStory(storyData);
      return res.status(201).json(newStory);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid data", 
          errors: error.errors 
        });
      }
      
      console.error("Error creating story:", error);
      return res.status(500).json({ message: "Server error" });
    }
  });
  
  apiRouter.put("/stories/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const storyData = insertStorySchema.partial().parse(req.body);
      
      const updatedStory = await storage.updateStory(id, storyData);
      
      if (!updatedStory) {
        return res.status(404).json({ message: "Story not found" });
      }
      
      return res.status(200).json(updatedStory);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid data", 
          errors: error.errors 
        });
      }
      
      console.error("Error updating story:", error);
      return res.status(500).json({ message: "Server error" });
    }
  });
  
  apiRouter.delete("/stories/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteStory(id);
      
      if (!success) {
        return res.status(404).json({ message: "Story not found" });
      }
      
      return res.status(204).send();
    } catch (error) {
      console.error("Error deleting story:", error);
      return res.status(500).json({ message: "Server error" });
    }
  });
  
  // Chapter routes
  apiRouter.get("/stories/:storyId/chapters", async (req: Request, res: Response) => {
    try {
      const storyId = parseInt(req.params.storyId);
      const chapters = await storage.getChapters(storyId);
      return res.status(200).json(chapters);
    } catch (error) {
      console.error("Error fetching chapters:", error);
      return res.status(500).json({ message: "Server error" });
    }
  });
  
  apiRouter.get("/chapters/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const chapter = await storage.getChapter(id);
      
      if (!chapter) {
        return res.status(404).json({ message: "Chapter not found" });
      }
      
      return res.status(200).json(chapter);
    } catch (error) {
      console.error("Error fetching chapter:", error);
      return res.status(500).json({ message: "Server error" });
    }
  });
  
  apiRouter.post("/chapters", async (req: Request, res: Response) => {
    try {
      const chapterData = insertChapterSchema.parse(req.body);
      const newChapter = await storage.createChapter(chapterData);
      return res.status(201).json(newChapter);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid data", 
          errors: error.errors 
        });
      }
      
      console.error("Error creating chapter:", error);
      return res.status(500).json({ message: "Server error" });
    }
  });
  
  apiRouter.put("/chapters/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const chapterData = insertChapterSchema.partial().parse(req.body);
      
      const updatedChapter = await storage.updateChapter(id, chapterData);
      
      if (!updatedChapter) {
        return res.status(404).json({ message: "Chapter not found" });
      }
      
      return res.status(200).json(updatedChapter);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid data", 
          errors: error.errors 
        });
      }
      
      console.error("Error updating chapter:", error);
      return res.status(500).json({ message: "Server error" });
    }
  });
  
  apiRouter.delete("/chapters/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteChapter(id);
      
      if (!success) {
        return res.status(404).json({ message: "Chapter not found" });
      }
      
      return res.status(204).send();
    } catch (error) {
      console.error("Error deleting chapter:", error);
      return res.status(500).json({ message: "Server error" });
    }
  });
  
  // Character routes
  apiRouter.get("/stories/:storyId/characters", async (req: Request, res: Response) => {
    try {
      const storyId = parseInt(req.params.storyId);
      const characters = await storage.getStoryCharacters(storyId);
      return res.status(200).json(characters);
    } catch (error) {
      console.error("Error fetching characters:", error);
      return res.status(500).json({ message: "Server error" });
    }
  });
  
  apiRouter.get("/foundations/:foundationId/characters", async (req: Request, res: Response) => {
    try {
      const foundationId = parseInt(req.params.foundationId);
      const characters = await storage.getCharactersByFoundation(foundationId);
      return res.status(200).json(characters);
    } catch (error) {
      console.error("Error fetching characters by foundation:", error);
      return res.status(500).json({ message: "Server error" });
    }
  });
  
  apiRouter.get("/characters/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const character = await storage.getCharacter(id);
      
      if (!character) {
        return res.status(404).json({ message: "Character not found" });
      }
      
      return res.status(200).json(character);
    } catch (error) {
      console.error("Error fetching character:", error);
      return res.status(500).json({ message: "Server error" });
    }
  });
  
  // Get combined character data from both tables
  apiRouter.get("/character-combined/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const character = await storage.getCharacter(id);
      
      if (!character) {
        return res.status(404).json({ message: "Character not found" });
      }
      
      // Try to find matching character details by name and foundation ID
      const characterDetails = await storage.getCharacterDetailsByNameAndFoundation(
        character.name, 
        character.foundationId
      );
      
      // Return both objects
      return res.status(200).json({
        character,
        characterDetails: characterDetails || null
      });
    } catch (error) {
      console.error("Error getting combined character data:", error);
      return res.status(500).json({ message: "Server error" });
    }
  });
  
  // Character Details routes
  apiRouter.get("/foundations/:foundationId/character-details", async (req: Request, res: Response) => {
    try {
      const foundationId = parseInt(req.params.foundationId);
      const characterDetails = await storage.getCharacterDetailsByFoundation(foundationId);
      return res.status(200).json(characterDetails);
    } catch (error) {
      console.error("Error fetching character details by foundation:", error);
      return res.status(500).json({ message: "Server error" });
    }
  });
  
  apiRouter.get("/character-details/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const characterDetail = await storage.getCharacterDetails(id);
      
      if (!characterDetail) {
        return res.status(404).json({ message: "Character details not found" });
      }
      
      return res.status(200).json(characterDetail);
    } catch (error) {
      console.error("Error fetching character details:", error);
      return res.status(500).json({ message: "Server error" });
    }
  });
  
  apiRouter.post("/character-details", async (req: Request, res: Response) => {
    try {
      const characterData = insertCharacterDetailsSchema.parse(req.body);
      const newCharacter = await storage.createCharacterDetails(characterData);
      return res.status(201).json(newCharacter);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid data", 
          errors: error.errors 
        });
      }
      
      console.error("Error creating character details:", error);
      return res.status(500).json({ message: "Server error" });
    }
  });
  
  apiRouter.patch("/character-details/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const characterData = insertCharacterDetailsSchema.partial().parse(req.body);
      
      const updatedCharacter = await storage.updateCharacterDetails(id, characterData);
      
      if (!updatedCharacter) {
        return res.status(404).json({ message: "Character details not found" });
      }
      
      return res.status(200).json(updatedCharacter);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid data", 
          errors: error.errors 
        });
      }
      
      console.error("Error updating character details:", error);
      return res.status(500).json({ message: "Server error" });
    }
  });
  
  apiRouter.delete("/character-details/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteCharacterDetails(id);
      
      if (!success) {
        return res.status(404).json({ message: "Character details not found" });
      }
      
      return res.status(204).send();
    } catch (error) {
      console.error("Error deleting character details:", error);
      return res.status(500).json({ message: "Server error" });
    }
  });
  
  apiRouter.post("/characters", async (req: Request, res: Response) => {
    try {
      const characterData = insertCharacterSchema.parse(req.body);
      const newCharacter = await storage.createCharacter(characterData);
      return res.status(201).json(newCharacter);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid data", 
          errors: error.errors 
        });
      }
      
      console.error("Error creating character:", error);
      return res.status(500).json({ message: "Server error" });
    }
  });
  
  apiRouter.put("/characters/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const characterData = insertCharacterSchema.partial().parse(req.body);
      
      const updatedCharacter = await storage.updateCharacter(id, characterData);
      
      if (!updatedCharacter) {
        return res.status(404).json({ message: "Character not found" });
      }
      
      return res.status(200).json(updatedCharacter);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid data", 
          errors: error.errors 
        });
      }
      
      console.error("Error updating character:", error);
      return res.status(500).json({ message: "Server error" });
    }
  });
  
  apiRouter.delete("/characters/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteCharacter(id);
      
      if (!success) {
        return res.status(404).json({ message: "Character not found" });
      }
      
      return res.status(204).send();
    } catch (error) {
      console.error("Error deleting character:", error);
      return res.status(500).json({ message: "Server error" });
    }
  });
  
  // Version routes
  apiRouter.get("/chapters/:chapterId/versions", async (req: Request, res: Response) => {
    try {
      const chapterId = parseInt(req.params.chapterId);
      const versions = await storage.getVersions(chapterId);
      return res.status(200).json(versions);
    } catch (error) {
      console.error("Error fetching versions:", error);
      return res.status(500).json({ message: "Server error" });
    }
  });
  
  apiRouter.post("/versions", async (req: Request, res: Response) => {
    try {
      const versionData = insertVersionSchema.parse(req.body);
      const newVersion = await storage.createVersion(versionData);
      return res.status(201).json(newVersion);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid data", 
          errors: error.errors 
        });
      }
      
      console.error("Error creating version:", error);
      return res.status(500).json({ message: "Server error" });
    }
  });
  
  // AI routes
  apiRouter.post("/ai/suggestions", async (req: Request, res: Response) => {
    try {
      const { storyContext, chapterContent, characters } = req.body;
      
      if (!storyContext || !chapterContent) {
        return res.status(400).json({ message: "Story context and chapter content are required" });
      }
      
      const suggestions = await getAISuggestions(storyContext, chapterContent, characters || []);
      return res.status(200).json(suggestions);
    } catch (error) {
      console.error("Error getting AI suggestions:", error);
      return res.status(500).json({ message: "Server error" });
    }
  });
  
  apiRouter.post("/ai/character-response", async (req: Request, res: Response) => {
    try {
      const { characterDescription, traits, situation } = req.body;
      
      if (!characterDescription || !situation) {
        return res.status(400).json({ message: "Character description and situation are required" });
      }
      
      const response = await generateCharacterResponse(
        characterDescription, 
        traits || [], 
        situation
      );
      
      return res.status(200).json({ response });
    } catch (error) {
      console.error("Error generating character response:", error);
      return res.status(500).json({ message: "Server error" });
    }
  });
  
  apiRouter.post("/ai/continue-story", async (req: Request, res: Response) => {
    try {
      const { storyContext, previousContent, characters, continuationPrompt } = req.body;
      
      if (!storyContext || !previousContent) {
        return res.status(400).json({ message: "Story context and previous content are required" });
      }
      
      const continuation = await continueStory(
        storyContext, 
        previousContent, 
        characters || [], 
        continuationPrompt
      );
      
      return res.status(200).json({ continuation });
    } catch (error) {
      console.error("Error continuing story:", error);
      return res.status(500).json({ message: "Server error" });
    }
  });
  
  apiRouter.post("/ai/analyze-text", async (req: Request, res: Response) => {
    try {
      const { text } = req.body;
      
      if (!text) {
        return res.status(400).json({ message: "Text is required" });
      }
      
      const analysis = await analyzeTextSentiment(text);
      return res.status(200).json(analysis);
    } catch (error) {
      console.error("Error analyzing text:", error);
      return res.status(500).json({ message: "Server error" });
    }
  });
  
  apiRouter.post("/ai/interactive-story", async (req: Request, res: Response) => {
    try {
      const { worldContext, characters, messageHistory, userInput } = req.body;
      
      if (!worldContext || !userInput) {
        return res.status(400).json({ message: "World context and user input are required" });
      }
      
      const storyResponse = await generateInteractiveStoryResponse(
        worldContext,
        characters || [],
        messageHistory || [],
        userInput
      );
      
      return res.status(200).json(storyResponse);
    } catch (error) {
      console.error("Error generating interactive story response:", error);
      return res.status(500).json({ message: "Server error" });
    }
  });
  
  apiRouter.post("/ai/detailed-character", async (req: Request, res: Response) => {
    try {
      const { name, role, genre, setting, story, additionalInfo } = req.body;
      
      const detailedCharacter = await createDetailedCharacter({
        name,
        role,
        genre,
        setting,
        story,
        additionalInfo
      });
      
      return res.status(200).json(detailedCharacter);
    } catch (error: any) {
      console.error("Error creating detailed character:", error);
      return res.status(500).json({ 
        message: "Failed to create character with the OpenAI assistant",
        error: error.message || "Unknown error"
      });
    }
  });
  
  // Combined endpoint to create a character in both the characters and character_details tables
  apiRouter.post("/character-creation/combined", async (req: Request, res: Response) => {
    try {
      const { 
        name, 
        role, 
        foundationId, 
        appearance, 
        background,
        personality,
        goals,
        fears,
        relationships,
        skills,
        voice,
        secrets,
        quirks,
        motivations,
        flaws,
        threadId,
        evolutionStage = 1,
        significantEvents = []
      } = req.body;
      
      // First create the character in the original table
      const characterData: any = {
        name,
        role,
        foundationId,
        threadId
      };
      
      // Add optional fields if they exist
      if (appearance) characterData.appearance = appearance;
      if (background) characterData.background = background;
      if (personality) characterData.personality = Array.isArray(personality) ? personality : personality.split(', ');
      if (goals) characterData.goals = Array.isArray(goals) ? goals : goals.split(', ');
      if (fears) characterData.fears = Array.isArray(fears) ? fears : fears.split(', ');
      if (skills) characterData.skills = Array.isArray(skills) ? skills : skills.split(', ');
      if (voice) characterData.voice = voice;
      if (secrets) characterData.secrets = secrets;
      if (quirks) characterData.quirks = Array.isArray(quirks) ? quirks : quirks.split(', ');
      if (motivations) characterData.motivations = Array.isArray(motivations) ? motivations : motivations.split(', ');
      if (flaws) characterData.flaws = Array.isArray(flaws) ? flaws : flaws.split(', ');
      if (evolutionStage) characterData.evolutionStage = evolutionStage;
      if (significantEvents) characterData.significantEvents = significantEvents;
      
      // Create the character in the original table
      const newCharacter = await storage.createCharacter(characterData);
      
      // Now create the character details entry
      const characterDetailsData: any = {
        foundationId,
        character_name: name,
        occupation: role,
        evolutionStage: evolutionStage,
        significantEvents: significantEvents,
        character_type: 'fictional'
      };
      
      // Add any additional fields that are available
      if (appearance) characterDetailsData.appearance = appearance;
      if (background) characterDetailsData.background = background;
      if (personality) characterDetailsData.personality = Array.isArray(personality) ? personality : personality.split(', ');
      if (goals) characterDetailsData.goals = Array.isArray(goals) ? goals : goals.split(', ');
      if (fears) characterDetailsData.fears = Array.isArray(fears) ? fears : fears.split(', ');
      if (relationships) characterDetailsData.relationships = Array.isArray(relationships) ? relationships : relationships.split(', ');
      if (skills) characterDetailsData.skills = Array.isArray(skills) ? skills : skills.split(', ');
      if (voice) characterDetailsData.voice = voice;
      if (secrets) characterDetailsData.secrets = secrets;
      if (quirks) characterDetailsData.quirks = Array.isArray(quirks) ? quirks : quirks.split(', ');
      if (motivations) characterDetailsData.motivations = Array.isArray(motivations) ? motivations : motivations.split(', ');
      if (flaws) characterDetailsData.flaws = Array.isArray(flaws) ? flaws : flaws.split(', ');
      if (threadId) characterDetailsData.threadId = threadId;
      
      try {
        const newCharacterDetails = await storage.createCharacterDetails(characterDetailsData);
        
        // Return both the character and character details
        return res.status(201).json({
          character: newCharacter,
          characterDetails: newCharacterDetails,
          success: true
        });
      } catch (detailsError) {
        console.error("Error creating character details:", detailsError);
        // Even if character details creation fails, we return the character
        // since it was created successfully
        return res.status(201).json({
          character: newCharacter,
          success: true,
          detailsError: "Failed to create character details, but character was created"
        });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid data", 
          errors: error.errors 
        });
      }
      
      console.error("Error creating character with combined approach:", error);
      return res.status(500).json({ message: "Server error" });
    }
  });
  
  apiRouter.post("/ai/genre-details", async (req: Request, res: Response) => {
    try {
      console.log("Genre details request received:", req.body);
      const { 
        userInterests, 
        themes, 
        mood, 
        targetAudience, 
        inspirations, 
        additionalInfo,
        threadId, // New parameter for continuing conversation
        previousMessages, // New parameter for conversation history
        isInitialStage // Flag to indicate if this is the first conversation stage
      } = req.body;
      
      // Log the request details
      console.log("Creating genre with input:", {
        userInterests,
        themes,
        mood,
        targetAudience,
        inspirations,
        additionalInfo,
        threadId: threadId ? `${threadId.substring(0, 10)}...` : undefined, // Log partial thread ID for privacy
        isInitialStage
      });
      
      // Call assistant with all parameters including thread ID if provided
      const genreDetails = await createGenreDetails({
        userInterests,
        themes,
        mood,
        targetAudience,
        inspirations,
        additionalInfo,
        threadId,
        previousMessages
      });
      
      console.log("Genre created successfully:", genreDetails.name);
      
      // Verify we're returning a proper threadId in the response
      if (!genreDetails.threadId) {
        console.warn("Warning: No threadId in the genre details response");
      } else {
        console.log(`Returning threadId: ${genreDetails.threadId.substring(0, 10)}...`);
      }
      
      // Check if this is an informative response or just a question
      // If it's just a question, treat it as an conversation in progress
      const description = genreDetails.description || '';
      const isQuestionOnly = description.includes("?") && description.length < 100;
        
      if (isQuestionOnly) {
        console.log("Detected question-only response, treating as conversation in progress");
        
        // Generate context-aware suggestions based on the question
        const description = (genreDetails.description || '').toLowerCase();
        let contextAwareSuggestions: string[] = [];
        
        // Default catch-all suggestion that lets AI decide
        const surpriseMeSuggestion = "Surprise me! You decide what works best.";
        
        // Check for question patterns and generate appropriate suggestions
        if (description.includes("darker") || description.includes("grittier") || 
            description.includes("poetic") || description.includes("introspective") ||
            description.includes("tone") || description.includes("style")) {
          
          // Questions about tone preference
          if (description.includes("darker") && description.includes("poetic")) {
            contextAwareSuggestions = [
              "I prefer a darker, grittier fantasy tone",
              "I'd like a more poetic, introspective tone",
              "I want a blend of both styles",
              surpriseMeSuggestion
            ];
          } else if (description.includes("tone") || description.includes("style")) {
            contextAwareSuggestions = [
              "I prefer an upbeat, hopeful tone",
              "I'd like something dark and atmospheric",
              "I want a balanced tone with both light and shadow",
              surpriseMeSuggestion
            ];
          }
        } else if (description.includes("magic") || description.includes("system")) {
          // Questions about magic systems
          contextAwareSuggestions = [
            "I want a well-defined, rule-based magic system",
            "I prefer mysterious, unexplained magical elements",
            "I'd like magic to be rare and powerful",
            surpriseMeSuggestion
          ];
        } else if (description.includes("character") || description.includes("protagonist")) {
          // Questions about character types
          contextAwareSuggestions = [
            "I want complex, morally gray characters",
            "I'd like heroic characters with clear moral values",
            "I prefer characters who evolve significantly throughout the story",
            surpriseMeSuggestion
          ];
        } else if (description.includes("world") || description.includes("setting")) {
          // Questions about worldbuilding
          contextAwareSuggestions = [
            "I want a detailed, expansive world with diverse cultures",
            "I prefer a focused setting with depth in specific locations",
            "I'd like a world with unusual geography or physics",
            surpriseMeSuggestion
          ];
        } else if (description.includes("theme") || description.includes("explore")) {
          // Questions about themes
          contextAwareSuggestions = [
            "I'm interested in themes of redemption and personal growth",
            "I want to explore power dynamics and political intrigue",
            "I'd like to focus on relationships and emotional journeys",
            surpriseMeSuggestion
          ];
        } else if (description.includes("author") || description.includes("book") || 
                  description.includes("favorite") || description.includes("similar")) {
          // Questions about influences
          contextAwareSuggestions = [
            "I love authors like Brandon Sanderson and Neil Gaiman",
            "My favorite books include The Lord of the Rings and Dune",
            "I enjoy stories similar to Harry Potter or Percy Jackson",
            surpriseMeSuggestion
          ];
        }
        
        // If we couldn't generate context-specific suggestions, use these defaults
        if (contextAwareSuggestions.length === 0) {
          contextAwareSuggestions = [
            "I love fantasy books like Lord of the Rings",
            "I'm a fan of sci-fi like Dune",
            "My favorite authors are Stephen King and Neil Gaiman",
            "I enjoy books with complex characters and deep worldbuilding"
          ];
        }
        
        // Save partial genre details to database even during conversation
        try {
          // Look up the foundation ID from the request
          const foundationId = parseInt(req.body.foundationId);
          
          if (foundationId && !isNaN(foundationId)) {
            console.log(`Saving partial genre details during conversation for foundation ID: ${foundationId}`);
            
            // Prepare genre data - extract available information even from partial response
            const partialGenreData = {
              // Required fields
              mainGenre: genreDetails.mainGenre || "Custom Genre",
              threadId: genreDetails.threadId,
              
              // Optional fields that might be present in partial responses
              name: genreDetails.name,
              description: genreDetails.description,
              themes: genreDetails.themes,
              mood: genreDetails.mood,
              tone: genreDetails.tone,
              inspirations: genreDetails.inspirations,
              // Any other fields that might be present
            };
            
            // First, check if genre details already exist for this foundation
            const existingDetails = await storage.getGenreDetailsByFoundation(foundationId);
            
            if (existingDetails) {
              // Update existing genre details
              console.log(`Updating existing genre details ID: ${existingDetails.id} during conversation`);
              await storage.updateGenreDetails(existingDetails.id, {
                ...partialGenreData,
                foundationId: foundationId
              });
            } else {
              // Create new genre details
              console.log(`Creating new genre details for foundation ID: ${foundationId} during conversation`);
              await storage.createGenreDetails({
                ...partialGenreData,
                foundationId: foundationId
              });
            }
          } else {
            console.log(`Cannot save partial genre details: Invalid or missing foundation ID: ${req.body.foundationId}`);
          }
        } catch (error) {
          console.error('Error saving partial genre details to database during conversation:', error);
          // Continue despite the error - don't block the response
        }
        
        return res.status(202).json({
          conversationInProgress: true,
          question: genreDetails.description,
          threadId: genreDetails.threadId,
          needsMoreInput: true,
          suggestions: contextAwareSuggestions
        });
      }
      
      return res.status(200).json(genreDetails);
    } catch (error: any) {
      console.error("Error creating genre details:", error);
      
      // Check if this is a conversation-in-progress error
      if (error.message && error.message.startsWith("CONVERSATION_IN_PROGRESS:")) {
        // Extract the question from the error message
        const question = error.message.replace("CONVERSATION_IN_PROGRESS: ", "");
        console.log("Conversation in progress, extracted question:", question);
        
        // Extract threadId from the error object if possible
        let threadId = req.body.threadId || null;
        
        // The error object might contain a threadId directly
        if (error.threadId) {
          threadId = error.threadId;
          console.log(`Found threadId in error object: ${threadId.substring(0, 10)}...`);
        }
        
        console.log(`Using threadId for conversation response: ${threadId ? threadId.substring(0, 10) + '...' : 'null'}`);
        
        // Check for conversation stage and message count
        // This helps identify when to transition from genre to world-building
        const messageCount = req.body.previousMessages ? req.body.previousMessages.length : 0;
        
        // Lower the threshold from 10 to 6 exchanges (3 user messages + 3 AI responses)
        const isLateStageConversation = messageCount >= 6;
        
        // Make the world-building detection more robust by adding more keywords
        // Check if the question is about world-building (which suggests genre might be complete)
        const worldBuildingKeywords = [
          "environment", "setting", "historical period", "world", "geography",
          "civilization", "culture", "politics", "society", "location", "map",
          "kingdom", "realm", "nation", "city", "town", "landscape", "region",
          "terrain", "climate", "history", "technology", "magic system", "religion"
        ];
        const isWorldBuildingQuestion = worldBuildingKeywords.some(keyword => 
          question.toLowerCase().includes(keyword.toLowerCase())
        );
        
        console.log(`Genre conversation check: messageCount=${messageCount}, isLateStage=${isLateStageConversation}, isWorldBuildingQuestion=${isWorldBuildingQuestion}`);
        
        // Make the world-building transition more lenient - either:
        // 1. We're in a late stage conversation AND the AI is asking about world-building, OR
        // 2. We're in a very late stage conversation (6+ messages) with a substantial response
        if ((isLateStageConversation && isWorldBuildingQuestion && question.length > 100) || 
            (messageCount >= 6 && question.length > 150)) {
          console.log("Detected transition from genre to world-building stage!");
          
          // Extract a genre name from the conversation history or input
          const genreKeywords = {
            "fantasy": "Fantasy Fiction",
            "sci-fi": "Science Fiction", 
            "science fiction": "Science Fiction",
            "mystery": "Mystery",
            "thriller": "Thriller",
            "horror": "Horror",
            "romance": "Romance",
            "historical": "Historical Fiction",
            "adventure": "Adventure",
            "dystopian": "Dystopian Fiction",
            "cyberpunk": "Cyberpunk",
            "steampunk": "Steampunk"
          };
          
          // Try to find a genre in the user's interests first
          let genreName = "Custom Genre";
          const userInterests = req.body.userInterests || "";
          
          for (const [keyword, name] of Object.entries(genreKeywords)) {
            if (userInterests.toLowerCase().includes(keyword)) {
              genreName = name;
              break;
            }
          }
          
          // If not found in user interests, try the question itself
          if (genreName === "Custom Genre") {
            for (const [keyword, name] of Object.entries(genreKeywords)) {
              if (question.toLowerCase().includes(keyword)) {
                genreName = name;
                break;
              }
            }
          }
          
          // Declare the variable here at a broader scope to make it available outside the try block
          let existingGenreDetails;
              
          try {
            // Look up the foundation ID from the request
            const foundationId = parseInt(req.body.foundationId);
            
            if (foundationId && !isNaN(foundationId)) {
              console.log(`Transitioning to world-building stage for foundation ID: ${foundationId}`);
              
              // First, check if genre details already exist for this foundation
              existingGenreDetails = await storage.getGenreDetailsByFoundation(foundationId);
              
              if (existingGenreDetails) {
                // If we have existing details, preserve them instead of overwriting with defaults
                console.log(`Found existing genre details ID: ${existingGenreDetails.id}, preserving data`);
                
                // Only update the necessary fields to mark the genre stage as complete
                // while PRESERVING all existing fields
                const updates = {
                  // If mainGenre isn't already set, use the detected one
                  mainGenre: existingGenreDetails.mainGenre || genreName,
                  
                  // Keep the original name if present
                  name: existingGenreDetails.name || genreName,
                  
                  // Keep the existing thread ID
                  threadId: existingGenreDetails.threadId || threadId,
                  
                  // Ensure we have some minimal data if fields are completely empty
                  description: existingGenreDetails.description || 
                    `Your ${(existingGenreDetails.mainGenre || genreName).toLowerCase()} genre has been defined based on your preferences.`,
                  
                  // Mark genre as complete by adding a "completed" field
                  genreComplete: true
                };
                
                console.log(`Updating existing genre details with partial fields to preserve data`);
                await storage.updateGenreDetails(existingGenreDetails.id, {
                  ...updates,
                  foundationId: foundationId
                });
              } else {
                // No existing genre details, create with defaults
                console.log(`No existing genre details found, creating new entry with defaults`);
                
                // Create a complete genre details object with defaults
                const genreData = {
                  mainGenre: genreName, // Required field
                  name: genreName,
                  description: `Your custom ${genreName.toLowerCase()} genre has been defined based on your preferences.`,
                  themes: ["Identity", "Growth", "Challenge"],
                  tropes: ["Hero's Journey", "Coming of Age"],
                  commonSettings: ["Detailed World", "Rich Environment"],
                  typicalCharacters: ["Protagonist", "Mentor", "Antagonist"],
                  plotStructures: ["Three-Act Structure", "Hero's Journey"],
                  styleGuide: {
                    tone: "Balanced",
                    pacing: "Medium",
                    perspective: "Third person",
                    dialogueStyle: "Natural"
                  },
                  threadId: threadId,
                  genreComplete: true
                };
                
                // Create new genre details
                console.log(`Creating new genre details for foundation ID: ${foundationId}`);
                await storage.createGenreDetails({
                  ...genreData,
                  foundationId: foundationId
                });
              }
            } else {
              console.log(`Cannot save genre details: Invalid or missing foundation ID: ${req.body.foundationId}`);
            }
          } catch (error) {
            console.error('Error saving genre details to database:', error);
            // Continue despite the error - don't block the response
          }
          
          // Return a response that completes the genre stage and includes the world-building question
          // If we have existing genre details, use them in the response
          if (existingGenreDetails) {
            // Return the existing details plus the world-building question
            return res.json({
              ...existingGenreDetails,
              // Make sure required fields are present
              mainGenre: existingGenreDetails.mainGenre || genreName,
              name: existingGenreDetails.name || genreName,
              // Add the world-building question and suggestions
              question: question,
              // We're in the midst of genre creation, so we use a default welcome message from the AI instead
              suggestions: ["Surprise me! You decide what works best."],
              threadId: existingGenreDetails.threadId || threadId
            });
          } else {
            // No existing details, use default values
            return res.json({
              mainGenre: genreName, // Required field
              name: genreName,
              description: `Your custom ${genreName.toLowerCase()} genre has been defined based on your preferences.`,
              themes: ["Identity", "Growth", "Challenge"],
              tropes: ["Hero's Journey", "Coming of Age"],
              commonSettings: ["Detailed World", "Rich Environment"],
              typicalCharacters: ["Protagonist", "Mentor", "Antagonist"],
              question: question, // Include the full question about world-building
              suggestions: ["Surprise me! You decide what works best."],
              threadId
            });
          }
        }
        
        // Set default suggestion
        // In the future this will be replaced with AI-generated suggestions from the chat suggestions assistant
        let contextAwareSuggestions = ["Surprise me! You decide what works best."];
        
        // Default catch-all suggestion that lets AI decide
        const surpriseMeSuggestion = "Surprise me! You decide what works best.";
        
        // If our extraction didn't yield enough suggestions, fall back to context-based category matching
        if (contextAwareSuggestions.length <= 1) {
          // Generate context-aware suggestions based on the question content
          const description = question.toLowerCase();
          contextAwareSuggestions = [];
          
          // Check for question patterns and generate appropriate suggestions
          if (description.includes("darker") || description.includes("grittier") || 
              description.includes("poetic") || description.includes("introspective") ||
              description.includes("tone") || description.includes("style")) {
            
            // Questions about tone preference
            if (description.includes("darker") && description.includes("poetic")) {
              contextAwareSuggestions = [
                "I prefer a darker, grittier fantasy tone",
                "I'd like a more poetic, introspective tone",
                "I want a blend of both styles",
                surpriseMeSuggestion
              ];
            } else if (description.includes("tone") || description.includes("style")) {
              contextAwareSuggestions = [
                "I prefer an upbeat, hopeful tone",
                "I'd like something dark and atmospheric",
                "I want a balanced tone with both light and shadow",
                surpriseMeSuggestion
              ];
            }
          } else if (description.includes("magic") || description.includes("system")) {
            // Questions about magic systems
            contextAwareSuggestions = [
              "I want a well-defined, rule-based magic system",
              "I prefer mysterious, unexplained magical elements",
              "I'd like magic to be rare and powerful",
              surpriseMeSuggestion
            ];
          } else if (description.includes("character") || description.includes("protagonist")) {
            // Questions about character types
            contextAwareSuggestions = [
              "I want complex, morally gray characters",
              "I'd like heroic characters with clear moral values",
              "I prefer characters who evolve significantly throughout the story",
              surpriseMeSuggestion
            ];
          } else if (description.includes("world") || description.includes("setting")) {
            // Questions about worldbuilding
            contextAwareSuggestions = [
              "I want a detailed, expansive world with diverse cultures",
              "I prefer a focused setting with depth in specific locations",
              "I'd like a world with unusual geography or physics",
              surpriseMeSuggestion
            ];
          } else if (description.includes("theme") || description.includes("explore")) {
            // Questions about themes
            contextAwareSuggestions = [
              "I'm interested in themes of redemption and personal growth",
              "I want to explore power dynamics and political intrigue",
              "I'd like to focus on relationships and emotional journeys",
              surpriseMeSuggestion
            ];
          } else if (description.includes("author") || description.includes("book") || 
                    description.includes("favorite") || description.includes("similar")) {
            // Questions about influences
            contextAwareSuggestions = [
              "I love authors like Brandon Sanderson and Neil Gaiman",
              "My favorite books include The Lord of the Rings and Dune",
              "I enjoy stories similar to Harry Potter or Percy Jackson",
              surpriseMeSuggestion
            ];
          }
          
          // If we couldn't generate context-specific suggestions, use these defaults
          if (contextAwareSuggestions.length === 0) {
            contextAwareSuggestions = [
              "I like fantasy books with dragons and magic",
              "I want something like Harry Potter or Lord of the Rings",
              "I prefer dark and gritty fantasy stories",
              "I enjoy stories with complex political intrigue"
            ];
          }
        } // End of contextAwareSuggestions.length <= 1 block
        
        // Save partial genre details to database even during conversation-in-progress
        try {
          // Look up the foundation ID from the request
          const foundationId = parseInt(req.body.foundationId);
          
          if (foundationId && !isNaN(foundationId)) {
            console.log(`Saving partial genre details during CONVERSATION_IN_PROGRESS for foundation ID: ${foundationId}`);
            
            // Extract genre name from the request or conversation
            let genreName = "Custom Genre";
            const userInterests = req.body.userInterests || "";
            
            // Check for genre keywords in the user interests
            const genreKeywords = {
              "fantasy": "Fantasy Fiction",
              "sci-fi": "Science Fiction", 
              "science fiction": "Science Fiction",
              "mystery": "Mystery",
              "thriller": "Thriller",
              "horror": "Horror",
              "romance": "Romance",
              "historical": "Historical Fiction",
              "adventure": "Adventure"
            };
            
            for (const [keyword, name] of Object.entries(genreKeywords)) {
              if (userInterests.toLowerCase().includes(keyword)) {
                genreName = name;
                break;
              }
            }
            
            // Prepare minimal genre data with at least the required fields
            const partialGenreData = {
              // Required fields
              mainGenre: genreName,
              threadId: threadId || `thread-${Date.now()}`,
              
              // Optional fields with placeholder values
              name: genreName,
              description: question, // Use the current question as partial description
            };
            
            // First, check if genre details already exist for this foundation
            const existingDetails = await storage.getGenreDetailsByFoundation(foundationId);
            
            if (existingDetails) {
              // Update existing genre details
              console.log(`Updating existing genre details ID: ${existingDetails.id} during CONVERSATION_IN_PROGRESS`);
              await storage.updateGenreDetails(existingDetails.id, {
                ...partialGenreData,
                foundationId: foundationId
              });
            } else {
              // Create new genre details
              console.log(`Creating new genre details for foundation ID: ${foundationId} during CONVERSATION_IN_PROGRESS`);
              await storage.createGenreDetails({
                ...partialGenreData,
                foundationId: foundationId
              });
            }
          } else {
            console.log(`Cannot save partial genre details: Invalid or missing foundation ID: ${req.body.foundationId}`);
          }
        } catch (error) {
          console.error('Error saving partial genre details to database during CONVERSATION_IN_PROGRESS:', error);
          // Continue despite the error - don't block the response
        }
        
        // Return a special response for the frontend to handle
        return res.status(202).json({
          conversationInProgress: true,
          question: question,
          threadId: threadId,
          needsMoreInput: true,
          suggestions: contextAwareSuggestions
        });
      }
      
      // Otherwise return a regular error
      return res.status(500).json({ 
        message: "Failed to create genre details with the OpenAI assistant",
        error: error.message || "Unknown error"
      });
    }
  });
  
  // Environment details API endpoint - comes after genre and before world details
  apiRouter.post("/ai/environment-details", async (req: Request, res: Response) => {
    try {
      console.log("Environment details request received:", req.body);
      const { 
        genreContext,    // Pass the genre context from the previous stage
        worldContext,    // Optional - if world details were created first
        name,            // Name of the specific location
        locationType,    // Type of location (city, forest, castle, etc.)
        purpose,         // Purpose of this location in the story
        atmosphere,      // The mood or atmosphere of the location
        inhabitants,     // Who lives there or frequents the location  
        dangers,         // Potential dangers or threats
        secrets,         // Hidden aspects or secrets of the location
        additionalInfo,  // Any additional details
        threadId,        // For continuing conversation
        previousMessages // For conversation history
      } = req.body;
      
      // Log the request details
      console.log("Creating environment with input:", {
        genreContext: genreContext ? genreContext.substring(0, 50) + "..." : undefined,
        worldContext: worldContext ? worldContext.substring(0, 50) + "..." : undefined,
        name,
        locationType,
        purpose,
        atmosphere,
        inhabitants,
        dangers,
        secrets,
        additionalInfo,
        threadId: threadId ? `${threadId.substring(0, 10)}...` : undefined // Log partial thread ID for privacy
      });
      
      // Call the Environment Generator assistant with all parameters
      const environmentDetails = await createEnvironmentDetails({
        worldContext: genreContext, // Initially using genre context as world context
        name,
        locationType,
        purpose,
        atmosphere,
        inhabitants,
        dangers,
        secrets,
        additionalInfo,
        threadId,
        previousMessages
      });
      
      console.log("Environment created successfully:", environmentDetails.name);
      
      try {
        // Save detailed environment data to the database
        const foundationId = parseInt(req.body.foundationId);
        
        if (foundationId && !isNaN(foundationId)) {
          console.log(`Saving environment details for foundation ID: ${foundationId}`);
          
          // Check if environment details already exist for this foundation
          const existingDetails = await storage.getEnvironmentDetailsByFoundation(foundationId);
          
          // Prepare the data to save - map from assistant response to database schema
          const environmentData = {
            environment_name: environmentDetails.name || 'Custom Environment',
            narrative_significance: environmentDetails.worldContext || '',
            geography: JSON.stringify(environmentDetails.physicalAttributes) || '',
            architecture: JSON.stringify(environmentDetails.structuralFeatures) || '',
            climate_weather: environmentDetails.physicalAttributes?.climate || '',
            sensory_atmosphere: JSON.stringify(environmentDetails.sensoryDetails) || '',
            cultural_influence: JSON.stringify(environmentDetails.culture) || '',
            societal_norms: environmentDetails.culture?.attitudes || '',
            historical_relevance: JSON.stringify(environmentDetails.history) || '',
            economic_significance: '',
            speculative_features: '',
            associated_characters_factions: JSON.stringify(environmentDetails.inhabitants) || '',
            inspirations_references: '',
            // Link to related genre/world details (if applicable)
            // These will be set later when world details are created
            threadId: environmentDetails.threadId
          };
          
          if (existingDetails) {
            // Update existing environment details
            console.log(`Updating existing environment details ID: ${existingDetails.id}`);
            await storage.updateEnvironmentDetails(existingDetails.id, {
              ...environmentData,
              foundationId
            });
          } else {
            // Create new environment details
            console.log(`Creating new environment details for foundation ID: ${foundationId}`);
            await storage.createEnvironmentDetails({
              ...environmentData,
              foundationId
            });
          }
        } else {
          console.log(`Cannot save environment details: Invalid foundation ID: ${req.body.foundationId}`);
        }
      } catch (saveError) {
        console.error('Error saving environment details to database:', saveError);
        // Continue despite the error - don't block the response
      }
      
      return res.status(200).json(environmentDetails);
    } catch (error: any) {
      console.error("Error creating environment details:", error);
      
      // Check if this is a conversation in progress
      if (error.message && error.message.startsWith("CONVERSATION_IN_PROGRESS:")) {
        // Extract the response from the error message
        const response = error.message.replace("CONVERSATION_IN_PROGRESS: ", "");
        return res.status(202).json({
          status: "conversation_in_progress",
          message: response,
          threadId: req.body.threadId
        });
      }
      
      return res.status(500).json({
        message: "Failed to create environment details",
        error: error.message
      });
    }
  });

  // World details API endpoint
  apiRouter.post("/ai/world-details", async (req: Request, res: Response) => {
    try {
      console.log("World details request received:", req.body);
      const { 
        genreContext,      // Pass the genre context from the previous stage
        environmentContext, // Pass environment context from environments stage
        setting, 
        timeframe, 
        environmentType, 
        culture, 
        technology, 
        conflicts, 
        additionalInfo,
        threadId,          // For continuing conversation
        previousMessages   // For conversation history
      } = req.body;
      
      // Log the request details
      console.log("Creating world with input:", {
        genreContext: genreContext ? genreContext.substring(0, 50) + "..." : undefined,
        environmentContext: environmentContext ? environmentContext.substring(0, 50) + "..." : undefined,
        setting,
        timeframe,
        environmentType,
        culture,
        technology,
        conflicts,
        additionalInfo,
        threadId: threadId ? `${threadId.substring(0, 10)}...` : undefined // Log partial thread ID for privacy
      });
      
      // Call the World Builder assistant with all parameters
      const worldDetails = await createWorldDetails({
        genreContext,
        setting,
        timeframe,
        environmentType,
        culture,
        technology,
        conflicts,
        additionalInfo,
        threadId,
        previousMessages
      });
      
      console.log("World created successfully:", worldDetails.name);
      
      try {
        // Save detailed world data to the database
        const foundationId = parseInt(req.body.foundationId);
        
        if (foundationId && !isNaN(foundationId)) {
          console.log(`Saving world details for foundation ID: ${foundationId}`);
          
          // Check if world details already exist for this foundation
          const existingDetails = await storage.getWorldDetailsByFoundation(foundationId);
          
          // Prepare the data to save - normalize empty arrays
          const worldData = {
            // Required field for the new world_details table
            world_name: worldDetails.name || 'Custom World',
            // New fields for the world_details table
            narrative_context: '',
            global_geography_topography: '',
            regions_territories: '',
            boundaries_borders: '',
            climate_environmental_zones: '',
            environment_placements_distances: '',
            resources_economic_geography: '',
            historical_cultural_geography: '',
            speculative_supernatural_geography: '',
            map_generation_details: '',
            inspirations_references: '',
            // Legacy fields maintained for compatibility
            description: worldDetails.description || '',
            era: worldDetails.era || '',
            geography: worldDetails.geography || [],
            locations: worldDetails.locations || [],
            culture: worldDetails.culture || {},
            politics: worldDetails.politics || {},
            economy: worldDetails.economy || {},
            technology: worldDetails.technology || {},
            conflicts: worldDetails.conflicts || [],
            history: worldDetails.history || {},
            magicSystem: worldDetails.magicSystem,
            threadId: worldDetails.threadId
          };
          
          if (existingDetails) {
            // Update existing world details
            console.log(`Updating existing world details ID: ${existingDetails.id}`);
            await storage.updateWorldDetails(existingDetails.id, {
              ...worldData,
              foundationId
            });
          } else {
            // Create new world details
            console.log(`Creating new world details for foundation ID: ${foundationId}`);
            await storage.createWorldDetails({
              ...worldData,
              foundationId
            });
          }
        } else {
          console.log(`Cannot save world details: Invalid foundation ID: ${req.body.foundationId}`);
        }
      } catch (saveError) {
        console.error('Error saving world details to database:', saveError);
        // Continue despite the error - don't block the response
      }
      
      return res.status(200).json(worldDetails);
    } catch (error: any) {
      console.error("Error creating world details:", error);
      
      // Check if this is a conversation-in-progress error
      if (error.message && error.message.startsWith("CONVERSATION_IN_PROGRESS:")) {
        // Extract the question from the error message
        const question = error.message.replace("CONVERSATION_IN_PROGRESS: ", "");
        
        // Default suggestion until fully integrated with chat suggestions assistant
        const contextAwareSuggestions = ["Surprise me! You decide what works best."];
        
        // Return a special response for the frontend to handle
        return res.status(202).json({
          conversationInProgress: true,
          question: question,
          threadId: req.body.threadId || null,
          needsMoreInput: true,
          suggestions: contextAwareSuggestions
        });
      }
      
      // Otherwise return a regular error
      return res.status(500).json({ 
        message: "Failed to create world details with the OpenAI assistant",
        error: error.message || "Unknown error"
      });
    }
  });
  
  // TTS routes
  apiRouter.get("/tts/voices", async (_req: Request, res: Response) => {
    try {
      const voices = getAvailableVoices();
      return res.status(200).json(voices);
    } catch (error) {
      console.error("Error getting available voices:", error);
      return res.status(500).json({ message: "Failed to retrieve voices" });
    }
  });
  
  apiRouter.post("/tts/generate", async (req: Request, res: Response) => {
    try {
      console.log("TTS Generate request received");
      const { text, voiceId, provider } = req.body;
      
      console.log(`TTS Request params: voice=${voiceId}, provider=${provider}, text length=${text?.length || 0}`);
      
      if (!text) {
        console.log("TTS Error: No text provided");
        return res.status(400).json({ message: "Text is required" });
      }
      
      if (!voiceId || !provider) {
        console.log(`TTS Error: Missing parameters - voiceId=${!!voiceId}, provider=${!!provider}`);
        return res.status(400).json({ message: "Voice ID and provider are required" });
      }
      
      // Find the voice option
      const voices = getAvailableVoices();
      console.log(`TTS: Found ${voices.length} available voices`);
      
      const voiceOption = voices.find(v => v.id === voiceId && v.provider === provider);
      
      if (!voiceOption) {
        console.log(`TTS Error: Voice not found - voiceId=${voiceId}, provider=${provider}`);
        return res.status(404).json({ message: "Voice not found" });
      }
      
      console.log(`TTS: Selected voice "${voiceOption.name}" (${voiceOption.provider}), generating speech...`);
      
      try {
        const audioDataUrl = await generateSpeech(text, voiceOption);
        console.log(`TTS: Speech generated successfully, data URL length: ${audioDataUrl.length}`);
        return res.status(200).json({ audio: audioDataUrl });
      } catch (speechError: any) {
        console.error("TTS: Specific error during speech generation:", speechError);
        return res.status(500).json({ 
          message: "Speech generation failed", 
          error: speechError.message || "Unknown error" 
        });
      }
    } catch (error: any) {
      console.error("TTS: Error in speech generation route:", error);
      return res.status(500).json({ 
        message: "Failed to generate speech",
        error: error.message || "Unknown error"
      });
    }
  });
  
  // Image generation routes
  apiRouter.post("/images/generate", async (req: Request, res: Response) => {
    try {
      const { prompt, style, aspectRatio, negativePrompt } = req.body as ImageGenerationRequest;
      
      if (!prompt) {
        return res.status(400).json({ message: "Image prompt is required" });
      }
      
      console.log(`Image generation: Generating image with prompt "${prompt.substring(0, 100)}..."`);
      
      const imageUrl = await generateImage({
        prompt,
        style,
        aspectRatio,
        negativePrompt
      });
      
      return res.status(200).json({ imageUrl });
    } catch (error: any) {
      console.error("Error generating image:", error);
      return res.status(500).json({ 
        message: "Failed to generate image",
        error: error.message || "Unknown error"
      });
    }
  });
  
  apiRouter.post("/images/character-portrait", async (req: Request, res: Response) => {
    try {
      const { name, appearance, gender, age, hairDetails, eyeDetails } = req.body;
      
      if (!name) {
        return res.status(400).json({ message: "Character name is required" });
      }
      
      console.log(`Image generation: Creating portrait for character "${name}"`);
      
      const imageUrl = await generateCharacterPortrait({
        name,
        appearance,
        gender,
        age,
        hairDetails,
        eyeDetails
      });
      
      return res.status(200).json({ imageUrl });
    } catch (error: any) {
      console.error("Error generating character portrait:", error);
      return res.status(500).json({ 
        message: "Failed to generate character portrait",
        error: error.message || "Unknown error"
      });
    }
  });
  
  apiRouter.post("/images/character-scene", async (req: Request, res: Response) => {
    try {
      const { name, appearance, typicalAttire, sceneDescription } = req.body;
      
      if (!name) {
        return res.status(400).json({ message: "Character name is required" });
      }
      
      console.log(`Image generation: Creating scene for character "${name}"`);
      
      const imageUrl = await generateCharacterScene({
        name,
        appearance,
        typicalAttire
      }, sceneDescription);
      
      return res.status(200).json({ imageUrl });
    } catch (error: any) {
      console.error("Error generating character scene:", error);
      return res.status(500).json({ 
        message: "Failed to generate character scene",
        error: error.message || "Unknown error"
      });
    }
  });
  
  apiRouter.post("/ai/chat-suggestions", async (req: Request, res: Response) => {
    try {
      const { userMessage, assistantReply } = req.body;
      
      // Special case - allow empty userMessage for initial welcome message with genre selection
      const isGenreSelectionTrigger = assistantReply && assistantReply.includes("What type of genre would you like to explore for your story world?");
      
      // For all other cases, require both parameters
      if ((!userMessage && !isGenreSelectionTrigger) || !assistantReply) {
        return res.status(400).json({ 
          message: "Both userMessage and assistantReply are required" 
        });
      }
      
      console.log(`Chat suggestions: Generating for conversation`);
      
      const suggestions = await generateChatSuggestions(
        userMessage,
        assistantReply
      );
      
      return res.status(200).json({ suggestions });
    } catch (error: any) {
      console.error("Error generating chat suggestions:", error);
      return res.status(500).json({ 
        message: "Failed to generate chat suggestions",
        error: error.message || "Unknown error"
      });
    }
  });
  
  // Use the router
  app.use("/api", apiRouter);
  
  const httpServer = createServer(app);
  return httpServer;
}
