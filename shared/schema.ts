import { pgTable, text, serial, integer, boolean, timestamp, json, jsonb, varchar, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// User schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  displayName: text("display_name"),
  email: text("email"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  displayName: true,
  email: true,
});

// Foundation schema (container for world, environments, and characters)
export const foundations = pgTable("foundations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  description: text("description"),
  genre: text("genre"),
  threadId: text("thread_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertFoundationSchema = createInsertSchema(foundations).pick({
  userId: true,
  name: true,
  description: true,
  genre: true,
  threadId: true,
});

// Story schema - now referencing foundations instead of directly containing world data
export const stories = pgTable("stories", {
  id: serial("id").primaryKey(),
  foundationId: integer("foundation_id").notNull().references(() => foundations.id),
  userId: integer("user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  synopsis: text("synopsis"),
  theme: text("theme"),
  setting: text("setting"),
  creationProgress: text("creation_progress"), // JSON string of creation progress state
  status: varchar("status", { length: 20 }), // 'draft', 'in-progress', 'ready', 'published'
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertStorySchema = createInsertSchema(stories).pick({
  foundationId: true,
  userId: true,
  title: true,
  synopsis: true,
  theme: true, 
  setting: true,
  creationProgress: true,
  status: true,
});

// Relations for foundations
// Conversation messages for foundations
export const foundationMessages = pgTable("foundation_messages", {
  id: serial("id").primaryKey(),
  foundationId: integer("foundation_id").notNull().references(() => foundations.id),
  role: text("role").notNull(), // 'user' or 'assistant'
  content: text("content").notNull(),
  timestamp: timestamp("timestamp").defaultNow(),
});

export const insertFoundationMessageSchema = createInsertSchema(foundationMessages).pick({
  foundationId: true,
  role: true,
  content: true,
});

export const foundationsRelations = relations(foundations, ({ one, many }) => ({
  user: one(users, {
    fields: [foundations.userId],
    references: [users.id],
  }),
  stories: many(stories),
  characters: many(characters),
  characterDetails: many(characterDetails),
  worldDetails: one(worldDetails),
  environmentDetails: one(environmentDetails), // For backward compatibility
  genreDetails: one(genreDetails),
  messages: many(foundationMessages),
}));

// Relations for stories
export const storiesRelations = relations(stories, ({ one, many }) => ({
  foundation: one(foundations, {
    fields: [stories.foundationId],
    references: [foundations.id],
  }),
  user: one(users, {
    fields: [stories.userId],
    references: [users.id],
  }),
  chapters: many(chapters),
  storyCharacters: many(storyCharacters),
}));

// Chapter schema
export const chapters = pgTable("chapters", {
  id: serial("id").primaryKey(),
  storyId: integer("story_id").notNull().references(() => stories.id),
  title: text("title").notNull(),
  content: text("content"),
  order: integer("order").notNull(),
  wordCount: integer("word_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertChapterSchema = createInsertSchema(chapters).pick({
  storyId: true,
  title: true,
  content: true,
  order: true,
  wordCount: true,
});

// Relations for chapters
export const chaptersRelations = relations(chapters, ({ one, many }) => ({
  story: one(stories, {
    fields: [chapters.storyId],
    references: [stories.id],
  }),
  versions: many(versions),
  suggestions: many(suggestions),
  narrativeVectors: many(narrativeVectors),
}));

// Character schema - now associated with foundations, not stories
// Legacy character table - retained for backwards compatibility, will be phased out
export const characters = pgTable("characters", {
  id: serial("id").primaryKey(),
  foundationId: integer("foundation_id").notNull().references(() => foundations.id),
  name: text("name").notNull(),
  role: text("role"),
  background: text("background"),
  personality: text("personality").array(),
  goals: text("goals").array(),
  fears: text("fears").array(),
  skills: text("skills").array(),
  appearance: text("appearance"),
  voice: text("voice"),
  secrets: text("secrets"),
  quirks: text("quirks").array(),
  motivations: text("motivations").array(),
  flaws: text("flaws").array(),
  threadId: text("thread_id"),
  // Track character evolution over time
  evolutionStage: integer("evolution_stage").default(1),
  significantEvents: jsonb("significant_events").default([]),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// New enhanced character details table with expanded fields
export const characterDetails = pgTable("character_details", {
  id: serial("id").primaryKey(),
  foundationId: integer("foundation_id").notNull().references(() => foundations.id),
  // Core info - basic character information
  character_name: text("character_name").notNull(),
  age: integer("age"),
  gender: text("gender"),
  occupation: text("occupation"),
  nationality_ethnicity: text("nationality_ethnicity"),
  current_residence: text("current_residence"),
  
  // Physical Description
  height_build: text("height_build"),
  hair_description: text("hair_description"),
  eye_description: text("eye_description"),
  skin_complexion: text("skin_complexion"),
  facial_features: text("facial_features"),
  distinctive_features: text("distinctive_features"),
  body_type: text("body_type"),
  posture_body_language: text("posture_body_language"),
  typical_attire: text("typical_attire"),
  general_impression: text("general_impression"),
  
  // Backstory
  birthplace_family_background: text("birthplace_family_background"),
  childhood_experiences: text("childhood_experiences"),
  education_training: text("education_training"),
  major_life_events: text("major_life_events"),
  current_life_circumstances: text("current_life_circumstances"),
  
  // Psychological Profile
  personality_type: text("personality_type"),
  core_beliefs_values: text("core_beliefs_values"),
  fears_insecurities: text("fears_insecurities"),
  emotional_stability: text("emotional_stability"),
  coping_mechanisms: text("coping_mechanisms"),
  
  // Emotional Profile
  dominant_mood: text("dominant_mood"),
  emotional_triggers: text("emotional_triggers"),
  emotional_strengths_weaknesses: text("emotional_strengths_weaknesses"),
  response_to_conflict_stress: text("response_to_conflict_stress"),
  
  // Speech
  speech_accent_dialect: text("speech_accent_dialect"),
  speech_pace_tone: text("speech_pace_tone"),
  common_phrases_quirks: text("common_phrases_quirks"),
  formality_level: text("formality_level"),
  
  // Preferences & Personality
  hobbies_interests: text("hobbies_interests"),
  favorite_activities: text("favorite_activities"),
  favorite_foods_drinks: text("favorite_foods_drinks"),
  pet_peeves: text("pet_peeves"),
  disliked_activities: text("disliked_activities"),
  
  // Motivations
  short_term_goals: text("short_term_goals"),
  long_term_aspirations: text("long_term_aspirations"),
  deepest_desires: text("deepest_desires"),
  driving_motivations: text("driving_motivations"),
  
  // Relationships
  family_dynamics: text("family_dynamics"),
  friendships_social_life: text("friendships_social_life"),
  romantic_relationships: text("romantic_relationships"),
  professional_relationships: text("professional_relationships"),
  enemies_rivals: text("enemies_rivals"),
  
  // Internal Conflict
  secrets_hidden_aspects: text("secrets_hidden_aspects"),
  personal_contradictions: text("personal_contradictions"),
  internal_conflicts: text("internal_conflicts"),
  
  // Legacy fields (keeping for backward compatibility)
  role: text("role"),
  background: text("background"),
  personality: text("personality").array(),
  goals: text("goals").array(),
  fears: text("fears").array(),
  skills: text("skills").array(),
  appearance: text("appearance"),
  voice: text("voice"),
  secrets: text("secrets"),
  quirks: text("quirks").array(),
  motivations: text("motivations").array(),
  flaws: text("flaws").array(),
  
  // References / Metadata
  threadId: text("thread_id"),
  genre_id: integer("genre_id").references(() => genreDetails.id, { onDelete: 'set null' }),
  environment_id: integer("environment_id").references(() => environmentDetails.id, { onDelete: 'set null' }),
  world_id: integer("world_id").references(() => worldDetails.id, { onDelete: 'set null' }),
  
  // Character type/evolution tracking
  character_type: text("character_type").default('fictional'),
  evolutionStage: integer("evolution_stage").default(1),
  significantEvents: jsonb("significant_events").default([]),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertCharacterDetailsSchema = createInsertSchema(characterDetails).pick({
  foundationId: true,
  character_name: true,
  age: true,
  gender: true,
  occupation: true,
  nationality_ethnicity: true,
  current_residence: true,
  
  // Physical Description
  height_build: true,
  hair_description: true,
  eye_description: true,
  skin_complexion: true,
  facial_features: true,
  distinctive_features: true,
  body_type: true,
  posture_body_language: true,
  typical_attire: true,
  general_impression: true,
  
  // Backstory
  birthplace_family_background: true,
  childhood_experiences: true,
  education_training: true,
  major_life_events: true,
  current_life_circumstances: true,
  
  // Psychological Profile
  personality_type: true,
  core_beliefs_values: true,
  fears_insecurities: true,
  emotional_stability: true,
  coping_mechanisms: true,
  
  // Emotional Profile
  dominant_mood: true,
  emotional_triggers: true,
  emotional_strengths_weaknesses: true,
  response_to_conflict_stress: true,
  
  // Speech
  speech_accent_dialect: true,
  speech_pace_tone: true,
  common_phrases_quirks: true,
  formality_level: true,
  
  // Preferences & Personality
  hobbies_interests: true,
  favorite_activities: true,
  favorite_foods_drinks: true,
  pet_peeves: true,
  disliked_activities: true,
  
  // Motivations
  short_term_goals: true,
  long_term_aspirations: true,
  deepest_desires: true,
  driving_motivations: true,
  
  // Relationships
  family_dynamics: true,
  friendships_social_life: true,
  romantic_relationships: true,
  professional_relationships: true,
  enemies_rivals: true,
  
  // Internal Conflict
  secrets_hidden_aspects: true,
  personal_contradictions: true,
  internal_conflicts: true,
  
  // Legacy fields (keeping for backward compatibility)
  role: true,
  background: true,
  personality: true,
  goals: true,
  fears: true,
  skills: true,
  appearance: true,
  voice: true,
  secrets: true,
  quirks: true,
  motivations: true,
  flaws: true,
  
  // References / Metadata
  threadId: true,
  genre_id: true,
  environment_id: true,
  world_id: true,
  
  // Character type/evolution tracking
  character_type: true,
  evolutionStage: true,
  significantEvents: true,
});

// Keep legacy character schema for backward compatibility
export const insertCharacterSchema = createInsertSchema(characters).pick({
  foundationId: true,
  name: true,
  role: true,
  background: true,
  personality: true,
  goals: true,
  fears: true,
  skills: true,
  appearance: true,
  voice: true,
  secrets: true,
  quirks: true,
  motivations: true,
  flaws: true,
  threadId: true,
});

// Relationship types enum
export const relationshipTypeEnum = pgEnum('relationship_type', [
  'friend', 'enemy', 'family', 'ally', 'rival', 'love_interest', 'mentor', 'student', 'acquaintance', 'other'
]);

// Character relationships - tracks relationships between characters
export const characterRelationships = pgTable("character_relationships", {
  id: serial("id").primaryKey(),
  characterId: integer("character_id").notNull().references(() => characters.id),
  relatedCharacterId: integer("related_character_id").notNull().references(() => characters.id),
  relationshipType: relationshipTypeEnum("relationship_type").notNull(),
  description: text("description"),
  intensity: integer("intensity").default(5), // 1-10 scale for relationship intensity
  history: text("history"), // Historical context of the relationship
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertCharacterRelationshipSchema = createInsertSchema(characterRelationships).pick({
  characterId: true,
  relatedCharacterId: true,
  relationshipType: true,
  description: true,
  intensity: true,
  history: true,
});

// Story characters - tracks which characters appear in which stories
export const storyCharacters = pgTable("story_characters", {
  id: serial("id").primaryKey(),
  storyId: integer("story_id").notNull().references(() => stories.id),
  characterId: integer("character_id").notNull().references(() => characters.id),
  role: text("role"), // 'protagonist', 'antagonist', 'supporting', etc.
  importance: integer("importance").default(5), // 1-10 scale
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertStoryCharacterSchema = createInsertSchema(storyCharacters).pick({
  storyId: true,
  characterId: true,
  role: true,
  importance: true,
});

// Character event history - tracks significant events in a character's life
export const characterEvents = pgTable("character_events", {
  id: serial("id").primaryKey(),
  characterId: integer("character_id").notNull().references(() => characters.id),
  storyId: integer("story_id").references(() => stories.id), // Optional - event might not be tied to a specific story
  chapterId: integer("chapter_id").references(() => chapters.id), // Optional - event might not be tied to a specific chapter
  title: text("title").notNull(),
  description: text("description").notNull(),
  impact: text("impact").notNull(), // How this event changed the character
  date: text("date"), // In-universe date
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertCharacterEventSchema = createInsertSchema(characterEvents).pick({
  characterId: true,
  storyId: true,
  chapterId: true,
  title: true,
  description: true,
  impact: true,
  date: true,
});

// Relations for characters
export const charactersRelations = relations(characters, ({ one, many }) => ({
  foundation: one(foundations, {
    fields: [characters.foundationId],
    references: [foundations.id],
  }),
  relationships: many(characterRelationships, { relationName: 'primary_character' }),
  relatedTo: many(characterRelationships, { relationName: 'related_character' }),
  appearances: many(storyCharacters),
  events: many(characterEvents),
}));

// Relations for character details
export const characterDetailsRelations = relations(characterDetails, ({ one }) => ({
  foundation: one(foundations, {
    fields: [characterDetails.foundationId],
    references: [foundations.id],
  }),
  genre: one(genreDetails, {
    fields: [characterDetails.genre_id],
    references: [genreDetails.id],
  }),
  environment: one(environmentDetails, {
    fields: [characterDetails.environment_id],
    references: [environmentDetails.id],
  }),
  world: one(worldDetails, {
    fields: [characterDetails.world_id],
    references: [worldDetails.id],
  }),
}));

// Relations for character relationships
export const characterRelationshipsRelations = relations(characterRelationships, ({ one }) => ({
  character: one(characters, {
    fields: [characterRelationships.characterId],
    references: [characters.id],
    relationName: 'primary_character',
  }),
  relatedCharacter: one(characters, {
    fields: [characterRelationships.relatedCharacterId],
    references: [characters.id],
    relationName: 'related_character',
  }),
}));

// Relations for story characters
export const storyCharactersRelations = relations(storyCharacters, ({ one }) => ({
  story: one(stories, {
    fields: [storyCharacters.storyId],
    references: [stories.id],
  }),
  character: one(characters, {
    fields: [storyCharacters.characterId],
    references: [characters.id],
  }),
}));

// Relations for character events
export const characterEventsRelations = relations(characterEvents, ({ one }) => ({
  character: one(characters, {
    fields: [characterEvents.characterId],
    references: [characters.id],
  }),
  story: one(stories, {
    fields: [characterEvents.storyId],
    references: [stories.id],
  }),
  chapter: one(chapters, {
    fields: [characterEvents.chapterId],
    references: [chapters.id],
  }),
}));

// Version history schema
export const versions = pgTable("versions", {
  id: serial("id").primaryKey(),
  chapterId: integer("chapter_id").notNull().references(() => chapters.id),
  content: text("content").notNull(),
  wordCount: integer("word_count").default(0),
  type: text("type").notNull(), // 'auto', 'manual', 'ai-assisted'
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertVersionSchema = createInsertSchema(versions).pick({
  chapterId: true,
  content: true,
  wordCount: true,
  type: true,
});

// Relations for versions
export const versionsRelations = relations(versions, ({ one }) => ({
  chapter: one(chapters, {
    fields: [versions.chapterId],
    references: [chapters.id],
  }),
}));

// AI Suggestion schema
export const suggestions = pgTable("suggestions", {
  id: serial("id").primaryKey(),
  chapterId: integer("chapter_id").notNull().references(() => chapters.id),
  type: text("type").notNull(), // 'plot', 'character', 'style'
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  used: boolean("used").default(false),
});

export const insertSuggestionSchema = createInsertSchema(suggestions).pick({
  chapterId: true,
  type: true,
  content: true,
  used: true,
});

// Relations for suggestions
export const suggestionsRelations = relations(suggestions, ({ one }) => ({
  chapter: one(chapters, {
    fields: [suggestions.chapterId],
    references: [chapters.id],
  }),
}));

// Genre details schema
export const genreDetails = pgTable("genre_details", {
  id: serial("id").primaryKey(),
  foundationId: integer("foundation_id").notNull().references(() => foundations.id),
  // Basic genre information
  mainGenre: text("main_genre").notNull(),
  genreRationale: text("genre_rationale"),
  audienceExpectations: text("audience_expectations"),
  // Subgenre information
  subgenres: text("subgenres"),
  subgenreRationale: text("subgenre_rationale"),
  subgenreInteraction: text("subgenre_interaction"),
  subgenreTropes: text("subgenre_tropes"),
  // Mood and tone
  tone: text("tone"),
  mood: text("mood"),
  emotionalImpact: text("emotional_impact"),
  // Setting elements
  timePeriod: text("time_period"),
  technologyLevel: text("technology_level"),
  physicalEnvironment: text("physical_environment"),
  geography: text("geography"),
  // Social elements
  societalStructures: text("societal_structures"),
  culturalNorms: text("cultural_norms"),
  // Tropes and speculative elements
  keyTropes: text("key_tropes"),
  tropeStrategy: text("trope_strategy"),
  speculativeElements: text("speculative_elements"),
  speculativeRules: text("speculative_rules"),
  // Atmosphere and style
  atmosphere: text("atmosphere"),
  sensoryDetails: text("sensory_details"),
  atmosphericStyle: text("atmospheric_style"),
  thematicEnvironmentTieins: text("thematic_environment_tieins"),
  // Inspirations
  inspirations: text("inspirations"),
  inspirationDetails: text("inspiration_details"),
  divergenceFromInspirations: text("divergence_from_inspirations"),
  // Original data structure fields (kept for compatibility)
  name: text("name"),
  description: text("description"),
  themes: text("themes").array(),
  tropes: text("tropes").array(),
  commonSettings: text("common_settings").array(),
  typicalCharacters: text("typical_characters").array(),
  plotStructures: text("plot_structures").array(),
  styleGuide: jsonb("style_guide"),
  recommendedReading: text("recommended_reading").array(),
  popularExamples: text("popular_examples").array(),
  worldbuildingElements: text("worldbuilding_elements").array(),
  threadId: text("thread_id"),
  // Embeddings will be implemented later with pgvector
  embeddingJson: jsonb("embedding_json"),
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertGenreDetailsSchema = createInsertSchema(genreDetails).pick({
  foundationId: true,
  // Basic genre information
  mainGenre: true,
  genreRationale: true,
  audienceExpectations: true,
  // Subgenre information
  subgenres: true,
  subgenreRationale: true,
  subgenreInteraction: true,
  subgenreTropes: true,
  // Mood and tone
  tone: true,
  mood: true,
  emotionalImpact: true,
  // Setting elements
  timePeriod: true,
  technologyLevel: true,
  physicalEnvironment: true,
  geography: true,
  // Social elements
  societalStructures: true,
  culturalNorms: true,
  // Tropes and speculative elements
  keyTropes: true,
  tropeStrategy: true,
  speculativeElements: true,
  speculativeRules: true,
  // Atmosphere and style
  atmosphere: true,
  sensoryDetails: true,
  atmosphericStyle: true,
  thematicEnvironmentTieins: true,
  // Inspirations
  inspirations: true,
  inspirationDetails: true,
  divergenceFromInspirations: true,
  // Original fields kept for compatibility
  name: true,
  description: true,
  themes: true,
  tropes: true,
  commonSettings: true,
  typicalCharacters: true,
  plotStructures: true,
  styleGuide: true,
  recommendedReading: true,
  popularExamples: true,
  worldbuildingElements: true,
  threadId: true,
  embeddingJson: true,
});

// Relations for genre details
export const genreDetailsRelations = relations(genreDetails, ({ one }) => ({
  foundation: one(foundations, {
    fields: [genreDetails.foundationId],
    references: [foundations.id],
  }),
}));

// World details schema
export const worldDetails = pgTable("world_details", {
  id: serial("id").primaryKey(),
  foundationId: integer("foundation_id").notNull().references(() => foundations.id),
  world_name: text("world_name").notNull(),
  narrative_context: text("narrative_context"),
  global_geography_topography: text("global_geography_topography"),
  regions_territories: text("regions_territories"),
  boundaries_borders: text("boundaries_borders"),
  climate_environmental_zones: text("climate_environmental_zones"),
  environment_placements_distances: text("environment_placements_distances"),
  resources_economic_geography: text("resources_economic_geography"),
  historical_cultural_geography: text("historical_cultural_geography"),
  speculative_supernatural_geography: text("speculative_supernatural_geography"),
  map_generation_details: text("map_generation_details"),
  inspirations_references: text("inspirations_references"),
  // Legacy fields from environment_details for compatibility
  era: text("era"),
  description: text("description"),
  geography: text("geography").array(),
  locations: text("locations").array(),
  culture: jsonb("culture"),
  politics: jsonb("politics"),
  economy: jsonb("economy"),
  technology: jsonb("technology"),
  conflicts: text("conflicts").array(),
  history: jsonb("history"),
  magicSystem: jsonb("magic_system"),
  threadId: text("thread_id"),
  // Embeddings will be implemented later with pgvector
  embeddingJson: jsonb("embedding_json"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertWorldDetailsSchema = createInsertSchema(worldDetails).pick({
  foundationId: true,
  world_name: true,
  narrative_context: true,
  global_geography_topography: true,
  regions_territories: true,
  boundaries_borders: true,
  climate_environmental_zones: true,
  environment_placements_distances: true,
  resources_economic_geography: true,
  historical_cultural_geography: true,
  speculative_supernatural_geography: true,
  map_generation_details: true,
  inspirations_references: true,
  // Legacy fields
  era: true,
  description: true,
  geography: true,
  locations: true,
  culture: true,
  politics: true,
  economy: true,
  technology: true,
  conflicts: true,
  history: true,
  magicSystem: true,
  threadId: true,
  embeddingJson: true,
});

// Relations for world details
export const worldDetailsRelations = relations(worldDetails, ({ one }) => ({
  foundation: one(foundations, {
    fields: [worldDetails.foundationId],
    references: [foundations.id],
  }),
}));

// Environment details - separate from world_details
export const environmentDetails = pgTable("environment_details", {
  id: serial("id").primaryKey(),
  foundationId: integer("foundation_id").notNull().references(() => foundations.id),
  environment_name: text("environment_name").notNull(),
  narrative_significance: text("narrative_significance"),
  geography: text("geography"),
  architecture: text("architecture"),
  climate_weather: text("climate_weather"),
  sensory_atmosphere: text("sensory_atmosphere"),
  cultural_influence: text("cultural_influence"),
  societal_norms: text("societal_norms"),
  historical_relevance: text("historical_relevance"),
  economic_significance: text("economic_significance"),
  speculative_features: text("speculative_features"),
  associated_characters_factions: text("associated_characters_factions"),
  inspirations_references: text("inspirations_references"),
  // References to other tables in our schema (modified from the original request)
  worldDetailsId: integer("world_details_id").references(() => worldDetails.id, { onDelete: 'set null' }),
  genreDetailsId: integer("genre_details_id").references(() => genreDetails.id, { onDelete: 'set null' }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertEnvironmentDetailsSchema = createInsertSchema(environmentDetails).pick({
  foundationId: true,
  environment_name: true,
  narrative_significance: true,
  geography: true,
  architecture: true,
  climate_weather: true,
  sensory_atmosphere: true,
  cultural_influence: true,
  societal_norms: true,
  historical_relevance: true,
  economic_significance: true,
  speculative_features: true,
  associated_characters_factions: true,
  inspirations_references: true,
  worldDetailsId: true,
  genreDetailsId: true,
});

// Relations for environment details
export const environmentDetailsRelations = relations(environmentDetails, ({ one }) => ({
  foundation: one(foundations, {
    fields: [environmentDetails.foundationId],
    references: [foundations.id],
  }),
  worldDetails: one(worldDetails, {
    fields: [environmentDetails.worldDetailsId],
    references: [worldDetails.id],
  }),
  genreDetails: one(genreDetails, {
    fields: [environmentDetails.genreDetailsId],
    references: [genreDetails.id],
  }),
}));

// Narrative vector store for semantic search
export const narrativeVectors = pgTable("narrative_vectors", {
  id: serial("id").primaryKey(),
  storyId: integer("story_id").notNull().references(() => stories.id),
  chapterId: integer("chapter_id").references(() => chapters.id),
  segment: text("segment").notNull(),
  metadata: jsonb("metadata"),
  // Embeddings will be implemented later with pgvector
  embeddingJson: jsonb("embedding_json"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertNarrativeVectorSchema = createInsertSchema(narrativeVectors).pick({
  storyId: true,
  chapterId: true,
  segment: true,
  metadata: true,
  embeddingJson: true,
});

// Relations for narrative vectors
export const narrativeVectorsRelations = relations(narrativeVectors, ({ one }) => ({
  story: one(stories, {
    fields: [narrativeVectors.storyId],
    references: [stories.id],
  }),
  chapter: one(chapters, {
    fields: [narrativeVectors.chapterId],
    references: [chapters.id],
  }),
}));

// Relations for foundation messages
export const foundationMessagesRelations = relations(foundationMessages, ({ one }) => ({
  foundation: one(foundations, {
    fields: [foundationMessages.foundationId],
    references: [foundations.id],
  }),
}));

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Foundation = typeof foundations.$inferSelect;
export type InsertFoundation = z.infer<typeof insertFoundationSchema>;

export type FoundationMessage = typeof foundationMessages.$inferSelect;
export type InsertFoundationMessage = z.infer<typeof insertFoundationMessageSchema>;

export type Story = typeof stories.$inferSelect;
export type InsertStory = z.infer<typeof insertStorySchema>;

export type Chapter = typeof chapters.$inferSelect;
export type InsertChapter = z.infer<typeof insertChapterSchema>;

export type Character = typeof characters.$inferSelect;
export type InsertCharacter = z.infer<typeof insertCharacterSchema>;

export type CharacterDetails = typeof characterDetails.$inferSelect;
export type InsertCharacterDetails = z.infer<typeof insertCharacterDetailsSchema>;

export type CharacterRelationship = typeof characterRelationships.$inferSelect;
export type InsertCharacterRelationship = z.infer<typeof insertCharacterRelationshipSchema>;

export type StoryCharacter = typeof storyCharacters.$inferSelect;
export type InsertStoryCharacter = z.infer<typeof insertStoryCharacterSchema>;

export type CharacterEvent = typeof characterEvents.$inferSelect;
export type InsertCharacterEvent = z.infer<typeof insertCharacterEventSchema>;

export type Version = typeof versions.$inferSelect;
export type InsertVersion = z.infer<typeof insertVersionSchema>;

export type Suggestion = typeof suggestions.$inferSelect;
export type InsertSuggestion = z.infer<typeof insertSuggestionSchema>;

export type GenreDetails = typeof genreDetails.$inferSelect;
export type InsertGenreDetails = z.infer<typeof insertGenreDetailsSchema>;

export type WorldDetails = typeof worldDetails.$inferSelect;
export type InsertWorldDetails = z.infer<typeof insertWorldDetailsSchema>;

// Environment details types
export type EnvironmentDetails = typeof environmentDetails.$inferSelect;
export type InsertEnvironmentDetails = z.infer<typeof insertEnvironmentDetailsSchema>;

export type NarrativeVector = typeof narrativeVectors.$inferSelect;
export type InsertNarrativeVector = z.infer<typeof insertNarrativeVectorSchema>;
