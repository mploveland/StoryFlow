import OpenAI from "openai";
import { storage } from "./storage";

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Assistant IDs
const StoryFlow_CharacterCreator_ID = "asst_6leBQqNpfRPmS8cHjH9H2BXz";
// The assistant's name is StoryFlow_GenreCreator
const StoryFlow_GenreCreator_ID = "asst_Hc5VyWr5mXgNL86DvT1m4cim";
// The assistant's name is StoryFlow_WorldBuilder
const StoryFlow_WorldBuilder_ID = "asst_jHr9TLXeEtTiqt6DjTRhP1fo";
// The assistant's name is StoryFlow_ChatResponseSuggestions
const StoryFlow_ChatResponseSuggestions_ID = "asst_qRnUXdtrdWBC5Zb5DOU1o5bO";
// The assistant's name is StoryFlow_EnvironmentGenerator
const StoryFlow_EnvironmentGenerator_ID = "asst_EezatLBvY8BhCC20fztog1RF";

// NOTE: We have removed the keyword-based context detection functions.
// The original functions included:
// - extractStringPattern 
// - extractPhraseList
// - detectConversationContext
//
// This approach has been replaced with a more reliable method based on database flags:
// - If genreCompleted is not TRUE → Genre Stage
// - If genreCompleted=TRUE and environmentCompleted is not TRUE → Environment Stage
// - If genreCompleted=TRUE and environmentCompleted=TRUE and worldCompleted is not TRUE → World Stage
// - If genreCompleted=TRUE and environmentCompleted=TRUE and worldCompleted=TRUE → Character Stage
//
// This ensures stage progression is always consistent and not dependent on message content analysis.

export interface GenreCreationInput {
  userInterests?: string;
  tone?: string; // Added tone as an alternative to themes
  mood?: string;
  targetAudience?: string;
  inspirations?: string[];
  additionalInfo?: string;
  // For continuing an existing conversation
  threadId?: string;
  previousMessages?: { role: "user" | "assistant"; content: string }[];
}

// Interface for a complete genre profile
export interface GenreDetails {
  // Core identifying information
  name?: string;
  mainGenre: string;
  description?: string;

  // Expanded genre information
  genreRationale?: string;
  audienceExpectations?: string;

  // Subgenre details
  subgenres?: string;
  subgenreRationale?: string;
  subgenreInteraction?: string;
  subgenreTropes?: string;

  // Mood and tone
  tone?: string;
  mood?: string;
  emotionalImpact?: string;

  // Setting elements
  timePeriod?: string;
  technologyLevel?: string;
  physicalEnvironment?: string;
  geography?: string;

  // Social elements
  societalStructures?: string;
  culturalNorms?: string;

  // Tropes and speculative elements
  keyTropes?: string;
  tropeStrategy?: string;
  speculativeElements?: string;
  speculativeRules?: string;

  // Atmosphere and style
  atmosphere?: string;
  sensoryDetails?: string;
  atmosphericStyle?: string;
  thematicEnvironmentTieins?: string;

  // Inspirations
  inspirations?: string;
  inspirationDetails?: string;
  divergenceFromInspirations?: string;

  // Legacy fields (maintained for compatibility)
  themes?: string[];
  tropes?: string[];
  commonSettings?: string[];
  typicalCharacters?: string[];
  plotStructures?: string[];
  styleGuide?: {
    tone?: string;
    pacing?: string;
    perspective?: string;
    dialogueStyle?: string;
  };
  recommendedReading?: string[];
  popularExamples?: string[];
  worldbuildingElements?: string[];
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
  genreContext?: string; // The genre context from the previous stage
  setting?: string; // Basic setting information
  timeframe?: string; // Era or time period
  environmentType?: string; // Natural environment (forest, desert, etc.)
  culture?: string; // Cultural details
  technology?: string; // Level of technology
  conflicts?: string; // Major conflicts in the world
  additionalInfo?: string; // Any additional world details
  // For continuing an existing conversation
  threadId?: string;
  previousMessages?: { role: "user" | "assistant"; content: string }[];
}

// Interface for environment creation input
export interface EnvironmentCreationInput {
  worldContext?: string; // The world context this environment exists within
  name?: string; // Name of the specific location
  locationType?: string; // Type of location (city, forest, castle, etc.)
  purpose?: string; // Purpose of this location in the story
  atmosphere?: string; // The mood or atmosphere of the location
  inhabitants?: string; // Who lives there or frequents the location
  dangers?: string; // Potential dangers or threats in this environment
  secrets?: string; // Hidden aspects or secrets of the location
  additionalInfo?: string; // Any additional environment details
  // For continuing an existing conversation
  threadId?: string;
  previousMessages?: { role: "user" | "assistant"; content: string }[];
}

// Interface for a complete world profile
export interface WorldDetails {
  name: string; // Name of the world/setting
  description: string; // General description
  era: string; // Time period/era
  geography: string[]; // Notable geographical features
  locations: string[]; // Important locations/regions
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
  conflicts: string[]; // Major conflicts or tensions
  history: {
    majorEvents: string[];
    legends: string[];
  };
  magicSystem?: {
    // Optional for fantasy settings
    rules: string;
    limitations: string;
    practitioners: string;
  };
}

