import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchAvailableVoices, generateSpeechCached, VoiceOption } from '@/lib/tts';
import { useQuery } from '@tanstack/react-query';

interface UseTTSOptions {
  defaultVoiceId?: string;
  defaultProvider?: 'elevenlabs' | 'openai';
  defaultPlaybackSpeed?: number;
}

export function useTTS(options: UseTTSOptions = {}) {
  console.log("useTTS hook initialized with options:", options);
  
  // Default to OpenAI Nova voice instead of ElevenLabs
  const defaultVoiceId = options.defaultVoiceId || 'nova';
  const defaultProvider = options.defaultProvider || 'openai';
  const defaultPlaybackSpeed = options.defaultPlaybackSpeed || 1.1; // Updated default to 1.1 as requested
  
  // State
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState<VoiceOption | null>(null);
  const [currentAudioUrl, setCurrentAudioUrl] = useState<string | null>(null);
  const [playbackSpeed, setPlaybackSpeed] = useState(defaultPlaybackSpeed);
  
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
    if (!currentAudioUrl || !audioRef.current) {
      console.log("useTTS: No audio URL or audio element available");
      return;
    }
    
    console.log(`useTTS: Setting up audio with URL of length ${currentAudioUrl.length}`);
    console.log(`useTTS: URL starts with: ${currentAudioUrl.substring(0, 40)}...`);
    
    // First stop any current playback to avoid echo
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    
    // Use a simpler, more reliable approach to avoid the echo issue
    try {
      // Recreate the audio element each time to avoid issues with reusing the same element
      const newAudio = new Audio();
      newAudio.src = currentAudioUrl;
      newAudio.volume = 1.0;
      newAudio.muted = false;
      newAudio.playbackRate = playbackSpeed;
      
      // Add our event listeners to the new element
      newAudio.addEventListener('play', () => {
        console.log('Audio started playing');
        setIsPlaying(true);
      });
      
      newAudio.addEventListener('pause', () => {
        console.log('Audio paused');
        setIsPlaying(false);
      });
      
      newAudio.addEventListener('ended', () => {
        console.log('Audio playback ended');
        setIsPlaying(false);
      });
      
      newAudio.addEventListener('error', (e) => {
        console.error('Audio error:', e);
        setIsPlaying(false);
      });
      
      // Replace our reference
      audioRef.current = newAudio;
      
      // Play the audio
      console.log("useTTS: Playing new audio");
      newAudio.play()
        .then(() => console.log("useTTS: Audio playback started successfully"))
        .catch(err => {
          console.error("useTTS: Error playing audio:", err);
          // Show error to help debug audio playback issues
          setIsPlaying(false);
        });
    } catch (error) {
      console.error("useTTS: Error setting up audio:", error);
      setIsPlaying(false);
    }
  }, [currentAudioUrl, playbackSpeed]);
  
  // Play the current audio
  const playAudio = useCallback(() => {
    if (!audioRef.current) {
      console.error("useTTS: Cannot play: no audio element");
      return;
    }
    
    console.log("useTTS: Attempting to play audio");
    console.log("useTTS: Audio element current src:", audioRef.current.src ? audioRef.current.src.substring(0, 40) + "..." : "none");
    console.log("useTTS: Audio element readyState:", audioRef.current.readyState);
    console.log("useTTS: Audio element muted:", audioRef.current.muted);
    console.log("useTTS: Audio playback speed:", playbackSpeed);
    
    // Make sure audio is not muted
    audioRef.current.muted = false;
    
    // Set volume to maximum to ensure audibility
    audioRef.current.volume = 1.0;
    
    // Set playback speed
    audioRef.current.playbackRate = playbackSpeed;
    
    // Force autoplay by playing in response to a user gesture (even a synthetic one)
    const playPromise = audioRef.current.play();
    
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          console.log("useTTS: Audio playback started successfully");
        })
        .catch(error => {
          console.error("useTTS: Error playing audio:", error);
          
          // Try an alternative approach - using a fresh audio element
          console.log("useTTS: Trying alternative audio element...");
          const altAudio = new Audio(audioRef.current?.src);
          altAudio.volume = 1.0;
          altAudio.muted = false;
          altAudio.oncanplaythrough = () => {
            console.log("useTTS: Alternative audio can play");
            altAudio.play()
              .then(() => console.log("useTTS: Alternative audio playing"))
              .catch(err => console.error("useTTS: Alternative audio failed:", err));
          };
          
          // Try again with user interaction
          console.log("useTTS: Will attempt to play on next user interaction");
          const playOnUserInteraction = () => {
            console.log("useTTS: User interaction detected, trying to play again");
            if (audioRef.current) {
              audioRef.current.play()
                .then(() => console.log("useTTS: Playback on user interaction succeeded"))
                .catch(e => console.error("useTTS: Play attempt on user interaction failed:", e));
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
            console.warn("useTTS: Could not dispatch synthetic click:", e);
          }
        });
    }
  }, [playbackSpeed]);
  
  // Stop playback
  const stop = useCallback(() => {
    if (audioRef.current) {
      console.log("Stopping audio playback");
      
      // Thoroughly stop the audio to prevent any potential echo
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      
      // Reset playback state
      setIsPlaying(false);
      
      // Remove the src attribute to ensure it's completely stopped
      try {
        audioRef.current.removeAttribute('src');
      } catch (e) {
        // Some browsers might not support this, but that's okay
        console.log("Could not remove src attribute:", e);
      }
    }
  }, []);
  
  // Generate speech and play it
  // State for API key errors
  const [apiKeyError, setApiKeyError] = useState<{
    provider: 'elevenlabs' | 'openai';
    message: string;
  } | null>(null);
  
  const speak = useCallback(async (text: string): Promise<void> => {
    if (!selectedVoice) {
      console.error('useTTS: Cannot speak: No voice selected');
      return;
    }
    
    // Don't process empty text
    if (!text || text.trim() === '') {
      console.warn('useTTS: Cannot speak: Empty text provided');
      return;
    }
    
    // Clear any previous API key error
    setApiKeyError(null);
    
    console.log(`useTTS: Generating speech for "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}" with voice ${selectedVoice.name}`);
    
    try {
      // Stop any current playback
      stop();
      
      // Generate speech data
      const audioDataUrl = await generateSpeechCached(
        text, 
        selectedVoice.id, 
        selectedVoice.provider
      );
      
      console.log(`useTTS: Received audio data URL (length: ${audioDataUrl.length})`);
      
      // Set the audio URL to state
      setCurrentAudioUrl(audioDataUrl);
      
      // Force browser audio playback
      // Create a completely fresh Audio element to avoid issues with reused elements
      const tempAudio = new Audio(audioDataUrl);
      tempAudio.volume = 1.0;
      tempAudio.playbackRate = playbackSpeed;
      
      // Log when audio starts playing
      tempAudio.addEventListener('play', () => {
        console.log("useTTS: Temp audio started playing");
        setIsPlaying(true);
      });
      
      // Log when audio ends
      tempAudio.addEventListener('ended', () => {
        console.log("useTTS: Temp audio ended");
        setIsPlaying(false);
      });
      
      // Explicitly set the audio src to make sure it's set
      tempAudio.src = audioDataUrl;
      
      // Play immediately
      try {
        await tempAudio.play();
        console.log("useTTS: Successfully started audio playback");
      } catch (playError) {
        console.error("useTTS: Error playing audio directly:", playError);
        
        // Fallback to auto-play by user interaction
        const playOnInteraction = () => {
          tempAudio.play()
            .then(() => console.log("useTTS: Audio started after user interaction"))
            .catch(err => console.error("useTTS: Failed to play even after user interaction:", err));
            
          // Remove listeners
          document.removeEventListener('click', playOnInteraction);
          document.removeEventListener('keydown', playOnInteraction);
        };
        
        // Add event listeners for user interaction
        document.addEventListener('click', playOnInteraction, { once: true });
        document.addEventListener('keydown', playOnInteraction, { once: true });
        
        // Dispatch synthetic events to trigger audio playback
        try {
          document.dispatchEvent(new MouseEvent('click', {
            view: window,
            bubbles: true,
            cancelable: true
          }));
        } catch (e) {
          console.warn("useTTS: Failed to dispatch synthetic click:", e);
        }
      }
      
      // Store temp audio in the audioRef
      if (!audioRef.current) {
        audioRef.current = tempAudio;
      }
      
      // Return a promise that resolves when playback finishes
      return new Promise((resolve) => {
        const onEnded = () => {
          tempAudio.removeEventListener('ended', onEnded);
          resolve();
        };
        
        tempAudio.addEventListener('ended', onEnded);
        
        // Safety timeout (30 seconds max)
        const safetyTimeout = setTimeout(() => {
          console.log("useTTS: Safety timeout reached, resolving promise");
          tempAudio.removeEventListener('ended', onEnded);
          resolve();
        }, 30000);
        
        // Clean up timeout when audio ends
        tempAudio.addEventListener('ended', () => {
          clearTimeout(safetyTimeout);
        }, { once: true });
      });
    } catch (error: any) {
      console.error('useTTS: Error in speak function:', error);
      
      // Handle API key errors specially
      if (error.needsApiKey && error.provider) {
        console.warn(`useTTS: API key error detected for provider: ${error.provider}`);
        setApiKeyError({
          provider: error.provider,
          message: error.message || `The ${error.provider} API key is missing or invalid`
        });
        
        // Show a toast or notification about the API key issue
        // We'll handle this in the UI instead of here
      }
      
      setIsPlaying(false);
    }
  }, [selectedVoice, stop, playbackSpeed]);
  
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
  
  // Change the playback speed
  const changePlaybackSpeed = useCallback((speed: number) => {
    console.log(`Changing playback speed to ${speed}x`);
    setPlaybackSpeed(speed);
    
    // Update the speed immediately if audio is currently playing
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
    }
  }, []);
  
  return {
    speak,
    stop,
    isPlaying,
    voices,
    voicesLoading,
    selectedVoice,
    changeVoice,
    currentAudioUrl,
    playbackSpeed,
    changePlaybackSpeed,
    apiKeyError,
    clearApiKeyError: () => setApiKeyError(null)
  };
}