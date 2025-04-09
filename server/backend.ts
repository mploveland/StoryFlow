import { Request, Response } from "express";
import { storage } from "./storage";
import { getAppropriateAssistant, waitForRunCompletion } from "./assistants";
import OpenAI from "openai";

// Initialize OpenAI client
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * This improved helper function ensures that genre-completed foundations never revert back to genre stage
 * It implements the critical stage progression fix by enforcing strict ordering of stages
 */
export async function getContextTypeRespectingStageProgression(
  message: string,
  currentAssistantType: string | null,
  foundationId: number
) {
  // Get detected context and assistant ID from the standard function
  const result = await getAppropriateAssistant(
    message,
    currentAssistantType as "genre" | "world" | "character" | "environment" | null,
    foundationId
  );
  
  // Destructure result
  const { assistantId, contextType, isAutoTransition } = result;
  
  // CRITICAL FIX: If the foundation has already completed the genre stage,
  // force the assistant type to the next stage (environment) if it was detected as genre
  if (contextType === 'genre') {
    try {
      // Get the foundation to check if genre stage is completed
      const foundation = await storage.getFoundation(foundationId);
      
      // If genre is already completed, NEVER allow reverting to genre
      if (foundation && foundation.genreCompleted === true) {
        console.log(`[STAGE PROGRESSION] ⚠️ IMPORTANT: Foundation ${foundationId} has already completed genre stage (genreCompleted=true)`);
        console.log(`[STAGE PROGRESSION] Forcing assistant from 'genre' to 'environment' to prevent regression`);
        
        // Always use the StoryFlow_EnvironmentGenerator_ID for environment stage
        const StoryFlow_EnvironmentGenerator_ID = "asst_EezatLBvY8BhCC20fztog1RF";
        
        return {
          assistantId: StoryFlow_EnvironmentGenerator_ID, // Use the specific environment assistant ID
          contextType: 'environment',                     // Force to environment stage
          isAutoTransition: false                         // Not an auto transition
        };
      }
    } catch (error) {
      console.error(`[STAGE PROGRESSION] Error checking foundation stage:`, error);
    }
  }
  
  // If no special handling needed, return the original result
  return result;
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