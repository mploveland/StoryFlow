import { apiRequest } from "./queryClient";

export interface PlotSuggestion {
  content: string;
}

export interface CharacterInteraction {
  content: string;
}

export interface StyleSuggestion {
  title: string;
  description: string;
}

export interface AIResponse {
  plotSuggestions: PlotSuggestion[];
  characterInteractions: CharacterInteraction[];
  styleSuggestions: StyleSuggestion[];
}

export interface Character {
  id?: number;
  name: string;
  description: string;
  traits: string[];
  role?: string;
  color?: string;
}

export async function fetchAISuggestions(
  storyContext: string,
  chapterContent: string,
  characters: Character[]
): Promise<AIResponse> {
  try {
    const response = await apiRequest("POST", "/api/ai/suggestions", {
      storyContext,
      chapterContent,
      characters
    });
    
    return await response.json();
  } catch (error) {
    console.error("Error fetching AI suggestions:", error);
    return {
      plotSuggestions: [],
      characterInteractions: [],
      styleSuggestions: []
    };
  }
}

export async function fetchCharacterResponse(
  characterDescription: string,
  traits: string[],
  situation: string
): Promise<string> {
  try {
    const response = await apiRequest("POST", "/api/ai/character-response", {
      characterDescription,
      traits,
      situation
    });
    
    const data = await response.json();
    return data.response;
  } catch (error) {
    console.error("Error fetching character response:", error);
    return "I'm unable to respond at the moment.";
  }
}

export async function fetchStoryContinuation(
  storyContext: string,
  previousContent: string,
  characters: Character[],
  continuationPrompt: string = ""
): Promise<string> {
  try {
    const response = await apiRequest("POST", "/api/ai/continue-story", {
      storyContext,
      previousContent,
      characters,
      continuationPrompt
    });
    
    const data = await response.json();
    return data.continuation;
  } catch (error) {
    console.error("Error fetching story continuation:", error);
    return "Unable to generate story continuation at this time.";
  }
}

export async function fetchTextAnalysis(text: string): Promise<{
  tone: string,
  pacing: string,
  readability: string,
  wordVariety: string,
  suggestions: string[]
}> {
  try {
    const response = await apiRequest("POST", "/api/ai/analyze-text", {
      text
    });
    
    return await response.json();
  } catch (error) {
    console.error("Error analyzing text:", error);
    return {
      tone: "Unable to analyze",
      pacing: "Unable to analyze",
      readability: "Unable to analyze",
      wordVariety: "Unable to analyze",
      suggestions: ["Unable to generate suggestions at this time"]
    };
  }
}

export interface StoryMessage {
  sender: string;
  content: string;
}

export interface StoryResponse {
  content: string;
  choices?: string[];
}

export interface DetailedCharacter {
  name: string;
  role: string;
  background: string;
  personality: string[];
  goals: string[];
  fears: string[];
  relationships: string[];
  skills: string[];
  appearance: string;
  voice: string;
  secrets?: string;
  quirks?: string[];
  motivations?: string[];
  flaws?: string[];
}

export interface GenreDetails {
  name: string;
  description: string;
  themes: string[];
  tropes: string[];
  commonSettings: string[];
  typicalCharacters: string[];
  plotStructures: string[];
  styleGuide: {
    tone: string;
    pacing: string;
    perspective: string;
    dialogueStyle: string;
  };
  recommendedReading: string[];
  popularExamples: string[];
  worldbuildingElements: string[];
  threadId?: string; // Thread ID for continuing conversation
}

export interface GenreCreationInput {
  userInterests?: string;
  themes?: string[];
  mood?: string;
  targetAudience?: string;
  inspirations?: string[];
  additionalInfo?: string;
  threadId?: string; // Thread ID for continuing conversation
  previousMessages?: { role: 'user' | 'assistant', content: string }[]; // Previous messages in the conversation
}

