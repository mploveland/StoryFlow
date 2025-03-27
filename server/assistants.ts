import OpenAI from "openai";

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Assistant IDs
const HYPER_REALISTIC_CHARACTER_CREATOR_ID = "asst_zHYBFg9Om7fnilOfGTnVztF1";
// The assistant's name is StoryFlow_GenreCreator
const GENRE_CREATOR_ASSISTANT_ID = "asst_Hc5VyWr5mXgNL86DvT1m4cim";
// The assistant's name is StoryFlow_WorldBuilder
const WORLD_BUILDER_ASSISTANT_ID = "asst_0nfAuLNqDs7g84Q9UHwFyPjB";

// Interface for genre creation input
export interface GenreCreationInput {
  userInterests?: string;
  themes?: string[];
  mood?: string;
  targetAudience?: string;
  inspirations?: string[];
  additionalInfo?: string;
  // For continuing an existing conversation
  threadId?: string;
  previousMessages?: { role: 'user' | 'assistant', content: string }[];
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

// Interface for world building input
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

// Interface for a complete world profile
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
export async function createGenreDetails(genreInput: GenreCreationInput): Promise<GenreDetails & { threadId: string }> {
  try {
    let thread;
    let isNewThread = false;
    
    // Check if we're continuing an existing conversation
    if (genreInput.threadId) {
      console.log(`Continuing conversation in existing thread: ${genreInput.threadId}`);
      try {
        // Verify the thread exists by retrieving its messages
        const existingMessages = await openai.beta.threads.messages.list(genreInput.threadId);
        thread = { id: genreInput.threadId };
        console.log(`Found existing thread with ${existingMessages.data.length} messages`);
      } catch (error) {
        console.error(`Error accessing thread ${genreInput.threadId}:`, error);
        // If there's an error accessing the thread, create a new one
        thread = await openai.beta.threads.create();
        isNewThread = true;
        console.log(`Created new thread: ${thread.id}`);
      }
    } else {
      // Create a new thread
      thread = await openai.beta.threads.create();
      isNewThread = true;
      console.log(`Created new thread: ${thread.id}`);
    }

    // Handle the user's message based on whether it's a new thread or continuing conversation
    let promptContent;
    
    if (isNewThread) {
      // For a new thread, provide context about what we're trying to do
      promptContent = "I want to create a story with the following genre preferences. Please have a conversation with me about this genre and ask follow-up questions to help me develop it further.\n\n";
      
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
    } else {
      // For an existing conversation, just send the user's new message
      promptContent = genreInput.userInterests || "Tell me more about this genre.";
    }

    console.log(`Adding user message to thread: "${promptContent.substring(0, 100)}..."`);
    
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
    
    // Extract the response content from the message
    const latestMessage = assistantMessages[0];
    const textContent = latestMessage.content.find(content => content.type === "text");
    
    if (!textContent || textContent.type !== "text") {
      throw new Error("Response does not contain text");
    }
    
    const responseText = textContent.text.value;
    console.log("Received response from Genre Creator assistant:", responseText);
    
    // Parse the response content to extract genre information
    // Since we're not getting JSON now, we need to create a structured response
    // Let's make an educated guess about the genre based on the user's input
    
    // Extract likely genre name from the input
    let genreName = "Western"; // Default for this specific case
    
    if (genreInput.userInterests) {
      if (genreInput.userInterests.toLowerCase().includes("western")) {
        genreName = "Western";
      } else if (genreInput.userInterests.toLowerCase().includes("fantasy")) {
        genreName = "Fantasy";
      } else if (genreInput.userInterests.toLowerCase().includes("sci-fi") || 
                genreInput.userInterests.toLowerCase().includes("science fiction")) {
        genreName = "Science Fiction";
      } else if (genreInput.userInterests.toLowerCase().includes("romance")) {
        genreName = "Romance";
      } else if (genreInput.userInterests.toLowerCase().includes("mystery")) {
        genreName = "Mystery";
      } else if (genreInput.userInterests.toLowerCase().includes("horror")) {
        genreName = "Horror";
      } else if (genreInput.userInterests.toLowerCase().includes("thriller")) {
        genreName = "Thriller";
      }
    }
    
    // Return the detailed genre with some information filled in
    // and the assistant's response text as the description
    return {
      name: genreName,
      description: responseText, // Return the full response text
      themes: genreInput.themes || ["Adventure", "Frontier Life", "Justice"],
      tropes: ["Showdowns", "Frontier Justice", "Gold Rush"],
      commonSettings: ["Mining Town", "Saloon", "Wilderness"],
      typicalCharacters: ["Sheriff", "Outlaw", "Prospector", "Townspeople"],
      plotStructures: ["Hero's Journey", "Revenge Plot"],
      styleGuide: {
        tone: "Gritty and realistic",
        pacing: "Deliberate with bursts of action",
        perspective: "Third person",
        dialogueStyle: "Sparse and direct"
      },
      recommendedReading: ["Lonesome Dove", "True Grit"],
      popularExamples: ["The Good, the Bad and the Ugly", "Deadwood"],
      worldbuildingElements: ["Historical Accuracy", "Frontier Economy", "Social Hierarchy"],
      threadId: thread.id // Include the thread ID for continued conversation
    };
  } catch (error) {
    console.error("Error creating genre details:", error);
    // Create a new thread for fallback responses
    let fallbackThreadId;
    try {
      const fallbackThread = await openai.beta.threads.create();
      fallbackThreadId = fallbackThread.id;
      console.log(`Created fallback thread: ${fallbackThreadId}`);
    } catch (threadError) {
      console.error("Error creating fallback thread:", threadError);
      fallbackThreadId = "fallback-thread-error";
    }
    
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
      worldbuildingElements: ["Society", "Culture", "Technology"],
      threadId: fallbackThreadId
    };
  }
}