// Interface for a complete environment profile
export interface EnvironmentDetails {
  name: string; // Name of the specific location
  description: string; // General description
  locationType: string; // Type of location (city, dungeon, forest, etc.)
  worldContext: string; // How this location fits into the broader world
  physicalAttributes: {
    size: string; // Size/scale of the location
    terrain: string; // Terrain and physical features
    climate: string; // Local climate conditions
    flora: string[]; // Notable plant life
    fauna: string[]; // Notable animal life
  };
  structuralFeatures: string[]; // Notable structural features
  sensoryDetails: {
    sights: string[]; // Visual details
    sounds: string[]; // Auditory elements
    smells: string[]; // Olfactory elements
    textures: string[]; // Tactile elements
  };
  inhabitants: {
    residents: string[]; // Who lives here
    visitors: string[]; // Who visits here
    controllingFaction: string; // Who controls this place
  };
  culture: {
    traditions: string[]; // Local traditions
    laws: string[]; // Local rules and laws
    attitudes: string; // General attitudes of place
  };
  history: {
    origin: string; // How the place came to be
    significantEvents: string[]; // Important historical events
    secrets: string[]; // Hidden or forgotten aspects
  };
  currentState: {
    condition: string; // Current physical condition
    atmosphere: string; // Current mood/atmosphere
    conflicts: string[]; // Current tensions or conflicts
  };
  storyRelevance: {
    purpose: string; // Purpose in the narrative
    challenges: string[]; // Obstacles or challenges presented
    rewards: string[]; // Potential rewards or discoveries
  };
  connections: {
    linkedLocations: string[]; // Connections to other locations
    accessPoints: string[]; // Ways to enter/exit
  };
}

/**
 * This function has been completely rewritten to ONLY use database completion flags
 * to determine what stage we're in. No keyword detection is used anymore.
 * 
 * Stage progression is enforced strictly in this sequence:
 * 1. Genre
 * 2. Environment 
 * 3. World
 * 4. Character
 */
export async function getAppropriateAssistant(
  message: string,
  currentAssistantType:
    | "genre"
    | "world"
    | "character"
    | "environment"
    | null = null,
  foundationId?: number,
): Promise<{
  assistantId: string;
  contextType: "genre" | "world" | "character" | "environment";
  isAutoTransition?: boolean;
}> {
  console.log(
    `Getting appropriate assistant for message: "${message.substring(
      0,
      50,
    )}..." with current assistant: ${currentAssistantType || "none"}`,
  );

  // If we don't have a foundation ID, use genre assistant (should almost never happen)
  if (!foundationId) {
    console.log("No foundation ID provided, defaulting to genre assistant");
    return {
      assistantId: StoryFlow_GenreCreator_ID,
      contextType: "genre"
    };
  }

  try {
    // Get the foundation to check completion flags
    const foundation = await storage.getFoundation(foundationId);
    
    if (!foundation) {
      console.log(`Foundation ${foundationId} not found, defaulting to genre assistant`);
      return {
        assistantId: StoryFlow_GenreCreator_ID,
        contextType: "genre"
      };
    }
    
    // Log the foundation flags to aid debugging
    console.log(`Foundation ${foundationId} stage flags:`, {
      genreCompleted: foundation.genreCompleted,
      environmentCompleted: foundation.environmentCompleted,
      worldCompleted: foundation.worldCompleted,
      charactersCompleted: foundation.charactersCompleted
    });
    
    // Determine current stage based solely on completion flags
    // This follows strict sequential progression: Genre → Environment → World → Character
    if (!foundation.genreCompleted) {
      // If genre is not completed, we're in the genre stage
      console.log(`Stage determined by flags: Genre (foundation.genreCompleted = ${foundation.genreCompleted})`);
      return {
        assistantId: StoryFlow_GenreCreator_ID,
        contextType: "genre"
      };
    } 
    else if (foundation.genreCompleted && !foundation.environmentCompleted) {
      // If genre is completed but environment is not, we're in the environment stage
      console.log(`Stage determined by flags: Environment (genre completed, environment not completed)`);
      return {
        assistantId: StoryFlow_EnvironmentGenerator_ID,
        contextType: "environment"
      };
    } 
    else if (foundation.genreCompleted && foundation.environmentCompleted && !foundation.worldCompleted) {
      // If genre and environment are completed but world is not, we're in the world stage
      console.log(`Stage determined by flags: World (genre & environment completed, world not completed)`);
      return {
        assistantId: StoryFlow_WorldBuilder_ID,
        contextType: "world"
      };
    }
    else if (foundation.genreCompleted && foundation.environmentCompleted && foundation.worldCompleted) {
      // If genre, environment, and world are completed, we're in the character stage
      console.log(`Stage determined by flags: Character (genre, environment & world completed)`);
      return {
        assistantId: StoryFlow_CharacterCreator_ID,
        contextType: "character"
      };
    }
    
    // This should never happen because the above conditions cover all possibilities,
    // but include a fallback just in case
    console.log("Unexpected state in foundation flags, defaulting to genre assistant");
    return {
      assistantId: StoryFlow_GenreCreator_ID,
      contextType: "genre"
    };
  } 
  catch (error) {
    // In case of any error getting foundation data, use a safe default
    console.error("Error determining stage from foundation flags:", error);
    console.log("Error occurred, defaulting to genre assistant");
    return {
      assistantId: StoryFlow_GenreCreator_ID,
      contextType: "genre"
    };
  }
}

/**
 * Creates a thread with the Hyper-Realistic Character Creator assistant and gets a detailed character
 * @param characterInput Basic information about the character
 * @returns A detailed character profile
 */
