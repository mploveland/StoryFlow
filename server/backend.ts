import { Request, Response } from "express";
import { storage } from "./storage";
import { getAppropriateAssistant, waitForRunCompletion } from "./assistants";
import OpenAI from "openai";

// Define assistant IDs - these are the official production assistant IDs
const StoryFlow_GenreCreator_ID = "asst_Hc5VyWr5mXgNL86DvT1m4cim";
const StoryFlow_EnvironmentGenerator_ID = "asst_EezatLBvY8BhCC20fztog1RF";
const StoryFlow_WorldBuilder_ID = "asst_jHr9TLXeEtTiqt6DjTRhP1fo";
const StoryFlow_CharacterCreator_ID = "asst_6leBQqNpfRPmS8cHjH9H2BXz";

// Initialize OpenAI client
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * This function determines the correct stage and assistant based solely on the foundation's completion flags
 * It enforces a strict sequential stage progression: Genre → Environment → World → Character
 */
export async function getContextTypeRespectingStageProgression(
  message: string,
  currentAssistantType: string | null,
  foundationId: number
) {
  try {
    // Get the foundation to check completion flags
    const foundation = await storage.getFoundation(foundationId);
    if (!foundation) {
      throw new Error(`Foundation ${foundationId} not found`);
    }
    
    // Determine current stage based on completion flags
    let contextType = "genre";
    let assistantId = StoryFlow_GenreCreator_ID;
    
    console.log(`[STAGE DETERMINATION] Foundation ${foundationId} flags:`, {
      genreCompleted: foundation.genreCompleted,
      environmentCompleted: foundation.environmentCompleted,
      worldCompleted: foundation.worldCompleted,
      charactersCompleted: foundation.charactersCompleted
    });
    
    // Sequential stage determination
    if (!foundation.genreCompleted) {
      // If genre is not completed, we're in the genre stage
      contextType = "genre";
      assistantId = StoryFlow_GenreCreator_ID;
      console.log(`[STAGE DETERMINATION] Stage: Genre (${StoryFlow_GenreCreator_ID})`);
    } 
    else if (foundation.genreCompleted && !foundation.environmentCompleted) {
      // If genre is completed but environment is not, we're in the environment stage
      contextType = "environment";
      assistantId = StoryFlow_EnvironmentGenerator_ID;
      console.log(`[STAGE DETERMINATION] Stage: Environment (${StoryFlow_EnvironmentGenerator_ID})`);
    } 
    else if (foundation.genreCompleted && foundation.environmentCompleted && !foundation.worldCompleted) {
      // If genre and environment are completed but world is not, we're in the world stage
      contextType = "world";
      assistantId = StoryFlow_WorldBuilder_ID;
      console.log(`[STAGE DETERMINATION] Stage: World (${StoryFlow_WorldBuilder_ID})`);
    }
    else if (foundation.genreCompleted && foundation.environmentCompleted && foundation.worldCompleted && !foundation.charactersCompleted) {
      // If all but characters are completed, we're in the character stage
      contextType = "character";
      assistantId = StoryFlow_CharacterCreator_ID;
      console.log(`[STAGE DETERMINATION] Stage: Character (${StoryFlow_CharacterCreator_ID})`);
    }
    else {
      // If everything is completed, default to character stage
      contextType = "character";
      assistantId = StoryFlow_CharacterCreator_ID;
      console.log(`[STAGE DETERMINATION] Stage: Character (default) (${StoryFlow_CharacterCreator_ID})`);
    }
    
    // Update the foundation with the current stage if it's different
    if (foundation.currentStage !== contextType) {
      console.log(`[STAGE DETERMINATION] Updating foundation ${foundationId} currentStage from '${foundation.currentStage}' to '${contextType}'`);
      await storage.updateFoundation(foundationId, {
        currentStage: contextType
      });
    }
    
    // Log the final decision for clarity
    console.log(`[STAGE DETERMINATION] Final decision: ${contextType} stage with assistant ID ${assistantId}`);
    
    return {
      assistantId,
      contextType,
      isAutoTransition: false
    };
  } catch (error) {
    console.error(`[STAGE DETERMINATION] Error determining stage:`, error);
    
    // In case of error, use a safe default to the Genre stage
    console.log(`[STAGE DETERMINATION] Error occurred, defaulting to Genre stage`);
    return {
      assistantId: StoryFlow_GenreCreator_ID,
      contextType: "genre",
      isAutoTransition: false
    };
  }
}

