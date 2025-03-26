import OpenAI from "openai";
import { ElevenLabsClient } from 'elevenlabs'; // Import from root package

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const elevenLabsClient = new ElevenLabsClient({
  apiKey: process.env.ELEVEN_LABS_API_KEY
});

// Voice options from both services
export interface VoiceOption {
  id: string;
  name: string;
  provider: 'elevenlabs' | 'openai';
  description?: string;
  preview?: string; // URL to an audio preview if available
}

// A selection of high-quality ElevenLabs voices
export const ELEVENLABS_VOICES: VoiceOption[] = [
  {
    id: "21m00Tcm4TlvDq8ikWAM",
    name: "Rachel",
    provider: "elevenlabs",
    description: "Calm and clear female voice, perfect for narration"
  },
  {
    id: "AZnzlk1XvdvUeBnXmlld",
    name: "Domi",
    provider: "elevenlabs",
    description: "Soft and thoughtful female voice"
  },
  {
    id: "EXAVITQu4vr4xnSDxMaL",
    name: "Bella",
    provider: "elevenlabs",
    description: "Gentle and pleasant female voice"
  },
  {
    id: "ErXwobaYiN019PkySvjV",
    name: "Antoni",
    provider: "elevenlabs",
    description: "Warm and expressive male voice"
  },
  {
    id: "MF3mGyEYCl7XYWbV9V6O",
    name: "Elli",
    provider: "elevenlabs",
    description: "Approachable and friendly female voice"
  },
  {
    id: "VR6AewLTigWG4xSOukaG",
    name: "Adam",
    provider: "elevenlabs",
    description: "Deep and authoritative male voice"
  },
  {
    id: "pNInz6obpgDQGcFmaJgB",
    name: "Sam",
    provider: "elevenlabs",
    description: "Serious and focused male voice"
  }
];

// OpenAI's available voices
export const OPENAI_VOICES: VoiceOption[] = [
  {
    id: "alloy",
    name: "Alloy",
    provider: "openai",
    description: "Neutral and balanced voice"
  },
  {
    id: "echo",
    name: "Echo",
    provider: "openai",
    description: "Musical and melodic voice"
  },
  {
    id: "fable",
    name: "Fable",
    provider: "openai",
    description: "British accent, suitable for storytelling"
  },
  {
    id: "onyx",
    name: "Onyx",
    provider: "openai",
    description: "Deep and powerful male voice"
  },
  {
    id: "nova",
    name: "Nova",
    provider: "openai",
    description: "Weightier female voice"
  },
  {
    id: "shimmer",
    name: "Shimmer",
    provider: "openai",
    description: "Warm female voice"
  }
];

// All available voices
export const ALL_VOICES: VoiceOption[] = [
  ...ELEVENLABS_VOICES,
  ...OPENAI_VOICES
];

// Convert text to speech using ElevenLabs
export async function generateElevenLabsSpeech(
  text: string,
  voiceId: string = "21m00Tcm4TlvDq8ikWAM" // Default to Rachel
): Promise<string> {
  console.log(`ElevenLabs TTS: Starting with voiceId=${voiceId}, text length=${text.length}`);
  
  // Verify API key
  const apiKey = process.env.ELEVEN_LABS_API_KEY;
  if (!apiKey) {
    console.error("ElevenLabs TTS: Missing API key");
    throw new Error("Missing ElevenLabs API key");
  }
  
  console.log("ElevenLabs TTS: API key is present, proceeding...");
  
  try {
    // Use the client to generate speech
    console.log("ElevenLabs TTS: Calling API...");
    const audioStream = await elevenLabsClient.textToSpeech.convert(
      voiceId, 
      {
        text,
        model_id: "eleven_multilingual_v2", // Use the multilingual model for better quality
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.8
        }
      }
    );
    
    console.log("ElevenLabs TTS: Successfully received audio stream");
    
    // Convert to base64 for browser playback
    const chunks: Buffer[] = [];
    
    audioStream.on('data', (chunk: Buffer) => {
      console.log(`ElevenLabs TTS: Received chunk of size ${chunk.length}`);
      chunks.push(chunk);
    });
    
    // Return a promise that resolves when the stream ends
    return new Promise((resolve, reject) => {
      audioStream.on('end', () => {
        console.log(`ElevenLabs TTS: Stream ended, received ${chunks.length} chunks`);
        const audioBuffer = Buffer.concat(chunks);
        console.log(`ElevenLabs TTS: Audio buffer size: ${audioBuffer.length} bytes`);
        
        // Check if we actually received data
        if (audioBuffer.length === 0) {
          console.error("ElevenLabs TTS: Received empty audio buffer");
          reject(new Error("Received empty audio from ElevenLabs"));
          return;
        }
        
        const dataUrl = `data:audio/mpeg;base64,${audioBuffer.toString('base64')}`;
        console.log(`ElevenLabs TTS: Created data URL of length ${dataUrl.length}`);
        resolve(dataUrl);
      });
      
      audioStream.on('error', (err: Error) => {
        console.error("ElevenLabs TTS Stream error:", err);
        reject(new Error(`Error processing audio stream: ${err.message}`));
      });
    });
  } catch (error: any) {
    console.error("Error generating ElevenLabs speech:", error);
    // Get more detailed error message
    const errorMsg = error.message || "Unknown error";
    const statusCode = error.statusCode || error.status || "unknown";
    console.error(`ElevenLabs TTS error details: status=${statusCode}, message=${errorMsg}`);
    throw new Error(`Failed to generate speech with ElevenLabs: ${errorMsg}`);
  }
}

