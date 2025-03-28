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

/**
 * Extract potential response options from an AI question
 * This helps generate more context-relevant suggestions based on the AI's question
 */
export function extractSuggestionsFromQuestion(question: string): string[] {
  const suggestions: string[] = [];
  const surpriseMeSuggestion = "Surprise me! You decide what works best.";
  
  // Check for common phrases that indicate initial genre selection
  if (question.toLowerCase().includes("what genre") || 
      question.toLowerCase().includes("which genre") ||
      question.toLowerCase().includes("type of story")) {
    // This is likely the first question asking about genre, return extended genre list with single words
    console.log("Detected initial genre question, returning extended genre list");
    return [
      "Fantasy",
      "Mystery",
      "Romance",
      "Sci-Fi",
      "Western",
      "Horror",
      "Thriller",
      "Adventure",
      "Historical",
      "Drama",
      surpriseMeSuggestion
    ];
  }
  
  // Check for common phrases about book or author preference (the second typical question)
  if ((question.toLowerCase().includes("book") || question.toLowerCase().includes("author")) &&
      (question.toLowerCase().includes("like") || question.toLowerCase().includes("prefer") || 
       question.toLowerCase().includes("favorite") || question.toLowerCase().includes("enjoy") ||
       question.toLowerCase().includes("reference") || question.toLowerCase().includes("example"))) {
    
    console.log("Detected book or author preference question");
    
    // Try to detect which genre was previously selected to provide relevant author suggestions
    const lowerQuestion = question.toLowerCase();
    
    // Fantasy genre authors and books
    if (lowerQuestion.includes("fantasy")) {
      console.log("Detected fantasy genre author question");
      return [
        "Tolkien and The Lord of the Rings",
        "George R.R. Martin and Game of Thrones",
        "Brandon Sanderson and Mistborn",
        "Patrick Rothfuss and The Name of the Wind",
        surpriseMeSuggestion
      ];
    }
    
    // Sci-Fi genre authors and books
    if (lowerQuestion.includes("sci-fi") || lowerQuestion.includes("science fiction")) {
      console.log("Detected sci-fi genre author question");
      return [
        "Frank Herbert and Dune",
        "Douglas Adams and Hitchhiker's Guide",
        "Isaac Asimov and Foundation",
        "Andy Weir and The Martian",
        surpriseMeSuggestion
      ];
    }
    
    // Mystery genre authors and books
    if (lowerQuestion.includes("mystery") || lowerQuestion.includes("detective")) {
      console.log("Detected mystery genre author question");
      return [
        "Agatha Christie and Hercule Poirot novels",
        "Arthur Conan Doyle and Sherlock Holmes",
        "Gillian Flynn and Gone Girl",
        "Stieg Larsson and The Girl with the Dragon Tattoo",
        surpriseMeSuggestion
      ];
    }
    
    // Romance genre authors and books
    if (lowerQuestion.includes("romance")) {
      console.log("Detected romance genre author question");
      return [
        "Jane Austen and Pride and Prejudice",
        "Nicholas Sparks and The Notebook",
        "Emily Brontë and Wuthering Heights",
        "Danielle Steel's contemporary romance novels",
        surpriseMeSuggestion
      ];
    }
    
    // Horror genre authors and books
    if (lowerQuestion.includes("horror")) {
      console.log("Detected horror genre author question");
      return [
        "Stephen King and The Shining",
        "H.P. Lovecraft and Cthulhu mythology",
        "Shirley Jackson and The Haunting of Hill House",
        "Clive Barker and The Hellbound Heart",
        surpriseMeSuggestion
      ];
    }
    
    // Default author suggestions if we can't detect the genre
    console.log("No specific genre detected for author question, using general suggestions");
    return [
      "Stephen King's horror novels",
      "J.K. Rowling and Harry Potter",
      "Ernest Hemingway's classic literature",
      "Agatha Christie's mystery novels",
      surpriseMeSuggestion
    ];
  }
  
  // Check if the question contains explicit options in the text
  // Common pattern: "would you prefer A, B, or C?"
  const lines = question.split(/[.?!]\s+/);
  
  for (const line of lines) {
    // Skip lines that are too short
    if (line.length < 15) continue;
    
    // Check for lines with "or" which often indicate options
    if (line.includes(" or ")) {
      const parts = line.split(/\s+or\s+/);
      
      // Check first part for comma-separated list: "A, B, C, or D"
      if (parts[0].includes(",")) {
        const commaOptions = parts[0].split(",").map(opt => opt.trim());
        // Add all but the last one (which is handled by the "or" split)
        for (const opt of commaOptions) {
          if (opt && opt.length > 2 && !opt.includes("?")) {
            // Clean up the option
            let cleanOption = opt.replace(/would you prefer|do you prefer|would you like|how about/gi, "").trim();
            
            // Remove starting articles and conjunctions
            cleanOption = cleanOption.replace(/^(a|an|the|or|and|but|if|when)\s+/i, "").trim();
            
            // Skip if too short after cleaning
            if (cleanOption.length > 3) {
              suggestions.push(cleanOption);
            }
          }
        }
      }
      
      // Add the last option after "or"
      let lastOption = parts[parts.length - 1].trim();
      
      // Clean up question marks, prefixes
      lastOption = lastOption.replace(/\?.*$/, "").trim();
      lastOption = lastOption.replace(/^(a|an|the|maybe|perhaps|possibly)\s+/i, "").trim();
      
      if (lastOption.length > 3 && !lastOption.toLowerCase().includes("what") && !lastOption.toLowerCase().includes("why")) {
        suggestions.push(lastOption);
      }
    }
  }
  
  // Look for numbered or bulleted options
  const optionPatterns = [
    /\b(\d+\.\s*|•\s*|\*\s*|-\s*)([^.?!:]+)/g,
    /\b([A-Z])\)\s*([^.?!:]+)/g
  ];
  
  for (const pattern of optionPatterns) {
    // Use a more compatible approach instead of matchAll
    let match;
    while ((match = pattern.exec(question)) !== null) {
      const option = match[2].trim();
      if (option.length > 3) {
        suggestions.push(option);
      }
    }
  }
  
  // Extract directly quoted options (in quotes)
  const quotePattern = /"([^"]+)"/g;
  let quoteMatch;
  while ((quoteMatch = quotePattern.exec(question)) !== null) {
    const option = quoteMatch[1].trim();
    if (option.length > 3) {
      suggestions.push(option);
    }
  }
  
  // If we have specific tone words, extract them
  const toneWords = [
    "darker", "grittier", "poetic", "introspective", "mysterious", 
    "adventurous", "wonder", "melancholy", "reflection", "atmospheric"
  ];
  
  for (const tone of toneWords) {
    if (question.toLowerCase().includes(tone)) {
      suggestions.push(tone);
    }
  }
  
  // Check for a specific pattern where the assistant asks about preferences with "more toward X, Y, or Z?"
  const preferencePattern = /(?:leaning|prefer|interested in|like)\s+more\s+(?:toward|in|for|about)\s+(?:a|an)?\s*([^,]+?)(?:,|or|\?)(?:\s+(?:a|an)?\s*([^,]+?)(?:,|or|\?))?(?:\s+(?:a|an|or)?\s*([^?]+?)(?:\?|$))?/i;
  const preferenceMatch = question.match(preferencePattern);
  
  if (preferenceMatch) {
    console.log("Detected preference options in question");
    const cleanedSuggestions = [];
    for (let i = 1; i < preferenceMatch.length; i++) {
      if (preferenceMatch[i]) {
        // Clean up each option
        let option = preferenceMatch[i].trim();
        // If the option starts with "or", remove it
        option = option.replace(/^or\s+/i, '').trim();
        // If the option is "possibly a blend of both", simplify it
        if (option.includes("blend") && option.includes("both")) {
          option = "a blend of both";
        }
        cleanedSuggestions.push(option);
      }
    }
    
    // If we found structured options, add the surprise me option and return
    if (cleanedSuggestions.length > 0) {
      cleanedSuggestions.push(surpriseMeSuggestion);
      return cleanedSuggestions;
    }
  }
  
  // Deduplicate and limit to a reasonable number of suggestions
  // Use a manual deduplication approach to avoid Set iterator compatibility issues
  const uniqueSuggestions: string[] = [];
  for (const suggestion of suggestions) {
    if (!uniqueSuggestions.includes(suggestion)) {
      uniqueSuggestions.push(suggestion);
    }
  }
  
  // Take the 3-4 most relevant suggestions
  const finalSuggestions = uniqueSuggestions.slice(0, 4);
  
  // Always add the "Surprise me" option if we have room
  if (finalSuggestions.length < 5) {
    finalSuggestions.push(surpriseMeSuggestion);
  }
  
  return finalSuggestions;
}
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
    
    // Text is short OR contains a question mark OR has question phrase patterns OR doesn't have enough descriptive content
    const isQuestionResponse = 
      responseText.length < 500 || // Response is too short to be complete
      containsQuestion ||         // Contains any question
      hasQuestionIndicator ||     // Contains question indicator phrases
      responseText.split(".").length < 5 || // Fewer than 5 sentences
      !responseText.includes("genre"); // Doesn't mention "genre" at all
    
    console.log(`Question detection: containsQuestion=${containsQuestion}, hasQuestionIndicator=${hasQuestionIndicator}, responseLength=${responseText.length}, sentences=${responseText.split(".").length}, isQuestionResponse=${isQuestionResponse}`);
    
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
    
    // Return the detailed genre with thread ID for continued conversation
    return {
      name: genreName,
      description: responseText, // Return the full response text
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
      name: genreName,
      description: `A ${genreName.toLowerCase()} genre customized based on your preferences. Let's continue to refine it through our conversation.`,
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