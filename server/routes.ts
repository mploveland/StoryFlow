import express, { type Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import {
  insertUserSchema,
  insertStorySchema,
  insertChapterSchema,
  insertCharacterSchema,
  insertVersionSchema,
  insertSuggestionSchema
} from "@shared/schema";
import {
  getAISuggestions,
  generateCharacterResponse,
  continueStory,
  analyzeTextSentiment,
  generateInteractiveStoryResponse
} from "./ai";
import { createDetailedCharacter } from "./assistants";
import { generateSpeech, getAvailableVoices, VoiceOption } from "./tts";

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
        return res.status(409).json({ message: "Username already exists" });
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
  
  // Story routes
  apiRouter.get("/stories", async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.query.userId as string);
      
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Valid userId is required" });
      }
      
      const stories = await storage.getStories(userId);
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
      const characters = await storage.getCharacters(storyId);
      return res.status(200).json(characters);
    } catch (error) {
      console.error("Error fetching characters:", error);
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
  
  // Use the router
  app.use("/api", apiRouter);
  
  const httpServer = createServer(app);
  return httpServer;
}