/**
 * This is a simplified version of the dynamic-assistant endpoint that only implements
 * the critical stage progression fix to ensure foundations with genreCompleted=true
 * never revert back to genre stage
 */
export async function handleDynamicAssistantRequest(req: Request, res: Response) {
  try {
    const foundationId = parseInt(req.params.foundationId);
    if (isNaN(foundationId)) {
      return res.status(400).json({
        message: "Invalid foundation ID",
        details: "The foundation ID must be a valid number"
      });
    }
    
    // Get the foundation data
    const currentFoundation = await storage.getFoundation(foundationId);
    if (!currentFoundation) {
      return res.status(404).json({
        message: "Foundation not found",
        details: `No foundation exists with ID ${foundationId}`
      });
    }
    
    const { message, currentAssistantType, threadId } = req.body;
    
    if (!message) {
      return res.status(400).json({
        message: "Message is required",
        details: "The message field cannot be empty"
      });
    }
    
    console.log(`Dynamic assistant request for foundation ${foundationId}: "${message.substring(0, 50)}..."`);
    
    // Use our fixed function that respects stage progression
    const { assistantId, contextType, isAutoTransition } = await getContextTypeRespectingStageProgression(
      message,
      currentAssistantType || null,
      foundationId
    );
    
    console.log(`Selected assistant: ${contextType} (${assistantId.substring(0, 10)}...)`);
    
    // Process the message with the selected assistant
    let conversationThreadId = threadId;
    let isNewThread = false;
    
    // Create a new thread if none exists
    if (!conversationThreadId) {
      console.log("No thread ID provided, creating a new thread");
      const thread = await openai.beta.threads.create();
      conversationThreadId = thread.id;
      isNewThread = true;
      console.log(`Created new thread: ${conversationThreadId}`);
    }
    
    // Add the user message to the thread
    await openai.beta.threads.messages.create(conversationThreadId, {
      role: "user",
      content: message
    });
    
    // Log the request details for debugging
    console.log(`Using assistant ID: ${assistantId} for ${contextType} stage`);
    console.log(`Assistant type mapping check: 
      genre = ${StoryFlow_GenreCreator_ID}
      environment = ${StoryFlow_EnvironmentGenerator_ID}
      world = ${StoryFlow_WorldBuilder_ID}
      character = ${StoryFlow_CharacterCreator_ID}
    `);
    
    // Run the assistant on the thread
    const run = await openai.beta.threads.runs.create(conversationThreadId, {
      assistant_id: assistantId
    });
    
    console.log(`Started run with assistant ${contextType} (${assistantId})`);
    
    // Wait for the run to complete
    const completedRun = await waitForRunCompletion(conversationThreadId, run.id);
    if (completedRun.status !== "completed") {
      return res.status(500).json({
        message: "Assistant run failed",
        details: `Run ended with status: ${completedRun.status}`
      });
    }
    
    // Retrieve the assistant's response
    const messages = await openai.beta.threads.messages.list(conversationThreadId);
    const assistantMessages = messages.data.filter(msg => msg.role === "assistant");
    
    if (assistantMessages.length === 0) {
      return res.status(500).json({
        message: "No response from assistant",
        details: "The assistant did not generate a response"
      });
    }
    
    // Get the latest assistant message
    const assistantMessage = assistantMessages[0];
    let responseContent = "";
    
    // Extract text content from the message
    for (const content of assistantMessage.content) {
      if (content.type === "text") {
        responseContent = content.text.value;
        break;
      }
    }
    
    // Return the response
    return res.json({
      success: true,
      foundationId,
      threadId: conversationThreadId,
      contextType,
      content: responseContent,
      isAutoTransition
    });
    
  } catch (error: any) {
    console.error("Error in dynamic-assistant endpoint:", error);
    return res.status(500).json({
      message: "Error processing request",
      details: error.message
    });
  }
}