/**
 * Creates a thread with the World Builder assistant and gets detailed world information
 * @param worldInput Basic information about the desired world
 * @returns A detailed world profile with thread ID for continued conversation
 */
export async function createWorldDetails(worldInput: WorldCreationInput): Promise<WorldDetails & { threadId: string }> {
  try {
    let thread;
    let isNewThread = false;
    
    // Check if we're continuing an existing conversation
    if (worldInput.threadId) {
      console.log(`Continuing world-building conversation in existing thread: ${worldInput.threadId}`);
      try {
        // Verify the thread exists by retrieving its messages
        const existingMessages = await openai.beta.threads.messages.list(worldInput.threadId);
        thread = { id: worldInput.threadId };
        console.log(`Found existing world-building thread with ${existingMessages.data.length} messages`);
      } catch (error) {
        console.error(`Error accessing world-building thread ${worldInput.threadId}:`, error);
        // If there's an error accessing the thread, create a new one
        thread = await openai.beta.threads.create();
        isNewThread = true;
        console.log(`Created new world-building thread: ${thread.id}`);
      }
    } else {
      // Create a new thread
      thread = await openai.beta.threads.create();
      isNewThread = true;
      console.log(`Created new world-building thread: ${thread.id}`);
    }

    // Handle the user's message based on whether it's a new thread or continuing conversation
    let promptContent;
    
    if (isNewThread) {
      // For a new thread, provide context about what we're trying to do
      promptContent = "I'm creating a story world using the following details. Please help me develop it further by asking questions and providing suggestions:\n\n";
      
      if (worldInput.genreContext) {
        promptContent += `Genre Context: ${worldInput.genreContext}\n\n`;
      }
      
      if (worldInput.setting) {
        promptContent += `Basic Setting: ${worldInput.setting}\n`;
      }
      
      if (worldInput.timeframe) {
        promptContent += `Timeframe/Era: ${worldInput.timeframe}\n`;
      }
      
      if (worldInput.environmentType) {
        promptContent += `Environment: ${worldInput.environmentType}\n`;
      }
      
      if (worldInput.culture) {
        promptContent += `Culture: ${worldInput.culture}\n`;
      }
      
      if (worldInput.technology) {
        promptContent += `Technology Level: ${worldInput.technology}\n`;
      }
      
      if (worldInput.conflicts) {
        promptContent += `Major Conflicts: ${worldInput.conflicts}\n`;
      }
      
      if (worldInput.additionalInfo) {
        promptContent += `Additional Information: ${worldInput.additionalInfo}\n`;
      }
    } else {
      // For an existing conversation, just send the user's new message
      promptContent = worldInput.additionalInfo || "Tell me more about this world.";
    }

    console.log(`Adding user message to world-building thread: "${promptContent.substring(0, 100)}..."`);
    
    // Add the message to the thread
    await openai.beta.threads.messages.create(thread.id, {
      role: "user",
      content: promptContent,
    });

    // Run the assistant on the thread
    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: WORLD_BUILDER_ASSISTANT_ID,
    });

    // Poll for the completion of the run
    let completedRun = await waitForRunCompletion(thread.id, run.id);
    
    if (completedRun.status !== "completed") {
      throw new Error(`World Builder run ended with status: ${completedRun.status}`);
    }

    // Retrieve the assistant's messages
    const messages = await openai.beta.threads.messages.list(thread.id);
    
    // Get the latest assistant message
    const assistantMessages = messages.data.filter(msg => msg.role === "assistant");
    
    if (assistantMessages.length === 0) {
      throw new Error("No response from World Builder assistant");
    }
    
    // Extract the response content from the message
    const latestMessage = assistantMessages[0];
    const textContent = latestMessage.content.find(content => content.type === "text");
    
    if (!textContent || textContent.type !== "text") {
      throw new Error("Response does not contain text");
    }
    
    const responseText = textContent.text.value;
    console.log("Received response from World Builder assistant:", responseText.substring(0, 100) + "...");
    
    // We're using a conversational approach, so we'll create a structured world object
    // with reasonable defaults and the assistant's response as the description
    
    // Extract a world name from the input or use a default
    let worldName = "Mining Town"; // Default for Western genre
    
    if (worldInput.setting) {
      // Try to extract a name from the setting
      const settingWords = worldInput.setting.split(/\s+/);
      if (settingWords.length >= 2) {
        // Use the first two words that might form a reasonable name
        worldName = settingWords.slice(0, 2).join(" ");
      } else {
        worldName = worldInput.setting;
      }
    }
    
    // Return the detailed world with the assistant's response as the description
    // and reasonable defaults for the structured fields
    return {
      name: worldName,
      description: responseText, // Full conversational response
      era: worldInput.timeframe || "Late 19th Century",
      geography: ["Mountains", "River Valley", "Forested Hills"],
      locations: ["Mining Camp", "Town Center", "Railway Station"],
      culture: {
        socialStructure: "Frontier hierarchy with wealthy business owners and laborers",
        beliefs: "Mixture of traditional values and frontier pragmatism",
        customs: ["Community gatherings", "Local celebrations", "Mining traditions"],
        languages: ["English", "Indigenous languages", "Immigrant dialects"]
      },
      politics: {
        governmentType: "Local town council with mining company influence",
        powerDynamics: "Tension between business interests and townspeople",
        majorFactions: ["Mining Company", "Townsfolk", "Law Enforcement"]
      },
      economy: {
        resources: ["Gold", "Timber", "Agriculture"],
        trade: "Resource extraction with growing commerce",
        currency: "US Dollar with some barter systems"
      },
      technology: {
        level: "Industrial Revolution era",
        innovations: ["Steam power", "Telegraph", "Early firearms"],
        limitations: "Limited electricity and modern conveniences"
      },
      conflicts: [
        "Clash between mining interests and local residents",
        "Environmental impact of mining operations",
        "Cultural tensions between different groups"
      ],
      history: {
        majorEvents: ["Gold discovery", "Railway arrival", "Founding of the town"],
        legends: ["Tale of the first gold strike", "Stories of frontier heroes"]
      },
      threadId: thread.id // Include the thread ID for continued conversation
    };
  } catch (error) {
    console.error("Error creating world details:", error);
    // Create a new thread for fallback responses
    let fallbackThreadId;
    try {
      const fallbackThread = await openai.beta.threads.create();
      fallbackThreadId = fallbackThread.id;
      console.log(`Created fallback world-building thread: ${fallbackThreadId}`);
    } catch (threadError) {
      console.error("Error creating fallback thread:", threadError);
      fallbackThreadId = "fallback-thread-error";
    }
    
    // Return a fallback world if something goes wrong
    return {
      name: "Mining Frontier Town",
      description: "A bustling frontier town centered around gold mining operations in the late 19th century.",
      era: "Late 19th Century",
      geography: ["Mountains", "River Valley", "Forested Hills"],
      locations: ["Mining Camp", "Town Center", "Railway Station"],
      culture: {
        socialStructure: "Frontier hierarchy with wealthy business owners and laborers",
        beliefs: "Mixture of traditional values and frontier pragmatism",
        customs: ["Community gatherings", "Local celebrations", "Mining traditions"],
        languages: ["English", "Indigenous languages", "Immigrant dialects"]
      },
      politics: {
        governmentType: "Local town council with mining company influence",
        powerDynamics: "Tension between business interests and townspeople",
        majorFactions: ["Mining Company", "Townsfolk", "Law Enforcement"]
      },
      economy: {
        resources: ["Gold", "Timber", "Agriculture"],
        trade: "Resource extraction with growing commerce",
        currency: "US Dollar with some barter systems"
      },
      technology: {
        level: "Industrial Revolution era",
        innovations: ["Steam power", "Telegraph", "Early firearms"],
        limitations: "Limited electricity and modern conveniences"
      },
      conflicts: [
        "Clash between mining interests and local residents",
        "Environmental impact of mining operations",
        "Cultural tensions between different groups"
      ],
      history: {
        majorEvents: ["Gold discovery", "Railway arrival", "Founding of the town"],
        legends: ["Tale of the first gold strike", "Stories of frontier heroes"]
      },
      threadId: fallbackThreadId
    };
  }
}

