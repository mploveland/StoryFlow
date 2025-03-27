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
}

export interface GenreCreationInput {
  userInterests?: string;
  themes?: string[];
  mood?: string;
  targetAudience?: string;
  inspirations?: string[];
  additionalInfo?: string;
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
    const response = await apiRequest("POST", "/api/ai/genre-details", input);
    return await response.json();
  } catch (error) {
    console.error("Error creating genre details:", error);
    // Return a basic fallback genre if the API fails
    return {
      name: "Custom Fiction",
      description: "A customized genre based on your preferences.",
      themes: ["Identity", "Growth", "Challenge"],
      tropes: ["Hero's Journey", "Coming of Age"],
      commonSettings: ["Contemporary World", "Fantasy Realm"],
      typicalCharacters: ["Protagonist", "Mentor", "Antagonist"],
      plotStructures: ["Three-Act Structure", "Hero's Journey"],
      styleGuide: {
        tone: "Balanced",
        pacing: "Moderate",
        perspective: "Third person",
        dialogueStyle: "Natural"
      },
      recommendedReading: ["Various works in this style"],
      popularExamples: ["Successful titles in this genre"],
      worldbuildingElements: ["Society", "Culture", "Technology"]
    };
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
