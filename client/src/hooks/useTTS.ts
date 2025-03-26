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
    if (!selectedVoice) return;
    
    try {
      // Stop any currently playing audio
      if (currentAudio) {
        currentAudio();
        setCurrentAudio(null);
      }
      
      setIsPlaying(true);
      
      // Generate and play the speech
      const audioDataUrl = await generateSpeechCached(
        text, 
        selectedVoice.id, 
        selectedVoice.provider
      );
      
      const stopAudio = playAudio(audioDataUrl);
      setCurrentAudio(() => {
        return () => {
          stopAudio();
          setIsPlaying(false);
        };
      });
      
      // Create a promise that resolves when audio finishes playing
      return new Promise((resolve) => {
        const audio = new Audio(audioDataUrl);
        audio.addEventListener('ended', () => {
          setIsPlaying(false);
          setCurrentAudio(null);
          resolve();
        });
        audio.play().catch(err => {
          console.error('Error playing audio:', err);
          setIsPlaying(false);
          setCurrentAudio(null);
          resolve(); // Resolve anyway to prevent hanging promises
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