export async function createDetailedCharacter(
  characterInput: CharacterCreationInput,
): Promise<DetailedCharacter> {
  try {
    // Create a thread
    const thread = await openai.beta.threads.create();

    // Prepare the prompt from the input
    let promptContent =
      "Create a detailed character with the following specifications:\n\n";

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

    promptContent +=
      "\nPlease format the response as a JSON object with the following fields: name, role, background, personality (array), goals (array), fears (array), relationships (array), skills (array), appearance, voice, secrets, quirks (array), motivations (array), flaws (array)";

    // Add the message to the thread
    await openai.beta.threads.messages.create(thread.id, {
      role: "user",
      content: promptContent,
    });

    // Run the assistant on the thread
    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: StoryFlow_CharacterCreator_ID,
    });

    // Poll for the completion of the run
    let completedRun = await waitForRunCompletion(thread.id, run.id);

    if (completedRun.status !== "completed") {
      throw new Error(`Run ended with status: ${completedRun.status}`);
    }

    // Retrieve the assistant's messages
    const messages = await openai.beta.threads.messages.list(thread.id);
    const assistantMessages = messages.data.filter(
      (msg) => msg.role === "assistant",
    );

    if (assistantMessages.length === 0) {
      throw new Error("No response from the assistant");
    }

    // Get the latest message
    const latestMessage = assistantMessages[0];
    let responseText = "";

    // Extract the text content from the message
    for (const content of latestMessage.content) {
      if (content.type === "text") {
        responseText = content.text.value;
        break;
      }
    }

    if (!responseText) {
      throw new Error("No text content in the assistant's response");
    }

    // Try to parse the JSON response
    try {
      // First try to extract JSON if it's wrapped in markdown code blocks
      let jsonMatch = responseText.match(/```(?:json)?\s*({[\s\S]*?})\s*```/);
      if (jsonMatch && jsonMatch[1]) {
        responseText = jsonMatch[1];
      }

      // Clean up any potential formatting issues
      responseText = responseText.replace(/\\n/g, "").replace(/\\"/g, '"');

      // Parse the character details
      const characterDetails = JSON.parse(responseText);

      // Create a structured character object
      const result: DetailedCharacter = {
        name: characterDetails.name || "Unknown",
        role: characterDetails.role || "Unknown",
        background: characterDetails.background || "Unknown",
        personality: Array.isArray(characterDetails.personality)
          ? characterDetails.personality
          : ["Unknown"],
        goals: Array.isArray(characterDetails.goals)
          ? characterDetails.goals
          : ["Unknown"],
        fears: Array.isArray(characterDetails.fears)
          ? characterDetails.fears
          : ["Unknown"],
        relationships: Array.isArray(characterDetails.relationships)
          ? characterDetails.relationships
          : ["Unknown"],
        skills: Array.isArray(characterDetails.skills)
          ? characterDetails.skills
          : ["Unknown"],
        appearance: characterDetails.appearance || "Unknown",
        voice: characterDetails.voice || "Unknown",
        secrets: characterDetails.secrets || undefined,
        quirks: Array.isArray(characterDetails.quirks)
          ? characterDetails.quirks
          : undefined,
        motivations: Array.isArray(characterDetails.motivations)
          ? characterDetails.motivations
          : undefined,
        flaws: Array.isArray(characterDetails.flaws)
          ? characterDetails.flaws
          : undefined,
      };

      return result;
    } catch (error) {
      console.error("Error parsing character JSON:", error);
      console.error("Raw response:", responseText);

      // Return a minimal character object with the text content
      return {
        name: characterInput.name || "Unknown",
        role: characterInput.role || "Unknown",
        background: "Failed to parse character details: " + responseText,
        personality: ["Unknown"],
        goals: ["Unknown"],
        fears: ["Unknown"],
        relationships: ["Unknown"],
        skills: ["Unknown"],
        appearance: "Unknown",
        voice: "Unknown",
      };
    }
  } catch (error) {
    console.error("Error creating detailed character:", error);
    throw error;
  }
}

/**
 * Creates a thread with the Genre Creator assistant and gets detailed genre information
 * @param genreInput Basic information about the desired genre
 * @returns A detailed genre profile
 */
