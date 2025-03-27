import { pgTable, text, serial, integer, boolean, timestamp, json, jsonb, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

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

// Story schema
export const stories = pgTable("stories", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  genre: text("genre"),
  theme: text("theme"),
  setting: text("setting"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertStorySchema = createInsertSchema(stories).pick({
  userId: true,
  title: true,
  genre: true,
  theme: true,
  setting: true,
});

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

// Character schema
export const characters = pgTable("characters", {
  id: serial("id").primaryKey(),
  storyId: integer("story_id").notNull().references(() => stories.id),
  name: text("name").notNull(),
  role: text("role"),
  description: text("description"),
  traits: text("traits").array(),
  secrets: text("secrets"),
  color: text("color"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertCharacterSchema = createInsertSchema(characters).pick({
  storyId: true,
  name: true,
  role: true,
  description: true,
  traits: true,
  secrets: true,
  color: true,
});

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

// Genre details schema
export const genreDetails = pgTable("genre_details", {
  id: serial("id").primaryKey(),
  storyId: integer("story_id").notNull().references(() => stories.id),
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
  storyId: true,
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

// World details schema
export const worldDetails = pgTable("world_details", {
  id: serial("id").primaryKey(),
  storyId: integer("story_id").notNull().references(() => stories.id),
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
});

export const insertWorldDetailsSchema = createInsertSchema(worldDetails).pick({
  storyId: true,
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

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Story = typeof stories.$inferSelect;
export type InsertStory = z.infer<typeof insertStorySchema>;

export type Chapter = typeof chapters.$inferSelect;
export type InsertChapter = z.infer<typeof insertChapterSchema>;

export type Character = typeof characters.$inferSelect;
export type InsertCharacter = z.infer<typeof insertCharacterSchema>;

export type Version = typeof versions.$inferSelect;
export type InsertVersion = z.infer<typeof insertVersionSchema>;

export type Suggestion = typeof suggestions.$inferSelect;
export type InsertSuggestion = z.infer<typeof insertSuggestionSchema>;

export type GenreDetails = typeof genreDetails.$inferSelect;
export type InsertGenreDetails = z.infer<typeof insertGenreDetailsSchema>;

export type WorldDetails = typeof worldDetails.$inferSelect;
export type InsertWorldDetails = z.infer<typeof insertWorldDetailsSchema>;

export type NarrativeVector = typeof narrativeVectors.$inferSelect;
export type InsertNarrativeVector = z.infer<typeof insertNarrativeVectorSchema>;