export interface WorldCreationInput {
  genreContext?: string;     // The genre context from the previous stage
  setting?: string;          // Basic setting information
  timeframe?: string;        // Era or time period
  environmentType?: string;  // Natural environment (forest, desert, etc.)
  culture?: string;          // Cultural details
  technology?: string;       // Level of technology
  conflicts?: string;        // Major conflicts in the world
  additionalInfo?: string;   // Any additional world details
  // For continuing an existing conversation
  threadId?: string;
  previousMessages?: { role: 'user' | 'assistant', content: string }[];
}

export interface WorldDetails {
  name: string;              // Name of the world/setting
  description: string;       // General description
  era: string;               // Time period/era
  geography: string[];       // Notable geographical features
  locations: string[];       // Important locations/regions
  culture: {
    socialStructure: string;
    beliefs: string;
    customs: string[];
    languages: string[];
  };
  politics: {
    governmentType: string;
    powerDynamics: string;
    majorFactions: string[];
  };
  economy: {
    resources: string[];
    trade: string;
    currency: string;
  };
  technology: {
    level: string;
    innovations: string[];
    limitations: string;
  };
  conflicts: string[];       // Major conflicts or tensions
  history: {
    majorEvents: string[];
    legends: string[];
  };
  magicSystem?: {           // Optional for fantasy settings
    rules: string;
    limitations: string;
    practitioners: string;
  };
  threadId?: string;        // Thread ID for continuing conversation
}

export interface CharacterCreationInput {
  name?: string;
  role?: string;
  genre?: string;
  setting?: string;
  story?: string;
  additionalInfo?: string;
}

export async function fetchDetailedCharacter(input: CharacterCreationInput): Promise<DetailedCharacter> {
  try {
    const response = await apiRequest("POST", "/api/ai/detailed-character", input);
    return await response.json();
  } catch (error) {
    console.error("Error creating detailed character:", error);
    // Return a basic fallback character if the API fails
    return {
      name: input.name || "Character",
      role: input.role || "Character",
      background: "A mysterious individual with an unclear past.",
      personality: ["Adaptable", "Resourceful"],
      goals: ["Survival", "Finding purpose"],
      fears: ["Unknown", "Failure"],
      relationships: [],
      skills: ["Resilience", "Quick thinking"],
      appearance: "Has a distinctive appearance that matches their personality.",
      voice: "Speaks with an authentic and engaging tone."
    };
  }
}

export async function fetchGenreDetails(input: GenreCreationInput): Promise<GenreDetails> {
  try {
    console.log("Sending genre details request with input:", {
      ...input,
      threadId: input.threadId || 'none (creating new thread)',
      messagesCount: input.previousMessages?.length || 0
    });
    
    const response = await apiRequest("POST", "/api/ai/genre-details", input);
    const result = await response.json();
    
    console.log("Received genre details with threadId:", result.threadId);
    return result;
  } catch (error) {
    console.error("Error creating genre details:", error);
    throw error; // Propagate the error to be handled by the caller
  }
}

export async function fetchWorldDetails(input: WorldCreationInput): Promise<WorldDetails> {
  try {
    console.log("Sending world details request with input:", {
      ...input,
      genreContext: input.genreContext ? 'provided' : 'none',
      threadId: input.threadId || 'none (creating new thread)',
      messagesCount: input.previousMessages?.length || 0
    });
    
    const response = await apiRequest("POST", "/api/ai/world-details", input);
    const result = await response.json();
    
    console.log("Received world details with threadId:", result.threadId);
    return result;
  } catch (error) {
    console.error("Error creating world details:", error);
    throw error; // Propagate the error to be handled by the caller
  }
}

export async function fetchInteractiveStoryResponse(
  worldContext: string,
  characters: Character[],
  messageHistory: StoryMessage[],
  userInput: string
): Promise<StoryResponse> {
  try {
    const response = await apiRequest("POST", "/api/ai/interactive-story", {
      worldContext,
      characters,
      messageHistory,
      userInput
    });
    
    return await response.json();
  } catch (error) {
    console.error("Error fetching interactive story response:", error);
    return {
      content: "The story pauses momentarily...",
      choices: ["Continue the journey", "Take another approach"]
    };
  }
}
