import { apiRequest } from './queryClient';

// Voice option interface matching the server
export interface VoiceOption {
  id: string;
  name: string;
  provider: 'elevenlabs' | 'openai';
  description?: string;
  preview?: string;
}

/**
 * Fetch all available voices from both ElevenLabs and OpenAI
 * @returns A list of voice options
 */
export async function fetchAvailableVoices(): Promise<VoiceOption[]> {
  try {
    const response = await apiRequest("GET", "/api/tts/voices");
    return await response.json();
  } catch (error) {
    console.error('Error fetching available voices:', error);
    throw new Error('Failed to fetch voice options');
  }
}

/**
 * Generate speech from text using either ElevenLabs or OpenAI
 * @param text The text to convert to speech
 * @param voiceId The ID of the voice to use
 * @param provider The provider of the voice ('elevenlabs' or 'openai')
 * @returns A data URL containing the audio data
 */
export async function generateSpeech(
  text: string,
  voiceId: string,
  provider: 'elevenlabs' | 'openai'
): Promise<string> {
  try {
    const response = await apiRequest("POST", "/api/tts/generate", {
      text,
      voiceId,
      provider
    });
    const data = await response.json();
    return data.audio;
  } catch (error) {
    console.error('Error generating speech:', error);
    throw new Error('Failed to generate speech');
  }
}

/**
 * This function is deprecated - we're now using the Audio API directly in useTTS
 * Keeping it for backward compatibility
 * 
 * @param dataUrl The data URL containing the audio data
 * @returns A cleanup function to stop the audio
 */
export function playAudio(dataUrl: string): () => void {
  console.warn('playAudio is deprecated, use the useTTS hook instead');
  console.log('Creating audio element with data URL length:', dataUrl.length);
  
  const audio = new Audio();
  
  try {
    // Create a one-time click handler that will play the audio
    // when the user interacts with the page
    const playOnInteraction = () => {
      console.log('User interaction detected, playing audio');
      
      try {
        // Set the source and play
        audio.src = dataUrl;
        audio.play().catch(e => console.error('Play failed:', e));
      } catch (err) {
        console.error('Error in play handler:', err);
      }
      
      // Remove the listeners
      document.removeEventListener('click', playOnInteraction);
      document.removeEventListener('keydown', playOnInteraction);
    };
    
    // Add listeners for user interaction
    document.addEventListener('click', playOnInteraction, { once: true });
    document.addEventListener('keydown', playOnInteraction, { once: true });
    
    // Also try playing directly, which may work in some browsers
    audio.src = dataUrl;
    audio.play().catch(err => {
      console.warn('Initial play failed, waiting for user interaction:', err);
    });
  } catch (error) {
    console.error('Error setting up audio playback:', error);
  }
  
  // Return a cleanup function
  return () => {
    try {
      audio.pause();
      audio.currentTime = 0;
    } catch (err) {
      console.error('Error cleaning up audio:', err);
    }
  };
}

/**
 * Cached version of generateSpeech that stores results in memory
 * @param text The text to convert to speech
 * @param voiceId The ID of the voice to use
 * @param provider The provider of the voice ('elevenlabs' or 'openai')
 * @returns A data URL containing the audio data
 */
const speechCache = new Map<string, string>();

export async function generateSpeechCached(
  text: string,
  voiceId: string,
  provider: 'elevenlabs' | 'openai'
): Promise<string> {
  const cacheKey = `${text}-${voiceId}-${provider}`;
  
  if (speechCache.has(cacheKey)) {
    return speechCache.get(cacheKey)!;
  }
  
  const audioDataUrl = await generateSpeech(text, voiceId, provider);
  speechCache.set(cacheKey, audioDataUrl);
  
  return audioDataUrl;
}