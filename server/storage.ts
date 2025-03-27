import { 
  users, type User, type InsertUser,
  stories, type Story, type InsertStory,
  chapters, type Chapter, type InsertChapter,
  characters, type Character, type InsertCharacter,
  versions, type Version, type InsertVersion,
  suggestions, type Suggestion, type InsertSuggestion,
  genreDetails, type GenreDetails, type InsertGenreDetails,
  worldDetails, type WorldDetails, type InsertWorldDetails,
  narrativeVectors, type NarrativeVector, type InsertNarrativeVector
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Story operations
  getStories(userId: number): Promise<Story[]>;
  getStory(id: number): Promise<Story | undefined>;
  createStory(story: InsertStory): Promise<Story>;
  updateStory(id: number, story: Partial<InsertStory>): Promise<Story | undefined>;
  deleteStory(id: number): Promise<boolean>;
  
  // Chapter operations
  getChapters(storyId: number): Promise<Chapter[]>;
  getChapter(id: number): Promise<Chapter | undefined>;
  createChapter(chapter: InsertChapter): Promise<Chapter>;
  updateChapter(id: number, chapter: Partial<InsertChapter>): Promise<Chapter | undefined>;
  deleteChapter(id: number): Promise<boolean>;
  
  // Character operations
  getCharacters(storyId: number): Promise<Character[]>;
  getCharacter(id: number): Promise<Character | undefined>;
  createCharacter(character: InsertCharacter): Promise<Character>;
  updateCharacter(id: number, character: Partial<InsertCharacter>): Promise<Character | undefined>;
  deleteCharacter(id: number): Promise<boolean>;
  
  // Version operations
  getVersions(chapterId: number): Promise<Version[]>;
  getVersion(id: number): Promise<Version | undefined>;
  createVersion(version: InsertVersion): Promise<Version>;
  
  // Suggestion operations
  getSuggestions(chapterId: number): Promise<Suggestion[]>;
  getSuggestion(id: number): Promise<Suggestion | undefined>;
  createSuggestion(suggestion: InsertSuggestion): Promise<Suggestion>;
  updateSuggestion(id: number, suggestion: Partial<InsertSuggestion>): Promise<Suggestion | undefined>;
  deleteSuggestion(id: number): Promise<boolean>;
  
  // Genre details operations
  getGenreDetails(storyId: number): Promise<GenreDetails | undefined>;
  createGenreDetails(genreDetails: InsertGenreDetails): Promise<GenreDetails>;
  updateGenreDetails(id: number, genreDetails: Partial<InsertGenreDetails>): Promise<GenreDetails | undefined>;
  
  // World details operations
  getWorldDetails(storyId: number): Promise<WorldDetails | undefined>;
  createWorldDetails(worldDetails: InsertWorldDetails): Promise<WorldDetails>;
  updateWorldDetails(id: number, worldDetails: Partial<InsertWorldDetails>): Promise<WorldDetails | undefined>;
  
  // Narrative vector operations
  getNarrativeVectors(storyId: number): Promise<NarrativeVector[]>;
  getNarrativeVectorsByChapter(chapterId: number): Promise<NarrativeVector[]>;
  createNarrativeVector(narrativeVector: InsertNarrativeVector): Promise<NarrativeVector>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }
  
  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }
  
  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }
  
  // Story operations
  async getStories(userId: number): Promise<Story[]> {
    return db.select().from(stories).where(eq(stories.userId, userId));
  }
  
  async getStory(id: number): Promise<Story | undefined> {
    const [story] = await db.select().from(stories).where(eq(stories.id, id));
    return story;
  }
  
  async createStory(insertStory: InsertStory): Promise<Story> {
    const [story] = await db.insert(stories).values(insertStory).returning();
    return story;
  }
  
  async updateStory(id: number, storyUpdate: Partial<InsertStory>): Promise<Story | undefined> {
    const [story] = await db
      .update(stories)
      .set({ ...storyUpdate, updatedAt: new Date() })
      .where(eq(stories.id, id))
      .returning();
    return story;
  }
  
  async deleteStory(id: number): Promise<boolean> {
    const [deleted] = await db.delete(stories).where(eq(stories.id, id)).returning();
    return !!deleted;
  }
  
  // Chapter operations
  async getChapters(storyId: number): Promise<Chapter[]> {
    return db
      .select()
      .from(chapters)
      .where(eq(chapters.storyId, storyId))
      .orderBy(chapters.order);
  }
  
  async getChapter(id: number): Promise<Chapter | undefined> {
    const [chapter] = await db.select().from(chapters).where(eq(chapters.id, id));
    return chapter;
  }
  
  async createChapter(insertChapter: InsertChapter): Promise<Chapter> {
    const [chapter] = await db.insert(chapters).values(insertChapter).returning();
    return chapter;
  }
  
  async updateChapter(id: number, chapterUpdate: Partial<InsertChapter>): Promise<Chapter | undefined> {
    const [chapter] = await db
      .update(chapters)
      .set({ ...chapterUpdate, updatedAt: new Date() })
      .where(eq(chapters.id, id))
      .returning();
    return chapter;
  }
  
  async deleteChapter(id: number): Promise<boolean> {
    const [deleted] = await db.delete(chapters).where(eq(chapters.id, id)).returning();
    return !!deleted;
  }
  
  // Character operations
  async getCharacters(storyId: number): Promise<Character[]> {
    return db.select().from(characters).where(eq(characters.storyId, storyId));
  }
  
  async getCharacter(id: number): Promise<Character | undefined> {
    const [character] = await db.select().from(characters).where(eq(characters.id, id));
    return character;
  }
  
  async createCharacter(insertCharacter: InsertCharacter): Promise<Character> {
    const [character] = await db.insert(characters).values(insertCharacter).returning();
    return character;
  }
  
  async updateCharacter(id: number, characterUpdate: Partial<InsertCharacter>): Promise<Character | undefined> {
    const [character] = await db
      .update(characters)
      .set(characterUpdate)
      .where(eq(characters.id, id))
      .returning();
    return character;
  }
  
  async deleteCharacter(id: number): Promise<boolean> {
    const [deleted] = await db.delete(characters).where(eq(characters.id, id)).returning();
    return !!deleted;
  }
  
  // Version operations
  async getVersions(chapterId: number): Promise<Version[]> {
    return db
      .select()
      .from(versions)
      .where(eq(versions.chapterId, chapterId))
      .orderBy(desc(versions.createdAt));
  }
  
  async getVersion(id: number): Promise<Version | undefined> {
    const [version] = await db.select().from(versions).where(eq(versions.id, id));
    return version;
  }
  
  async createVersion(insertVersion: InsertVersion): Promise<Version> {
    const [version] = await db.insert(versions).values(insertVersion).returning();
    return version;
  }
  
  // Suggestion operations
  async getSuggestions(chapterId: number): Promise<Suggestion[]> {
    return db.select().from(suggestions).where(eq(suggestions.chapterId, chapterId));
  }
  
  async getSuggestion(id: number): Promise<Suggestion | undefined> {
    const [suggestion] = await db.select().from(suggestions).where(eq(suggestions.id, id));
    return suggestion;
  }
  
  async createSuggestion(insertSuggestion: InsertSuggestion): Promise<Suggestion> {
    const [suggestion] = await db.insert(suggestions).values(insertSuggestion).returning();
    return suggestion;
  }
  
  async updateSuggestion(id: number, suggestionUpdate: Partial<InsertSuggestion>): Promise<Suggestion | undefined> {
    const [suggestion] = await db
      .update(suggestions)
      .set(suggestionUpdate)
      .where(eq(suggestions.id, id))
      .returning();
    return suggestion;
  }
  
  async deleteSuggestion(id: number): Promise<boolean> {
    const [deleted] = await db.delete(suggestions).where(eq(suggestions.id, id)).returning();
    return !!deleted;
  }
  
  // Genre details operations
  async getGenreDetails(storyId: number): Promise<GenreDetails | undefined> {
    const [details] = await db.select().from(genreDetails).where(eq(genreDetails.storyId, storyId));
    return details;
  }
  
  async createGenreDetails(insertGenreDetails: InsertGenreDetails): Promise<GenreDetails> {
    const [details] = await db.insert(genreDetails).values(insertGenreDetails).returning();
    return details;
  }
  
  async updateGenreDetails(id: number, genreDetailsUpdate: Partial<InsertGenreDetails>): Promise<GenreDetails | undefined> {
    const [details] = await db
      .update(genreDetails)
      .set(genreDetailsUpdate)
      .where(eq(genreDetails.id, id))
      .returning();
    return details;
  }
  
  // World details operations
  async getWorldDetails(storyId: number): Promise<WorldDetails | undefined> {
    const [details] = await db.select().from(worldDetails).where(eq(worldDetails.storyId, storyId));
    return details;
  }
  
  async createWorldDetails(insertWorldDetails: InsertWorldDetails): Promise<WorldDetails> {
    const [details] = await db.insert(worldDetails).values(insertWorldDetails).returning();
    return details;
  }
  
  async updateWorldDetails(id: number, worldDetailsUpdate: Partial<InsertWorldDetails>): Promise<WorldDetails | undefined> {
    const [details] = await db
      .update(worldDetails)
      .set(worldDetailsUpdate)
      .where(eq(worldDetails.id, id))
      .returning();
    return details;
  }
  
  // Narrative vector operations
  async getNarrativeVectors(storyId: number): Promise<NarrativeVector[]> {
    return db.select().from(narrativeVectors).where(eq(narrativeVectors.storyId, storyId));
  }
  
  async getNarrativeVectorsByChapter(chapterId: number): Promise<NarrativeVector[]> {
    return db.select().from(narrativeVectors).where(eq(narrativeVectors.chapterId, chapterId));
  }
  
  async createNarrativeVector(insertNarrativeVector: InsertNarrativeVector): Promise<NarrativeVector> {
    const [vector] = await db.insert(narrativeVectors).values(insertNarrativeVector).returning();
    return vector;
  }
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private stories: Map<number, Story>;
  private chapters: Map<number, Chapter>;
  private characters: Map<number, Character>;
  private versions: Map<number, Version>;
  private suggestions: Map<number, Suggestion>;
  private genreDetails: Map<number, GenreDetails>;
  private worldDetails: Map<number, WorldDetails>;
  private narrativeVectors: Map<number, NarrativeVector>;
  
  private userId: number;
  private storyId: number;
  private chapterId: number;
  private characterId: number;
  private versionId: number;
  private suggestionId: number;
  private genreDetailsId: number;
  private worldDetailsId: number;
  private narrativeVectorId: number;
  
  constructor() {
    this.users = new Map();
    this.stories = new Map();
    this.chapters = new Map();
    this.characters = new Map();
    this.versions = new Map();
    this.suggestions = new Map();
    this.genreDetails = new Map();
    this.worldDetails = new Map();
    this.narrativeVectors = new Map();
    
    this.userId = 1;
    this.storyId = 1;
    this.chapterId = 1;
    this.characterId = 1;
    this.versionId = 1;
    this.suggestionId = 1;
    this.genreDetailsId = 1;
    this.worldDetailsId = 1;
    this.narrativeVectorId = 1;
    
    // Seed with demo user
    this.users.set(1, {
      id: 1,
      username: 'demo',
      password: 'password',
      displayName: 'Demo User',
      email: 'demo@storyflow.com',
      createdAt: new Date(),
    });
  }
  
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }
  
  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }
  
  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userId++;
    const now = new Date();
    const user: User = { ...insertUser, id, createdAt: now };
    this.users.set(id, user);
    return user;
  }
  
  // Story operations
  async getStories(userId: number): Promise<Story[]> {
    return Array.from(this.stories.values()).filter(
      (story) => story.userId === userId,
    );
  }
  
  async getStory(id: number): Promise<Story | undefined> {
    return this.stories.get(id);
  }
  
  async createStory(insertStory: InsertStory): Promise<Story> {
    const id = this.storyId++;
    const now = new Date();
    const story: Story = { ...insertStory, id, createdAt: now, updatedAt: now };
    this.stories.set(id, story);
    return story;
  }
  
  async updateStory(id: number, storyUpdate: Partial<InsertStory>): Promise<Story | undefined> {
    const story = this.stories.get(id);
    if (!story) return undefined;
    
    const updatedStory: Story = { 
      ...story, 
      ...storyUpdate, 
      updatedAt: new Date() 
    };
    
    this.stories.set(id, updatedStory);
    return updatedStory;
  }
  
  async deleteStory(id: number): Promise<boolean> {
    return this.stories.delete(id);
  }
  
  // Chapter operations
  async getChapters(storyId: number): Promise<Chapter[]> {
    return Array.from(this.chapters.values())
      .filter((chapter) => chapter.storyId === storyId)
      .sort((a, b) => a.order - b.order);
  }
  
  async getChapter(id: number): Promise<Chapter | undefined> {
    return this.chapters.get(id);
  }
  
  async createChapter(insertChapter: InsertChapter): Promise<Chapter> {
    const id = this.chapterId++;
    const now = new Date();
    const chapter: Chapter = { 
      ...insertChapter, 
      id, 
      createdAt: now, 
      updatedAt: now 
    };
    
    this.chapters.set(id, chapter);
    return chapter;
  }
  
  async updateChapter(id: number, chapterUpdate: Partial<InsertChapter>): Promise<Chapter | undefined> {
    const chapter = this.chapters.get(id);
    if (!chapter) return undefined;
    
    const updatedChapter: Chapter = { 
      ...chapter, 
      ...chapterUpdate, 
      updatedAt: new Date() 
    };
    
    this.chapters.set(id, updatedChapter);
    return updatedChapter;
  }
  
  async deleteChapter(id: number): Promise<boolean> {
    return this.chapters.delete(id);
  }
  
  // Character operations
  async getCharacters(storyId: number): Promise<Character[]> {
    return Array.from(this.characters.values()).filter(
      (character) => character.storyId === storyId,
    );
  }
  
  async getCharacter(id: number): Promise<Character | undefined> {
    return this.characters.get(id);
  }
  
  async createCharacter(insertCharacter: InsertCharacter): Promise<Character> {
    const id = this.characterId++;
    const now = new Date();
    const character: Character = { 
      ...insertCharacter, 
      id, 
      createdAt: now 
    };
    
    this.characters.set(id, character);
    return character;
  }
  
  async updateCharacter(id: number, characterUpdate: Partial<InsertCharacter>): Promise<Character | undefined> {
    const character = this.characters.get(id);
    if (!character) return undefined;
    
    const updatedCharacter: Character = { 
      ...character, 
      ...characterUpdate
    };
    
    this.characters.set(id, updatedCharacter);
    return updatedCharacter;
  }
  
  async deleteCharacter(id: number): Promise<boolean> {
    return this.characters.delete(id);
  }
  
  // Version operations
  async getVersions(chapterId: number): Promise<Version[]> {
    return Array.from(this.versions.values())
      .filter((version) => version.chapterId === chapterId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
  
  async getVersion(id: number): Promise<Version | undefined> {
    return this.versions.get(id);
  }
  
  async createVersion(insertVersion: InsertVersion): Promise<Version> {
    const id = this.versionId++;
    const now = new Date();
    const version: Version = { 
      ...insertVersion, 
      id, 
      createdAt: now 
    };
    
    this.versions.set(id, version);
    return version;
  }
  
  // Suggestion operations
  async getSuggestions(chapterId: number): Promise<Suggestion[]> {
    return Array.from(this.suggestions.values()).filter(
      (suggestion) => suggestion.chapterId === chapterId,
    );
  }
  
  async getSuggestion(id: number): Promise<Suggestion | undefined> {
    return this.suggestions.get(id);
  }
  
  async createSuggestion(insertSuggestion: InsertSuggestion): Promise<Suggestion> {
    const id = this.suggestionId++;
    const now = new Date();
    const suggestion: Suggestion = { 
      ...insertSuggestion, 
      id, 
      createdAt: now 
    };
    
    this.suggestions.set(id, suggestion);
    return suggestion;
  }
  
  async updateSuggestion(id: number, suggestionUpdate: Partial<InsertSuggestion>): Promise<Suggestion | undefined> {
    const suggestion = this.suggestions.get(id);
    if (!suggestion) return undefined;
    
    const updatedSuggestion: Suggestion = { 
      ...suggestion, 
      ...suggestionUpdate
    };
    
    this.suggestions.set(id, updatedSuggestion);
    return updatedSuggestion;
  }
  
  async deleteSuggestion(id: number): Promise<boolean> {
    return this.suggestions.delete(id);
  }
  
  // Genre details operations
  async getGenreDetails(storyId: number): Promise<GenreDetails | undefined> {
    return Array.from(this.genreDetails.values()).find(
      (details) => details.storyId === storyId
    );
  }
  
  async createGenreDetails(insertGenreDetails: InsertGenreDetails): Promise<GenreDetails> {
    const id = this.genreDetailsId++;
    const now = new Date();
    const details: GenreDetails = {
      ...insertGenreDetails,
      id,
      createdAt: now
    };
    
    this.genreDetails.set(id, details);
    return details;
  }
  
  async updateGenreDetails(id: number, genreDetailsUpdate: Partial<InsertGenreDetails>): Promise<GenreDetails | undefined> {
    const details = this.genreDetails.get(id);
    if (!details) return undefined;
    
    const updatedDetails: GenreDetails = {
      ...details,
      ...genreDetailsUpdate
    };
    
    this.genreDetails.set(id, updatedDetails);
    return updatedDetails;
  }
  
  // World details operations
  async getWorldDetails(storyId: number): Promise<WorldDetails | undefined> {
    return Array.from(this.worldDetails.values()).find(
      (details) => details.storyId === storyId
    );
  }
  
  async createWorldDetails(insertWorldDetails: InsertWorldDetails): Promise<WorldDetails> {
    const id = this.worldDetailsId++;
    const now = new Date();
    const details: WorldDetails = {
      ...insertWorldDetails,
      id,
      createdAt: now
    };
    
    this.worldDetails.set(id, details);
    return details;
  }
  
  async updateWorldDetails(id: number, worldDetailsUpdate: Partial<InsertWorldDetails>): Promise<WorldDetails | undefined> {
    const details = this.worldDetails.get(id);
    if (!details) return undefined;
    
    const updatedDetails: WorldDetails = {
      ...details,
      ...worldDetailsUpdate
    };
    
    this.worldDetails.set(id, updatedDetails);
    return updatedDetails;
  }
  
  // Narrative vector operations
  async getNarrativeVectors(storyId: number): Promise<NarrativeVector[]> {
    return Array.from(this.narrativeVectors.values()).filter(
      (vector) => vector.storyId === storyId
    );
  }
  
  async getNarrativeVectorsByChapter(chapterId: number): Promise<NarrativeVector[]> {
    return Array.from(this.narrativeVectors.values()).filter(
      (vector) => vector.chapterId === chapterId
    );
  }
  
  async createNarrativeVector(insertNarrativeVector: InsertNarrativeVector): Promise<NarrativeVector> {
    const id = this.narrativeVectorId++;
    const now = new Date();
    const vector: NarrativeVector = {
      ...insertNarrativeVector,
      id,
      createdAt: now
    };
    
    this.narrativeVectors.set(id, vector);
    return vector;
  }
}

export const storage = new DatabaseStorage();
