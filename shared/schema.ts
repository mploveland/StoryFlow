import { pgTable, text, serial, integer, boolean, timestamp, json } from "drizzle-orm/pg-core";
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
