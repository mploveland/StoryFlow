import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchAvailableVoices, generateSpeechCached, VoiceOption } from '@/lib/tts';
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
  
  // State
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState<VoiceOption | null>(null);
  const [currentAudioUrl, setCurrentAudioUrl] = useState<string | null>(null);
  
  // Refs for audio elements
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  
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
      
      console.log(`Setting default voice: ${defaultVoice.name} (${defaultVoice.provider})`);
      setSelectedVoice(defaultVoice);
    }
  }, [voices, defaultVoiceId, defaultProvider, selectedVoice]);
  
  // Create and set up audio elements
  useEffect(() => {
    // Create audio element
    if (!audioRef.current) {
      console.log("Creating new audio element");
      audioRef.current = new Audio();
      
      // Add event listeners
      audioRef.current.addEventListener('play', () => {
        console.log('Audio started playing');
        setIsPlaying(true);
      });
      
      audioRef.current.addEventListener('pause', () => {
        console.log('Audio paused');
        setIsPlaying(false);
      });
      
      audioRef.current.addEventListener('ended', () => {
        console.log('Audio playback ended');
        setIsPlaying(false);
      });
      
      audioRef.current.addEventListener('error', (e) => {
        console.error('Audio error:', e);
        setIsPlaying(false);
      });
    }
    
    // Create audio context
    try {
      if (!audioContextRef.current) {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContext) {
          console.log("Creating audio context");
          audioContextRef.current = new AudioContext();
        }
      }
    } catch (error) {
      console.warn("Failed to create audio context:", error);
    }
    
    // Clean up
    return () => {
      if (audioRef.current) {
        console.log("Cleaning up audio element");
        audioRef.current.pause();
        audioRef.current = null;
      }
      
      if (sourceNodeRef.current) {
        console.log("Disconnecting source node");
        sourceNodeRef.current.disconnect();
        sourceNodeRef.current = null;
      }
    };
  }, []);
  
  // Handle changes to the current audio URL
  useEffect(() => {
    if (!currentAudioUrl || !audioRef.current) return;
    
    console.log(`Setting up audio with URL of length ${currentAudioUrl.length}`);
    
    // Use the Web Audio API for better browser compatibility
    try {
      if (audioContextRef.current && audioRef.current) {
        // Disconnect any existing source
        if (sourceNodeRef.current) {
          sourceNodeRef.current.disconnect();
        }
        
        // Set the source on the audio element
        audioRef.current.src = currentAudioUrl;
        
        // Create a new source node
        sourceNodeRef.current = audioContextRef.current.createMediaElementSource(audioRef.current);
        sourceNodeRef.current.connect(audioContextRef.current.destination);
        
        // Resume audio context (needed in some browsers)
        if (audioContextRef.current.state === 'suspended') {
          console.log("Resuming suspended audio context");
          audioContextRef.current.resume();
        }
        
        // Attempt to play
        console.log("Starting playback with Web Audio API");
        playAudio();
      } else {
        // Fallback to basic audio element
        console.log("Using basic audio element (no audio context)");
        if (audioRef.current) {
          audioRef.current.src = currentAudioUrl;
          playAudio();
        }
      }
    } catch (error) {
      console.error("Error setting up audio:", error);
      
      // Last-resort fallback
      if (audioRef.current) {
        try {
          audioRef.current.src = currentAudioUrl;
          playAudio();
        } catch (e) {
          console.error("Even the fallback failed:", e);
        }
      }
    }
  }, [currentAudioUrl]);
  
  // Play the current audio
  const playAudio = useCallback(() => {
    if (!audioRef.current) {
      console.error("Cannot play: no audio element");
      return;
    }
    
    console.log("Attempting to play audio");
    
    // Force autoplay by playing in response to a user gesture (even a synthetic one)
    const playPromise = audioRef.current.play();
    
    if (playPromise !== undefined) {
      playPromise.catch(error => {
        console.error("Error playing audio:", error);
        
        // Try again with user interaction
        console.log("Will attempt to play on next user interaction");
        const playOnUserInteraction = () => {
          console.log("User interaction detected, trying to play again");
          if (audioRef.current) {
            audioRef.current.play().catch(e => console.error("Play attempt failed again:", e));
          }
          
          // Remove the listener
          document.removeEventListener('click', playOnUserInteraction);
          document.removeEventListener('keydown', playOnUserInteraction);
        };
        
        document.addEventListener('click', playOnUserInteraction, { once: true });
        document.addEventListener('keydown', playOnUserInteraction, { once: true });
        
        // Also dispatch a synthetic click event to try immediately
        try {
          document.dispatchEvent(new MouseEvent('click', {
            view: window,
            bubbles: true,
            cancelable: true
          }));
        } catch (e) {
          console.warn("Could not dispatch synthetic click:", e);
        }
      });
    }
  }, []);
  
  // Stop playback
  const stop = useCallback(() => {
    if (audioRef.current) {
      console.log("Stopping audio playback");
      audioRef.current.pause();
      setIsPlaying(false);
    }
  }, []);
  
  // Generate speech and play it
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
    
    console.log(`Generating speech for "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}" with voice ${selectedVoice.name}`);
    
    try {
      // Stop any current playback
      stop();
      
      // Generate speech data
      const audioDataUrl = await generateSpeechCached(
        text, 
        selectedVoice.id, 
        selectedVoice.provider
      );
      
      console.log(`Received audio data URL (length: ${audioDataUrl.length})`);
      setCurrentAudioUrl(audioDataUrl);
      
      // Return a promise that resolves when playback finishes
      return new Promise((resolve) => {
        if (!audioRef.current) {
          console.error("No audio element available");
          resolve();
          return;
        }
        
        const onEnded = () => {
          console.log("Playback ended, resolving promise");
          audioRef.current?.removeEventListener('ended', onEnded);
          resolve();
        };
        
        audioRef.current.addEventListener('ended', onEnded);
        
        // Safety timeout (30 seconds max)
        const safetyTimeout = setTimeout(() => {
          console.log("Safety timeout reached, resolving promise");
          audioRef.current?.removeEventListener('ended', onEnded);
          resolve();
        }, 30000);
        
        // Clean up timeout when audio ends
        const clearTimeoutOnEnd = () => {
          clearTimeout(safetyTimeout);
          audioRef.current?.removeEventListener('ended', clearTimeoutOnEnd);
        };
        
        audioRef.current.addEventListener('ended', clearTimeoutOnEnd);
      });
    } catch (error) {
      console.error('Error in speak function:', error);
      setIsPlaying(false);
    }
  }, [selectedVoice, stop]);
  
  // Change the current voice
  const changeVoice = useCallback((voiceId: string, provider: 'elevenlabs' | 'openai') => {
    console.log(`Changing voice to ${voiceId} (${provider})`);
    const voice = voices.find(v => v.id === voiceId && v.provider === provider);
    if (voice) {
      console.log(`Selected voice: ${voice.name}`);
      setSelectedVoice(voice);
    } else {
      console.warn(`Could not find voice with id=${voiceId}, provider=${provider}`);
    }
  }, [voices]);
  
  return {
    speak,
    stop,
    isPlaying,
    voices,
    voicesLoading,
    selectedVoice,
    changeVoice,
    currentAudioUrl
  };
}