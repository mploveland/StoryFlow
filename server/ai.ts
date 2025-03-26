import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || 'sk-demo' 
});

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

export async function getAISuggestions(
  storyContext: string,
  chapterContent: string,
  characters: { name: string; description: string; traits: string[] }[]
): Promise<AIResponse> {
  try {
    const charactersText = characters.map(char => 
      `${char.name}: ${char.description} Traits: ${char.traits.join(', ')}`
    ).join('\n');
    
    const prompt = `
    As an AI writing assistant, analyze the current chapter content and provide creative suggestions.
    
    STORY CONTEXT:
    ${storyContext}
    
    CHARACTERS:
    ${charactersText}
    
    CURRENT CHAPTER CONTENT:
    ${chapterContent}
    
    Based on the above, provide the following in JSON format:
    1. Three plot suggestions for how the story could continue
    2. Two potential character interactions based on existing characters
    3. Two style improvement suggestions with specific details
    
    Format your response as a valid JSON object with these fields:
    - plotSuggestions: array of objects with { content: string }
    - characterInteractions: array of objects with { content: string }
    - styleSuggestions: array of objects with { title: string, description: string }
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" }
    });

    const content = response.choices[0].message.content || '{}';
    const result = JSON.parse(content);
    
    return {
      plotSuggestions: result.plotSuggestions || [],
      characterInteractions: result.characterInteractions || [],
      styleSuggestions: result.styleSuggestions || []
    };
  } catch (error) {
    console.error("Error getting AI suggestions:", error);
    return {
      plotSuggestions: [],
      characterInteractions: [],
      styleSuggestions: []
    };
  }
}

export async function generateCharacterResponse(
  characterDescription: string,
  traits: string[],
  situation: string
): Promise<string> {
  try {
    const traitsText = traits.join(', ');
    const prompt = `
    You are going to role-play as a fictional character with the following attributes:
    
    CHARACTER DESCRIPTION:
    ${characterDescription}
    
    CHARACTER TRAITS:
    ${traitsText}
    
    SITUATION:
    ${situation}
    
    Respond in first person as this character would to the given situation. Keep your response focused, in-character, and under 150 words.
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 250,
    });

    return response.choices[0].message.content || "No response generated";
  } catch (error) {
    console.error("Error generating character response:", error);
    return "I'm unable to respond at the moment.";
  }
}

export async function continueStory(
  storyContext: string,
  previousContent: string,
  characters: { name: string; description: string; traits: string[] }[],
  continuationPrompt: string = ""
): Promise<string> {
  try {
    const charactersText = characters.map(char => 
      `${char.name}: ${char.description} Traits: ${char.traits.join(', ')}`
    ).join('\n');
    
    let prompt = `
    As a skilled fiction writer, continue the story based on the following context and previous content.
    
    STORY CONTEXT:
    ${storyContext}
    
    CHARACTERS:
    ${charactersText}
    
    PREVIOUS CONTENT:
    ${previousContent}
    `;
    
    if (continuationPrompt) {
      prompt += `\nADDITIONAL DIRECTION: ${continuationPrompt}`;
    }
    
    prompt += `\n\nContinue the story with approximately 200-300 words, maintaining the same style, tone, and narrative voice.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 500,
    });

    return response.choices[0].message.content || "No continuation generated";
  } catch (error) {
    console.error("Error continuing story:", error);
    return "Unable to generate story continuation at this time.";
  }
}

export async function analyzeTextSentiment(text: string): Promise<{
  tone: string,
  pacing: string,
  readability: string,
  wordVariety: string,
  suggestions: string[]
}> {
  try {
    const prompt = `
    Analyze the following text excerpt and provide a brief assessment of:
    1. Tone (e.g., dark, hopeful, tense)
    2. Pacing (e.g., slow, balanced, rushed)
    3. Readability (e.g., simple, moderate, complex)
    4. Word variety/repetition issues
    5. Three specific suggestions for improvement
    
    Return your analysis as a JSON object with the following fields:
    - tone: string
    - pacing: string
    - readability: string
    - wordVariety: string
    - suggestions: array of strings
    
    TEXT TO ANALYZE:
    ${text}
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" }
    });

    const content = response.choices[0].message.content || '{}';
    const result = JSON.parse(content);
    
    return {
      tone: result.tone || "Unknown",
      pacing: result.pacing || "Unknown",
      readability: result.readability || "Unknown",
      wordVariety: result.wordVariety || "Unknown",
      suggestions: result.suggestions || []
    };
  } catch (error) {
    console.error("Error analyzing text sentiment:", error);
    return {
      tone: "Unable to analyze",
      pacing: "Unable to analyze",
      readability: "Unable to analyze",
      wordVariety: "Unable to analyze",
      suggestions: ["Unable to generate suggestions at this time"]
    };
  }
}

export interface StoryResponse {
  content: string;
  choices?: string[];
}

export async function generateInteractiveStoryResponse(
  worldContext: string,
  characters: { name: string; role: string; personality: string[] }[],
  messageHistory: { sender: string; content: string }[],
  userInput: string
): Promise<StoryResponse> {
  try {
    const charactersText = characters.map(char => 
      `${char.name} (${char.role}): ${char.personality.join(', ')}`
    ).join('\n');
    
    const conversationHistory = messageHistory.map(msg => 
      `${msg.sender}: ${msg.content}`
    ).join('\n');
    
    const prompt = `
    You are a highly creative interactive storyteller. You're running an immersive narrative experience set in the following world:
    
    WORLD CONTEXT:
    ${worldContext}
    
    CHARACTERS:
    ${charactersText}
    
    CONVERSATION HISTORY:
    ${conversationHistory}
    
    USER INPUT:
    ${userInput}
    
    Based on the world, characters, and conversation so far, create a compelling story response.
    
    Return your response as a JSON object with these fields:
    - content: string (your main story response, 100-200 words, written in engaging prose)
    - choices: array of 2-4 strings (options for what the user could do next)
    
    Make your response feel like part of an ongoing adventure, with dramatic elements, character interactions, and vivid imagery.
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_tokens: 700
    });

    const content = response.choices[0].message.content || '{}';
    const result = JSON.parse(content);
    
    return {
      content: result.content || "The story continues...",
      choices: result.choices || ["Continue the journey", "Ask for more details", "Change course"]
    };
  } catch (error) {
    console.error("Error generating interactive story response:", error);
    return {
      content: "The storyteller pauses for a moment, gathering thoughts before continuing the tale...",
      choices: ["Continue the journey", "Ask for more details", "Change course"]
    };
  }
}
