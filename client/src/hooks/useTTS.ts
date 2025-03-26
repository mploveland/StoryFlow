import { useState, useEffect, useCallback } from 'react';
import { fetchAvailableVoices, generateSpeechCached, playAudio, VoiceOption } from '@/lib/tts';
import { useQuery } from '@tanstack/react-query';

interface UseTTSOptions {
  defaultVoiceId?: string;
  defaultProvider?: 'elevenlabs' | 'openai';
}

export function useTTS(options: UseTTSOptions = {}) {
  console.log("useTTS hook initialized with options:", options);
  // Default to the first ElevenLabs voice (Rachel)
  const defaultVoiceId = options.defaultVoiceId || '21m00Tcm4TlvDq8ikWAM';
  const defaultProvider = options.defaultProvider || 'elevenlabs';
  
  const [currentAudio, setCurrentAudio] = useState<(() => void) | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState<VoiceOption | null>(null);
  
  // Fetch available voices
  const { data: voices = [], isLoading: voicesLoading } = useQuery({
    queryKey: ['/api/tts/voices'],
    queryFn: async () => fetchAvailableVoices(),
  });
  
  // Set the default voice once voices are loaded
  useEffect(() => {
    if (voices.length > 0 && !selectedVoice) {
      const defaultVoice = voices.find(
        v => v.id === defaultVoiceId && v.provider === defaultProvider
      ) || voices[0];
      
      setSelectedVoice(defaultVoice);
    }
  }, [voices, defaultVoiceId, defaultProvider, selectedVoice]);
  
  // Stop any playing audio when component unmounts
  useEffect(() => {
    return () => {
      if (currentAudio) {
        currentAudio();
      }
    };
  }, [currentAudio]);
  
  const speak = useCallback(async (text: string): Promise<void> => {
    if (!selectedVoice) {
      console.error('Cannot speak: No voice selected');
      return;
    }
    
    // Don't process empty text
    if (!text || text.trim() === '') {
      console.warn('Cannot speak: Empty text provided');
      return;
    }
    
    console.log(`Starting speech synthesis with voice "${selectedVoice.name}" (${selectedVoice.provider})`);
    console.log(`Text to speak (${text.length} chars): "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`);
    
    try {
      // Stop any currently playing audio
      if (currentAudio) {
        console.log('Stopping previous audio playback');
        currentAudio();
        setCurrentAudio(null);
      }
      
      setIsPlaying(true);
      
      // Generate speech from API
      console.log('Generating speech...');
      const audioDataUrl = await generateSpeechCached(
        text, 
        selectedVoice.id, 
        selectedVoice.provider
      );
      
      console.log(`Received audio data URL (length: ${audioDataUrl.length})`);
      
      // Use our enhanced playAudio function
      console.log('Starting audio playback');
      const stopAudio = playAudio(audioDataUrl);
      
      setCurrentAudio(() => {
        return () => {
          console.log('Cleanup function called');
          stopAudio();
          setIsPlaying(false);
        };
      });
      
      // Use a separate audio element to track when audio finishes
      return new Promise((resolve) => {
        const audio = new Audio();
        
        // Log audio events for debugging
        audio.addEventListener('canplay', () => console.log('Audio can play'));
        audio.addEventListener('play', () => console.log('Audio started playing'));
        audio.addEventListener('error', (e) => console.error('Audio error:', e));
        
        audio.addEventListener('ended', () => {
          console.log('Audio playback ended naturally');
          setIsPlaying(false);
          setCurrentAudio(null);
          resolve();
        });
        
        // Set the source after adding listeners
        audio.src = audioDataUrl;
        
        // Add safety timeout to ensure promise resolves
        const safetyTimeout = setTimeout(() => {
          console.log('Safety timeout triggered after 30s');
          setIsPlaying(false);
          setCurrentAudio(null);
          resolve();
        }, 30000); // 30 second safety timeout
        
        // Clear timeout when audio ends
        audio.addEventListener('ended', () => clearTimeout(safetyTimeout));
        
        // Start playing
        audio.play().catch(err => {
          console.error('Error playing audio in tracking element:', err);
          
          // Try with user interaction
          console.log('Attempting fallback play method');
          document.addEventListener('click', function playOnInteraction() {
            audio.play().catch(e => console.error('Failed again:', e));
            document.removeEventListener('click', playOnInteraction);
          }, { once: true });
          
          // Don't wait forever if audio fails
          setTimeout(() => {
            console.log('Resolving promise despite playback failure');
            setIsPlaying(false);
            setCurrentAudio(null);
            clearTimeout(safetyTimeout);
            resolve();
          }, 1000);
        });
      });
    } catch (error) {
      console.error('Error in speak function:', error);
      setIsPlaying(false);
      setCurrentAudio(null);
    }
  }, [selectedVoice, currentAudio]);
  
  const stop = useCallback(() => {
    if (currentAudio) {
      currentAudio();
      setCurrentAudio(null);
      setIsPlaying(false);
    }
  }, [currentAudio]);
  
  const changeVoice = useCallback((voiceId: string, provider: 'elevenlabs' | 'openai') => {
    const voice = voices.find(v => v.id === voiceId && v.provider === provider);
    if (voice) {
      setSelectedVoice(voice);
    }
  }, [voices]);
  
  return {
    speak,
    stop,
    isPlaying,
    voices,
    voicesLoading,
    selectedVoice,
    changeVoice
  };
}