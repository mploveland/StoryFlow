import { 
  users, type User, type InsertUser,
  stories, type Story, type InsertStory,
  chapters, type Chapter, type InsertChapter,
  characters, type Character, type InsertCharacter,
  versions, type Version, type InsertVersion,
  suggestions, type Suggestion, type InsertSuggestion
} from "@shared/schema";

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
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private stories: Map<number, Story>;
  private chapters: Map<number, Chapter>;
  private characters: Map<number, Character>;
  private versions: Map<number, Version>;
  private suggestions: Map<number, Suggestion>;
  
  private userId: number;
  private storyId: number;
  private chapterId: number;
  private characterId: number;
  private versionId: number;
  private suggestionId: number;
  
  constructor() {
    this.users = new Map();
    this.stories = new Map();
    this.chapters = new Map();
    this.characters = new Map();
    this.versions = new Map();
    this.suggestions = new Map();
    
    this.userId = 1;
    this.storyId = 1;
    this.chapterId = 1;
    this.characterId = 1;
    this.versionId = 1;
    this.suggestionId = 1;
    
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
}

export const storage = new MemStorage();
