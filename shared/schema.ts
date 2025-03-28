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
export const foundationsRelations = relations(foundations, ({ one, many }) => ({
  user: one(users, {
    fields: [foundations.userId],
    references: [users.id],
  }),
  stories: many(stories),
  characters: many(characters),
  environmentDetails: one(environmentDetails),
  genreDetails: one(genreDetails),
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
  name: text("name").notNull(),
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
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertGenreDetailsSchema = createInsertSchema(genreDetails).pick({
  foundationId: true,
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

// Environment details schema (formerly World details)
export const environmentDetails = pgTable("environment_details", {
  id: serial("id").primaryKey(),
  foundationId: integer("foundation_id").notNull().references(() => foundations.id),
  name: text("name").notNull(),
  description: text("description"),
  era: text("era"),
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

export const insertEnvironmentDetailsSchema = createInsertSchema(environmentDetails).pick({
  foundationId: true,
  name: true,
  description: true,
  era: true,
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

// Relations for environment details
export const environmentDetailsRelations = relations(environmentDetails, ({ one }) => ({
  foundation: one(foundations, {
    fields: [environmentDetails.foundationId],
    references: [foundations.id],
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

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Foundation = typeof foundations.$inferSelect;
export type InsertFoundation = z.infer<typeof insertFoundationSchema>;

export type Story = typeof stories.$inferSelect;
export type InsertStory = z.infer<typeof insertStorySchema>;

export type Chapter = typeof chapters.$inferSelect;
export type InsertChapter = z.infer<typeof insertChapterSchema>;

export type Character = typeof characters.$inferSelect;
export type InsertCharacter = z.infer<typeof insertCharacterSchema>;

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

export type EnvironmentDetails = typeof environmentDetails.$inferSelect;
export type InsertEnvironmentDetails = z.infer<typeof insertEnvironmentDetailsSchema>;

export type NarrativeVector = typeof narrativeVectors.$inferSelect;
export type InsertNarrativeVector = z.infer<typeof insertNarrativeVectorSchema>;
