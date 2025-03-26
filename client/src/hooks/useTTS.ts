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
    if (!currentAudioUrl || !audioRef.current) {
      console.log("useTTS: No audio URL or audio element available");
      return;
    }
    
    console.log(`useTTS: Setting up audio with URL of length ${currentAudioUrl.length}`);
    console.log(`useTTS: URL starts with: ${currentAudioUrl.substring(0, 40)}...`);
    
    // Use the Web Audio API for better browser compatibility
    try {
      if (audioContextRef.current && audioRef.current) {
        console.log("useTTS: Using Web Audio API for playback");
        
        // Disconnect any existing source
        if (sourceNodeRef.current) {
          console.log("useTTS: Disconnecting previous source node");
          sourceNodeRef.current.disconnect();
        }
        
        // Set the source on the audio element
        console.log("useTTS: Setting audio source URL");
        audioRef.current.src = currentAudioUrl;
        
        // Create a new source node
        console.log("useTTS: Creating media element source node");
        sourceNodeRef.current = audioContextRef.current.createMediaElementSource(audioRef.current);
        sourceNodeRef.current.connect(audioContextRef.current.destination);
        
        // Resume audio context (needed in some browsers)
        if (audioContextRef.current.state === 'suspended') {
          console.log("useTTS: Resuming suspended audio context");
          audioContextRef.current.resume();
        }
        
        // Attempt to play
        console.log("useTTS: Starting playback with Web Audio API");
        playAudio();
      } else {
        // Fallback to basic audio element
        console.log("useTTS: Using basic audio element (no audio context)");
        if (audioRef.current) {
          audioRef.current.src = currentAudioUrl;
          playAudio();
        }
      }
    } catch (error) {
      console.error("useTTS: Error setting up audio:", error);
      
      // Last-resort fallback
      if (audioRef.current) {
        try {
          console.log("useTTS: Using emergency fallback approach");
          
          // Create a completely fresh audio element
          const freshAudio = new Audio();
          freshAudio.src = currentAudioUrl;
          freshAudio.oncanplaythrough = () => {
            console.log("useTTS: Fresh audio element can play through");
            freshAudio.play()
              .then(() => console.log("useTTS: Fallback playback started successfully"))
              .catch(err => console.error("useTTS: Fallback playback failed:", err));
          };
          freshAudio.onerror = (e) => {
            console.error("useTTS: Fresh audio element error:", e);
          };
          
          // Replace our reference
          audioRef.current = freshAudio;
          
        } catch (e) {
          console.error("useTTS: Even the fallback failed:", e);
        }
      }
    }
  }, [currentAudioUrl]);
  
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
    
    // Make sure audio is not muted
    audioRef.current.muted = false;
    
    // Set volume to maximum to ensure audibility
    audioRef.current.volume = 1.0;
    
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
      console.error('useTTS: Cannot speak: No voice selected');
      return;
    }
    
    // Don't process empty text
    if (!text || text.trim() === '') {
      console.warn('useTTS: Cannot speak: Empty text provided');
      return;
    }
    
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
      setCurrentAudioUrl(audioDataUrl);
      
      // Create a simple audio element directly
      try {
        console.log("useTTS: Attempting direct audio playback");
        const directAudio = new Audio(audioDataUrl);
        directAudio.volume = 1.0;
        directAudio.playbackRate = 1.0;
        directAudio.muted = false;
        directAudio.oncanplaythrough = () => {
          console.log("useTTS: Direct audio can play through");
          directAudio.play()
            .then(() => console.log("useTTS: Direct audio playback started"))
            .catch(err => console.error("useTTS: Direct audio playback failed:", err));
        };
        directAudio.onerror = (err) => {
          console.error("useTTS: Direct audio error:", err);
        };
      } catch (directErr) {
        console.error("useTTS: Could not create direct audio element:", directErr);
      }
      
      // Return a promise that resolves when playback finishes
      return new Promise((resolve) => {
        if (!audioRef.current) {
          console.error("useTTS: No audio element available");
          resolve();
          return;
        }
        
        const onEnded = () => {
          console.log("useTTS: Playback ended, resolving promise");
          audioRef.current?.removeEventListener('ended', onEnded);
          resolve();
        };
        
        audioRef.current.addEventListener('ended', onEnded);
        
        // Safety timeout (30 seconds max)
        const safetyTimeout = setTimeout(() => {
          console.log("useTTS: Safety timeout reached, resolving promise");
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
      console.error('useTTS: Error in speak function:', error);
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