import OpenAI from "openai";

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Assistant IDs
const HYPER_REALISTIC_CHARACTER_CREATOR_ID = "asst_zHYBFg9Om7fnilOfGTnVztF1";
const GENRE_CREATOR_ASSISTANT_ID = "asst_genre_creator_id"; // This should be replaced with your real assistant ID

// Interface for genre creation input
export interface GenreCreationInput {
  userInterests?: string;
  themes?: string[];
  mood?: string;
  targetAudience?: string;
  inspirations?: string[];
  additionalInfo?: string;
}

// Interface for a complete genre profile
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

// Interface for character creation input
export interface CharacterCreationInput {
  name?: string;
  role?: string;
  genre?: string;
  setting?: string;
  story?: string;
  additionalInfo?: string;
}

// Interface for a complete character
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

/**
 * Creates a thread with the Hyper-Realistic Character Creator assistant and gets a detailed character
 * @param characterInput Basic information about the character
 * @returns A detailed character profile
 */
export async function createDetailedCharacter(characterInput: CharacterCreationInput): Promise<DetailedCharacter> {
  try {
    // Create a thread
    const thread = await openai.beta.threads.create();

    // Prepare the prompt from the input
    let promptContent = "Create a detailed character with the following specifications:\n\n";
    
    if (characterInput.name) {
      promptContent += `Character Name: ${characterInput.name}\n`;
    }
    
    if (characterInput.role) {
      promptContent += `Role in Story: ${characterInput.role}\n`;
    }
    
    if (characterInput.genre) {
      promptContent += `Genre: ${characterInput.genre}\n`;
    }
    
    if (characterInput.setting) {
      promptContent += `Setting: ${characterInput.setting}\n`;
    }
    
    if (characterInput.story) {
      promptContent += `Story Context: ${characterInput.story}\n`;
    }
    
    if (characterInput.additionalInfo) {
      promptContent += `Additional Information: ${characterInput.additionalInfo}\n`;
    }
    
    promptContent += "\nPlease format the response as a JSON object with the following fields: name, role, background, personality (array), goals (array), fears (array), relationships (array), skills (array), appearance, voice, secrets, quirks (array), motivations (array), flaws (array)";

    // Add the message to the thread
    await openai.beta.threads.messages.create(thread.id, {
      role: "user",
      content: promptContent,
    });

    // Run the assistant on the thread
    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: HYPER_REALISTIC_CHARACTER_CREATOR_ID,
    });

    // Poll for the completion of the run
    let completedRun = await waitForRunCompletion(thread.id, run.id);
    
    if (completedRun.status !== "completed") {
      throw new Error(`Run ended with status: ${completedRun.status}`);
    }

    // Retrieve the assistant's messages
    const messages = await openai.beta.threads.messages.list(thread.id);
    
    // Get the latest assistant message
    const assistantMessages = messages.data.filter(msg => msg.role === "assistant");
    
    if (assistantMessages.length === 0) {
      throw new Error("No response from assistant");
    }
    
    // Extract the character data from the message content
    const latestMessage = assistantMessages[0];
    const textContent = latestMessage.content.find(content => content.type === "text");
    
    if (!textContent || textContent.type !== "text") {
      throw new Error("Response does not contain text");
    }
    
    // Try to parse JSON from the response
    const jsonMatch = textContent.text.value.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Could not extract JSON from response");
    }
    
    const characterData = JSON.parse(jsonMatch[0]);
    
    // Return the detailed character
    return {
      name: characterData.name || characterInput.name || "Unnamed Character",
      role: characterData.role || characterInput.role || "Protagonist",
      background: characterData.background || "",
      personality: characterData.personality || [],
      goals: characterData.goals || [],
      fears: characterData.fears || [],
      relationships: characterData.relationships || [],
      skills: characterData.skills || [],
      appearance: characterData.appearance || "",
      voice: characterData.voice || "",
      secrets: characterData.secrets || "",
      quirks: characterData.quirks || [],
      motivations: characterData.motivations || [],
      flaws: characterData.flaws || []
    };
  } catch (error) {
    console.error("Error creating detailed character:", error);
    // Return a fallback character if something goes wrong
    return {
      name: characterInput.name || "Character",
      role: characterInput.role || "Character",
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

/**
 * Creates a thread with the Genre Creator assistant and gets detailed genre information
 * @param genreInput Basic information about the desired genre
 * @returns A detailed genre profile
 */
export async function createGenreDetails(genreInput: GenreCreationInput): Promise<GenreDetails> {
  try {
    // Create a thread
    const thread = await openai.beta.threads.create();

    // Prepare the prompt from the input
    let promptContent = "Create a detailed genre profile based on the following preferences:\n\n";
    
    if (genreInput.userInterests) {
      promptContent += `User's Interests: ${genreInput.userInterests}\n`;
    }
    
    if (genreInput.themes && genreInput.themes.length > 0) {
      promptContent += `Themes: ${genreInput.themes.join(', ')}\n`;
    }
    
    if (genreInput.mood) {
      promptContent += `Mood/Tone: ${genreInput.mood}\n`;
    }
    
    if (genreInput.targetAudience) {
      promptContent += `Target Audience: ${genreInput.targetAudience}\n`;
    }
    
    if (genreInput.inspirations && genreInput.inspirations.length > 0) {
      promptContent += `Inspirations: ${genreInput.inspirations.join(', ')}\n`;
    }
    
    if (genreInput.additionalInfo) {
      promptContent += `Additional Information: ${genreInput.additionalInfo}\n`;
    }
    
    promptContent += "\nPlease format the response as a JSON object with the following fields: name, description, themes (array), tropes (array), commonSettings (array), typicalCharacters (array), plotStructures (array), styleGuide (object with tone, pacing, perspective, dialogueStyle), recommendedReading (array), popularExamples (array), worldbuildingElements (array)";

    // Add the message to the thread
    await openai.beta.threads.messages.create(thread.id, {
      role: "user",
      content: promptContent,
    });

    // Run the assistant on the thread
    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: GENRE_CREATOR_ASSISTANT_ID,
    });

    // Poll for the completion of the run
    let completedRun = await waitForRunCompletion(thread.id, run.id);
    
    if (completedRun.status !== "completed") {
      throw new Error(`Run ended with status: ${completedRun.status}`);
    }

    // Retrieve the assistant's messages
    const messages = await openai.beta.threads.messages.list(thread.id);
    
    // Get the latest assistant message
    const assistantMessages = messages.data.filter(msg => msg.role === "assistant");
    
    if (assistantMessages.length === 0) {
      throw new Error("No response from assistant");
    }
    
    // Extract the genre data from the message content
    const latestMessage = assistantMessages[0];
    const textContent = latestMessage.content.find(content => content.type === "text");
    
    if (!textContent || textContent.type !== "text") {
      throw new Error("Response does not contain text");
    }
    
    // Try to parse JSON from the response
    const jsonMatch = textContent.text.value.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Could not extract JSON from response");
    }
    
    const genreData = JSON.parse(jsonMatch[0]);
    
    // Return the detailed genre
    return {
      name: genreData.name || "Custom Genre",
      description: genreData.description || "A unique blend of elements tailored to your preferences.",
      themes: genreData.themes || [],
      tropes: genreData.tropes || [],
      commonSettings: genreData.commonSettings || [],
      typicalCharacters: genreData.typicalCharacters || [],
      plotStructures: genreData.plotStructures || [],
      styleGuide: {
        tone: genreData.styleGuide?.tone || "Balanced",
        pacing: genreData.styleGuide?.pacing || "Moderate",
        perspective: genreData.styleGuide?.perspective || "Third person",
        dialogueStyle: genreData.styleGuide?.dialogueStyle || "Natural"
      },
      recommendedReading: genreData.recommendedReading || [],
      popularExamples: genreData.popularExamples || [],
      worldbuildingElements: genreData.worldbuildingElements || []
    };
  } catch (error) {
    console.error("Error creating genre details:", error);
    // Return a fallback genre if something goes wrong
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

/**
 * Wait for an assistant run to complete by polling
 */
async function waitForRunCompletion(threadId: string, runId: string, maxAttempts = 30): Promise<OpenAI.Beta.Threads.Runs.Run> {
  let attempts = 0;
  while (attempts < maxAttempts) {
    const run = await openai.beta.threads.runs.retrieve(threadId, runId);
    
    if (run.status === "completed" || 
        run.status === "failed" || 
        run.status === "cancelled" || 
        run.status === "expired") {
      return run;
    }
    
    // If the run requires action (like function calling), handle it
    if (run.status === "requires_action") {
      // This is where you'd handle tool calls if needed
      // For this simple example, we'll just cancel the run
      await openai.beta.threads.runs.cancel(threadId, runId);
      throw new Error("Run requires action, but we don't handle that in this example");
    }
    
    // Wait before checking again
    await new Promise(resolve => setTimeout(resolve, 1000));
    attempts++;
  }
  
  // If we hit the max attempts, cancel the run and throw
  await openai.beta.threads.runs.cancel(threadId, runId);
  throw new Error("Timed out waiting for run to complete");
}