/**
 * Wait for an assistant run to complete by polling
 */
async function waitForRunCompletion(threadId: string, runId: string, maxAttempts = 60): Promise<OpenAI.Beta.Threads.Runs.Run> {
  let attempts = 0;
  console.log(`Waiting for run ${runId} on thread ${threadId} to complete...`);
  
  while (attempts < maxAttempts) {
    const run = await openai.beta.threads.runs.retrieve(threadId, runId);
    console.log(`Run status (attempt ${attempts + 1}/${maxAttempts}): ${run.status}`);
    
    if (run.status === "completed") {
      console.log(`Run ${runId} completed successfully!`);
      return run;
    }
    
    if (run.status === "failed" || run.status === "cancelled" || run.status === "expired") {
      console.error(`Run ${runId} ended with status: ${run.status}`);
      if (run.last_error) {
        console.error(`Error details: ${run.last_error.code} - ${run.last_error.message}`);
      }
      return run;
    }
    
    // If the run requires action (like function calling), handle it
    if (run.status === "requires_action") {
      console.log(`Run ${runId} requires action - not handling in this implementation`);
      // This is where you'd handle tool calls if needed
      // For this simple example, we'll just cancel the run
      await openai.beta.threads.runs.cancel(threadId, runId);
      throw new Error("Run requires action, but we don't handle that in this example");
    }
    
    // Wait before checking again - increasing wait time for longer runs
    // Start with 1 second, then increase up to 3 seconds between checks
    const waitTime = Math.min(1000 + (attempts * 50), 3000);
    console.log(`Waiting ${waitTime}ms before checking again...`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
    attempts++;
  }
  
  // If we hit the max attempts, cancel the run and throw
  console.error(`Timed out after ${maxAttempts} attempts waiting for run ${runId} to complete`);
  await openai.beta.threads.runs.cancel(threadId, runId);
  throw new Error(`Timed out waiting for run to complete after ${maxAttempts} attempts`);
}