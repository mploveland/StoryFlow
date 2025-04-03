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

import { 
  generateSpeech, 
  getAvailableVoices, 
  VoiceOption, 
  generateElevenLabsSpeech, 
  generateOpenAISpeech 
} from "./tts";
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
      let isNewThread = false;
      
      // Create a new thread if none exists
      if (!conversationThreadId) {
        console.log("No thread ID provided, creating a new thread");
        const thread = await openai.beta.threads.create();
        conversationThreadId = thread.id;
        isNewThread = true;
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
              // Create a transition message with more comprehensive genre context
              // Include all available structured data fields
              let genreContext = `I'd like to create the first environment for my story. Here's the detailed genre context:`;
              
              // Core genre information
              genreContext += `\nGenre: ${genreDetails.mainGenre}`;
              if (genreDetails.genreRationale) genreContext += `\nGenre Rationale: ${genreDetails.genreRationale}`;
              if (genreDetails.audienceExpectations) genreContext += `\nAudience Expectations: ${genreDetails.audienceExpectations}`;
              
              // Subgenre details if available
              if (genreDetails.subgenres) genreContext += `\nSubgenres: ${genreDetails.subgenres}`;
              if (genreDetails.subgenreRationale) genreContext += `\nSubgenre Rationale: ${genreDetails.subgenreRationale}`;
              
              // Mood and tone
              if (genreDetails.tone) genreContext += `\nTone: ${genreDetails.tone}`;
              if (genreDetails.mood) genreContext += `\nMood: ${genreDetails.mood}`;
              if (genreDetails.emotionalImpact) genreContext += `\nEmotional Impact: ${genreDetails.emotionalImpact}`;
              
              // Setting elements
              if (genreDetails.timePeriod) genreContext += `\nTime Period: ${genreDetails.timePeriod}`;
              if (genreDetails.physicalEnvironment) genreContext += `\nPhysical Environment: ${genreDetails.physicalEnvironment}`;
              
              // Tropes and speculative elements
              if (genreDetails.keyTropes) genreContext += `\nKey Tropes: ${genreDetails.keyTropes}`;
              if (genreDetails.speculativeElements) genreContext += `\nSpeculative Elements: ${genreDetails.speculativeElements}`;
              
              // Note: Themes field has been removed from schema
              
              // Add generic description if specific fields aren't available
              if (genreDetails.description) genreContext += `\nDescription: ${genreDetails.description}`;
              
              // Add user's initial environment thoughts
              genreContext += `\n\nMy initial thoughts for an environment: ${message}`;
                
              // Use the enhanced context message
              currentMessage = genreContext;
              console.log("Added comprehensive genre context to environment transition message");
            }
          } catch (contextError) {
            console.error("Error retrieving genre context for transition:", contextError);
          }
        } else if (currentAssistantType === 'environment' && contextType === 'world') {
          // Get both genre and environment details to pass as context to world stage
          try {
            const genreDetails = await storage.getGenreDetailsByFoundation(foundationId);
            
            // Get all environment details for this foundation - may have multiple environments
            const environmentDetails = await storage.getEnvironmentDetailsByFoundation(foundationId);
            
            if (genreDetails && environmentDetails) {
              // Create a detailed transition message with complete context for the world builder
              currentMessage = `Welcome to the World Builder stage!
In this phase, we'll design the broader world where your narratives unfold—drawing from the genre and environment details you've already established. The World Builder will place your environments into meaningful locations within the world, while also laying a rich, interconnected foundation for future settings. By the end, you'll have enough world detail to generate a map and set the stage for immersive storytelling.

Here's the context from previous stages:
Genre: ${genreDetails.mainGenre}
Environment: ${environmentDetails.environment_name || 'Custom Environment'}

To begin, do you have an existing map in mind for reference—or should I start by building around the environments we've already established? ${message}`;
                
              console.log("Added comprehensive genre and environment context to world transition message");
              
              // Update the foundation to mark the new stage
              await storage.updateFoundation(foundationId, {
                currentStage: 'world'
              });
            }
          } catch (contextError) {
            console.error("Error retrieving context for world transition:", contextError);
          }
        }
      }
      
      // If this is a new thread but we're working with an existing foundation,
      // we need to load the previous conversation history to initialize the thread
      if (isNewThread && foundation.threadId === null && foundationId) {
        try {
          console.log(`Initializing new thread with previous conversation for foundation ${foundationId}`);
          
          // Get all previous messages for this foundation
          const previousMessages = await storage.getFoundationMessages(foundationId);
          
          if (previousMessages && previousMessages.length > 0) {
            console.log(`Found ${previousMessages.length} previous messages to add to new thread`);
            
            // Add all previous messages to the thread in chronological order
            for (const prevMsg of previousMessages) {
              await openai.beta.threads.messages.create(conversationThreadId, {
                role: prevMsg.role === 'assistant' ? 'assistant' : 'user',
                content: prevMsg.content
              });
              console.log(`Added ${prevMsg.role} message to thread: ${prevMsg.content.substring(0, 50)}...`);
            }
          }
        } catch (historyError) {
          console.error(`Error adding conversation history to new thread:`, historyError);
          // Continue with the current message even if history loading fails
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
      
      // Process response based on the context type
      if (contextType === 'genre') {
        try {
          console.log(`[GENRE DEBUG] Processing genre details from dynamic assistant for foundation ${foundationId}`);
          console.log(`[GENRE DEBUG] AI Response content: ${content.substring(0, 200)}...`);
          
          // Extract genre information from the conversation
          // Look for genre patterns in the assistant's response - improved pattern matching
          const genrePattern = /(?:genre|style|type|fiction)(?:\s+is|\s+would\s+be|\s*:|\s+could\s+be)?\s+([^\.,:;!?]+)/i;
          const themePattern = /(?:themes|about|focuses on|explores|deals with|centers around|themed around|key themes include)(?:\s+are|\s+include|\s*:|\s+could\s+include)?\s+([^\.!?]+)/i;
          const moodPattern = /(?:mood|tone|atmosphere|feeling|ambiance|vibe)(?:\s+is|\s+would\s+be|\s*:|\s+could\s+be)?\s+([^\.!?]+)/i;
          
          // Extract genre from messages or use more flexible detection
          let mainGenre = "Custom Genre";
          const fullText = message + " " + content;
          console.log(`[GENRE DEBUG] User message: "${message}"`);
          
          // First, try to extract a specific genre mention from the user message
          // This approach prioritizes what the user explicitly says
          
          // Direct selection or mention check - check if the user directly mentioned a genre name
          // This handles when user selects from suggestion buttons or types a specific genre
          const genreKeywords = [
            "Science Fiction", "Fantasy", "Mystery", "Romance", "Historical Fiction",
            "Horror", "Thriller", "Adventure", "Dystopian", "Cyberpunk", 
            "Western", "Comedy", "Drama", "Action", "Supernatural", "Crime",
            "Sci-Fi", "Urban Fantasy", "Space Opera", "Magical Realism", "Steampunk"
          ];
          
          // Initialize the flag for detected genre from user
          let foundUserGenre = false;
          
          // First, check if the user's message directly contains any of our known genres
          for (const genre of genreKeywords) {
            if (message.toLowerCase().includes(genre.toLowerCase())) {
              mainGenre = genre;  // Use the properly capitalized version
              console.log(`[GENRE DEBUG] Found direct genre mention: "${mainGenre}"`);
              foundUserGenre = true;
              break;
            }
          }
          
          // If no direct match, try extracting with patterns
          if (!foundUserGenre) {
            const userMessageGenrePatterns = [
              /I want a ([\w\s-]+) (story|novel|book|setting|world|foundation)/i,
              /My genre is ([\w\s-]+)/i,
              /I choose ([\w\s-]+)/i,
              /Let's go with ([\w\s-]+)/i,
              /I'd like ([\w\s-]+)/i,
              /I'm interested in ([\w\s-]+)/i
            ];
            
            for (const pattern of userMessageGenrePatterns) {
              const userGenreMatch = message.match(pattern);
              if (userGenreMatch && userGenreMatch[1]) {
                // Check if this is a recognized genre or a sentence fragment
                const potentialGenre = userGenreMatch[1].trim();
                if (potentialGenre.length < 30 && !potentialGenre.includes('that I should')) {
                  mainGenre = potentialGenre;
                  console.log(`[GENRE DEBUG] Extracted user-specified genre from message: "${mainGenre}"`);
                  foundUserGenre = true;
                  break;
                }
              }
            }
          }
          
          // If we didn't find a genre in the user message, try the AI response
          if (!foundUserGenre) {
            // Try specific pattern matching
            const genreMatch = content.match(genrePattern);
            if (genreMatch && genreMatch[1]) {
              mainGenre = genreMatch[1].trim();
              console.log(`[GENRE DEBUG] Found genre via pattern in AI response: ${mainGenre}`);
            }
            // If pattern fails, try to detect from common genres in text
            else {
              // Keywords for common genres
              const genreKeywords = [
                {keyword: "science fiction", genre: "Science Fiction"},
                {keyword: "sci-fi", genre: "Science Fiction"},
                {keyword: "fantasy", genre: "Fantasy"},
                {keyword: "post-apocalyptic", genre: "Post-Apocalyptic"},
                {keyword: "horror", genre: "Horror"},
                {keyword: "thriller", genre: "Thriller"},
                {keyword: "mystery", genre: "Mystery"},
                {keyword: "romance", genre: "Romance"},
                {keyword: "historical", genre: "Historical Fiction"},
                {keyword: "western", genre: "Western"},
                {keyword: "adventure", genre: "Adventure"},
                {keyword: "cyberpunk", genre: "Cyberpunk"},
                {keyword: "dystopian", genre: "Dystopian"},
                {keyword: "sci-fi", genre: "Science Fiction"},
                {keyword: "steampunk", genre: "Steampunk"},
                {keyword: "urban fantasy", genre: "Urban Fantasy"}
              ];
              
              // First check the user message for genre keywords
              for (const {keyword, genre} of genreKeywords) {
                if (message.toLowerCase().includes(keyword)) {
                  mainGenre = genre;
                  console.log(`[GENRE DEBUG] Found genre via keyword '${keyword}' in user message: ${genre}`);
                  foundUserGenre = true;
                  break;
                }
              }
              
              // If still not found, check the AI response
              if (!foundUserGenre) {
                for (const {keyword, genre} of genreKeywords) {
                  if (content.toLowerCase().includes(keyword)) {
                    mainGenre = genre;
                    console.log(`[GENRE DEBUG] Found genre via keyword '${keyword}' in AI response: ${genre}`);
                    break;
                  }
                }
              }
            }
          }
          
          // Try to extract mood/tone first
          let mood = "";
          let tone = "";
          let thematicTone = "";
          
          // Get the mood
          const moodMatch = content.match(moodPattern);
          if (moodMatch && moodMatch[1]) {
            mood = moodMatch[1].trim();
            console.log(`[GENRE DEBUG] Found mood: ${mood}`);
          }
          
          // Extract thematic elements that will be stored as tone
          const themeMatch = content.match(themePattern);
          if (themeMatch && themeMatch[1]) {
            // Get the raw text about themes
            thematicTone = themeMatch[1].trim();
            console.log(`[GENRE DEBUG] Found thematic elements: ${thematicTone}`);
            
            // If we don't have tone yet, use the thematic elements as tone
            if (!tone) {
              tone = thematicTone.length > 100 ? thematicTone.substring(0, 100) : thematicTone;
              console.log(`[GENRE DEBUG] Using thematic elements as tone: ${tone}`);
            }
          } else {
            console.log(`[GENRE DEBUG] No thematic elements found in assistant response`);
          }
          
          // Force a specific genre if still using default
          if (mainGenre === "Custom Genre") {
            // Check for specific genres in the conversation
            if (fullText.toLowerCase().includes("dystopian")) {
              mainGenre = "Dystopian";
            } else if (fullText.toLowerCase().includes("sci-fi") || fullText.toLowerCase().includes("science fiction")) {
              mainGenre = "Science Fiction";
            } else if (fullText.toLowerCase().includes("fantasy")) {
              mainGenre = "Fantasy";
            }
            console.log(`[GENRE DEBUG] Forced genre to: ${mainGenre}`);
          }
          
          // Filter out known problematic phrases that might be captured as genres
          const invalidGenrePhrases = [
            "that i should", 
            "that we should", 
            "you recommend", 
            "as a reference",
            "as reference",
            "please provide",
            "i want something"
          ];
          
          // Check if current genre contains any invalid phrases
          const lowerGenre = mainGenre.toLowerCase();
          for (const phrase of invalidGenrePhrases) {
            if (lowerGenre.includes(phrase)) {
              console.log(`[GENRE DEBUG] Found invalid phrase in genre: "${phrase}", resetting to default`);
              mainGenre = "Custom Genre";
              break;
            }
          }
          
          // One final check to ensure we have a reasonable length for a genre name
          if (mainGenre.length > 30) {
            console.log(`[GENRE DEBUG] Genre name too long (${mainGenre.length} chars), resetting to default`);
            mainGenre = "Custom Genre";
          }
          
          // Check if genre details already exist for this foundation
          const existingDetails = await storage.getGenreDetailsByFoundation(foundationId);
          console.log(`[GENRE DEBUG] Existing details found: ${!!existingDetails}`);
          
          // Prepare genre data with extracted information
          const genreData = {
            mainGenre,
            threadId: conversationThreadId,
            mood, // Will be mapped to the mood field in schema
            tone, // New field for tone information
            // Use the assistant's response as a description
            description: content
          };
          
          console.log(`[GENRE DEBUG] Prepared genre data: ${JSON.stringify({
            mainGenre: genreData.mainGenre,
            threadId: genreData.threadId?.substring(0, 10) + '...',
            mood: genreData.mood,
            descriptionLength: genreData.description?.length || 0
          })}`);
          
          try {
            if (existingDetails) {
              // Update existing genre details
              console.log(`[GENRE DEBUG] Updating existing genre details ID: ${existingDetails.id} from dynamic assistant`);
              const updated = await storage.updateGenreDetails(existingDetails.id, {
                ...genreData,
                foundationId
              });
              console.log(`[GENRE DEBUG] Updated genre details successfully: ${!!updated}`);
            } else {
              // Create new genre details
              console.log(`[GENRE DEBUG] Creating new genre details for foundation ID: ${foundationId} from dynamic assistant`);
              const created = await storage.createGenreDetails({
                ...genreData,
                foundationId
              });
              console.log(`[GENRE DEBUG] Created genre details successfully: ${!!created}, ID: ${created?.id}`);
            }
          } catch (dbError) {
            console.error(`[GENRE DEBUG] Database error saving genre details:`, dbError);
          }
          
          // Update the foundation with the genre name - always do this to ensure it's set
          console.log(`[GENRE DEBUG] Updating foundation ${foundationId} genre to: ${mainGenre}`);
          try {
            const updatedFoundation = await storage.updateFoundation(foundationId, {
              genre: mainGenre
            });
            console.log(`[GENRE DEBUG] Foundation updated successfully: ${!!updatedFoundation}`);
          } catch (dbError) {
            console.error(`[GENRE DEBUG] Database error updating foundation:`, dbError);
          }
        } catch (error) {
          console.error("[GENRE DEBUG] Error saving genre details from dynamic assistant:", error);
          // Continue despite the error - don't block the response
        }
      }
      
      // If this is an environment-related conversation, save details to environment_details table
      if (contextType === 'environment') {
        try {
          console.log(`[ENVIRONMENT DEBUG] Processing environment details from dynamic assistant for foundation ${foundationId}`);
          console.log(`[ENVIRONMENT DEBUG] AI Response content: ${content.substring(0, 200)}...`);
          
          // Extract setting/location/era from the conversation
          const settingPattern = /(?:setting|location|place|environment|world|city|town|realm)(?:\s+is|\s+would\s+be|\s*:|\s+could\s+be)?\s+([^\.,:;!?]+)/i;
          const eraPattern = /(?:era|time period|time|century|decade|age|historical period)(?:\s+is|\s+would\s+be|\s*:|\s+could\s+be)?\s+([^\.,:;!?]+)/i;
          const atmospherePattern = /(?:atmosphere|feeling|vibe|ambiance|ambience|mood)(?:\s+is|\s+would\s+be|\s*:|\s+could\s+be)?\s+([^\.,:;!?]+)/i;
          
          // Extract environment information
          let setting = "";
          let era = "";
          let atmosphere = "";
          const fullText = message + " " + content;
          
          // Try to extract setting
          const settingMatch = content.match(settingPattern);
          if (settingMatch && settingMatch[1]) {
            setting = settingMatch[1].trim();
            console.log(`[ENVIRONMENT DEBUG] Found setting: ${setting}`);
          }
          
          // Try to extract era
          const eraMatch = content.match(eraPattern);
          if (eraMatch && eraMatch[1]) {
            era = eraMatch[1].trim();
            console.log(`[ENVIRONMENT DEBUG] Found era: ${era}`);
          }
          
          // Try to extract atmosphere
          const atmosphereMatch = content.match(atmospherePattern);
          if (atmosphereMatch && atmosphereMatch[1]) {
            atmosphere = atmosphereMatch[1].trim();
            console.log(`[ENVIRONMENT DEBUG] Found atmosphere: ${atmosphere}`);
          }
          
          // Check if environment details already exist for this foundation
          const existingDetails = await storage.getEnvironmentDetailsByFoundation(foundationId);
          console.log(`[ENVIRONMENT DEBUG] Existing details found: ${!!existingDetails}`);
          
          // Prepare environment data with extracted information
          const environmentData = {
            environment_name: setting || 'Custom Environment', // Use setting as the environment name
            setting,
            era,
            atmosphere,
            threadId: conversationThreadId,
            // Use the assistant's response as a description - store the full conversation for reference
            description: content
          };
          
          console.log(`[ENVIRONMENT DEBUG] Prepared environment data: ${JSON.stringify({
            setting: environmentData.setting,
            era: environmentData.era,
            atmosphere: environmentData.atmosphere,
            threadId: environmentData.threadId?.substring(0, 10) + '...',
            descriptionLength: environmentData.description?.length || 0
          })}`);
          
          try {
            if (existingDetails) {
              // Update existing environment details
              console.log(`[ENVIRONMENT DEBUG] Updating existing environment details ID: ${existingDetails.id} from dynamic assistant`);
              const updated = await storage.updateEnvironmentDetails(existingDetails.id, {
                ...environmentData,
                foundationId
              });
              console.log(`[ENVIRONMENT DEBUG] Updated environment details successfully: ${!!updated}`);
            } else {
              // Create new environment details
              console.log(`[ENVIRONMENT DEBUG] Creating new environment details for foundation ID: ${foundationId} from dynamic assistant`);
              const created = await storage.createEnvironmentDetails({
                ...environmentData,
                foundationId
              });
              console.log(`[ENVIRONMENT DEBUG] Created environment details successfully: ${!!created}, ID: ${created?.id}`);
            }
            
            // Update the foundation to mark environment as completed
            console.log(`[ENVIRONMENT DEBUG] Updating foundation ${foundationId} to mark environment as completed`);
            try {
              const updatedFoundation = await storage.updateFoundation(foundationId, {
                environmentCompleted: true  // Mark the environment stage as completed
              });
              console.log(`[ENVIRONMENT DEBUG] Foundation updated successfully: ${!!updatedFoundation}`);
            } catch (dbError) {
              console.error(`[ENVIRONMENT DEBUG] Database error updating foundation:`, dbError);
            }
            
          } catch (dbError) {
            console.error(`[ENVIRONMENT DEBUG] Database error saving environment details:`, dbError);
          }
        } catch (error) {
          console.error("[ENVIRONMENT DEBUG] Error saving environment details from dynamic assistant:", error);
          // Continue despite the error - don't block the response
        }
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
  
  // Foundation stage transitions
  apiRouter.post("/foundations/:id/transition", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { stage } = req.body;
      
      if (!id || !stage) {
        return res.status(400).json({ error: 'Foundation ID and stage are required' });
      }
      
      // Update the foundation's current stage
      await storage.updateFoundation(parseInt(id), { currentStage: stage });
      
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error transitioning foundation stage:', error);
      return res.status(500).json({ error: 'Failed to transition stage' });
    }
  });

  // Environment to World transition
  apiRouter.post("/foundations/:id/environment-to-world", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { 
        environmentDetails = {},
        createAnother = false // Flag to determine if user wants to create another environment
      } = req.body;
      
      if (!id) {
        return res.status(400).json({ 
          error: 'Foundation ID is required' 
        });
      }
      
      console.log(`Processing environment-to-world transition for foundation ${id}`);
      const foundationId = parseInt(id);
      
      // 1. Save environment details if they're provided and not already saved
      if (Object.keys(environmentDetails).length > 0) {
        try {
          console.log(`Saving final environment details for foundation ID: ${foundationId}`);
          
          // Check if environment details already exist for this foundation
          const existingDetails = await storage.getEnvironmentDetailsByFoundation(foundationId);
          
          // Cast environmentDetails to any type to avoid TypeScript errors with dynamic properties
          const environmentDetailsAny = environmentDetails as any;
          
          // Generate a user-friendly name for the environment if one isn't provided
          const envName = environmentDetailsAny.name || environmentDetailsAny.environment_name || 'Custom Environment';
          
          // Prepare the environment data - handle both camelCase and snake_case formats
          // Ensuring we use the correct column names as defined in the schema
          const environmentData = {
            environment_name: envName,
            narrative_significance: environmentDetailsAny.worldContext || environmentDetailsAny.narrative_significance || '',
            geography: typeof environmentDetailsAny.physicalAttributes === 'object' ? 
              JSON.stringify(environmentDetailsAny.physicalAttributes) : 
              (environmentDetailsAny.geography || ''),
            architecture: typeof environmentDetailsAny.structuralFeatures === 'object' ? 
              JSON.stringify(environmentDetailsAny.structuralFeatures) : 
              (environmentDetailsAny.architecture || ''),
            climate_weather: environmentDetailsAny.physicalAttributes?.climate || environmentDetailsAny.climate_weather || '',
            sensory_atmosphere: typeof environmentDetailsAny.sensoryDetails === 'object' ? 
              JSON.stringify(environmentDetailsAny.sensoryDetails) : 
              (environmentDetailsAny.sensory_atmosphere || ''),
            cultural_influence: typeof environmentDetailsAny.culture === 'object' ? 
              JSON.stringify(environmentDetailsAny.culture) : 
              (environmentDetailsAny.cultural_influence || ''),
            societal_norms: environmentDetailsAny.culture?.attitudes || environmentDetailsAny.societal_norms || '',
            historical_relevance: typeof environmentDetailsAny.history === 'object' ? 
              JSON.stringify(environmentDetailsAny.history) : 
              (environmentDetailsAny.historical_relevance || ''),
            economic_significance: environmentDetailsAny.economic_significance || '',
            speculative_features: environmentDetailsAny.speculative_features || '',
            associated_characters_factions: typeof environmentDetailsAny.inhabitants === 'object' ? 
              JSON.stringify(environmentDetailsAny.inhabitants) : 
              (environmentDetailsAny.associated_characters_factions || ''),
            inspirations_references: environmentDetailsAny.inspirations_references || '',
            // No threadId column in schema, so we'll need to handle it separately
            foundationId // Add the foundation ID explicitly
          };
          
          if (existingDetails) {
            // Update existing environment details
            console.log(`Updating existing environment details ID: ${existingDetails.id}`);
            console.log('Environment data to save:', JSON.stringify(environmentData, null, 2));
            
            const updatedEnv = await storage.updateEnvironmentDetails(existingDetails.id, {
              ...environmentData,
              foundationId
            });
            console.log('Successfully updated environment details:', updatedEnv?.id);
          } else {
            // Create new environment details
            console.log(`Creating new environment details for foundation ID: ${foundationId}`);
            console.log('Environment data to save:', JSON.stringify(environmentData, null, 2));
            
            const newEnv = await storage.createEnvironmentDetails({
              ...environmentData,
              foundationId
            });
            console.log('Successfully created environment details with ID:', newEnv?.id);
          }
          
          console.log(`Successfully saved environment details for foundation ${foundationId}`);
        } catch (saveError) {
          console.error('Error saving environment details to database:', saveError);
          // Continue despite the error - don't block the transition
        }
      }
      
      // 2. Decide next steps based on user choice:
      if (createAnother) {
        // User wants to create another environment for this world
        console.log(`User requested to create another environment for foundation ${foundationId}`);
        
        // Get genre details to provide context for the next environment
        const genreDetails = await storage.getGenreDetailsByFoundation(foundationId);
        
        return res.status(200).json({
          success: true,
          nextAction: "createAnotherEnvironment",
          message: "Ready to create another environment",
          genreContext: genreDetails ? {
            mainGenre: genreDetails.mainGenre,
            description: genreDetails.description
          } : null
        });
      } else {
        // User wants to move to the world building stage
        console.log(`Transitioning foundation ${foundationId} from environment to world stage`);
        
        // Update the foundation's current stage
        await storage.updateFoundation(foundationId, { currentStage: 'world' });
        
        // Collect context from previous stages to pass to world building
        const genreDetails = await storage.getGenreDetailsByFoundation(foundationId);
        
        // Get all environment details to provide comprehensive context for world building
        const allEnvironmentDetails = await storage.getAllEnvironmentDetailsByFoundation(foundationId);
        const environmentDetails = allEnvironmentDetails.length > 0 ? allEnvironmentDetails[0] : undefined;
        
        // Transform all environment details into a simplified format for the client
        const environmentContexts = allEnvironmentDetails.map(env => ({
          id: env.id,
          name: env.environment_name,
          description: env.narrative_significance,
          geography: env.geography,
          climate: env.climate_weather,
          culture: env.cultural_influence
        }));
        
        return res.status(200).json({
          success: true,
          nextAction: "proceedToWorld",
          currentStage: "world",
          contextData: {
            genreContext: genreDetails ? {
              mainGenre: genreDetails.mainGenre,
              description: genreDetails.description
            } : null,
            // Primary environment (first one created)
            environmentContext: environmentDetails ? {
              name: environmentDetails.environment_name,
              description: environmentDetails.narrative_significance
            } : null,
            // All environments (for more comprehensive world building)
            allEnvironments: environmentContexts.length > 0 ? environmentContexts : null
          }
        });
      }
    } catch (error) {
      console.error('Error in environment to world transition:', error);
      return res.status(500).json({ error: 'Failed to process environment to world transition' });
    }
  });

  // Genre to Environment transition with foundation rename suggestion
  apiRouter.post("/foundations/:id/genre-to-environment", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { 
        genreSummary, 
        mainGenre,
        genreDetails = {},
        suggestedNames = []
      } = req.body;
      
      if (!id || !genreSummary) {
        return res.status(400).json({ 
          error: 'Foundation ID and genre summary are required' 
        });
      }
      
      console.log(`Transitioning foundation ${id} from genre to environment stage`);
      const foundationId = parseInt(id);
      const effectiveMainGenre = mainGenre || 'Fantasy'; // Fallback to Fantasy if not provided
      
      // Log the received genre details if structured JSON data is present
      if (Object.keys(genreDetails).length > 0) {
        console.log('Received structured genre data with fields:', 
          Object.keys(genreDetails).join(', '));
      } else {
        console.log('No structured genre data received, using basic info');
      }
      
      // 1. Update the foundation with genre info and change stage
      await storage.updateFoundation(foundationId, { 
        genre: effectiveMainGenre, 
        currentStage: 'environment'  // Advance to environment stage
      });
      
      console.log('Foundation updated to environment stage');
      
      // 2. Add genre details to the database - handle all possible structured fields
      
      console.log('[GENRE DB] Converting fields from snake_case to camelCase');
      
      // First, convert any snake_case field names to camelCase for consistency
      const fieldMappings = {
        'main_genre': 'mainGenre',
        'genre_rationale': 'genreRationale',
        'audience_expectations': 'audienceExpectations',
        'time_period': 'timePeriod',
        'technology_level': 'technologyLevel',
        'physical_environment': 'physicalEnvironment',
        'key_tropes': 'keyTropes',
        'trope_strategy': 'tropeStrategy',
        'speculative_elements': 'speculativeElements',
        'speculative_rules': 'speculativeRules',
        'emotional_impact': 'emotionalImpact',
        'subgenre_rationale': 'subgenreRationale',
        'subgenre_interaction': 'subgenreInteraction',
        'subgenre_tropes': 'subgenreTropes',
        'societal_structures': 'societalStructures',
        'cultural_norms': 'culturalNorms',
        'sensory_details': 'sensoryDetails',
        'atmospheric_style': 'atmosphericStyle',
        'thematic_environment_tieins': 'thematicEnvironmentTieins',
        'inspiration_details': 'inspirationDetails',
        'divergence_from_inspirations': 'divergenceFromInspirations'
      };
      
      // Process all field mappings systematically
      Object.entries(fieldMappings).forEach(([snakeCase, camelCase]) => {
        if (genreDetails[snakeCase] && !genreDetails[camelCase]) {
          console.log(`Converting ${snakeCase} to ${camelCase}`);
          genreDetails[camelCase] = genreDetails[snakeCase];
        }
      });
      
      // Ensure any array or object fields are properly stringified if needed
      ['subgenres', 'keyTropes', 'speculativeElements'].forEach(field => {
        if (genreDetails[field] && typeof genreDetails[field] === 'object') {
          genreDetails[field] = JSON.stringify(genreDetails[field]);
        }
      });
      
      // Log all processed field data for debugging
      console.log('[GENRE DB] Looking up genre details for foundation', foundationId);
      
      // Create a structured object from the genre data for generating the summary
      const genreDataForSummary = {
        mainGenre: effectiveMainGenre,
        tone: genreDetails.tone || '',
        mood: genreDetails.mood || '',
        timePeriod: genreDetails.timePeriod || '',
        physicalEnvironment: genreDetails.physicalEnvironment || '',
        keyTropes: genreDetails.keyTropes || '',
        atmosphere: genreDetails.atmosphere || ''
      };
      
      // Generate a user-friendly summary
      const userFriendlySummary = generateGenreSummaryForDisplay(genreDataForSummary);
      console.log('[GENRE DB] Generated user-friendly summary for description:', userFriendlySummary);
      
      const genreData = {
        foundationId,
        // Core identifying information
        name: genreDetails.name || `${effectiveMainGenre} Genre`, // Default name is required
        mainGenre: effectiveMainGenre,
        description: userFriendlySummary, // Use the user-friendly summary instead of raw JSON
        
        // Handle all possible JSON fields from the GenreDetails interface
        // Expanded genre information
        genreRationale: genreDetails.genreRationale || '',
        audienceExpectations: genreDetails.audienceExpectations || '',
        
        // Subgenre details
        subgenres: genreDetails.subgenres || '',
        subgenreRationale: genreDetails.subgenreRationale || '',
        subgenreInteraction: genreDetails.subgenreInteraction || '',
        subgenreTropes: genreDetails.subgenreTropes || '',
        
        // Mood and tone
        tone: genreDetails.tone || '',
        mood: genreDetails.mood || '',
        emotionalImpact: genreDetails.emotionalImpact || '',
        
        // Setting elements
        timePeriod: genreDetails.timePeriod || '',
        technologyLevel: genreDetails.technologyLevel || '',
        physicalEnvironment: genreDetails.physicalEnvironment || '',
        geography: genreDetails.geography || '',
        
        // Social elements - these were missing from previous implementation
        societalStructures: genreDetails.societalStructures || '',
        culturalNorms: genreDetails.culturalNorms || '',
        
        // Tropes and speculative elements
        keyTropes: genreDetails.keyTropes || '',
        tropeStrategy: genreDetails.tropeStrategy || '',
        speculativeElements: genreDetails.speculativeElements || '',
        speculativeRules: genreDetails.speculativeRules || '',
        
        // Atmosphere and style
        atmosphere: genreDetails.atmosphere || '',
        sensoryDetails: genreDetails.sensoryDetails || '',
        atmosphericStyle: genreDetails.atmosphericStyle || '',
        thematicEnvironmentTieins: genreDetails.thematicEnvironmentTieins || '',
        
        // Inspirations
        inspirations: genreDetails.inspirations || '',
        inspirationDetails: genreDetails.inspirationDetails || '',
        divergenceFromInspirations: genreDetails.divergenceFromInspirations || '',
        
        // Thread ID for continued conversation
        threadId: genreDetails.threadId || null
      };
      
      // Check if genre details already exist for this foundation
      const existingDetails = await storage.getGenreDetailsByFoundation(foundationId);
      
      if (!existingDetails) {
        // Insert new genre details
        console.log('[GENRE DB] No genre details found for foundation', foundationId);
        console.log('[GENRE DB] Creating new genre details for foundation', foundationId);
        console.log('[GENRE DB] Genre data:', JSON.stringify(genreData, null, 2));
        
        const newGenre = await storage.createGenreDetails(genreData);
        console.log('[GENRE DB] Successfully created genre details with ID', newGenre?.id);
      } else {
        // Update existing genre details
        console.log('[GENRE DB] Found existing genre details ID:', existingDetails.id);
        console.log('[GENRE DB] Updating genre details');
        console.log('[GENRE DB] Genre data to save:', JSON.stringify(genreData, null, 2));
        
        const updatedGenre = await storage.updateGenreDetails(existingDetails.id, genreData);
        console.log('[GENRE DB] Successfully updated genre details with ID:', updatedGenre?.id);
      }
      
      // 3. Generate a customized environment introduction based on the genre
      const environmentIntroMessage = getEnvironmentIntroMessage(effectiveMainGenre, genreSummary);
      
      return res.status(200).json({ 
        success: true, 
        suggestedNames,
        message: "Genre details saved and ready for environment stage",
        environmentIntroMessage,
        mainGenre: effectiveMainGenre,
        genreSummary: userFriendlySummary // Use the same user-friendly summary we stored in the database
      });
    } catch (error) {
      console.error('Error in genre to environment transition:', error);
      return res.status(500).json({ error: 'Failed to process genre to environment transition' });
    }
  });
  
  // Helper function to generate a user-friendly genre summary from the genre data
  function generateGenreSummaryForDisplay(genreData: any): string {
    const { mainGenre, tone, mood, timePeriod, physicalEnvironment, keyTropes, atmosphere } = genreData;
    
    let summary = `Your ${mainGenre} story world`;
    
    // Add tone/mood if available
    if (tone || mood) {
      summary += ` has a ${tone || mood} feel`;
    }
    
    // Add time period if available
    if (timePeriod) {
      summary += `, set in ${timePeriod}`;
    }
    
    // Add physical environment if available
    if (physicalEnvironment) {
      const environmentDesc = physicalEnvironment.length > 100 
        ? physicalEnvironment.substring(0, 97) + '...'
        : physicalEnvironment;
      summary += `, with ${environmentDesc}`;
    }
    
    // Add key tropes if available
    if (keyTropes) {
      let tropesText = keyTropes;
      if (typeof tropesText === 'string' && tropesText.startsWith('[') && tropesText.endsWith(']')) {
        try {
          const tropesArray = JSON.parse(tropesText);
          if (Array.isArray(tropesArray) && tropesArray.length > 0) {
            tropesText = tropesArray.slice(0, 3).join(', ');
            if (tropesArray.length > 3) {
              tropesText += ', and more';
            }
          }
        } catch (e) {
          // Keep original text if JSON parsing fails
        }
      }
      
      if (tropesText && tropesText.length > 0) {
        summary += `. It features elements like ${tropesText}`;
      }
    }
    
    // Add atmosphere if available and not already covered by tone/mood
    if (atmosphere && atmosphere !== tone && atmosphere !== mood) {
      summary += `. The atmosphere is ${atmosphere}`;
    }
    
    // End with a period if needed
    if (!summary.endsWith('.')) {
      summary += '.';
    }
    
    return summary;
  }

  // Helper function to generate environment introduction message with enhanced genre data
  function getEnvironmentIntroMessage(mainGenre: string, genreSummary: string): string {
    // Try to extract structured JSON data from the genre summary if available
    let structuredData = null;
    
    // First, check if this is a user-friendly summary (non-JSON) or raw JSON data
    const isUserFriendlySummary = !genreSummary.includes('{') || genreSummary.startsWith('Your');
    
    if (!isUserFriendlySummary) {
      try {
        const jsonMatch = genreSummary.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const jsonString = jsonMatch[0];
          structuredData = JSON.parse(jsonString);
          console.log('Found structured JSON data for environment intro message');
        }
      } catch (jsonError) {
        console.log('No valid JSON found in genre summary for environment intro', jsonError);
      }
    } else {
      console.log('Using user-friendly summary for environment intro message');
    }
    
    // Base message template
    let baseMessage = `Welcome to the Environment Stage! Now that we've established the ${mainGenre} genre for your story world, let's explore the physical settings where your stories will take place.`;
    
    // If we have structured data, create a more personalized message
    if (structuredData) {
      // Handle both camelCase and snake_case field names
      // Use available structured fields to make a more customized message
      const mood = structuredData.mood || structuredData.tone || structuredData.mood_tone || '';
      const timePeriod = structuredData.timePeriod || structuredData.time_period || '';
      const physicalEnvironment = structuredData.physicalEnvironment || structuredData.physical_environment || '';
      const atmosphere = structuredData.atmosphere || structuredData.atmospheric_tone || mood;
      
      if (mood || atmosphere) {
        baseMessage += ` You've defined a ${mood || atmosphere} mood for your world.`;
      }
      
      if (timePeriod) {
        baseMessage += ` Your world is set in ${timePeriod}.`;
      }
      
      if (physicalEnvironment) {
        baseMessage += ` You've mentioned settings like ${physicalEnvironment}.`;
      }
      
      baseMessage += ' Now, what specific environments would you like to create within your world?';
    }
    // If no structured data, fall back to the genre-specific template
    else {
      // Add genre-specific extensions
      switch (mainGenre.toLowerCase()) {
        case 'fantasy':
          baseMessage += ' Consider magical landscapes, ancient forests, mystical mountains, or enchanted cities. What environments do you envision for your fantasy world?';
          break;
        case 'sci-fi':
        case 'science fiction':
          baseMessage += ' Think about futuristic cities, space stations, distant planets, or post-apocalyptic landscapes. What settings would you like to explore in your sci-fi universe?';
          break;
        case 'horror':
          baseMessage += ' Imagine eerie mansions, foggy towns, abandoned facilities, or supernatural locations. What kind of unsettling environments would you like to include?';
          break;
        case 'romance':
          baseMessage += ' Consider picturesque towns, beautiful natural settings, cozy cafes, or exotic destinations. What romantic settings would you like to include in your world?';
          break;
        case 'mystery':
        case 'detective':
        case 'thriller':
          baseMessage += ' Think about atmospheric cities, secluded towns, or locations with hidden secrets. What intriguing settings would best serve your mystery world?';
          break;
        case 'historical':
        case 'historical fiction':
          baseMessage += ' Consider authentic period locations, notable historical sites, or settings during significant events. In which historical environments would you like to set your stories?';
          break;
        default:
          baseMessage += ' What types of physical settings would you like to include in your story world?';
      }
    }
    
    return baseMessage;
  }

  // Update foundation name
  apiRouter.post("/foundations/:id/rename", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { name } = req.body;
      
      if (!id || !name) {
        return res.status(400).json({ error: 'Foundation ID and new name are required' });
      }
      
      // Update the foundation name
      await storage.updateFoundation(parseInt(id), { name });
      
      return res.status(200).json({ 
        success: true, 
        message: "Foundation renamed successfully"
      });
    } catch (error) {
      console.error('Error renaming foundation:', error);
      return res.status(500).json({ error: 'Failed to rename foundation' });
    }
  });
  
  // Generate foundation name suggestions
  apiRouter.post("/foundations/:id/name-suggestions", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { genreSummary, mainGenre } = req.body;
      
      if (!id || !genreSummary) {
        return res.status(400).json({ error: 'Foundation ID and genre summary are required' });
      }
      
      // Use OpenAI to generate foundation name suggestions based on the genre
      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: "You are a creative naming assistant for a storytelling application. Generate 5 creative and thematically appropriate names for a story foundation based on the provided genre information. The names should be evocative and capture the essence of the genre, while being original and memorable. Return ONLY the list of names in JSON format with a 'names' array field."
          },
          {
            role: "user",
            content: `Generate 5 creative and evocative foundation names based on this genre summary:\n\nGenre: ${mainGenre}\n\nSummary: ${genreSummary}\n\nFormat your response as a JSON object with a 'names' array field.`
          }
        ],
        response_format: { type: "json_object" },
        max_tokens: 500
      });
      
      // Extract the suggested names
      const responseContent = response.choices[0].message.content || '';
      let suggestedNames: string[] = [];
      
      try {
        const parsedResponse = JSON.parse(responseContent);
        if (Array.isArray(parsedResponse.names)) {
          suggestedNames = parsedResponse.names.slice(0, 5);
        } else if (parsedResponse.names && typeof parsedResponse.names === 'string') {
          // Handle case where it's a comma-separated string
          suggestedNames = parsedResponse.names.split(',').map((name: string) => name.trim()).slice(0, 5);
        }
      } catch (parseError) {
        console.error('Error parsing name suggestions:', parseError);
        // Try to extract names using regex if JSON parsing fails
        const nameMatches = responseContent.match(/["']([^"']+)["']/g);
        if (nameMatches) {
          suggestedNames = nameMatches
            .map((match: string) => match.replace(/["']/g, ''))
            .slice(0, 5);
        }
      }
      
      // Ensure we have at least some names, even if parsing failed
      if (suggestedNames.length === 0) {
        suggestedNames = [
          `${mainGenre} Chronicles`,
          `Tales of ${mainGenre}`,
          `${mainGenre} World`,
          `${mainGenre} Realms`,
          `${mainGenre} Foundation`
        ];
      }
      
      return res.status(200).json({ 
        success: true, 
        suggestedNames 
      });
    } catch (error) {
      console.error('Error generating name suggestions:', error);
      return res.status(500).json({ error: 'Failed to generate name suggestions' });
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
        // Using tone and mood directly instead of themes
        tone,
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
        tone,
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
        tone,
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
                  // Basic genre information
                  genreRationale: `This genre was selected based on your preferences and interests.`,
                  audienceExpectations: `Readers expect immersive storytelling with engaging characters.`,
                  // Mood and tone
                  tone: "Balanced",
                  mood: "Immersive",
                  // Other essential fields
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
              genreRationale: `This genre was selected based on your preferences and interests.`,
              audienceExpectations: `Readers expect immersive storytelling with engaging characters.`,
              tone: "Balanced",
              mood: "Immersive",
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
            console.log('Environment data to save:', JSON.stringify(environmentData, null, 2));
            
            const updatedEnv = await storage.updateEnvironmentDetails(existingDetails.id, {
              ...environmentData,
              foundationId
            });
            console.log('Successfully updated environment details:', updatedEnv?.id);
          } else {
            // Create new environment details
            console.log(`Creating new environment details for foundation ID: ${foundationId}`);
            console.log('Environment data to save:', JSON.stringify(environmentData, null, 2));
            
            const newEnv = await storage.createEnvironmentDetails({
              ...environmentData,
              foundationId
            });
            console.log('Successfully created environment details with ID:', newEnv?.id);
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
          
          // Cast worldDetails to any type to avoid TypeScript errors with dynamic properties
          const worldDetailsAny = worldDetails as any;
          
          // Prepare the data to save - normalize empty arrays
          const worldData = {
            // Required field for the new world_details table
            world_name: worldDetailsAny.name || 'Custom World',
            // New fields for the world_details table - ensure empty string fallbacks
            narrative_context: worldDetailsAny.narrative_context || '',
            global_geography_topography: worldDetailsAny.global_geography_topography || '',
            regions_territories: worldDetailsAny.regions_territories || '',
            boundaries_borders: worldDetailsAny.boundaries_borders || '',
            climate_environmental_zones: worldDetailsAny.climate_environmental_zones || '',
            environment_placements_distances: worldDetailsAny.environment_placements_distances || '',
            resources_economic_geography: worldDetailsAny.resources_economic_geography || '',
            historical_cultural_geography: worldDetailsAny.historical_cultural_geography || '',
            speculative_supernatural_geography: worldDetailsAny.speculative_supernatural_geography || '',
            map_generation_details: worldDetailsAny.map_generation_details || '',
            inspirations_references: worldDetailsAny.inspirations_references || '',
            // Legacy fields maintained for compatibility - ensure proper defaults for all types
            description: worldDetailsAny.description || '',
            era: worldDetailsAny.era || '',
            geography: Array.isArray(worldDetailsAny.geography) ? worldDetailsAny.geography : [],
            locations: Array.isArray(worldDetailsAny.locations) ? worldDetailsAny.locations : [],
            culture: worldDetailsAny.culture || {},
            politics: worldDetailsAny.politics || {},
            economy: worldDetailsAny.economy || {},
            technology: worldDetailsAny.technology || {},
            conflicts: Array.isArray(worldDetailsAny.conflicts) ? worldDetailsAny.conflicts : [],
            history: worldDetailsAny.history || {},
            magicSystem: worldDetailsAny.magicSystem || null,
            threadId: worldDetailsAny.threadId || null
          };
          
          if (existingDetails) {
            // Update existing world details
            console.log(`Updating existing world details ID: ${existingDetails.id}`);
            console.log('World data to save:', JSON.stringify(worldData, null, 2));
            
            const updatedWorld = await storage.updateWorldDetails(existingDetails.id, {
              ...worldData,
              foundationId
            });
            console.log('Successfully updated world details:', updatedWorld?.id);
          } else {
            // Create new world details
            console.log(`Creating new world details for foundation ID: ${foundationId}`);
            console.log('World data to save:', JSON.stringify(worldData, null, 2));
            
            const newWorld = await storage.createWorldDetails({
              ...worldData,
              foundationId
            });
            console.log('Successfully created world details with ID:', newWorld?.id);
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
  
  // API Key update endpoint (for TTS services)
  apiRouter.post("/settings/api-key", async (req: Request, res: Response) => {
    try {
      const { provider, apiKey } = req.body;
      
      if (!provider || !apiKey) {
        return res.status(400).json({ message: "Provider and API key are required" });
      }
      
      if (provider !== 'elevenlabs' && provider !== 'openai') {
        return res.status(400).json({ message: "Invalid provider. Must be 'elevenlabs' or 'openai'" });
      }
      
      // Validation checks
      if (typeof apiKey !== 'string' || apiKey.trim().length < 10) {
        return res.status(400).json({ message: "API key appears to be invalid (too short)" });
      }
      
      // Provider-specific validation
      if (provider === 'openai' && !apiKey.startsWith('sk-')) {
        return res.status(400).json({ message: "OpenAI API key should start with 'sk-'" });
      }
      
      console.log(`Updating ${provider} API key`);
      
      // For security, we don't want to save API keys in a session or cookie
      // Instead, we'll set it as an environment variable for the current process
      // Note: This will be lost when the server restarts
      if (provider === 'elevenlabs') {
        process.env.ELEVEN_LABS_API_KEY = apiKey;
      } else {
        process.env.OPENAI_API_KEY = apiKey;
      }
      
      // Attempt a test call to validate the key
      try {
        // Small test to validate the key
        if (provider === 'elevenlabs') {
          // Simple test to confirm key works
          const testText = "API key testing message.";
          await generateElevenLabsSpeech(testText, "21m00Tcm4TlvDq8ikWAM");
        } else {
          // Test OpenAI key
          const testText = "API key testing message.";
          await generateOpenAISpeech(testText, "nova");
        }
        
        console.log(`Successfully validated ${provider} API key`);
        return res.status(200).json({ 
          success: true, 
          message: `Successfully updated ${provider} API key` 
        });
      } catch (validationError: any) {
        console.error(`Error validating ${provider} API key:`, validationError);
        
        // Clear the invalid key
        if (provider === 'elevenlabs') {
          process.env.ELEVEN_LABS_API_KEY = '';
        } else {
          process.env.OPENAI_API_KEY = '';
        }
        
        return res.status(401).json({ 
          success: false, 
          message: `Invalid ${provider} API key: ${validationError.message}` 
        });
      }
    } catch (error: any) {
      console.error("Error updating API key:", error);
      return res.status(500).json({ 
        success: false,
        message: "Failed to update API key",
        error: error.message || "Unknown error"
      });
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
        
        // Check for API key related errors specifically
        const errorMsg = speechError.message || "Unknown error";
        if (errorMsg.includes("API key") && (errorMsg.includes("invalid") || 
            errorMsg.includes("expired") || errorMsg.includes("missing"))) {
          // Determine which provider is having the issue
          const providerWithIssue = voiceOption.provider;
          console.log(`TTS: API key issue detected for provider: ${providerWithIssue}`);
          
          // Return a 401 for auth errors so the client can handle them specially
          return res.status(401).json({ 
            message: "Speech generation failed due to API key issues", 
            error: errorMsg,
            needsApiKey: true,
            provider: providerWithIssue
          });
        }
        
        return res.status(500).json({ 
          message: "Speech generation failed", 
          error: errorMsg
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
      
      if (!assistantReply) {
        return res.status(400).json({ 
          message: "Assistant reply is required" 
        });
      }
      
      console.log(`Chat suggestions: Generating for conversation`);
      console.log(`User message: "${userMessage?.substring(0, 50)}${userMessage?.length > 50 ? '...' : ''}"`);
      console.log(`Assistant reply: "${assistantReply?.substring(0, 50)}${assistantReply?.length > 50 ? '...' : ''}"`);
      
      // Check for welcome message specifically
      const isWelcomeMessage = assistantReply && (
        assistantReply.includes("Welcome to Foundation Builder") || 
        assistantReply.includes("What type of genre would you like to explore")
      );
      
      // All suggestions must come from the AI assistant, even for welcome messages
      // The generateChatSuggestions function now handles all cases consistently
      const suggestions = await generateChatSuggestions(
        userMessage || '', // Pass empty string if userMessage is null/undefined
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