// Convert text to speech using OpenAI
export async function generateOpenAISpeech(
  text: string,
  voice: "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer" = "nova" // Default to Nova
): Promise<string> {
  console.log(`OpenAI TTS: Starting with voice=${voice}, text length=${text.length}`);
  
  // Verify API key
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("OpenAI TTS: Missing API key");
    throw new Error("Missing OpenAI API key");
  }
  
  console.log("OpenAI TTS: API key is present, proceeding...");
  
  try {
    console.log("OpenAI TTS: Calling API...");
    const mp3 = await openai.audio.speech.create({
      model: "tts-1", // or "tts-1-hd" for higher quality
      voice,
      input: text,
    });
    
    console.log("OpenAI TTS: Successfully received response");
    
    try {
      const arrayBuffer = await mp3.arrayBuffer();
      console.log(`OpenAI TTS: Converted to arrayBuffer, size: ${arrayBuffer.byteLength} bytes`);
      
      const buffer = Buffer.from(arrayBuffer);
      console.log(`OpenAI TTS: Created buffer of size: ${buffer.length} bytes`);
      
      // Check if we have data
      if (buffer.length === 0) {
        console.error("OpenAI TTS: Received empty audio buffer");
        throw new Error("Received empty audio from OpenAI");
      }
      
      const dataUrl = `data:audio/mpeg;base64,${buffer.toString('base64')}`;
      console.log(`OpenAI TTS: Created data URL of length ${dataUrl.length}`);
      return dataUrl;
    } catch (bufferError: any) {
      console.error("OpenAI TTS: Error processing audio buffer:", bufferError);
      const errorMessage = bufferError.message || "Unknown buffer processing error";
      throw new Error(`Error processing audio buffer: ${errorMessage}`);
    }
  } catch (error: any) {
    console.error("Error generating OpenAI speech:", error);
    // Get more detailed error message
    const errorMsg = error.message || "Unknown error";
    const statusCode = error.statusCode || error.status || "unknown";
    console.error(`OpenAI TTS error details: status=${statusCode}, message=${errorMsg}`);
    throw new Error(`Failed to generate speech with OpenAI: ${errorMsg}`);
  }
}

// Generate speech with either provider based on the voice ID
export async function generateSpeech(
  text: string,
  voiceOption: VoiceOption
): Promise<string> {
  console.log(`TTS Main: Generating speech with voice "${voiceOption.name}" (${voiceOption.provider})`);
  
  try {
    let result: string;
    
    if (voiceOption.provider === "elevenlabs") {
      console.log(`TTS Main: Using ElevenLabs with voice ID ${voiceOption.id}`);
      result = await generateElevenLabsSpeech(text, voiceOption.id);
    } else {
      // Cast to OpenAI voice type
      console.log(`TTS Main: Using OpenAI with voice ID ${voiceOption.id}`);
      const openaiVoice = voiceOption.id as "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer";
      result = await generateOpenAISpeech(text, openaiVoice);
    }
    
    console.log(`TTS Main: Successfully generated speech, data URL length: ${result.length}`);
    return result;
  } catch (error: any) {
    console.error(`TTS Main: Error generating speech with ${voiceOption.provider}:`, error);
    
    // Try fallback to the other provider if one fails
    if (voiceOption.provider === "elevenlabs" && process.env.OPENAI_API_KEY) {
      console.log("TTS Main: Attempting fallback to OpenAI TTS");
      try {
        const fallbackResult = await generateOpenAISpeech(text, "nova");
        console.log("TTS Main: Fallback to OpenAI successful");
        return fallbackResult;
      } catch (fallbackError) {
        console.error("TTS Main: Fallback to OpenAI also failed:", fallbackError);
      }
    } else if (voiceOption.provider === "openai" && process.env.ELEVEN_LABS_API_KEY) {
      console.log("TTS Main: Attempting fallback to ElevenLabs TTS");
      try {
        const fallbackResult = await generateElevenLabsSpeech(text);
        console.log("TTS Main: Fallback to ElevenLabs successful");
        return fallbackResult;
      } catch (fallbackError) {
        console.error("TTS Main: Fallback to ElevenLabs also failed:", fallbackError);
      }
    }
    
    // If we get here, both primary and fallback (if attempted) failed
    throw new Error(`Failed to generate speech: ${error.message}`);
  }
}

// Get all available voices
export function getAvailableVoices(): VoiceOption[] {
  return ALL_VOICES;
}