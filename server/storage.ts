import { 
  users, type User, type InsertUser,
  foundations, type Foundation, type InsertFoundation,
  stories, type Story, type InsertStory,
  chapters, type Chapter, type InsertChapter,
  characters, type Character, type InsertCharacter,
  characterDetails, type CharacterDetails, type InsertCharacterDetails,
  characterRelationships, type CharacterRelationship, type InsertCharacterRelationship,
  storyCharacters, type StoryCharacter, type InsertStoryCharacter,
  characterEvents, type CharacterEvent, type InsertCharacterEvent,
  versions, type Version, type InsertVersion,
  suggestions, type Suggestion, type InsertSuggestion,
  genreDetails, type GenreDetails, type InsertGenreDetails,
  worldDetails, type WorldDetails, type InsertWorldDetails,
  environmentDetails, type EnvironmentDetails, type InsertEnvironmentDetails,
  narrativeVectors, type NarrativeVector, type InsertNarrativeVector,
  foundationMessages, type FoundationMessage, type InsertFoundationMessage
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Foundation operations
  getFoundations(userId: number): Promise<Foundation[]>;
  getFoundation(id: number): Promise<Foundation | undefined>;
  createFoundation(foundation: InsertFoundation): Promise<Foundation>;
  updateFoundation(id: number, foundation: Partial<InsertFoundation>): Promise<Foundation | undefined>;
  deleteFoundation(id: number): Promise<boolean>;
  
  // Story operations
  getStoriesByUser(userId: number): Promise<Story[]>;
  getStoriesByFoundation(foundationId: number): Promise<Story[]>;
  getStory(id: number): Promise<Story | undefined>;
  createStory(story: InsertStory): Promise<Story>;
  updateStory(id: number, story: Partial<InsertStory>): Promise<Story | undefined>;
  deleteStory(id: number): Promise<boolean>;
  
  // Chapter operations
  getChapters(storyId: number): Promise<Chapter[]>;
  getChaptersByStoryId(storyId: number): Promise<Chapter[]>;
  getChapter(id: number): Promise<Chapter | undefined>;
  createChapter(chapter: InsertChapter): Promise<Chapter>;
  updateChapter(id: number, chapter: Partial<InsertChapter>): Promise<Chapter | undefined>;
  deleteChapter(id: number): Promise<boolean>;
  
  // Character operations
  getCharactersByFoundation(foundationId: number): Promise<Character[]>;
  getCharacter(id: number): Promise<Character | undefined>;
  createCharacter(character: InsertCharacter): Promise<Character>;
  updateCharacter(id: number, character: Partial<InsertCharacter>): Promise<Character | undefined>;
  deleteCharacter(id: number): Promise<boolean>;
  
  // Character Details operations
  getCharacterDetailsByFoundation(foundationId: number): Promise<CharacterDetails[]>;
  getCharacterDetails(id: number): Promise<CharacterDetails | undefined>;
  createCharacterDetails(characterDetails: InsertCharacterDetails): Promise<CharacterDetails>;
  updateCharacterDetails(id: number, characterDetails: Partial<InsertCharacterDetails>): Promise<CharacterDetails | undefined>;
  deleteCharacterDetails(id: number): Promise<boolean>;
  getCharacterDetailsByNameAndFoundation(name: string, foundationId: number): Promise<CharacterDetails | undefined>;
  
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
  deleteVersionsByChapterId(chapterId: number): Promise<boolean>;
  
  // Suggestion operations
  getSuggestions(chapterId: number): Promise<Suggestion[]>;
  getSuggestion(id: number): Promise<Suggestion | undefined>;
  createSuggestion(suggestion: InsertSuggestion): Promise<Suggestion>;
  updateSuggestion(id: number, suggestion: Partial<InsertSuggestion>): Promise<Suggestion | undefined>;
  deleteSuggestion(id: number): Promise<boolean>;
  
  // Genre details operations
  getGenreDetailsByFoundation(foundationId: number): Promise<GenreDetails | undefined>;
  createGenreDetails(genreDetails: InsertGenreDetails): Promise<GenreDetails>;
  updateGenreDetails(id: number, genreDetails: Partial<InsertGenreDetails>): Promise<GenreDetails | undefined>;
  
  // World details operations (replaces Environment details)
  getWorldDetailsByFoundation(foundationId: number): Promise<WorldDetails | undefined>;
  getWorldDetails(id: number): Promise<WorldDetails | undefined>;
  createWorldDetails(worldDetails: InsertWorldDetails): Promise<WorldDetails>;
  updateWorldDetails(id: number, worldDetails: Partial<InsertWorldDetails>): Promise<WorldDetails | undefined>;
  
  // Environment details operations (kept for backward compatibility)
  getEnvironmentDetailsByFoundation(foundationId: number): Promise<EnvironmentDetails | undefined>;
  createEnvironmentDetails(environmentDetails: InsertEnvironmentDetails): Promise<EnvironmentDetails>;
  updateEnvironmentDetails(id: number, environmentDetails: Partial<InsertEnvironmentDetails>): Promise<EnvironmentDetails | undefined>;
  
  // Narrative vector operations
  getNarrativeVectors(storyId: number): Promise<NarrativeVector[]>;
  getNarrativeVectorsByChapter(chapterId: number): Promise<NarrativeVector[]>;
  createNarrativeVector(narrativeVector: InsertNarrativeVector): Promise<NarrativeVector>;
  
  // Foundation message operations
  getFoundationMessages(foundationId: number): Promise<FoundationMessage[]>;
  createFoundationMessage(message: InsertFoundationMessage): Promise<FoundationMessage>;
  deleteFoundationMessagesByFoundationId(foundationId: number): Promise<boolean>;
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
  
  // Foundation operations
  async getFoundations(userId: number): Promise<Foundation[]> {
    return db.select().from(foundations).where(eq(foundations.userId, userId));
  }
  
  async getFoundation(id: number): Promise<Foundation | undefined> {
    console.log(`Storage: Fetching foundation with ID: ${id}, type: ${typeof id}`);
    
    if (isNaN(id)) {
      console.error(`Storage: Invalid foundation ID: ${id}`);
      return undefined;
    }
    
    try {
      const [foundation] = await db.select().from(foundations).where(eq(foundations.id, id));
      console.log(`Storage: Foundation lookup result:`, foundation ? `Found foundation with ID ${foundation.id}` : 'Foundation not found');
      return foundation;
    } catch (error) {
      console.error(`Storage: Error fetching foundation with ID ${id}:`, error);
      throw error;
    }
  }
  
  async createFoundation(insertFoundation: InsertFoundation): Promise<Foundation> {
    const [foundation] = await db.insert(foundations).values(insertFoundation).returning();
    return foundation;
  }
  
  async updateFoundation(id: number, foundationUpdate: Partial<InsertFoundation>): Promise<Foundation | undefined> {
    const [foundation] = await db
      .update(foundations)
      .set({ ...foundationUpdate, updatedAt: new Date() })
      .where(eq(foundations.id, id))
      .returning();
    return foundation;
  }
  
  async deleteFoundation(id: number): Promise<boolean> {
    try {
      // Start a transaction to ensure all deletions are atomic
      await db.transaction(async (tx) => {
        // Delete dependent records first - starting with foundation messages
        await tx.delete(foundationMessages).where(eq(foundationMessages.foundationId, id));
        
        // Delete genre details
        await tx.delete(genreDetails).where(eq(genreDetails.foundationId, id));
        
        // Delete environment details
        await tx.delete(environmentDetails).where(eq(environmentDetails.foundationId, id));
        
        // Delete world details
        await tx.delete(worldDetails).where(eq(worldDetails.foundationId, id));
        
        // Delete characters and their details
        await tx.delete(characterDetails).where(eq(characterDetails.foundationId, id));
        await tx.delete(characters).where(eq(characters.foundationId, id));
        
        // Finally delete the foundation itself
        await tx.delete(foundations).where(eq(foundations.id, id));
      });
      
      return true;
    } catch (error) {
      console.error('Error in deleteFoundation transaction:', error);
      throw error;
    }
  }
  
  // Story operations
  async getStoriesByUser(userId: number): Promise<Story[]> {
    return db.select().from(stories).where(eq(stories.userId, userId));
  }
  
  async getStoriesByFoundation(foundationId: number): Promise<Story[]> {
    return db.select().from(stories).where(eq(stories.foundationId, foundationId));
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
  
  async getChaptersByStoryId(storyId: number): Promise<Chapter[]> {
    return db
      .select()
      .from(chapters)
      .where(eq(chapters.storyId, storyId));
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
  async getCharactersByFoundation(foundationId: number): Promise<Character[]> {
    return db.select().from(characters).where(eq(characters.foundationId, foundationId));
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
  
  // Character Details operations
  async getCharacterDetailsByFoundation(foundationId: number): Promise<CharacterDetails[]> {
    return db.select().from(characterDetails).where(eq(characterDetails.foundationId, foundationId));
  }
  
  async getCharacterDetails(id: number): Promise<CharacterDetails | undefined> {
    const [characterDetail] = await db.select().from(characterDetails).where(eq(characterDetails.id, id));
    return characterDetail;
  }
  
  async createCharacterDetails(insertCharacterDetails: InsertCharacterDetails): Promise<CharacterDetails> {
    const [characterDetail] = await db.insert(characterDetails).values(insertCharacterDetails).returning();
    return characterDetail;
  }
  
  async updateCharacterDetails(id: number, characterDetailsUpdate: Partial<InsertCharacterDetails>): Promise<CharacterDetails | undefined> {
    const [characterDetail] = await db
      .update(characterDetails)
      .set({ ...characterDetailsUpdate, updatedAt: new Date() })
      .where(eq(characterDetails.id, id))
      .returning();
    return characterDetail;
  }
  
  async deleteCharacterDetails(id: number): Promise<boolean> {
    const [deleted] = await db.delete(characterDetails).where(eq(characterDetails.id, id)).returning();
    return !!deleted;
  }
  
  async getCharacterDetailsByNameAndFoundation(name: string, foundationId: number): Promise<CharacterDetails | undefined> {
    const [characterDetail] = await db.select()
      .from(characterDetails)
      .where(and(
        eq(characterDetails.character_name, name),
        eq(characterDetails.foundationId, foundationId)
      ));
    return characterDetail;
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
  
  async deleteVersionsByChapterId(chapterId: number): Promise<boolean> {
    await db.delete(versions).where(eq(versions.chapterId, chapterId));
    return true;
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
  async getGenreDetailsByFoundation(foundationId: number): Promise<GenreDetails | undefined> {
    console.log(`[GENRE DB] Looking up genre details for foundation ${foundationId}`);
    try {
      const foundationGenreDetails = await db.select().from(genreDetails).where(eq(genreDetails.foundationId, foundationId));
      console.log(`[GENRE DB] Query executed, found ${foundationGenreDetails.length} records`);
      
      if (foundationGenreDetails.length === 0) {
        console.log(`[GENRE DB] No genre details found for foundation ${foundationId}`);
        return undefined;
      }
      
      const [details] = foundationGenreDetails;
      console.log(`[GENRE DB] Found genre details with ID ${details.id} and genre '${details.mainGenre}'`);
      
      return details;
    } catch (error) {
      console.error(`[GENRE DB] Error retrieving genre details:`, error);
      return undefined;
    }
  }
  
  async createGenreDetails(insertGenreDetails: InsertGenreDetails): Promise<GenreDetails> {
    console.log(`[GENRE DB] Creating new genre details for foundation ${insertGenreDetails.foundationId}`);
    console.log(`[GENRE DB] Genre data: ${JSON.stringify({
      mainGenre: insertGenreDetails.mainGenre,
      foundationId: insertGenreDetails.foundationId
    })}`);
    
    try {
      // Ensure we have a valid data object
      const genreData = { ...insertGenreDetails };
      
      // Ensure we have a valid mainGenre string
      if (!genreData.mainGenre || typeof genreData.mainGenre !== 'string' || genreData.mainGenre.trim() === '') {
        console.log(`[GENRE DB] Setting default mainGenre`);
        genreData.mainGenre = 'Custom Genre';
      }
      
      const [details] = await db.insert(genreDetails).values(genreData).returning();
      console.log(`[GENRE DB] Successfully created genre details with ID ${details.id}`);
      return details;
    } catch (error) {
      console.error(`[GENRE DB] Error creating genre details:`, error);
      throw error;
    }
  }
  
  async updateGenreDetails(id: number, genreDetailsUpdate: Partial<InsertGenreDetails>): Promise<GenreDetails | undefined> {
    console.log(`[GENRE DB] Updating genre details with ID ${id}`);
    console.log(`[GENRE DB] Update data: ${JSON.stringify({
      mainGenre: genreDetailsUpdate.mainGenre,
      foundationId: genreDetailsUpdate.foundationId
    })}`);
    
    try {
      // Create a safe copy of the update data
      const safeUpdate = { ...genreDetailsUpdate };
      
      // Ensure mainGenre is valid if it's being updated
      if (safeUpdate.mainGenre !== undefined) {
        if (!safeUpdate.mainGenre || typeof safeUpdate.mainGenre !== 'string' || safeUpdate.mainGenre.trim() === '') {
          console.log(`[GENRE DB] Setting default mainGenre for update`);
          safeUpdate.mainGenre = 'Custom Genre';
        }
      }
      
      // Set the current date (no direct property assignment since updatedAt might not be in type)
      
      const [details] = await db
        .update(genreDetails)
        .set(safeUpdate)
        .where(eq(genreDetails.id, id))
        .returning();
      
      if (details) {
        console.log(`[GENRE DB] Successfully updated genre details with ID ${details.id}`);
      } else {
        console.log(`[GENRE DB] No record found for update with ID ${id}`);
      }
      
      return details;
    } catch (error) {
      console.error(`[GENRE DB] Error updating genre details:`, error);
      return undefined;
    }
  }
  
  // World details operations (primary world building data)
  async getWorldDetailsByFoundation(foundationId: number): Promise<WorldDetails | undefined> {
    const [details] = await db.select().from(worldDetails).where(eq(worldDetails.foundationId, foundationId));
    return details;
  }
  
  async getWorldDetails(id: number): Promise<WorldDetails | undefined> {
    const [details] = await db.select().from(worldDetails).where(eq(worldDetails.id, id));
    return details;
  }
  
  async createWorldDetails(insertWorldDetails: InsertWorldDetails): Promise<WorldDetails> {
    const [details] = await db.insert(worldDetails).values(insertWorldDetails).returning();
    return details;
  }
  
  async updateWorldDetails(id: number, worldDetailsUpdate: Partial<InsertWorldDetails>): Promise<WorldDetails | undefined> {
    const [details] = await db
      .update(worldDetails)
      .set({ ...worldDetailsUpdate, updatedAt: new Date() })
      .where(eq(worldDetails.id, id))
      .returning();
    return details;
  }
  
  // Environment details operations (now using separate environment_details table)
  async getEnvironmentDetailsByFoundation(foundationId: number): Promise<EnvironmentDetails | undefined> {
    try {
      console.log(`Getting environment details for foundation ${foundationId}`);
      const [details] = await db
        .select()
        .from(environmentDetails)
        .where(eq(environmentDetails.foundationId, foundationId));
      return details;
    } catch (error) {
      console.error('Error fetching environment details:', error);
      return undefined;
    }
  }
  
  async createEnvironmentDetails(insertEnvironmentDetails: InsertEnvironmentDetails): Promise<EnvironmentDetails> {
    try {
      console.log(`Creating environment details with data:`, JSON.stringify(insertEnvironmentDetails, null, 2));
      
      // Create the environment details with the fields from the schema
      const [details] = await db
        .insert(environmentDetails)
        .values(insertEnvironmentDetails)
        .returning();
      return details;
    } catch (error) {
      console.error('Error creating environment details:', error);
      throw error;
    }
  }
  
  async updateEnvironmentDetails(id: number, environmentDetailsUpdate: Partial<InsertEnvironmentDetails>): Promise<EnvironmentDetails | undefined> {
    try {
      console.log(`Updating environment details with ID ${id} with data:`, JSON.stringify(environmentDetailsUpdate, null, 2));
      
      // Add the updated timestamp
      const updateData = {
        ...environmentDetailsUpdate,
        updatedAt: new Date()
      };
      
      const [details] = await db
        .update(environmentDetails)
        .set(updateData)
        .where(eq(environmentDetails.id, id))
        .returning();
      return details;
    } catch (error) {
      console.error(`Error updating environment details with ID ${id}:`, error);
      return undefined;
    }
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

  // Foundation message operations
  async getFoundationMessages(foundationId: number): Promise<FoundationMessage[]> {
    return db
      .select()
      .from(foundationMessages)
      .where(eq(foundationMessages.foundationId, foundationId))
      .orderBy(foundationMessages.timestamp);
  }
  
  async createFoundationMessage(insertMessage: InsertFoundationMessage): Promise<FoundationMessage> {
    const [message] = await db.insert(foundationMessages).values(insertMessage).returning();
    return message;
  }
  
  async deleteFoundationMessagesByFoundationId(foundationId: number): Promise<boolean> {
    await db.delete(foundationMessages).where(eq(foundationMessages.foundationId, foundationId));
    return true;
  }

  // Temporary compatibility methods for world/foundation transition
  // These will be removed after the application is fully updated
  
  // World operations - redirect to foundation
  async getWorlds(userId: number): Promise<Foundation[]> {
    return this.getFoundations(userId);
  }
  
  async getWorld(id: number): Promise<Foundation | undefined> {
    return this.getFoundation(id);
  }
  
  async createWorld(insertWorld: InsertFoundation): Promise<Foundation> {
    return this.createFoundation(insertWorld);
  }
  
  async updateWorld(id: number, worldUpdate: Partial<InsertFoundation>): Promise<Foundation | undefined> {
    return this.updateFoundation(id, worldUpdate);
  }
  
  async deleteWorld(id: number): Promise<boolean> {
    return this.deleteFoundation(id);
  }
  
  // World details legacy operations - redirect to world details
  async getWorldDetailsByWorld(worldId: number): Promise<WorldDetails | undefined> {
    return this.getWorldDetailsByFoundation(worldId);
  }
  
  // Character operations with world ID - redirect to foundation ID
  async getCharactersByWorld(worldId: number): Promise<Character[]> {
    return this.getCharactersByFoundation(worldId);
  }
  
  // Genre details with world ID - redirect to foundation ID
  async getGenreDetailsByWorld(worldId: number): Promise<GenreDetails | undefined> {
    return this.getGenreDetailsByFoundation(worldId);
  }
  
  // Stories by world - redirect to foundation
  async getStoriesByWorld(worldId: number): Promise<Story[]> {
    return this.getStoriesByFoundation(worldId);
  }
}

export const storage = new DatabaseStorage();