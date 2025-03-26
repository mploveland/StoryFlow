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
 * Play audio from a data URL
 * @param dataUrl The data URL containing the audio data
 * @returns A cleanup function to stop the audio
 */
export function playAudio(dataUrl: string): () => void {
  console.log('Creating audio element with data URL length:', dataUrl.length);
  const audio = new Audio(dataUrl);
  
  // Set audio context for better compatibility
  try {
    // Force audio to be processed and played, even if tab is not active
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContext) {
      const audioContext = new AudioContext();
      const source = audioContext.createMediaElementSource(audio);
      source.connect(audioContext.destination);
      
      // Resume audio context if it's suspended (required in some browsers)
      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }
    }
  } catch (error) {
    console.warn('Advanced audio context not available, falling back to basic audio', error);
  }
  
  // Play the audio with better error handling
  audio.play().catch(err => {
    console.error('Error playing audio:', err);
    
    // Try playing again with user interaction simulation
    document.addEventListener('click', function playOnClick() {
      audio.play().catch(e => console.error('Second attempt to play failed:', e));
      document.removeEventListener('click', playOnClick);
    }, { once: true });
  });
  
  // Return a cleanup function
  return () => {
    audio.pause();
    audio.currentTime = 0;
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