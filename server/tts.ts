import OpenAI from "openai";
import { Voice, VoiceSettings } from "elevenlabs/api";
import ElevenLabs from "elevenlabs";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const elevenlabs = new ElevenLabs({
  apiKey: process.env.ELEVEN_LABS_API_KEY,
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
  try {
    const audioStream = await elevenlabs.textToSpeech({
      voiceId,
      textInput: text,
      stability: 0.5,
      similarityBoost: 0.8,
      style: 0,
      modelId: "eleven_multilingual_v2", // Use the multilingual model for better quality
    });
    
    // Convert to base64 for browser playback
    const chunks: Uint8Array[] = [];
    for await (const chunk of audioStream) {
      chunks.push(chunk);
    }
    
    const audioBuffer = Buffer.concat(chunks);
    return `data:audio/mpeg;base64,${audioBuffer.toString('base64')}`;
  } catch (error) {
    console.error("Error generating ElevenLabs speech:", error);
    throw new Error("Failed to generate speech with ElevenLabs");
  }
}

// Convert text to speech using OpenAI
export async function generateOpenAISpeech(
  text: string,
  voice: "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer" = "nova" // Default to Nova
): Promise<string> {
  try {
    const mp3 = await openai.audio.speech.create({
      model: "tts-1", // or "tts-1-hd" for higher quality
      voice,
      input: text,
    });

    const buffer = Buffer.from(await mp3.arrayBuffer());
    return `data:audio/mpeg;base64,${buffer.toString('base64')}`;
  } catch (error) {
    console.error("Error generating OpenAI speech:", error);
    throw new Error("Failed to generate speech with OpenAI");
  }
}

// Generate speech with either provider based on the voice ID
export async function generateSpeech(
  text: string,
  voiceOption: VoiceOption
): Promise<string> {
  if (voiceOption.provider === "elevenlabs") {
    return generateElevenLabsSpeech(text, voiceOption.id);
  } else {
    return generateOpenAISpeech(text, voiceOption.id);
  }
}

// Get all available voices
export function getAvailableVoices(): VoiceOption[] {
  return ALL_VOICES;
}