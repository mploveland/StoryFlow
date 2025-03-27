import { 
  users, type User, type InsertUser,
  worlds, type World, type InsertWorld,
  stories, type Story, type InsertStory,
  chapters, type Chapter, type InsertChapter,
  characters, type Character, type InsertCharacter,
  characterRelationships, type CharacterRelationship, type InsertCharacterRelationship,
  storyCharacters, type StoryCharacter, type InsertStoryCharacter,
  characterEvents, type CharacterEvent, type InsertCharacterEvent,
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
  
  // World operations
  getWorlds(userId: number): Promise<World[]>;
  getWorld(id: number): Promise<World | undefined>;
  createWorld(world: InsertWorld): Promise<World>;
  updateWorld(id: number, world: Partial<InsertWorld>): Promise<World | undefined>;
  deleteWorld(id: number): Promise<boolean>;
  
  // Story operations
  getStoriesByUser(userId: number): Promise<Story[]>;
  getStoriesByWorld(worldId: number): Promise<Story[]>;
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
  getCharactersByWorld(worldId: number): Promise<Character[]>;
  getCharacter(id: number): Promise<Character | undefined>;
  createCharacter(character: InsertCharacter): Promise<Character>;
  updateCharacter(id: number, character: Partial<InsertCharacter>): Promise<Character | undefined>;
  deleteCharacter(id: number): Promise<boolean>;
  
  // Character relationship operations
  getCharacterRelationships(characterId: number): Promise<CharacterRelationship[]>;
  getCharacterRelationship(id: number): Promise<CharacterRelationship | undefined>;
  createCharacterRelationship(relationship: InsertCharacterRelationship): Promise<CharacterRelationship>;
  updateCharacterRelationship(id: number, relationship: Partial<InsertCharacterRelationship>): Promise<CharacterRelationship | undefined>;
  deleteCharacterRelationship(id: number): Promise<boolean>;
  
  // Story character operations
  getStoryCharacters(storyId: number): Promise<StoryCharacter[]>;
  getStoryCharactersByCharacter(characterId: number): Promise<StoryCharacter[]>;
  getStoryCharacter(id: number): Promise<StoryCharacter | undefined>;
  createStoryCharacter(storyCharacter: InsertStoryCharacter): Promise<StoryCharacter>;
  updateStoryCharacter(id: number, storyCharacter: Partial<InsertStoryCharacter>): Promise<StoryCharacter | undefined>;
  deleteStoryCharacter(id: number): Promise<boolean>;
  
  // Character event operations
  getCharacterEvents(characterId: number): Promise<CharacterEvent[]>;
  getCharacterEventsByStory(storyId: number): Promise<CharacterEvent[]>;
  getCharacterEvent(id: number): Promise<CharacterEvent | undefined>;
  createCharacterEvent(event: InsertCharacterEvent): Promise<CharacterEvent>;
  updateCharacterEvent(id: number, event: Partial<InsertCharacterEvent>): Promise<CharacterEvent | undefined>;
  deleteCharacterEvent(id: number): Promise<boolean>;
  
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
  getGenreDetailsByWorld(worldId: number): Promise<GenreDetails | undefined>;
  createGenreDetails(genreDetails: InsertGenreDetails): Promise<GenreDetails>;
  updateGenreDetails(id: number, genreDetails: Partial<InsertGenreDetails>): Promise<GenreDetails | undefined>;
  
  // World details operations
  getWorldDetailsByWorld(worldId: number): Promise<WorldDetails | undefined>;
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
  
  // World operations
  async getWorlds(userId: number): Promise<World[]> {
    return db.select().from(worlds).where(eq(worlds.userId, userId));
  }
  
  async getWorld(id: number): Promise<World | undefined> {
    const [world] = await db.select().from(worlds).where(eq(worlds.id, id));
    return world;
  }
  
  async createWorld(insertWorld: InsertWorld): Promise<World> {
    const [world] = await db.insert(worlds).values(insertWorld).returning();
    return world;
  }
  
  async updateWorld(id: number, worldUpdate: Partial<InsertWorld>): Promise<World | undefined> {
    const [world] = await db
      .update(worlds)
      .set({ ...worldUpdate, updatedAt: new Date() })
      .where(eq(worlds.id, id))
      .returning();
    return world;
  }
  
  async deleteWorld(id: number): Promise<boolean> {
    const [deleted] = await db.delete(worlds).where(eq(worlds.id, id)).returning();
    return !!deleted;
  }
  
  // Story operations
  async getStoriesByUser(userId: number): Promise<Story[]> {
    return db.select().from(stories).where(eq(stories.userId, userId));
  }
  
  async getStoriesByWorld(worldId: number): Promise<Story[]> {
    return db.select().from(stories).where(eq(stories.worldId, worldId));
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
  async getCharactersByWorld(worldId: number): Promise<Character[]> {
    return db.select().from(characters).where(eq(characters.worldId, worldId));
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
      .set({ ...characterUpdate, updatedAt: new Date() })
      .where(eq(characters.id, id))
      .returning();
    return character;
  }
  
  async deleteCharacter(id: number): Promise<boolean> {
    const [deleted] = await db.delete(characters).where(eq(characters.id, id)).returning();
    return !!deleted;
  }
  
  // Character relationship operations
  async getCharacterRelationships(characterId: number): Promise<CharacterRelationship[]> {
    return db.select().from(characterRelationships).where(eq(characterRelationships.characterId, characterId));
  }
  
  async getCharacterRelationship(id: number): Promise<CharacterRelationship | undefined> {
    const [relationship] = await db.select().from(characterRelationships).where(eq(characterRelationships.id, id));
    return relationship;
  }
  
  async createCharacterRelationship(insertRelationship: InsertCharacterRelationship): Promise<CharacterRelationship> {
    const [relationship] = await db.insert(characterRelationships).values(insertRelationship).returning();
    return relationship;
  }
  
  async updateCharacterRelationship(id: number, relationshipUpdate: Partial<InsertCharacterRelationship>): Promise<CharacterRelationship | undefined> {
    const [relationship] = await db
      .update(characterRelationships)
      .set({ ...relationshipUpdate, updatedAt: new Date() })
      .where(eq(characterRelationships.id, id))
      .returning();
    return relationship;
  }
  
  async deleteCharacterRelationship(id: number): Promise<boolean> {
    const [deleted] = await db.delete(characterRelationships).where(eq(characterRelationships.id, id)).returning();
    return !!deleted;
  }
  
  // Story character operations
  async getStoryCharacters(storyId: number): Promise<StoryCharacter[]> {
    return db.select().from(storyCharacters).where(eq(storyCharacters.storyId, storyId));
  }
  
  async getStoryCharactersByCharacter(characterId: number): Promise<StoryCharacter[]> {
    return db.select().from(storyCharacters).where(eq(storyCharacters.characterId, characterId));
  }
  
  async getStoryCharacter(id: number): Promise<StoryCharacter | undefined> {
    const [storyCharacter] = await db.select().from(storyCharacters).where(eq(storyCharacters.id, id));
    return storyCharacter;
  }
  
  async createStoryCharacter(insertStoryCharacter: InsertStoryCharacter): Promise<StoryCharacter> {
    const [storyCharacter] = await db.insert(storyCharacters).values(insertStoryCharacter).returning();
    return storyCharacter;
  }
  
  async updateStoryCharacter(id: number, storyCharacterUpdate: Partial<InsertStoryCharacter>): Promise<StoryCharacter | undefined> {
    const [storyCharacter] = await db
      .update(storyCharacters)
      .set(storyCharacterUpdate)
      .where(eq(storyCharacters.id, id))
      .returning();
    return storyCharacter;
  }
  
  async deleteStoryCharacter(id: number): Promise<boolean> {
    const [deleted] = await db.delete(storyCharacters).where(eq(storyCharacters.id, id)).returning();
    return !!deleted;
  }
  
  // Character event operations
  async getCharacterEvents(characterId: number): Promise<CharacterEvent[]> {
    return db.select().from(characterEvents).where(eq(characterEvents.characterId, characterId));
  }
  
  async getCharacterEventsByStory(storyId: number): Promise<CharacterEvent[]> {
    return db.select().from(characterEvents).where(eq(characterEvents.storyId, storyId));
  }
  
  async getCharacterEvent(id: number): Promise<CharacterEvent | undefined> {
    const [event] = await db.select().from(characterEvents).where(eq(characterEvents.id, id));
    return event;
  }
  
  async createCharacterEvent(insertEvent: InsertCharacterEvent): Promise<CharacterEvent> {
    const [event] = await db.insert(characterEvents).values(insertEvent).returning();
    return event;
  }
  
  async updateCharacterEvent(id: number, eventUpdate: Partial<InsertCharacterEvent>): Promise<CharacterEvent | undefined> {
    const [event] = await db
      .update(characterEvents)
      .set(eventUpdate)
      .where(eq(characterEvents.id, id))
      .returning();
    return event;
  }
  
  async deleteCharacterEvent(id: number): Promise<boolean> {
    const [deleted] = await db.delete(characterEvents).where(eq(characterEvents.id, id)).returning();
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
  async getGenreDetailsByWorld(worldId: number): Promise<GenreDetails | undefined> {
    const [details] = await db.select().from(genreDetails).where(eq(genreDetails.worldId, worldId));
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
  async getWorldDetailsByWorld(worldId: number): Promise<WorldDetails | undefined> {
    const [details] = await db.select().from(worldDetails).where(eq(worldDetails.worldId, worldId));
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
  private worlds: Map<number, World>;
  private stories: Map<number, Story>;
  private chapters: Map<number, Chapter>;
  private characters: Map<number, Character>;
  private characterRelationships: Map<number, CharacterRelationship>;
  private storyCharacters: Map<number, StoryCharacter>;
  private characterEvents: Map<number, CharacterEvent>;
  private versions: Map<number, Version>;
  private suggestions: Map<number, Suggestion>;
  private genreDetails: Map<number, GenreDetails>;
  private worldDetails: Map<number, WorldDetails>;
  private narrativeVectors: Map<number, NarrativeVector>;
  
  private userId: number;
  private worldId: number;
  private storyId: number;
  private chapterId: number;
  private characterId: number;
  private relationshipId: number;
  private storyCharacterId: number;
  private eventId: number;
  private versionId: number;
  private suggestionId: number;
  private genreDetailsId: number;
  private worldDetailsId: number;
  private narrativeVectorId: number;
  
  constructor() {
    this.users = new Map();
    this.worlds = new Map();
    this.stories = new Map();
    this.chapters = new Map();
    this.characters = new Map();
    this.characterRelationships = new Map();
    this.storyCharacters = new Map();
    this.characterEvents = new Map();
    this.versions = new Map();
    this.suggestions = new Map();
    this.genreDetails = new Map();
    this.worldDetails = new Map();
    this.narrativeVectors = new Map();
    
    this.userId = 1;
    this.worldId = 1;
    this.storyId = 1;
    this.chapterId = 1;
    this.characterId = 1;
    this.relationshipId = 1;
    this.storyCharacterId = 1;
    this.eventId = 1;
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
  
  // World operations
  async getWorlds(userId: number): Promise<World[]> {
    return Array.from(this.worlds.values()).filter(
      (world) => world.userId === userId,
    );
  }
  
  async getWorld(id: number): Promise<World | undefined> {
    return this.worlds.get(id);
  }
  
  async createWorld(insertWorld: InsertWorld): Promise<World> {
    const id = this.worldId++;
    const now = new Date();
    const world: World = {
      ...insertWorld,
      id,
      createdAt: now,
      updatedAt: now,
    };
    this.worlds.set(id, world);
    return world;
  }
  
  async updateWorld(id: number, worldUpdate: Partial<InsertWorld>): Promise<World | undefined> {
    const world = this.worlds.get(id);
    if (!world) return undefined;
    
    const updatedWorld: World = {
      ...world,
      ...worldUpdate,
      updatedAt: new Date(),
    };
    
    this.worlds.set(id, updatedWorld);
    return updatedWorld;
  }
  
  async deleteWorld(id: number): Promise<boolean> {
    return this.worlds.delete(id);
  }
  
  // Story operations
  async getStoriesByUser(userId: number): Promise<Story[]> {
    return Array.from(this.stories.values()).filter(
      (story) => story.userId === userId,
    );
  }
  
  async getStoriesByWorld(worldId: number): Promise<Story[]> {
    return Array.from(this.stories.values()).filter(
      (story) => story.worldId === worldId,
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
  async getCharactersByWorld(worldId: number): Promise<Character[]> {
    return Array.from(this.characters.values()).filter(
      (character) => character.worldId === worldId,
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
      createdAt: now,
      updatedAt: now,
      evolutionStage: 1,
      significantEvents: []
    };
    
    this.characters.set(id, character);
    return character;
  }
  
  async updateCharacter(id: number, characterUpdate: Partial<InsertCharacter>): Promise<Character | undefined> {
    const character = this.characters.get(id);
    if (!character) return undefined;
    
    const updatedCharacter: Character = { 
      ...character, 
      ...characterUpdate,
      updatedAt: new Date()
    };
    
    this.characters.set(id, updatedCharacter);
    return updatedCharacter;
  }
  
  async deleteCharacter(id: number): Promise<boolean> {
    return this.characters.delete(id);
  }
  
  // Character relationship operations
  async getCharacterRelationships(characterId: number): Promise<CharacterRelationship[]> {
    return Array.from(this.characterRelationships.values()).filter(
      (relationship) => relationship.characterId === characterId,
    );
  }
  
  async getCharacterRelationship(id: number): Promise<CharacterRelationship | undefined> {
    return this.characterRelationships.get(id);
  }
  
  async createCharacterRelationship(insertRelationship: InsertCharacterRelationship): Promise<CharacterRelationship> {
    const id = this.relationshipId++;
    const now = new Date();
    const relationship: CharacterRelationship = {
      ...insertRelationship,
      id,
      createdAt: now,
      updatedAt: now
    };
    
    this.characterRelationships.set(id, relationship);
    return relationship;
  }
  
  async updateCharacterRelationship(id: number, relationshipUpdate: Partial<InsertCharacterRelationship>): Promise<CharacterRelationship | undefined> {
    const relationship = this.characterRelationships.get(id);
    if (!relationship) return undefined;
    
    const updatedRelationship: CharacterRelationship = {
      ...relationship,
      ...relationshipUpdate,
      updatedAt: new Date()
    };
    
    this.characterRelationships.set(id, updatedRelationship);
    return updatedRelationship;
  }
  
  async deleteCharacterRelationship(id: number): Promise<boolean> {
    return this.characterRelationships.delete(id);
  }
  
  // Story character operations
  async getStoryCharacters(storyId: number): Promise<StoryCharacter[]> {
    return Array.from(this.storyCharacters.values()).filter(
      (storyCharacter) => storyCharacter.storyId === storyId,
    );
  }
  
  async getStoryCharactersByCharacter(characterId: number): Promise<StoryCharacter[]> {
    return Array.from(this.storyCharacters.values()).filter(
      (storyCharacter) => storyCharacter.characterId === characterId,
    );
  }
  
  async getStoryCharacter(id: number): Promise<StoryCharacter | undefined> {
    return this.storyCharacters.get(id);
  }
  
  async createStoryCharacter(insertStoryCharacter: InsertStoryCharacter): Promise<StoryCharacter> {
    const id = this.storyCharacterId++;
    const now = new Date();
    const storyCharacter: StoryCharacter = {
      ...insertStoryCharacter,
      id,
      createdAt: now
    };
    
    this.storyCharacters.set(id, storyCharacter);
    return storyCharacter;
  }
  
  async updateStoryCharacter(id: number, storyCharacterUpdate: Partial<InsertStoryCharacter>): Promise<StoryCharacter | undefined> {
    const storyCharacter = this.storyCharacters.get(id);
    if (!storyCharacter) return undefined;
    
    const updatedStoryCharacter: StoryCharacter = {
      ...storyCharacter,
      ...storyCharacterUpdate
    };
    
    this.storyCharacters.set(id, updatedStoryCharacter);
    return updatedStoryCharacter;
  }
  
  async deleteStoryCharacter(id: number): Promise<boolean> {
    return this.storyCharacters.delete(id);
  }
  
  // Character event operations
  async getCharacterEvents(characterId: number): Promise<CharacterEvent[]> {
    return Array.from(this.characterEvents.values()).filter(
      (event) => event.characterId === characterId,
    );
  }
  
  async getCharacterEventsByStory(storyId: number): Promise<CharacterEvent[]> {
    return Array.from(this.characterEvents.values()).filter(
      (event) => event.storyId === storyId,
    );
  }
  
  async getCharacterEvent(id: number): Promise<CharacterEvent | undefined> {
    return this.characterEvents.get(id);
  }
  
  async createCharacterEvent(insertEvent: InsertCharacterEvent): Promise<CharacterEvent> {
    const id = this.eventId++;
    const now = new Date();
    const event: CharacterEvent = {
      ...insertEvent,
      id,
      createdAt: now
    };
    
    this.characterEvents.set(id, event);
    return event;
  }
  
  async updateCharacterEvent(id: number, eventUpdate: Partial<InsertCharacterEvent>): Promise<CharacterEvent | undefined> {
    const event = this.characterEvents.get(id);
    if (!event) return undefined;
    
    const updatedEvent: CharacterEvent = {
      ...event,
      ...eventUpdate
    };
    
    this.characterEvents.set(id, updatedEvent);
    return updatedEvent;
  }
  
  async deleteCharacterEvent(id: number): Promise<boolean> {
    return this.characterEvents.delete(id);
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
  async getGenreDetailsByWorld(worldId: number): Promise<GenreDetails | undefined> {
    return Array.from(this.genreDetails.values()).find(
      (details) => details.worldId === worldId
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
  async getWorldDetailsByWorld(worldId: number): Promise<WorldDetails | undefined> {
    return Array.from(this.worldDetails.values()).find(
      (details) => details.worldId === worldId
    );
  }
  
  async createWorldDetails(insertWorldDetails: InsertWorldDetails): Promise<WorldDetails> {
    const id = this.worldDetailsId++;
    const now = new Date();
    const details: WorldDetails = {
      ...insertWorldDetails,
      id,
      createdAt: now,
      updatedAt: now
    };
    
    this.worldDetails.set(id, details);
    return details;
  }
  
  async updateWorldDetails(id: number, worldDetailsUpdate: Partial<InsertWorldDetails>): Promise<WorldDetails | undefined> {
    const details = this.worldDetails.get(id);
    if (!details) return undefined;
    
    const updatedDetails: WorldDetails = {
      ...details,
      ...worldDetailsUpdate,
      updatedAt: new Date()
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
