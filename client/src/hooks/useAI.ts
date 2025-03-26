import { useState } from 'react';
import { 
  fetchAISuggestions, 
  fetchCharacterResponse, 
  fetchStoryContinuation, 
  fetchTextAnalysis,
  type AIResponse,
  type Character
} from '@/lib/openai';

export function useAI() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const getSuggestions = async (
    storyContext: string,
    chapterContent: string,
    characters: Character[]
  ): Promise<AIResponse> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetchAISuggestions(storyContext, chapterContent, characters);
      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get AI suggestions';
      setError(errorMessage);
      return {
        plotSuggestions: [],
        characterInteractions: [],
        styleSuggestions: []
      };
    } finally {
      setLoading(false);
    }
  };
  
  const getCharacterResponse = async (
    characterDescription: string,
    traits: string[],
    situation: string
  ): Promise<string> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetchCharacterResponse(characterDescription, traits, situation);
      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get character response';
      setError(errorMessage);
      return "I'm unable to respond at the moment.";
    } finally {
      setLoading(false);
    }
  };
  
  const getContinuation = async (
    storyContext: string,
    previousContent: string,
    characters: Character[],
    continuationPrompt: string = ""
  ): Promise<string> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetchStoryContinuation(
        storyContext, 
        previousContent, 
        characters, 
        continuationPrompt
      );
      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to continue story';
      setError(errorMessage);
      return "Unable to generate story continuation at this time.";
    } finally {
      setLoading(false);
    }
  };
  
  const analyzeText = async (text: string): Promise<{
    tone: string,
    pacing: string,
    readability: string,
    wordVariety: string,
    suggestions: string[]
  }> => {
    setLoading(true);
    setError(null);
    
    try {
      const analysis = await fetchTextAnalysis(text);
      return analysis;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to analyze text';
      setError(errorMessage);
      return {
        tone: "Unable to analyze",
        pacing: "Unable to analyze",
        readability: "Unable to analyze",
        wordVariety: "Unable to analyze",
        suggestions: ["Unable to generate suggestions at this time"]
      };
    } finally {
      setLoading(false);
    }
  };
  
  return {
    getSuggestions,
    getCharacterResponse,
    getContinuation,
    analyzeText,
    loading,
    error
  };
}

export default useAI;
