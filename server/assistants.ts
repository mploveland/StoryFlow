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
const WORLD_BUILDER_ASSISTANT_ID = "asst_1uR8DP6BZB3CdrUDm6Me7vHA";
// The assistant's name is StoryFlow_ChatResponseSuggestions
const CHAT_SUGGESTIONS_ASSISTANT_ID = "asst_qRnUXdtrdWBC5Zb5DOU1o5bO";
// The assistant's name is StoryFlow_EnvironmentGenerator
const ENVIRONMENT_GENERATOR_ASSISTANT_ID = "asst_EezatLBvY8BhCC20fztog1RF";

/**
 * Helper function to extract pattern matches from text with safety checks
 * 
 * @param text The text to search in
 * @param regex The regex pattern to match
 * @param contextLength How many characters to extract around the match
 * @returns The extracted text portion or empty string if no match
 */
function extractStringPattern(text: string, regex: RegExp, contextLength = 100): string {
  const match = text.match(regex);
  if (!match || typeof match.index !== 'number') return '';
  
  // If we have a capture group, use that, otherwise use the whole match
  const capturedText = match[1] ? match[1].trim() : match[0].trim();
  return capturedText;
}

/**
 * Helper function to extract a list of phrases from a text using a regex pattern
 * 
 * @param text The text to search in
 * @param regex The regex pattern to match
 * @returns An array of extracted phrases
 */
function extractPhraseList(text: string, regex: RegExp): string[] {
  const match = text.match(regex);
  if (!match || !match[1]) return [];
  
  return match[1].split(/[,;.]/)
    .map(item => item.trim())
    .filter(item => item.length > 0);
}

/**
 * Helper function to detect conversation context from a message
 * This is used to dynamically switch between assistants based on the content
 * 
 * @param message The user's message to analyze
 * @returns The detected context type ('character', 'world', 'genre', 'environment', or null)
 */
export function detectConversationContext(message: string): 'character' | 'world' | 'genre' | 'environment' | null {
  const cleanedMessage = message.toLowerCase();
  
  // Character-related keywords
  const characterKeywords = [
    'character', 'protagonist', 'antagonist', 'villain', 'hero', 'heroine',
    'personality', 'backstory', 'motivation', 'goal', 'fear', 'flaw',
    'trait', 'appearance', 'skill', 'ability', 'relationship', 'family',
    'friend', 'enemy', 'ally', 'rival', 'lover', 'spouse', 'parent', 'child',
    'mentor', 'student', 'age', 'gender', 'occupation', 'profession',
    'name', 'physical', 'height', 'weight', 'hair', 'eyes'
  ];
  
  // World-related keywords
  const worldKeywords = [
    'world', 'geography', 'landscape',
    'kingdom', 'empire', 'country', 'nation',
    'continent', 'ocean', 'sea', 'mountain', 'river', 'forest', 'desert',
    'climate', 'weather', 'region', 'territory', 'area', 'map', 'realm',
    'politics', 'government', 'ruler', 'law', 'society', 'culture',
    'religion', 'economy', 'trade', 'technology', 'history', 'civilization',
    'race', 'species', 'language', 'magic', 'system', 'planet'
  ];
  
  // Environment-related keywords - specific locations within a world
  const environmentKeywords = [
    'environment', 'setting', 'location', 'place', 'scene', 'venue',
    'city', 'town', 'village', 'castle', 'palace', 'fortress', 'temple',
    'tavern', 'inn', 'house', 'mansion', 'cave', 'dungeon', 'forest',
    'building', 'street', 'alley', 'square', 'market', 'shop', 'store',
    'harbor', 'port', 'dock', 'beach', 'coast', 'bay', 'river', 'lake',
    'interior', 'room', 'hall', 'chamber', 'corridor', 'library', 'laboratory'
  ];
  
  // Genre-related keywords
  const genreKeywords = [
    'genre', 'style', 'tone', 'theme', 'mood', 'atmosphere', 'trope',
    'fantasy', 'sci-fi', 'science fiction', 'horror', 'mystery', 'thriller',
    'romance', 'historical', 'adventure', 'drama', 'comedy', 'tragedy',
    'western', 'noir', 'dystopian', 'utopian', 'steampunk', 'cyberpunk',
    'supernatural', 'paranormal', 'fairy tale', 'myth', 'legend',
    'epic', 'saga', 'young adult', 'children', 'adult', 'literary'
  ];
  
  // Count occurrences of keywords in each category
  let characterScore = 0;
  let worldScore = 0;
  let environmentScore = 0;
  let genreScore = 0;
  
  // Check character keywords
  for (const keyword of characterKeywords) {
    if (cleanedMessage.includes(keyword)) {
      characterScore += 1;
    }
  }
  
  // Check world keywords
  for (const keyword of worldKeywords) {
    if (cleanedMessage.includes(keyword)) {
      worldScore += 1;
    }
  }
  
  // Check environment keywords
  for (const keyword of environmentKeywords) {
    if (cleanedMessage.includes(keyword)) {
      environmentScore += 1;
    }
  }
  
  // Check genre keywords
  for (const keyword of genreKeywords) {
    if (cleanedMessage.includes(keyword)) {
      genreScore += 1;
    }
  }
  
  // Add weight to more specific phrases
  if (cleanedMessage.includes('main character') || 
      cleanedMessage.includes('character design') ||
      cleanedMessage.includes('character profile') ||
      cleanedMessage.includes('character description')) {
    characterScore += 3;
  }
  
  if (cleanedMessage.includes('world building') || 
      cleanedMessage.includes('build a world') ||
      cleanedMessage.includes('world design')) {
    worldScore += 3;
  }
  
  if (cleanedMessage.includes('story setting') || 
      cleanedMessage.includes('specific location') ||
      cleanedMessage.includes('environment design') ||
      cleanedMessage.includes('location details') ||
      cleanedMessage.includes('where the story takes place')) {
    environmentScore += 3;
  }
  
  if (cleanedMessage.includes('genre conventions') || 
      cleanedMessage.includes('genre elements') ||
      cleanedMessage.includes('genre tropes') ||
      cleanedMessage.includes('genre themes')) {
    genreScore += 3;
  }
  
  // Determine the highest score
  const highestScore = Math.max(characterScore, worldScore, environmentScore, genreScore);
  
  // Return the context type with the highest score, if it's significant enough
  if (highestScore > 1) {
    if (characterScore === highestScore) return 'character';
    if (worldScore === highestScore) return 'world';
    if (environmentScore === highestScore) return 'environment';
    if (genreScore === highestScore) return 'genre';
  }
  
  // If no clear context detected or scores too low, return null
  return null;
}

// Function extractSuggestionsFromQuestion has been removed
// All suggestions now come from the OpenAI assistant via generateChatSuggestions

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

