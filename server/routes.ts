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
  insertVersionSchema,
  insertSuggestionSchema,
  insertEnvironmentDetailsSchema,
  insertGenreDetailsSchema
} from "@shared/schema";
import {
  getAISuggestions,
  generateCharacterResponse,
  continueStory,
  analyzeTextSentiment,
  generateInteractiveStoryResponse
} from "./ai";
import { createDetailedCharacter, createGenreDetails, createWorldDetails } from "./assistants";
import { generateSpeech, getAvailableVoices, VoiceOption } from "./tts";
import { generateImage, generateCharacterPortrait, generateCharacterScene, ImageGenerationRequest } from "./image-generation";

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
  
  // Foundation message routes
  apiRouter.get("/foundations/:foundationId/messages", async (req: Request, res: Response) => {
    try {
      console.log(`GET request for foundation messages with ID: ${req.params.foundationId}`);
      
      const foundationId = parseInt(req.params.foundationId);
      if (isNaN(foundationId)) {
        console.warn(`Invalid foundation ID provided: ${req.params.foundationId}`);
        return res.status(400).json({ message: "Invalid foundation ID" });
      }
      
      const foundation = await storage.getFoundation(foundationId);
      if (!foundation) {
        console.warn(`Foundation not found with ID: ${foundationId}`);
        return res.status(404).json({ message: "Foundation not found" });
      }
      
      const messages = await storage.getFoundationMessages(foundationId);
      console.log(`Retrieved ${messages.length} messages for foundation ID: ${foundationId}`);
      return res.status(200).json(messages);
    } catch (error) {
      console.error("Error getting foundation messages:", error);
      return res.status(500).json({ 
        message: "Server error",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  apiRouter.post("/foundations/:foundationId/messages", async (req: Request, res: Response) => {
    try {
      console.log(`POST request for foundation message with ID: ${req.params.foundationId}`);
      
      const foundationId = parseInt(req.params.foundationId);
      if (isNaN(foundationId)) {
        console.warn(`Invalid foundation ID provided: ${req.params.foundationId}`);
        return res.status(400).json({ message: "Invalid foundation ID" });
      }
      
      const foundation = await storage.getFoundation(foundationId);
      if (!foundation) {
        console.warn(`Foundation not found with ID: ${foundationId}`);
        return res.status(404).json({ message: "Foundation not found" });
      }
      
      const { role, content } = req.body;
      
      // Input validation
      if (!role) {
        return res.status(400).json({ message: "Role is required" });
      }
      
      if (!content || typeof content !== 'string') {
        return res.status(400).json({ message: "Content is required and must be a string" });
      }
      
      if (content.trim() === '') {
        return res.status(400).json({ message: "Content cannot be empty" });
      }
      
      if (role !== 'user' && role !== 'assistant') {
        return res.status(400).json({ message: "Role must be 'user' or 'assistant'" });
      }
      
      console.log(`Creating foundation message for ID: ${foundationId}, role: ${role}, content length: ${content.length}`);
      
      const message = await storage.createFoundationMessage({
        foundationId,
        role,
        content
      });
      
      console.log(`Successfully created message ID: ${message.id}`);
      return res.status(201).json(message);
    } catch (error) {
      console.error("Error creating foundation message:", error);
      return res.status(500).json({ 
        message: "Server error",
        error: error instanceof Error ? error.message : String(error)
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
      const isQuestionOnly = genreDetails.description && 
        genreDetails.description.includes("?") && 
        genreDetails.description.length < 100;
        
      if (isQuestionOnly) {
        console.log("Detected question-only response, treating as conversation in progress");
        
        // Generate context-aware suggestions based on the question
        const description = genreDetails.description.toLowerCase();
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
        
        // Generate context-aware suggestions based on the question
        const description = question.toLowerCase();
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
            "I like fantasy books with dragons and magic",
            "I want something like Harry Potter or Lord of the Rings",
            "I prefer dark and gritty fantasy stories",
            "I enjoy stories with complex political intrigue"
          ];
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
  
  // World details API endpoint
  apiRouter.post("/ai/world-details", async (req: Request, res: Response) => {
    try {
      console.log("World details request received:", req.body);
      const { 
        genreContext,    // Pass the genre context from the previous stage
        setting, 
        timeframe, 
        environmentType, 
        culture, 
        technology, 
        conflicts, 
        additionalInfo,
        threadId,        // For continuing conversation
        previousMessages // For conversation history
      } = req.body;
      
      // Log the request details
      console.log("Creating world with input:", {
        genreContext: genreContext ? genreContext.substring(0, 50) + "..." : undefined,
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
      return res.status(200).json(worldDetails);
    } catch (error: any) {
      console.error("Error creating world details:", error);
      
      // Check if this is a conversation-in-progress error
      if (error.message && error.message.startsWith("CONVERSATION_IN_PROGRESS:")) {
        // Extract the question from the error message
        const question = error.message.replace("CONVERSATION_IN_PROGRESS: ", "");
        
        // Return a special response for the frontend to handle
        return res.status(202).json({
          conversationInProgress: true,
          question: question,
          threadId: req.body.threadId || null,
          needsMoreInput: true
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
  
  // Use the router
  app.use("/api", apiRouter);
  
  const httpServer = createServer(app);
  return httpServer;
}