export async function createGenreDetails(
  genreInput: GenreCreationInput,
): Promise<{ genreDetails: GenreDetails; threadId: string }> {
  try {
    // Use an existing thread or create a new one
    const threadId = genreInput.threadId || (await openai.beta.threads.create()).id;

    let promptContent = "Let's create a genre for my story. ";

    if (genreInput.userInterests) {
      promptContent += `Here are some of my interests: ${genreInput.userInterests}. `;
    }

    if (genreInput.tone) {
      promptContent += `I'd like the tone to be: ${genreInput.tone}. `;
    }

    if (genreInput.mood) {
      promptContent += `The mood I'm aiming for is: ${genreInput.mood}. `;
    }

    if (genreInput.targetAudience) {
      promptContent += `The target audience is: ${genreInput.targetAudience}. `;
    }

    if (
      genreInput.inspirations &&
      Array.isArray(genreInput.inspirations) &&
      genreInput.inspirations.length > 0
    ) {
      promptContent += `I'm inspired by: ${genreInput.inspirations.join(
        ", ",
      )}. `;
    }

    if (genreInput.additionalInfo) {
      promptContent += `Additional information: ${genreInput.additionalInfo}`;
    }

    if (genreInput.previousMessages && genreInput.previousMessages.length > 0) {
      // If we have previous messages, we're continuing a conversation
      // Just add the latest user message
      const lastUserMessage = genreInput.previousMessages
        .filter((msg) => msg.role === "user")
        .pop();

      if (lastUserMessage) {
        promptContent = lastUserMessage.content;
      }
    }

    // Add the message to the thread
    await openai.beta.threads.messages.create(threadId, {
      role: "user",
      content: promptContent,
    });

    // Run the assistant on the thread
    const run = await openai.beta.threads.runs.create(threadId, {
      assistant_id: StoryFlow_GenreCreator_ID,
    });

    // Poll for the completion of the run
    const completedRun = await waitForRunCompletion(threadId, run.id);

    if (completedRun.status !== "completed") {
      throw new Error(`Run ended with status: ${completedRun.status}`);
    }

    // Retrieve the assistant's messages
    const messages = await openai.beta.threads.messages.list(threadId);
    const assistantMessages = messages.data.filter(
      (msg) => msg.role === "assistant",
    );

    if (assistantMessages.length === 0) {
      throw new Error("No response from the assistant");
    }

    // Get the latest message
    const latestMessage = assistantMessages[0];
    let responseText = "";

    // Extract the text content from the message
    for (const content of latestMessage.content) {
      if (content.type === "text") {
        responseText = content.text.value;
        break;
      }
    }

    // Extract genre details from the response
    let mainGenre = "Fantasy"; // Default
    let description = responseText;

    // Try to extract fields from the response in a more robust way
    const mainGenreMatch = responseText.match(
      /main genre:?\s*([\w\s\-]+)/i,
    );
    if (mainGenreMatch && mainGenreMatch[1]) {
      mainGenre = mainGenreMatch[1].trim();
    }

    const genreDetails: GenreDetails = {
      mainGenre,
      description,
    };

    // Try to extract specific fields
    const extractField = (
      fieldName: string,
      regex: RegExp,
      defaultValue: string = "",
    ): string => {
      const match = responseText.match(regex);
      return match && match[1] ? match[1].trim() : defaultValue;
    };

    // Core genre info
    genreDetails.genreRationale = extractField(
      "genreRationale",
      /genre rationale:?\s*([^#]+)/i,
    );
    genreDetails.audienceExpectations = extractField(
      "audienceExpectations",
      /audience expectations:?\s*([^#]+)/i,
    );

    // Subgenre details
    genreDetails.subgenres = extractField(
      "subgenres",
      /subgenres:?\s*([^#]+)/i,
    );
    genreDetails.subgenreRationale = extractField(
      "subgenreRationale",
      /subgenre rationale:?\s*([^#]+)/i,
    );
    genreDetails.subgenreInteraction = extractField(
      "subgenreInteraction",
      /subgenre interaction:?\s*([^#]+)/i,
    );
    genreDetails.subgenreTropes = extractField(
      "subgenreTropes",
      /subgenre tropes:?\s*([^#]+)/i,
    );

    // Mood and tone
    genreDetails.tone = extractField("tone", /tone:?\s*([^#]+)/i);
    genreDetails.mood = extractField("mood", /mood:?\s*([^#]+)/i);
    genreDetails.emotionalImpact = extractField(
      "emotionalImpact",
      /emotional impact:?\s*([^#]+)/i,
    );

    // Setting elements
    genreDetails.timePeriod = extractField(
      "timePeriod",
      /time period:?\s*([^#]+)/i,
    );
    genreDetails.technologyLevel = extractField(
      "technologyLevel",
      /technology level:?\s*([^#]+)/i,
    );
    genreDetails.physicalEnvironment = extractField(
      "physicalEnvironment",
      /physical environment:?\s*([^#]+)/i,
    );
    genreDetails.geography = extractField(
      "geography",
      /geography:?\s*([^#]+)/i,
    );

    // Social elements
    genreDetails.societalStructures = extractField(
      "societalStructures",
      /societal structures:?\s*([^#]+)/i,
    );
    genreDetails.culturalNorms = extractField(
      "culturalNorms",
      /cultural norms:?\s*([^#]+)/i,
    );

    // Tropes and speculative elements
    genreDetails.keyTropes = extractField(
      "keyTropes",
      /key tropes:?\s*([^#]+)/i,
    );
    genreDetails.tropeStrategy = extractField(
      "tropeStrategy",
      /trope strategy:?\s*([^#]+)/i,
    );
    genreDetails.speculativeElements = extractField(
      "speculativeElements",
      /speculative elements:?\s*([^#]+)/i,
    );
    genreDetails.speculativeRules = extractField(
      "speculativeRules",
      /speculative rules:?\s*([^#]+)/i,
    );

    // Atmosphere and style
    genreDetails.atmosphere = extractField(
      "atmosphere",
      /atmosphere:?\s*([^#]+)/i,
    );
    genreDetails.sensoryDetails = extractField(
      "sensoryDetails",
      /sensory details:?\s*([^#]+)/i,
    );
    genreDetails.atmosphericStyle = extractField(
      "atmosphericStyle",
      /atmospheric style:?\s*([^#]+)/i,
    );
    genreDetails.thematicEnvironmentTieins = extractField(
      "thematicEnvironmentTieins",
      /thematic environment tie-ins:?\s*([^#]+)/i,
    );

    // Inspirations
    genreDetails.inspirations = extractField(
      "inspirations",
      /inspirations:?\s*([^#]+)/i,
    );
    genreDetails.inspirationDetails = extractField(
      "inspirationDetails",
      /inspiration details:?\s*([^#]+)/i,
    );
    genreDetails.divergenceFromInspirations = extractField(
      "divergenceFromInspirations",
      /divergence from inspirations:?\s*([^#]+)/i,
    );

    // For legacy compatibility - extract these as arrays
    const extractArrayField = (
      fieldName: string,
      regex: RegExp,
    ): string[] => {
      const match = responseText.match(regex);
      if (match && match[1]) {
        return match[1]
          .split(/[,;]/)
          .map((item) => item.trim())
          .filter((item) => item.length > 0);
      }
      return [];
    };

    genreDetails.themes = extractArrayField(
      "themes",
      /themes:?\s*([^#]+)/i,
    );
    genreDetails.tropes = extractArrayField(
      "tropes",
      /tropes:?\s*([^#]+)/i,
    );
    genreDetails.commonSettings = extractArrayField(
      "commonSettings",
      /common settings:?\s*([^#]+)/i,
    );
    genreDetails.typicalCharacters = extractArrayField(
      "typicalCharacters",
      /typical characters:?\s*([^#]+)/i,
    );
    genreDetails.plotStructures = extractArrayField(
      "plotStructures",
      /plot structures:?\s*([^#]+)/i,
    );
    genreDetails.recommendedReading = extractArrayField(
      "recommendedReading",
      /recommended reading:?\s*([^#]+)/i,
    );
    genreDetails.popularExamples = extractArrayField(
      "popularExamples",
      /popular examples:?\s*([^#]+)/i,
    );
    genreDetails.worldbuildingElements = extractArrayField(
      "worldbuildingElements",
      /worldbuilding elements:?\s*([^#]+)/i,
    );

    return { genreDetails, threadId };
  } catch (error) {
    console.error("Error creating genre details:", error);
    throw error;
  }
}

/**
 * Creates a thread with the Environment Generator assistant and gets detailed environment information
 * @param environmentInput Basic information about the desired environment
 * @returns A detailed environment profile with thread ID for continued conversation
 */
export async function createEnvironmentDetails(
  environmentInput: EnvironmentCreationInput,
): Promise<{ environmentDetails: EnvironmentDetails; threadId: string }> {
  try {
    // Use an existing thread or create a new one
    const threadId = environmentInput.threadId || (await openai.beta.threads.create()).id;

    let promptContent = "Let's create a detailed environment for my story. ";

    if (environmentInput.worldContext) {
      promptContent += `This environment exists within: ${environmentInput.worldContext}. `;
    }

    if (environmentInput.name) {
      promptContent += `The location's name is: ${environmentInput.name}. `;
    }

    if (environmentInput.locationType) {
      promptContent += `It's a type of: ${environmentInput.locationType}. `;
    }

    if (environmentInput.purpose) {
      promptContent += `Its purpose in the story is: ${environmentInput.purpose}. `;
    }

    if (environmentInput.atmosphere) {
      promptContent += `The atmosphere/mood is: ${environmentInput.atmosphere}. `;
    }

    if (environmentInput.inhabitants) {
      promptContent += `It's inhabited by: ${environmentInput.inhabitants}. `;
    }

    if (environmentInput.dangers) {
      promptContent += `Potential dangers include: ${environmentInput.dangers}. `;
    }

    if (environmentInput.secrets) {
      promptContent += `Hidden aspects include: ${environmentInput.secrets}. `;
    }

    if (environmentInput.additionalInfo) {
      promptContent += `Additional information: ${environmentInput.additionalInfo}`;
    }

    if (environmentInput.previousMessages && environmentInput.previousMessages.length > 0) {
      // If we have previous messages, we're continuing a conversation
      // Just add the latest user message
      const lastUserMessage = environmentInput.previousMessages
        .filter((msg) => msg.role === "user")
        .pop();

      if (lastUserMessage) {
        promptContent = lastUserMessage.content;
      }
    }

    // Add the message to the thread
    await openai.beta.threads.messages.create(threadId, {
      role: "user",
      content: promptContent,
    });

    // Run the assistant on the thread
    const run = await openai.beta.threads.runs.create(threadId, {
      assistant_id: StoryFlow_EnvironmentGenerator_ID,
    });

    // Poll for the completion of the run
    const completedRun = await waitForRunCompletion(threadId, run.id);

    if (completedRun.status !== "completed") {
      throw new Error(`Run ended with status: ${completedRun.status}`);
    }

    // Retrieve the assistant's messages
    const messages = await openai.beta.threads.messages.list(threadId);
    const assistantMessages = messages.data.filter(
      (msg) => msg.role === "assistant",
    );

    if (assistantMessages.length === 0) {
      throw new Error("No response from the assistant");
    }

    // Get the latest message
    const latestMessage = assistantMessages[0];
    let responseText = "";

    // Extract the text content from the message
    for (const content of latestMessage.content) {
      if (content.type === "text") {
        responseText = content.text.value;
        break;
      }
    }

    // Extract environment details from the response using regex patterns
    // This is not as reliable as JSON, but necessary for the current assistants
    const nameMatch = responseText.match(/name:?\s*(.+?)(?:\n|$)/i);
    const locationTypeMatch = responseText.match(/location type:?\s*(.+?)(?:\n|$)/i);
    const descriptionMatch = responseText.match(/description:?\s*(.+?)(?:\n|$)/i);
    const worldContextMatch = responseText.match(/world context:?\s*(.+?)(?:\n|$)/i);

    // Create a default environment object with extracted data or placeholders
    const environment: EnvironmentDetails = {
      name: nameMatch?.[1]?.trim() || environmentInput.name || "Unnamed Location",
      description: descriptionMatch?.[1]?.trim() || responseText.substring(0, 200) + "...",
      locationType: locationTypeMatch?.[1]?.trim() || environmentInput.locationType || "Unknown",
      worldContext: worldContextMatch?.[1]?.trim() || environmentInput.worldContext || "Unknown",
      
      physicalAttributes: {
        size: "Medium", // Default
        terrain: "Varied",
        climate: "Temperate",
        flora: ["Various plants"],
        fauna: ["Various animals"],
      },
      
      structuralFeatures: ["Notable structures"],
      
      sensoryDetails: {
        sights: ["Visual elements"],
        sounds: ["Auditory elements"],
        smells: ["Olfactory elements"],
        textures: ["Tactile elements"],
      },
      
      inhabitants: {
        residents: ["Local residents"],
        visitors: ["Common visitors"],
        controllingFaction: "Ruling group",
      },
      
      culture: {
        traditions: ["Local customs"],
        laws: ["Local rules"],
        attitudes: "General cultural outlook",
      },
      
      history: {
        origin: "How this place came to be",
        significantEvents: ["Important historical events"],
        secrets: ["Hidden aspects"],
      },
      
      currentState: {
        condition: "Current physical state",
        atmosphere: environmentInput.atmosphere || "General mood",
        conflicts: ["Current tensions"],
      },
      
      storyRelevance: {
        purpose: environmentInput.purpose || "Role in the narrative",
        challenges: ["Obstacles present"],
        rewards: ["Potential discoveries"],
      },
      
      connections: {
        linkedLocations: ["Related places"],
        accessPoints: ["Ways to enter/exit"],
      },
    };

    // Further parse the full text to extract more detailed information
    // This is a simplified approach that could be enhanced with more regex patterns
    
    // Extract physical attributes
    const sizeMatch = responseText.match(/size:?\s*(.+?)(?:\n|$)/i);
    if (sizeMatch) environment.physicalAttributes.size = sizeMatch[1].trim();
    
    const terrainMatch = responseText.match(/terrain:?\s*(.+?)(?:\n|$)/i);
    if (terrainMatch) environment.physicalAttributes.terrain = terrainMatch[1].trim();
    
    const climateMatch = responseText.match(/climate:?\s*(.+?)(?:\n|$)/i);
    if (climateMatch) environment.physicalAttributes.climate = climateMatch[1].trim();
    
    // Extract flora and fauna (simplified)
    const floraMatch = responseText.match(/flora:?\s*(.+?)(?:\n|$)/i);
    if (floraMatch) {
      environment.physicalAttributes.flora = floraMatch[1]
        .split(/[,;]/)
        .map(item => item.trim())
        .filter(item => item.length > 0);
    }
    
    const faunaMatch = responseText.match(/fauna:?\s*(.+?)(?:\n|$)/i);
    if (faunaMatch) {
      environment.physicalAttributes.fauna = faunaMatch[1]
        .split(/[,;]/)
        .map(item => item.trim())
        .filter(item => item.length > 0);
    }
    
    // Extract atmosphere
    const atmosphereMatch = responseText.match(/atmosphere:?\s*(.+?)(?:\n|$)/i);
    if (atmosphereMatch) environment.currentState.atmosphere = atmosphereMatch[1].trim();
    
    // Extract purpose
    const purposeMatch = responseText.match(/purpose:?\s*(.+?)(?:\n|$)/i);
    if (purposeMatch) environment.storyRelevance.purpose = purposeMatch[1].trim();

    return { environmentDetails: environment, threadId };
  } catch (error) {
    console.error("Error creating environment details:", error);
    throw error;
  }
}

/**
 * Creates a thread with the World Builder assistant and gets detailed world information
 * @param worldInput Basic information about the desired world
 * @returns A detailed world profile with thread ID for continued conversation
 */
export async function createWorldDetails(
  worldInput: WorldCreationInput,
): Promise<{ worldDetails: WorldDetails; threadId: string }> {
  try {
    // Use an existing thread or create a new one
    const threadId = worldInput.threadId || (await openai.beta.threads.create()).id;

    let promptContent = "Let's build a detailed world for my story. ";

    if (worldInput.genreContext) {
      promptContent += `The genre context is: ${worldInput.genreContext}. `;
    }

    if (worldInput.setting) {
      promptContent += `The basic setting is: ${worldInput.setting}. `;
    }

    if (worldInput.timeframe) {
      promptContent += `The era/time period is: ${worldInput.timeframe}. `;
    }

    if (worldInput.environmentType) {
      promptContent += `The natural environment is: ${worldInput.environmentType}. `;
    }

    if (worldInput.culture) {
      promptContent += `The culture is: ${worldInput.culture}. `;
    }

    if (worldInput.technology) {
      promptContent += `The technology level is: ${worldInput.technology}. `;
    }

    if (worldInput.conflicts) {
      promptContent += `Major conflicts include: ${worldInput.conflicts}. `;
    }

    if (worldInput.additionalInfo) {
      promptContent += `Additional information: ${worldInput.additionalInfo}`;
    }

    if (worldInput.previousMessages && worldInput.previousMessages.length > 0) {
      // If we have previous messages, we're continuing a conversation
      // Just add the latest user message
      const lastUserMessage = worldInput.previousMessages
        .filter((msg) => msg.role === "user")
        .pop();

      if (lastUserMessage) {
        promptContent = lastUserMessage.content;
      }
    }

    // Add the message to the thread
    await openai.beta.threads.messages.create(threadId, {
      role: "user",
      content: promptContent,
    });

    // Run the assistant on the thread
    const run = await openai.beta.threads.runs.create(threadId, {
      assistant_id: StoryFlow_WorldBuilder_ID,
    });

    // Poll for the completion of the run
    const completedRun = await waitForRunCompletion(threadId, run.id);

    if (completedRun.status !== "completed") {
      throw new Error(`Run ended with status: ${completedRun.status}`);
    }

    // Retrieve the assistant's messages
    const messages = await openai.beta.threads.messages.list(threadId);
    const assistantMessages = messages.data.filter(
      (msg) => msg.role === "assistant",
    );

    if (assistantMessages.length === 0) {
      throw new Error("No response from the assistant");
    }

    // Get the latest message
    const latestMessage = assistantMessages[0];
    let responseText = "";

    // Extract the text content from the message
    for (const content of latestMessage.content) {
      if (content.type === "text") {
        responseText = content.text.value;
        break;
      }
    }

    // Extract world details from the response using regex patterns
    const nameMatch = responseText.match(/name:?\s*(.+?)(?:\n|$)/i);
    const eraMatch = responseText.match(/era:?\s*(.+?)(?:\n|$)/i);
    const descriptionMatch = responseText.match(/description:?\s*(.+?)(?:\n\n|\n#|\n\*\*|$)/i);

    // Create a default world object
    const world: WorldDetails = {
      name: nameMatch?.[1]?.trim() || worldInput.setting?.split(" ")[0] || "Unnamed World",
      description: descriptionMatch?.[1]?.trim() || responseText.substring(0, 200) + "...",
      era: eraMatch?.[1]?.trim() || worldInput.timeframe || "Unknown Era",
      
      geography: ["Various geographical features"],
      locations: ["Notable locations"],
      
      culture: {
        socialStructure: "Social hierarchy",
        beliefs: "Common beliefs and values",
        customs: ["Cultural practices"],
        languages: ["Spoken languages"],
      },
      
      politics: {
        governmentType: "System of governance",
        powerDynamics: "Distribution of power",
        majorFactions: ["Important political groups"],
      },
      
      economy: {
        resources: ["Valuable resources"],
        trade: "Economic system",
        currency: "Exchange medium",
      },
      
      technology: {
        level: worldInput.technology || "Technological advancement",
        innovations: ["Notable technologies"],
        limitations: "Technological constraints",
      },
      
      conflicts: [worldInput.conflicts || "Major tensions"],
      
      history: {
        majorEvents: ["Significant historical events"],
        legends: ["Myths and legends"],
      },
    };

    // If there are indications of magic, add a magic system
    if (responseText.toLowerCase().includes("magic") || 
        responseText.toLowerCase().includes("magical") || 
        responseText.toLowerCase().includes("spell") ||
        responseText.toLowerCase().includes("arcane")) {
      
      world.magicSystem = {
        rules: "How magic functions",
        limitations: "Constraints on magical power",
        practitioners: "Who can use magic",
      };
      
      // Extract magic details if available
      // Use 'i' flag instead of 'is' to avoid TypeScript error
      const magicRulesMatch = responseText.match(/magic rules:?\s*(.+?)(?:\n\n|\n#|\n\*\*|$)/i);
      if (magicRulesMatch) world.magicSystem.rules = magicRulesMatch[1].trim();
      
      // Use 'i' flag instead of 'is' flag for TypeScript compatibility
      const magicLimitationsMatch = responseText.match(/magic limitations:?\s*(.+?)(?:\n\n|\n#|\n\*\*|$)/i);
      if (magicLimitationsMatch) world.magicSystem.limitations = magicLimitationsMatch[1].trim();
      
      // Use 'i' flag instead of 'is' flag for TypeScript compatibility
      const magicPractitionersMatch = responseText.match(/magic practitioners:?\s*(.+?)(?:\n\n|\n#|\n\*\*|$)/i);
      if (magicPractitionersMatch) world.magicSystem.practitioners = magicPractitionersMatch[1].trim();
    }

    // Further parse the response to extract more information
    // Extract geography (simplified)
    // Use 'i' flag instead of 'is' flag for TypeScript compatibility
    const geographyMatch = responseText.match(/geography:?\s*(.+?)(?:\n\n|\n#|\n\*\*|$)/i);
    if (geographyMatch) {
      world.geography = geographyMatch[1]
        .split(/[,;.]/)
        .map(item => item.trim())
        .filter(item => item.length > 0);
    }
    
    // Extract locations
    // Use 'i' flag instead of 'is' flag for TypeScript compatibility
    const locationsMatch = responseText.match(/locations:?\s*(.+?)(?:\n\n|\n#|\n\*\*|$)/i);
    if (locationsMatch) {
      world.locations = locationsMatch[1]
        .split(/[,;.]/)
        .map(item => item.trim())
        .filter(item => item.length > 0);
    }
    
    // Extract social structure
    const socialStructureMatch = responseText.match(/social structure:?\s*(.+?)(?:\n|$)/i);
    if (socialStructureMatch) world.culture.socialStructure = socialStructureMatch[1].trim();
    
    // Extract beliefs
    const beliefsMatch = responseText.match(/beliefs:?\s*(.+?)(?:\n|$)/i);
    if (beliefsMatch) world.culture.beliefs = beliefsMatch[1].trim();
    
    // Extract government
    const governmentMatch = responseText.match(/government:?\s*(.+?)(?:\n|$)/i);
    if (governmentMatch) world.politics.governmentType = governmentMatch[1].trim();
    
    // Extract technology level
    const techLevelMatch = responseText.match(/technology level:?\s*(.+?)(?:\n|$)/i);
    if (techLevelMatch) world.technology.level = techLevelMatch[1].trim();

    return { worldDetails: world, threadId };
  } catch (error) {
    console.error("Error creating world details:", error);
    throw error;
  }
}

/**
 * Generate chat suggestions using the StoryFlow_ChatResponseSuggestions assistant.
 * This function takes the conversation context and returns suggested responses.
 * All suggestions MUST come from the StoryFlow_ChatResponseSuggestions assistant.
 *
 * @param userMessage The user's last message in the conversation
 * @param assistantReply The assistant's response to the user's message
 * @returns Array of suggested responses the user could make
 */
export async function generateChatSuggestions(
  userMessage: string,
  assistantReply: string,
): Promise<string[]> {
  try {
    console.log("Generating chat suggestions for conversation:");
    console.log(`User: ${userMessage.substring(0, 50)}...`);
    console.log(`Assistant: ${assistantReply.substring(0, 50)}...`);

    // Create a new thread for this suggestion request
    const thread = await openai.beta.threads.create();
    console.log(`Created thread: ${thread.id} for chat suggestions`);

    // Simplified prompt - just send the conversation context without additional instructions
    const content = `USER: ${userMessage}
ASSISTANT: ${assistantReply}`;

    // Add the message to the thread
    await openai.beta.threads.messages.create(thread.id, {
      role: "user",
      content,
    });

    console.log("Passing conversation to the chat suggestions assistant");
    console.log(`Using assistant ID: ${StoryFlow_ChatResponseSuggestions_ID} for chat suggestions`);

    // Run the assistant
    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: StoryFlow_ChatResponseSuggestions_ID,
    });
    console.log(`Started run: ${run.id} with assistant: ${StoryFlow_ChatResponseSuggestions_ID}`);

    // Wait for the run to complete
    const completedRun = await waitForRunCompletion(thread.id, run.id);
    if (completedRun.status !== "completed") {
      console.error(`Suggestions run failed with status: ${completedRun.status}`);
      return [
        "Tell me more about that.",
        "That sounds interesting.",
        "I like that idea!",
        "Let's explore that further.",
        "What else can you tell me?",
      ];
    }

    // Get the assistant's reply
    const messages = await openai.beta.threads.messages.list(thread.id);
    const assistantMessages = messages.data.filter(
      (msg) => msg.role === "assistant",
    );

    if (assistantMessages.length === 0) {
      console.error("No suggestions received from assistant");
      return [
        "Tell me more about that.",
        "I like that idea!",
        "Let's continue with this approach.",
        "Could you elaborate on that?",
        "That works for me.",
      ];
    }

    // Get the most recent message
    const latestMessage = assistantMessages[0];
    let responseText = "";

    // Extract text content
    for (const content of latestMessage.content) {
      if (content.type === "text") {
        responseText = content.text.value;
        break;
      }
    }

    // Try to parse JSON from the response
    try {
      // First, try to extract JSON if it's wrapped in a code block
      let jsonMatch = responseText.match(/```(?:json)?\s*({[\s\S]*?})\s*```/);
      let jsonText = jsonMatch ? jsonMatch[1] : responseText;

      // Clean up any potential formatting issues
      jsonText = jsonText.replace(/\\n/g, "").replace(/\\"/g, '"');

      console.log("Raw suggestion response:", jsonText);

      // Parse the JSON
      const responseObj = JSON.parse(jsonText);
      console.log("Successfully parsed complete JSON response");

      // Check if the response has the expected structure
      if (responseObj && Array.isArray(responseObj.options)) {
        console.log(`Parsed response object:`, JSON.stringify(responseObj).substring(0, 150) + "...");
        const suggestions = responseObj.options
          .filter((option: any) => typeof option === "string" && option.trim().length > 0)
          .slice(0, 15); // Limit to 15 suggestions max

        console.log(`Returning ${suggestions.length} valid suggestions:`, JSON.stringify(suggestions));
        return suggestions;
      } else {
        // If the structure doesn't match, try direct extraction
        console.error("Response didn't have expected 'options' array structure:", responseObj);
        
        // Try to extract suggestions directly from the text
        const lines = responseText
          .split("\n")
          .map((line) => line.trim())
          .filter((line) => 
            line.startsWith("-") || 
            line.startsWith("*") || 
            /^\d+[\.\)]/.test(line)
          )
          .map((line) => line.replace(/^[-*\d\.)\s]+/, "").trim())
          .filter((line) => line.length > 0)
          .slice(0, 15);
        
        if (lines.length > 0) {
          console.log(`Extracted ${lines.length} suggestions from text format`);
          return lines;
        }
        
        // Fallback suggestions
        return [
          "Tell me more about that.",
          "That's interesting!",
          "Let's continue with this approach.",
          "I like where this is going.",
          "What other possibilities are there?",
        ];
      }
    } catch (error) {
      console.error("Error parsing suggestions JSON:", error);
      
      // Try to extract suggestions directly from the text as a fallback
      const lines = responseText
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => 
          line.startsWith("-") || 
          line.startsWith("*") || 
          /^\d+[\.\)]/.test(line)
        )
        .map((line) => line.replace(/^[-*\d\.)\s]+/, "").trim())
        .filter((line) => line.length > 0)
        .slice(0, 15);
      
      if (lines.length > 0) {
        console.log(`Extracted ${lines.length} suggestions from text format after JSON parse failure`);
        return lines;
      }
      
      // Ultimate fallback suggestions
      return [
        "Tell me more.",
        "I like that!",
        "Let's continue.",
        "Interesting approach.",
        "What else?",
      ];
    }
  } catch (error) {
    console.error("Error generating chat suggestions:", error);
    return [
      "Tell me more.",
      "Sounds good.",
      "I like that idea.",
      "Let's go with that.",
      "What's next?",
    ];
  }
}

/**
 * Wait for an assistant run to complete by polling
 */
export async function waitForRunCompletion(
  threadId: string,
  runId: string,
  maxAttempts = 60,
): Promise<OpenAI.Beta.Threads.Runs.Run> {
  let attempts = 0;
  console.log(`Waiting for run ${runId} on thread ${threadId} to complete...`);

  while (attempts < maxAttempts) {
    const run = await openai.beta.threads.runs.retrieve(threadId, runId);
    console.log(
      `Run status (attempt ${attempts + 1}/${maxAttempts}): ${run.status}`,
    );

    if (run.status === "completed") {
      console.log(`Run ${runId} completed successfully!`);
      return run;
    }

    if (
      run.status === "failed" ||
      run.status === "cancelled" ||
      run.status === "expired"
    ) {
      console.error(`Run ${runId} ended with status: ${run.status}`);
      if (run.last_error) {
        console.error(
          `Error details: ${run.last_error.code} - ${run.last_error.message}`,
        );
      }
      return run;
    }

    // If the run requires action (like function calling), handle it
    if (run.status === "requires_action") {
      console.log(
        `Run ${runId} requires action - not handling in this implementation`,
      );
      // This is where you'd handle tool calls if needed
      // For this simple example, we'll just cancel the run
      await openai.beta.threads.runs.cancel(threadId, runId);
      throw new Error(
        "Run requires action, but we don't handle that in this example",
      );
    }

    // Wait before checking again - increasing wait time for longer runs
    // Start with 1 second, then increase up to 3 seconds between checks
    const waitTime = Math.min(1000 + attempts * 50, 3000);
    console.log(`Waiting ${waitTime}ms before checking again...`);
    await new Promise((resolve) => setTimeout(resolve, waitTime));
    attempts++;
  }

  // If we hit the max attempts, cancel the run and throw
  console.error(
    `Timed out after ${maxAttempts} attempts waiting for run ${runId} to complete`,
  );
  await openai.beta.threads.runs.cancel(threadId, runId);
  throw new Error(
    `Timed out waiting for run to complete after ${maxAttempts} attempts`,
  );
}