// Interface for environment creation input
export interface EnvironmentCreationInput {
  worldContext?: string;     // The world context this environment exists within
  name?: string;             // Name of the specific location
  locationType?: string;     // Type of location (city, forest, castle, etc.)
  purpose?: string;          // Purpose of this location in the story
  atmosphere?: string;       // The mood or atmosphere of the location  
  inhabitants?: string;      // Who lives there or frequents the location
  dangers?: string;          // Potential dangers or threats in this environment
  secrets?: string;          // Hidden aspects or secrets of the location
  additionalInfo?: string;   // Any additional environment details
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

// Interface for a complete environment profile
export interface EnvironmentDetails {
  name: string;                   // Name of the specific location
  description: string;            // General description
  locationType: string;           // Type of location (city, dungeon, forest, etc.)
  worldContext: string;           // How this location fits into the broader world
  physicalAttributes: {
    size: string;                 // Size/scale of the location
    terrain: string;              // Terrain and physical features
    climate: string;              // Local climate conditions
    flora: string[];              // Notable plant life
    fauna: string[];              // Notable animal life
  };
  structuralFeatures: string[];   // Notable structural features
  sensoryDetails: {
    sights: string[];             // Visual details
    sounds: string[];             // Auditory elements
    smells: string[];             // Olfactory elements
    textures: string[];           // Tactile elements
  };
  inhabitants: {
    residents: string[];          // Who lives here
    visitors: string[];           // Who visits here
    controllingFaction: string;   // Who controls this place
  };
  culture: {
    traditions: string[];         // Local traditions
    laws: string[];               // Local rules and laws
    attitudes: string;            // General attitudes of place
  };
  history: {
    origin: string;               // How the place came to be
    significantEvents: string[];  // Important historical events
    secrets: string[];            // Hidden or forgotten aspects
  };
  currentState: {
    condition: string;            // Current physical condition
    atmosphere: string;           // Current mood/atmosphere
    conflicts: string[];          // Current tensions or conflicts
  };
  storyRelevance: {
    purpose: string;              // Purpose in the narrative
    challenges: string[];         // Obstacles or challenges presented
    rewards: string[];            // Potential rewards or discoveries
  };
  connections: {
    linkedLocations: string[];    // Connections to other locations
    accessPoints: string[];       // Ways to enter/exit
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
  // Define threadId outside of try block so it's available in catch block
  let thread;
  let isNewThread = false;
  let threadId: string = ''; // Initialize with empty string
  
  try {
    
    // Check if we're continuing an existing conversation
    if (genreInput.threadId) {
      console.log(`Attempting to continue conversation in existing thread: ${genreInput.threadId}`);
      threadId = genreInput.threadId;
      
      try {
        // Verify the thread exists by retrieving its messages
        const existingMessages = await openai.beta.threads.messages.list(genreInput.threadId);
        
        // Make sure the thread has messages
        if (existingMessages.data.length > 0) {
          thread = { id: genreInput.threadId };
          console.log(`Found existing thread with ${existingMessages.data.length} messages`);
        } else {
          console.warn(`Thread ${genreInput.threadId} exists but has no messages, creating a new thread`);
          const newThread = await openai.beta.threads.create();
          thread = newThread;
          threadId = newThread.id;
          isNewThread = true;
          console.log(`Created new thread: ${thread.id}`);
        }
      } catch (error) {
        console.error(`Error accessing thread ${genreInput.threadId}:`, error);
        // Log the specific error type for debugging
        const typedError = error as { status?: number; message?: string };
        if (typedError.status) {
          console.error(`Error status: ${typedError.status}, message: ${typedError.message || 'Unknown'}`);
        }
        
        // If there's an error accessing the thread, create a new one
        console.log('Creating new thread due to error accessing existing thread');
        const newThread = await openai.beta.threads.create();
        thread = newThread;
        threadId = newThread.id;
        isNewThread = true;
        console.log(`Created new thread: ${thread.id}`);
      }
    } else {
      // Create a new thread
      console.log('No thread ID provided, creating a new thread');
      const newThread = await openai.beta.threads.create();
      thread = newThread;
      threadId = newThread.id;
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
    // More robust check if we've received an informative response or if we're still in question mode
    const containsQuestion = responseText.includes("?");
    
    // Look for common question patterns
    const questionIndicators = [
      "tell me", "could you", "would you", "what kind", "which", "how", 
      "leaning", "prefer", "like to", "do you", "in your", "are you", "aspects",
      "elements", "tell me more", "can you share", "any specific", "what themes", "what are",
      "choices", "distinct", "atmospheric", "introspective", "more toward"
    ];
    
    // Check if the response contains any of these question indicators
    const hasQuestionIndicator = questionIndicators.some(indicator => 
      responseText.toLowerCase().includes(indicator.toLowerCase())
    );
    
    // Check if this appears to be a transition to world-building questions
    // indicated by specific keywords related to world-building
    const worldBuildingKeywords = [
      "environment", "setting", "historical period", "world", "geography",
      "civilization", "culture", "politics", "society", "location"
    ];
    const isWorldBuildingTransition = worldBuildingKeywords.some(keyword => 
      responseText.toLowerCase().includes(keyword.toLowerCase())
    );
    
    // If we have a substantial response that mentions genre AND
    // appears to be transitioning to world building, consider it a complete genre response
    const isCompletedGenreWithWorldBuilding = 
      responseText.length > 400 && 
      responseText.split(".").length >= 3 &&
      responseText.includes("genre") &&
      isWorldBuildingTransition;
      
    // Track what iteration/message number we're on in the conversation
    const messageCount = genreInput.previousMessages ? genreInput.previousMessages.length : 0;
    console.log(`Message count in conversation: ${messageCount}`);
    
    // After several exchanges, we should be more lenient about accepting genre completion
    // Lower from 10 to 6 exchanges (3 user messages and 3 AI responses)
    const isLateStageConversation = messageCount >= 6;
    
    // Text is short OR contains a question mark OR has question phrase patterns OR doesn't have enough descriptive content
    // UNLESS it's a completed genre with world building transition OR we're in late stage conversation
    const isQuestionResponse = 
      !isCompletedGenreWithWorldBuilding && 
      !isLateStageConversation && (
        responseText.length < 500 || // Response is too short to be complete
        containsQuestion ||         // Contains any question
        hasQuestionIndicator ||     // Contains question indicator phrases
        responseText.split(".").length < 5 || // Fewer than 5 sentences
        !responseText.includes("genre") // Doesn't mention "genre" at all
      );
    
    console.log(`Question detection: containsQuestion=${containsQuestion}, hasQuestionIndicator=${hasQuestionIndicator}, responseLength=${responseText.length}, sentences=${responseText.split(".").length}, isWorldBuildingTransition=${isWorldBuildingTransition}, isCompletedGenre=${isCompletedGenreWithWorldBuilding}, isLateStage=${isLateStageConversation}, isQuestionResponse=${isQuestionResponse}`);
    
    if (isQuestionResponse) {
      // The assistant is asking a question, this is a conversation in progress
      // We should return a special response that indicates we need more input
      console.log("Identified as a question response, triggering CONVERSATION_IN_PROGRESS");
      throw new Error("CONVERSATION_IN_PROGRESS: " + responseText);
    }
    
    // Try to extract a genre name from the response text or from user interests
    // IMPORTANT: Only set a real genre name when we have a complete response
    // This prevents prematurely setting "Custom Genre" and moving to world building
    
    let genreName = null;  // Start with no genre detected
    
    // Only look for a genre if we have a substantial response
    if (responseText.length > 500 && responseText.split(".").length >= 5) {
      // Now try to find the genre name in the response text
      const genreKeywords = [
        "fantasy", "science fiction", "sci-fi", "mystery", "thriller", 
        "horror", "romance", "western", "historical", "adventure",
        "dystopian", "cyberpunk", "steampunk", "urban fantasy", 
        "young adult", "crime", "noir", "magical realism"
      ];
      
      // First try to find the genre name in the response text
      for (const keyword of genreKeywords) {
        if (responseText.toLowerCase().includes(keyword)) {
          // Capitalize each word in the genre name
          genreName = keyword.split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
          break;
        }
      }
      
      // If we didn't find a genre keyword, ONLY then use "Custom Genre" as fallback
      if (!genreName) {
        genreName = "Custom Genre";
      }
    } else {
      // If response is not complete, we're still in the genre conversation phase
      // CRITICAL: Don't set any genre name, which triggers conversation in progress
      throw new Error("CONVERSATION_IN_PROGRESS: " + responseText);
    }
    
    console.log(`Genre name selected: ${genreName}`);
    console.log(`Using thread ID in response: ${thread.id}`);
    
    // Extract likely themes from the text
    const themeKeywords = [
      "adventure", "love", "betrayal", "redemption", "justice", "good vs evil",
      "coming of age", "power", "morality", "identity", "survival", "war",
      "exploration", "discovery", "revenge", "sacrifice", "family", "freedom",
      "heroism", "tragedy", "hope", "corruption", "honor", "loyalty"
    ];
    
    // Find themes mentioned in the text
    const themes = themeKeywords
      .filter(theme => responseText.toLowerCase().includes(theme))
      .map(theme => theme.charAt(0).toUpperCase() + theme.slice(1));
    
    // If we couldn't extract themes, provide some default ones
    const finalThemes = themes.length > 0 ? themes : 
      (genreInput.themes?.length ? genreInput.themes : ["Identity", "Adventure", "Morality"]);
    
    // Extract common settings based on the detected genre
    let commonSettings: string[] = [];
    let tropes: string[] = [];
    let typicalCharacters: string[] = [];
    let recommendedReading: string[] = [];
    let popularExamples: string[] = [];
    let worldbuildingElements: string[] = [];
    
    // Populate genre-specific details
    switch (genreName.toLowerCase()) {
      case "fantasy":
        commonSettings = ["Medieval Kingdom", "Magical Forest", "Ancient Ruins"];
        tropes = ["Chosen One", "Magic System", "Epic Quest"];
        typicalCharacters = ["Wizard", "Knight", "Princess", "Dragon"];
        recommendedReading = ["The Lord of the Rings", "A Game of Thrones"];
        popularExamples = ["The Witcher", "Harry Potter"];
        worldbuildingElements = ["Magic System", "Mythical Creatures", "Ancient History"];
        break;
      case "science fiction":
      case "sci-fi":
        commonSettings = ["Space Station", "Alien Planet", "Future Earth"];
        tropes = ["Advanced Technology", "Space Travel", "Artificial Intelligence"];
        typicalCharacters = ["Astronaut", "Scientist", "Android", "Alien"];
        recommendedReading = ["Dune", "Neuromancer"];
        popularExamples = ["Star Wars", "Blade Runner"];
        worldbuildingElements = ["Technology Systems", "Alien Civilizations", "Future Society"];
        break;
      case "mystery":
        commonSettings = ["Small Town", "Detective Agency", "Crime Scene"];
        tropes = ["Whodunit", "Red Herring", "The Perfect Crime"];
        typicalCharacters = ["Detective", "Suspect", "Witness", "Victim"];
        recommendedReading = ["The Hound of the Baskervilles", "Gone Girl"];
        popularExamples = ["Knives Out", "Sherlock Holmes"];
        worldbuildingElements = ["Criminal Underworld", "Legal System", "Investigation Methods"];
        break;
      case "western":
        commonSettings = ["Mining Town", "Saloon", "Wilderness"];
        tropes = ["Showdowns", "Frontier Justice", "Gold Rush"];
        typicalCharacters = ["Sheriff", "Outlaw", "Prospector", "Townspeople"];
        recommendedReading = ["Lonesome Dove", "True Grit"];
        popularExamples = ["The Good, the Bad and the Ugly", "Deadwood"];
        worldbuildingElements = ["Historical Accuracy", "Frontier Economy", "Social Hierarchy"];
        break;
      default:
        // For genres we don't have specifics for, extract more content from the response
        // and provide sensible defaults
        commonSettings = ["Unique World", "Character-driven Environment", "Atmospheric Setting"];
        tropes = ["Genre-specific Conventions", "Character Archetypes", "Plot Devices"];
        typicalCharacters = ["Protagonist", "Antagonist", "Sidekick", "Mentor"];
        recommendedReading = ["Classic Works in this Genre", "Contemporary Bestsellers"];
        popularExamples = ["Well-known Movies/Shows", "Famous Book Series"];
        worldbuildingElements = ["Cultural Elements", "Geography", "Historical Context"];
    }
    
    // Extract mood/tone details
    const mood = extractStringPattern(
      responseText, 
      /mood|tone|emotional impact|feel|atmosphere/i
    );
    
    // Extract time period details
    const timePeriod = extractStringPattern(
      responseText, 
      /era|period|time|century|decade/i
    );
    
    // Extract speculative elements
    const speculativeElements = extractStringPattern(
      responseText, 
      /magic|technology|supernatural|powers|abilities|fantasy elements|sci-fi|futuristic/i,
      150
    );
    
    // Extract inspirations
    const inspirationsText = extractStringPattern(
      responseText,
      /inspired by|like|similar to|comparable to|reference|influenced by/i,
      150
    );
    
    // Return the detailed genre with thread ID for continued conversation
    return {
      // Core identifying information 
      mainGenre: genreName,
      name: genreName,
      description: responseText, // Return the full response text
      
      // Genre information
      genreRationale: `This ${genreName} setting is designed to support immersive storytelling with rich character development and engaging plot structures.`,
      audienceExpectations: `Readers of ${genreName} typically expect ${finalThemes.join(', ')} as central themes.`,
      
      // Subgenre information (if available)
      subgenres: finalThemes.join(', '),
      
      // Mood and tone
      tone: mood,
      mood: mood,
      emotionalImpact: `${genreName} typically evokes feelings of ${finalThemes.map(t => t.toLowerCase()).join(', ')}.`,
      
      // Setting elements
      timePeriod: timePeriod,
      physicalEnvironment: commonSettings.join(', '),
      
      // Tropes and speculative elements
      keyTropes: tropes.join(', '),
      speculativeElements: speculativeElements,
      
      // Atmosphere and style
      atmosphere: mood,
      
      // Inspirations
      inspirations: inspirationsText,
      
      // Legacy fields (maintained for compatibility)
      themes: finalThemes,
      tropes: tropes,
      commonSettings: commonSettings,
      typicalCharacters: typicalCharacters,
      plotStructures: ["Hero's Journey", "Three-Act Structure", genreName + " Conventions"],
      styleGuide: {
        tone: "Adaptive to story needs",
        pacing: "Balanced with appropriate tension",
        perspective: "Suitable for the narrative",
        dialogueStyle: "Natural and character-appropriate"
      },
      recommendedReading: recommendedReading,
      popularExamples: popularExamples,
      worldbuildingElements: worldbuildingElements,
      threadId: thread.id
    };
  } catch (error) {
    console.error("Error creating genre details:", error);
    
    // Check if this is a conversation-in-progress error, which should be propagated
    const typedError = error as { message?: string };
    if (typedError.message && typedError.message.startsWith("CONVERSATION_IN_PROGRESS:")) {
      // This is not a failure but a special case where we need more input
      // Attach the thread ID to the error before propagating it
      const conversationError = new Error(typedError.message);
      
      // Create a new dummy thread ID if one isn't available
      const errorThreadId = threadId || `error-thread-${Date.now()}`;
      
      // Add the threadId to the error object for the API to use
      Object.assign(conversationError, { threadId: errorThreadId });
      console.log(`Throwing conversation-in-progress error with threadId: ${errorThreadId}`);
      throw conversationError;
    }
    
    // Create a new thread for fallback responses
    let fallbackThreadId;
    try {
      console.log("Creating fallback thread for error recovery");
      const fallbackThread = await openai.beta.threads.create();
      fallbackThreadId = fallbackThread.id;
      console.log(`Created fallback thread: ${fallbackThreadId}`);
    } catch (threadError) {
      console.error("Error creating fallback thread:", threadError);
      fallbackThreadId = "fallback-thread-error-" + Date.now();
      console.log("Using generated fallback thread ID:", fallbackThreadId);
    }
    
    // Try to extract genre hints from the user input for a better fallback
    let genreName = "Custom Fiction";
    let genreThemes = ["Identity", "Growth", "Challenge"];
    
    if (genreInput.userInterests) {
      // Simple genre detection from keywords
      const genreKeywords = {
        "fantasy": {
          name: "Fantasy Fiction",
          themes: ["Magic", "Adventure", "Heroism"]
        },
        "sci-fi": {
          name: "Science Fiction",
          themes: ["Technology", "Future", "Space"]
        },
        "mystery": {
          name: "Mystery",
          themes: ["Investigation", "Suspense", "Truth"]
        },
        "romance": {
          name: "Romance",
          themes: ["Love", "Relationships", "Emotion"]
        },
        "horror": {
          name: "Horror",
          themes: ["Fear", "Suspense", "Supernatural"]
        },
        "adventure": {
          name: "Adventure",
          themes: ["Journey", "Discovery", "Courage"]
        }
      };
      
      // Check for genre keywords
      const userInterests = genreInput.userInterests.toLowerCase();
      for (const [keyword, genre] of Object.entries(genreKeywords)) {
        if (userInterests.includes(keyword)) {
          genreName = genre.name;
          genreThemes = genre.themes;
          break;
        }
      }
    }
    
    // Return a fallback genre if something goes wrong, slightly customized based on input
    return {
      // Core identifying information
      mainGenre: genreName, // Required field
      name: genreName,
      description: `A ${genreName.toLowerCase()} genre customized based on your preferences. Let's continue to refine it through our conversation.`,
      
      // Genre information
      genreRationale: `This ${genreName} setting provides a foundation for character-driven storytelling.`,
      audienceExpectations: `Readers of ${genreName} typically expect ${genreThemes.join(', ')} as central themes.`,
      
      // Subgenre information
      subgenres: genreThemes.join(', '),
      
      // Mood and tone
      tone: "Balanced",
      mood: "Engaging",
      emotionalImpact: `Stories in this genre typically evoke feelings of wonder and excitement.`,
      
      // Setting elements
      timePeriod: "Variable",
      physicalEnvironment: "Diverse settings",
      
      // Tropes and speculative elements
      keyTropes: "Hero's Journey, Coming of Age",
      speculativeElements: "Varies based on specific genre implementation",
      
      // Atmosphere and style
      atmosphere: "Immersive",
      
      // Legacy fields (maintained for compatibility)
      themes: genreThemes,
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
 * Creates a thread with the Environment Generator assistant and gets detailed environment information
 * @param environmentInput Basic information about the desired environment
 * @returns A detailed environment profile with thread ID for continued conversation
 */
export async function createEnvironmentDetails(environmentInput: EnvironmentCreationInput): Promise<EnvironmentDetails & { threadId: string }> {
  try {
    let thread;
    let isNewThread = false;
    
    // Check if we're continuing an existing conversation
    if (environmentInput.threadId) {
      console.log(`Continuing environment creation conversation in existing thread: ${environmentInput.threadId}`);
      try {
        // Verify the thread exists by retrieving its messages
        const existingMessages = await openai.beta.threads.messages.list(environmentInput.threadId);
        thread = { id: environmentInput.threadId };
        console.log(`Found existing environment thread with ${existingMessages.data.length} messages`);
      } catch (error) {
        console.error(`Error accessing environment thread ${environmentInput.threadId}:`, error);
        // If there's an error accessing the thread, create a new one
        thread = await openai.beta.threads.create();
        isNewThread = true;
        console.log(`Created new environment thread: ${thread.id}`);
      }
    } else {
      // Create a new thread
      thread = await openai.beta.threads.create();
      isNewThread = true;
      console.log(`Created new environment thread: ${thread.id}`);
    }
    
    // Prepare the prompt from the input
    let promptContent;
    
    if (isNewThread) {
      promptContent = "Create a detailed story environment with the following information:\n\n";
      
      if (environmentInput.worldContext) {
        promptContent += `World Context: ${environmentInput.worldContext}\n`;
      }
      
      if (environmentInput.name) {
        promptContent += `Location Name: ${environmentInput.name}\n`;
      }
      
      if (environmentInput.locationType) {
        promptContent += `Location Type: ${environmentInput.locationType}\n`;
      }
      
      if (environmentInput.purpose) {
        promptContent += `Purpose in Story: ${environmentInput.purpose}\n`;
      }
      
      if (environmentInput.atmosphere) {
        promptContent += `Desired Atmosphere: ${environmentInput.atmosphere}\n`;
      }
      
      if (environmentInput.inhabitants) {
        promptContent += `Inhabitants: ${environmentInput.inhabitants}\n`;
      }
      
      if (environmentInput.dangers) {
        promptContent += `Dangers/Threats: ${environmentInput.dangers}\n`;
      }
      
      if (environmentInput.secrets) {
        promptContent += `Hidden Aspects/Secrets: ${environmentInput.secrets}\n`;
      }
      
      if (environmentInput.additionalInfo) {
        promptContent += `Additional Information: ${environmentInput.additionalInfo}\n`;
      }
      
      promptContent += "\nPlease create a richly detailed environment description. Format the response with clear section headings and include sensory details that bring this location to life. Also suggest how this environment might evolve or change throughout a story.";
    } else {
      // For continuing conversations, just pass along the message
      promptContent = environmentInput.additionalInfo || "Tell me more about this environment.";
    }
    
    // Add the message to the thread
    await openai.beta.threads.messages.create(thread.id, {
      role: "user",
      content: promptContent,
    });
    
    // Run the assistant on the thread
    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: ENVIRONMENT_GENERATOR_ASSISTANT_ID,
    });
    
    // Wait for the run to complete
    let completedRun = await waitForRunCompletion(thread.id, run.id);
    
    if (completedRun.status !== "completed") {
      throw new Error(`Environment generation run ended with status: ${completedRun.status}`);
    }
    
    // Retrieve the assistant's messages
    const messages = await openai.beta.threads.messages.list(thread.id);
    
    // Get the latest assistant message
    const assistantMessages = messages.data.filter(msg => msg.role === "assistant");
    
    if (assistantMessages.length === 0) {
      throw new Error("No response from Environment Generator assistant");
    }
    
    // Extract the environment data
    const latestMessage = assistantMessages[0];
    const textContent = latestMessage.content.find(content => content.type === "text");
    
    if (!textContent || textContent.type !== "text") {
      throw new Error("Response does not contain text");
    }
    
    const responseText = textContent.text.value;
    console.log("Received environment description, length:", responseText.length);
    
    // Try to extract structured information from the response
    // Since the response is likely in prose format, we'll use regexes to extract information
    
    // Extract the name (if not provided, look for it in the response)
    const nameLine = environmentInput.name || extractStringPattern(responseText, /(?:^|\n)(?:Name|Location|Place|Setting):\s*([^\n]+)/i);
    const name = nameLine || "Unnamed Location";
    
    // Extract the description
    const descriptionMatch = responseText.match(/(?:^|\n)(?:Description|Overview|Summary):\s*([^\n]+(?:\n[^\n]+)*)/i);
    const description = descriptionMatch ? descriptionMatch[1].trim() : responseText.split('\n').slice(0, 3).join(' ').trim();
    
    // Extract the location type
    const locationTypeMatch = responseText.match(/(?:^|\n)(?:Type|Location Type|Environment Type):\s*([^\n]+)/i);
    const locationType = locationTypeMatch ? locationTypeMatch[1].trim() : environmentInput.locationType || "Mixed Environment";
    
    // Extract structural features
    const structuralFeaturesMatch = responseText.match(/(?:^|\n)(?:Features|Structures|Landmarks|Notable Features):\s*([^\n]+(?:\n[^\n]+)*)/i);
    const structuralFeaturesText = structuralFeaturesMatch ? structuralFeaturesMatch[1].trim() : "";
    const structuralFeatures = structuralFeaturesText.split(/[,;.]/).filter(item => item.trim().length > 0).map(item => item.trim());
    
    // Extract the world context
    const worldContextMatch = responseText.match(/(?:^|\n)(?:World Context|In the World|Relation to World):\s*([^\n]+(?:\n[^\n]+)*)/i);
    const worldContext = worldContextMatch ? worldContextMatch[1].trim() : environmentInput.worldContext || "Part of the broader setting";
    
    // Process the detailed environment
    const environment: EnvironmentDetails = {
      name,
      description,
      locationType,
      worldContext,
      physicalAttributes: {
        size: extractStringPattern(responseText, /(?:size|scale|dimensions):\s*([^\n.,;]+)/i) || "Medium",
        terrain: extractStringPattern(responseText, /(?:terrain|ground|landscape|surface):\s*([^\n.,;]+)/i) || "Varied",
        climate: extractStringPattern(responseText, /(?:climate|weather|temperature):\s*([^\n.,;]+)/i) || "Temperate",
        flora: extractPhraseList(responseText, /(?:flora|plants|vegetation):\s*([^\n]+)/i),
        fauna: extractPhraseList(responseText, /(?:fauna|animals|wildlife|creatures):\s*([^\n]+)/i),
      },
      structuralFeatures,
      sensoryDetails: {
        sights: extractPhraseList(responseText, /(?:sights|visuals|can see|visible):\s*([^\n]+)/i),
        sounds: extractPhraseList(responseText, /(?:sounds|audio|can hear|audible):\s*([^\n]+)/i),
        smells: extractPhraseList(responseText, /(?:smells|scents|odors|can smell):\s*([^\n]+)/i),
        textures: extractPhraseList(responseText, /(?:textures|tactile|feel|touch):\s*([^\n]+)/i),
      },
      inhabitants: {
        residents: extractPhraseList(responseText, /(?:residents|inhabitants|populace|people|who lives):\s*([^\n]+)/i),
        visitors: extractPhraseList(responseText, /(?:visitors|travelers|guests|tourists):\s*([^\n]+)/i),
        controllingFaction: extractStringPattern(responseText, /(?:control|ruled by|governed by|leader|faction):\s*([^\n.,;]+)/i) || "Unknown",
      },
      culture: {
        traditions: extractPhraseList(responseText, /(?:traditions|customs|rituals|practices):\s*([^\n]+)/i),
        laws: extractPhraseList(responseText, /(?:laws|rules|regulations|code):\s*([^\n]+)/i),
        attitudes: extractStringPattern(responseText, /(?:attitudes|mindset|outlook|disposition):\s*([^\n.,;]+)/i) || "Neutral",
      },
      history: {
        origin: extractStringPattern(responseText, /(?:origin|history|background|founded):\s*([^\n.,;]+)/i) || "Unknown origins",
        significantEvents: extractPhraseList(responseText, /(?:events|happened|significant|notable|history):\s*([^\n]+)/i),
        secrets: extractPhraseList(responseText, /(?:secrets|hidden|unknown|mystery|mysteries):\s*([^\n]+)/i),
      },
      currentState: {
        condition: extractStringPattern(responseText, /(?:condition|state|status|current):\s*([^\n.,;]+)/i) || "Stable",
        atmosphere: environmentInput.atmosphere || extractStringPattern(responseText, /(?:atmosphere|mood|feeling|ambiance):\s*([^\n.,;]+)/i) || "Neutral",
        conflicts: extractPhraseList(responseText, /(?:conflicts|tensions|problems|issues|dangers):\s*([^\n]+)/i),
      },
      storyRelevance: {
        purpose: environmentInput.purpose || extractStringPattern(responseText, /(?:purpose|role|function|significance):\s*([^\n.,;]+)/i) || "Setting for story events",
        challenges: extractPhraseList(responseText, /(?:challenges|obstacles|difficulties|problems):\s*([^\n]+)/i),
        rewards: extractPhraseList(responseText, /(?:rewards|treasures|benefits|gains|advantages):\s*([^\n]+)/i),
      },
      connections: {
        linkedLocations: extractPhraseList(responseText, /(?:connected to|linked to|leads to|nearby|adjoining):\s*([^\n]+)/i),
        accessPoints: extractPhraseList(responseText, /(?:access|entrances|exits|ways in|ways out):\s*([^\n]+)/i),
      },
    };
    
    // Return the environment details with thread ID for continued conversation
    return {
      ...environment,
      threadId: thread.id
    };
  } catch (error) {
    console.error("Error creating detailed environment:", error);
    
    // Create a fallback basic environment if something goes wrong
    const fallbackThreadId = typeof environmentInput.threadId === 'string' 
      ? environmentInput.threadId 
      : 'fallback-thread-id';
      
    return {
      name: environmentInput.name || "Unnamed Location",
      description: "A mysterious location waiting to be explored.",
      locationType: environmentInput.locationType || "Generic Environment",
      worldContext: environmentInput.worldContext || "Part of the story world",
      physicalAttributes: {
        size: "Medium",
        terrain: "Mixed",
        climate: "Temperate",
        flora: ["Local vegetation"],
        fauna: ["Local wildlife"],
      },
      structuralFeatures: ["Notable landmarks"],
      sensoryDetails: {
        sights: ["Visual elements"],
        sounds: ["Ambient sounds"],
        smells: ["Environmental scents"],
        textures: ["Tactile surfaces"],
      },
      inhabitants: {
        residents: ["Local inhabitants"],
        visitors: ["Occasional visitors"],
        controllingFaction: "Local authority",
      },
      culture: {
        traditions: ["Local customs"],
        laws: ["Established rules"],
        attitudes: "Determined by story context",
      },
      history: {
        origin: "Established long ago",
        significantEvents: ["Historical moments"],
        secrets: ["Hidden history"],
      },
      currentState: {
        condition: "Stable",
        atmosphere: environmentInput.atmosphere || "Neutral",
        conflicts: ["Potential tensions"],
      },
      storyRelevance: {
        purpose: environmentInput.purpose || "Setting for story events",
        challenges: ["Obstacles to overcome"],
        rewards: ["Discoveries to be made"],
      },
      connections: {
        linkedLocations: ["Connected areas"],
        accessPoints: ["Ways in and out"],
      },
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
    
    // Check if the response is a question (conversation in progress)
    const isQuestionResponse = responseText.includes("?") && 
                              (responseText.includes("tell me") || 
                               responseText.includes("could you") ||
                               responseText.includes("would you") ||
                               responseText.includes("what kind"));
    
    if (isQuestionResponse) {
      // The assistant is asking a question, this is a conversation in progress
      throw new Error("CONVERSATION_IN_PROGRESS: " + responseText);
    }
    
    // Try to extract a world name from the response or input
    let worldName = "Custom World";
    
    // First try to extract from setting if provided
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
    
    // Look for location names in the response text
    const locationPatterns = [
      /(?:called|named)\s+["']([^"']+)["']/i,  // "called 'Eldoria'" or "named 'New Haven'"
      /world of\s+["']?([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)["']?/i,  // "world of Eldoria"
      /(?:kingdom|empire|realm|world|land|city|town) (?:of|is) ["']?([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)["']?/i,
      /["']([A-Z][a-z]+(?:\s[A-Z][a-z]+)?(?:\s[A-Z][a-z]+)?)["'] is a/i,  // "'New Haven' is a"
    ];
    
    for (const pattern of locationPatterns) {
      const match = responseText.match(pattern);
      if (match && match[1]) {
        worldName = match[1];
        break;
      }
    }
    
    // Extract era from the response or use the input timeframe
    let era = worldInput.timeframe || "Contemporary";
    const eraPatterns = [
      /(?:set in|takes place in|during) the\s+([^.,]+)(?:era|period|age|century)/i,
      /(?:era|period|age) is (?:the|a)\s+([^.,]+)/i,
    ];
    
    for (const pattern of eraPatterns) {
      const match = responseText.match(pattern);
      if (match && match[1]) {
        era = match[1].trim();
        break;
      }
    }
    
    // Extract geography and locations from the response
    const geographyKeywords = [
      "mountains", "hills", "valleys", "forests", "rivers", "lakes", "oceans", 
      "deserts", "plains", "islands", "tundra", "jungle", "swamp", "plateau",
      "canyon", "coast", "reef", "glacier", "volcano", "marsh"
    ];
    
    // Find geography mentioned in the response
    const geography = geographyKeywords
      .filter(geo => responseText.toLowerCase().includes(geo))
      .map(geo => geo.charAt(0).toUpperCase() + geo.slice(1));
    
    // Extract locations from response
    const locationKeywords = [
      "castle", "city", "town", "village", "kingdom", "empire", "fortress", 
      "capital", "settlement", "outpost", "harbor", "port", "palace", "temple",
      "ruins", "academy", "market", "district", "quarter", "station"
    ];
    
    // Find locations mentioned in the response
    const locations = locationKeywords
      .filter(loc => responseText.toLowerCase().includes(loc))
      .map(loc => {
        // Try to extract the full location name
        const pattern = new RegExp(`(?:\\b|the\\s)((?:[A-Z][a-z]*\\s)?${loc})\\b`, 'i');
        const match = responseText.match(pattern);
        return match ? match[1].trim().charAt(0).toUpperCase() + match[1].trim().slice(1) : 
                      loc.charAt(0).toUpperCase() + loc.slice(1);
      });
    
    // Create dynamic world based on response and inputs
    let worldType = "generic";
    if (responseText.toLowerCase().includes("fantasy")) worldType = "fantasy";
    else if (responseText.toLowerCase().includes("sci-fi") || 
             responseText.toLowerCase().includes("science fiction")) worldType = "scifi";
    else if (responseText.toLowerCase().includes("western")) worldType = "western";
    else if (responseText.toLowerCase().includes("medieval")) worldType = "medieval";
    else if (responseText.toLowerCase().includes("modern")) worldType = "modern";
    else if (responseText.toLowerCase().includes("post-apocalyptic")) worldType = "postapoc";
    
    // Set reasonable defaults based on world type
    let culture = {
      socialStructure: "Complex hierarchical society",
      beliefs: "Mixed belief systems",
      customs: ["Local traditions", "Regional celebrations", "Cultural practices"],
      languages: ["Common language", "Regional dialects", "Ancient languages"]
    };
    
    let politics = {
      governmentType: "Mixed governance",
      powerDynamics: "Complex power relationships",
      majorFactions: ["Ruling Group", "Opposition Forces", "Neutral Parties"]
    };
    
    let economy = {
      resources: ["Primary Resources", "Secondary Goods", "Luxury Items"],
      trade: "Trade networks according to world technology level",
      currency: "Standard currency with regional variations"
    };
    
    let technology = {
      level: "Appropriate to setting",
      innovations: ["Key Technologies", "Important Tools", "Significant Inventions"],
      limitations: "Technological constraints appropriate to the setting"
    };
    
    let conflicts = [
      "Primary conflict appropriate to setting",
      "Secondary tensions between groups",
      "Personal struggles relevant to world"
    ];
    
    let history = {
      majorEvents: ["Founding Event", "Critical Turn", "Recent Milestone"],
      legends: ["Origin Myth", "Historical Legend", "Cultural Tale"]
    };
    
    // Adjust defaults based on detected world type
    switch (worldType) {
      case "fantasy":
        culture.beliefs = "Mystical belief systems with magical elements";
        technology.level = "Pre-industrial with magical elements";
        technology.innovations = ["Magic systems", "Enchanted items", "Alchemical processes"];
        break;
      case "scifi":
        technology.level = "Advanced beyond current capabilities";
        technology.innovations = ["Faster-than-light travel", "Advanced AI", "Energy weapons"];
        economy.resources = ["Rare minerals", "Energy sources", "Advanced materials"];
        break;
      case "western":
        era = era || "Late 19th Century";
        culture.socialStructure = "Frontier hierarchy with emerging order";
        technology.level = "Industrial Revolution era";
        economy.resources = ["Mineral deposits", "Cattle", "Land"];
        break;
      case "medieval":
        era = era || "Middle Ages";
        politics.governmentType = "Feudal system with noble hierarchy";
        technology.level = "Pre-industrial";
        economy.currency = "Mix of barter and precious metals";
        break;
      case "modern":
        era = era || "Present Day";
        technology.level = "Current technology";
        politics.governmentType = "Democratic or authoritarian systems";
        break;
      case "postapoc":
        culture.socialStructure = "Survivor groups with new hierarchies";
        economy.trade = "Scavenging and barter systems";
        conflicts = ["Resource scarcity", "Survivor conflicts", "Environmental threats"];
        break;
    }
    
    // Return the detailed world with the processed information
    return {
      name: worldName,
      description: responseText, // Full conversational response
      era: era,
      geography: geography.length > 0 ? geography : ["Diverse Landscapes", "Notable Formations", "Natural Features"],
      locations: locations.length > 0 ? locations : ["Major Settlement", "Important Location", "Significant Site"],
      culture: culture,
      politics: politics,
      economy: economy,
      technology: technology,
      conflicts: conflicts,
      history: history,
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
  assistantReply: string
): Promise<string[]> {
  try {
    // Check if this is the special genre selection trigger (welcome message)
    const isGenreSelectionTrigger = assistantReply && assistantReply.includes("What type of genre would you like to explore for your story world?");
    
    // No more hardcoded options - all suggestions must come from the AI assistant
    // Just log a special message for debugging welcome case
    if (isGenreSelectionTrigger) {
      console.log("Detected welcome message with genre selection prompt, passing to suggestions assistant");
    }
    
    // For non-welcome cases, require both parameters
    // For welcome message case, we can proceed with just the assistant reply
    const isWelcomeMessage = assistantReply && (
      assistantReply.includes("Welcome to Foundation Builder") || 
      assistantReply.includes("What type of genre would you like to explore")
    );
    
    if ((!isWelcomeMessage && (!userMessage || userMessage.trim() === '')) || !assistantReply || assistantReply.trim() === '') {
      console.log("Missing required inputs for chat suggestions");
      return []; // Return empty array - no fallback suggestions
    }
    
    console.log(`Generating chat suggestions for conversation:`);
    console.log(`User: ${userMessage.substring(0, 50)}...`);
    console.log(`Assistant: ${assistantReply.substring(0, 50)}...`);
    
    // Ensure CHAT_SUGGESTIONS_ASSISTANT_ID is valid
    if (!CHAT_SUGGESTIONS_ASSISTANT_ID) {
      console.error("CHAT_SUGGESTIONS_ASSISTANT_ID is not defined");
      return [];
    }

    console.log(`Using assistant ID: ${CHAT_SUGGESTIONS_ASSISTANT_ID} for chat suggestions`);
    
    // Create a new thread for this suggestions request
    const thread = await openai.beta.threads.create();
    console.log(`Created thread: ${thread.id} for chat suggestions`);
    
    // Format the input as a JSON object as required by the assistant
    console.log("Passing conversation to the chat suggestions assistant");
    
    // Create JSON object with the user message and assistant reply
    const messageObject = {
      "user": userMessage,
      "chat assistant": assistantReply
    };
    
    // Convert to JSON string
    const promptContent = JSON.stringify(messageObject, null, 2);
    
    // Log debugging info for the welcome message trigger
    if (assistantReply.includes("What type of genre would you like to explore for your story world?")) {
      console.log("Detected genre selection trigger - should return single-word genre options");
    }
    
    // Add messages to provide context for the suggestions
    await openai.beta.threads.messages.create(thread.id, {
      role: "user",
      content: promptContent,
    });
    
    // Run the suggestions assistant
    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: CHAT_SUGGESTIONS_ASSISTANT_ID,
    });
    console.log(`Started run: ${run.id} with assistant: ${CHAT_SUGGESTIONS_ASSISTANT_ID}`);
    
    // Wait for completion
    const completedRun = await waitForRunCompletion(thread.id, run.id);
    
    if (completedRun.status !== "completed") {
      console.error(`Chat suggestions run ended with status: ${completedRun.status}`);
      return []; // Return empty array - no fallback suggestions
    }
    
    // Get the suggestions from the assistant's response
    const messages = await openai.beta.threads.messages.list(thread.id);
    const assistantMessages = messages.data.filter(msg => msg.role === "assistant");
    
    if (assistantMessages.length === 0) {
      console.error("No response from suggestions assistant");
      return []; // Return empty array - no fallback suggestions
    }
    
    // Extract the suggestions from the message content
    const latestMessage = assistantMessages[0];
    const textContent = latestMessage.content.find(content => content.type === "text");
    
    if (!textContent || textContent.type !== "text") {
      console.error("Suggestions response does not contain text");
      return []; // Return empty array - no fallback suggestions
    }
    
    // Try to parse JSON from the response
    try {
      // Print the raw response for debugging
      console.log(`Raw suggestion response: ${textContent.text.value.substring(0, 200)}...`);
      
      // Extract the full JSON object from the response
      // First find objects with format: { ... }
      let jsonObj;
      try {
        // Try to parse the entire response as JSON first
        jsonObj = JSON.parse(textContent.text.value);
        console.log("Successfully parsed complete JSON response");
      } catch (err) {
        // If that fails, try to extract JSON from within the text
        const jsonObjMatch = textContent.text.value.match(/\{[\s\S]*\}/);
        if (!jsonObjMatch) {
          console.error("Could not extract JSON object from suggestions response");
          return []; // Return empty array - no fallback suggestions
        }
        
        try {
          jsonObj = JSON.parse(jsonObjMatch[0]);
          console.log("Successfully extracted and parsed JSON from response");
        } catch (parseErr) {
          console.error("Error parsing extracted JSON object:", parseErr);
          return []; // Return empty array - no fallback suggestions
        }
      }
      
      console.log(`Parsed response object: ${JSON.stringify(jsonObj).substring(0, 200)}...`);
      
      // Process the options based on the new format where options are in the 'options' property
      let suggestions: string[] = [];
      
      if (jsonObj && Array.isArray(jsonObj.options) && jsonObj.options.length > 0) {
        // Get the options array from the response
        suggestions = jsonObj.options
          .filter((item: any) => typeof item === "string");
          
        // Add the additional option if present and it's a string
        if (jsonObj.additional_option && typeof jsonObj.additional_option === "string") {
          suggestions.push(jsonObj.additional_option);
        }
      } else if (Array.isArray(jsonObj)) {
        // Fall back to the old format where the response might be a direct array
        suggestions = jsonObj.filter((item: any) => typeof item === "string");
      }
      
      // No longer applying any limits - let the assistant control the number of suggestions
      // Pass through all valid suggestions as returned by the assistant
      const validSuggestions = suggestions;
        
      if (validSuggestions.length > 0) {
        console.log(`Returning ${validSuggestions.length} valid suggestions: ${JSON.stringify(validSuggestions)}`);
        return validSuggestions;
      }
      
      console.error("No valid suggestions found in response");
      return []; // Return empty array - no fallback suggestions
    } catch (error) {
      console.error("Error processing suggestions response:", error);
      return []; // Return empty array - no fallback suggestions
    }
  } catch (error) {
    console.error("Error generating chat suggestions:", error);
    return []; // Return empty array - no fallback suggestions
  }
}

/**
 * Get the appropriate assistant ID based on conversation context
 * This enables dynamically switching between different assistants based on the content
 * 
 * @param message The user's message to analyze
 * @param currentAssistantType The current assistant type (if known)
 * @param foundationId The foundation ID for context
 * @returns Object with assistantId and contextType
 */
export async function getAppropriateAssistant(
  message: string, 
  currentAssistantType: 'genre' | 'world' | 'character' | 'environment' | null = null,
  foundationId?: number
): Promise<{
  assistantId: string;
  contextType: 'genre' | 'world' | 'character' | 'environment';
  isAutoTransition?: boolean;
}> {
  // Detect the conversation context from the message
  const detectedContext = detectConversationContext(message);
  console.log(`Context detection for message: "${message.substring(0, 50)}..." detected: ${detectedContext}`);
  
  // Special handling for completed genre stage - look for transition signals
  const isGenreComplete = currentAssistantType === 'genre' && 
    (message.toLowerCase().includes("done") || 
     message.toLowerCase().includes("finished") || 
     message.toLowerCase().includes("complete") ||
     message.toLowerCase().includes("sounds good") ||
     message.toLowerCase().includes("thank you") ||
     message.toLowerCase().includes("great") ||
     message.toLowerCase().includes("that sounds") ||
     message.toLowerCase().includes("i like that") ||
     message.toLowerCase().includes("perfect") ||
     message.toLowerCase().includes("awesome") ||
     message.toLowerCase().includes("perfect") ||
     message.toLowerCase().includes("continue") ||
     message.toLowerCase().includes("proceed") ||
     message.toLowerCase().includes("next step") ||
     message.toLowerCase().includes("next stage"));
     
  // Check for transition cues in the message content
  const hasGenreToEnvironmentTransition = isGenreComplete || 
    message.toLowerCase().includes("let's create an environment") ||
    message.toLowerCase().includes("create environment") ||
    message.toLowerCase().includes("build environment") ||
    message.toLowerCase().includes("design environment") ||
    message.toLowerCase().includes("start with environment") ||
    (currentAssistantType === 'genre' && message.toLowerCase().includes("next"));
  
  // If we have a foundation ID, check the foundation's stage to provide context
  let foundationStage: 'genre' | 'world' | 'character' | 'environment' | null = null;
  
  if (foundationId) {
    try {
      // In a future implementation, we could check the database to determine 
      // the foundation's current stage by looking for genre/environment/world details
      
      // For now, we'll use the currentAssistantType and transition triggers
      if (currentAssistantType === 'genre' && hasGenreToEnvironmentTransition) {
        console.log("Detected completion of genre stage, automatically transitioning to environment");
        return {
          assistantId: ENVIRONMENT_GENERATOR_ASSISTANT_ID,
          contextType: 'environment',
          isAutoTransition: true
        };
      } else if (currentAssistantType === 'environment' && 
                (message.toLowerCase().includes("no more environments") ||
                 message.toLowerCase().includes("move to world") ||
                 message.toLowerCase().includes("go to world") ||
                 message.toLowerCase().includes("world building") ||
                 message.toLowerCase().includes("world creation"))) {
        console.log("Detected completion of environments stage, transitioning to world building");
        return {
          assistantId: WORLD_BUILDER_ASSISTANT_ID,
          contextType: 'world',
          isAutoTransition: true
        };
      }
    } catch (error) {
      console.error("Error determining foundation stage:", error);
    }
  }
  
  // If we detected a specific context in the message, use that
  if (detectedContext) {
    console.log(`Using detected context: ${detectedContext}`);
    
    if (detectedContext === 'character') {
      return { 
        assistantId: HYPER_REALISTIC_CHARACTER_CREATOR_ID, 
        contextType: 'character' 
      };
    } else if (detectedContext === 'world') {
      return { 
        assistantId: WORLD_BUILDER_ASSISTANT_ID, 
        contextType: 'world' 
      };
    } else if (detectedContext === 'environment') {
      return { 
        assistantId: ENVIRONMENT_GENERATOR_ASSISTANT_ID, 
        contextType: 'environment' 
      };
    } else if (detectedContext === 'genre') {
      return { 
        assistantId: GENRE_CREATOR_ASSISTANT_ID, 
        contextType: 'genre' 
      };
    }
  }
  
  // If no context was detected and we have a current assistant, stick with it
  if (currentAssistantType) {
    console.log(`No context detected, continuing with current assistant: ${currentAssistantType}`);
    
    if (currentAssistantType === 'character') {
      return { 
        assistantId: HYPER_REALISTIC_CHARACTER_CREATOR_ID, 
        contextType: 'character' 
      };
    } else if (currentAssistantType === 'world') {
      return { 
        assistantId: WORLD_BUILDER_ASSISTANT_ID, 
        contextType: 'world' 
      };
    } else if (currentAssistantType === 'environment') {
      return { 
        assistantId: ENVIRONMENT_GENERATOR_ASSISTANT_ID, 
        contextType: 'environment' 
      };
    } else {
      return { 
        assistantId: GENRE_CREATOR_ASSISTANT_ID, 
        contextType: 'genre' 
      };
    }
  }
  
  // Default to genre creator if all else fails (starting point)
  console.log("No context detected and no current assistant, defaulting to genre assistant");
  return { 
    assistantId: GENRE_CREATOR_ASSISTANT_ID, 
    contextType: 'genre' 
  };
}

// We no longer use defaultSuggestions - all suggestions must come from the AI assistant

/**
 * Wait for an assistant run to complete by polling
 */
export async function waitForRunCompletion(threadId: string, runId: string, maxAttempts = 60): Promise<OpenAI.Beta.Threads.Runs.Run> {
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