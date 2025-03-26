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
