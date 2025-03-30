import { useState, useEffect, useCallback, useRef } from 'react';

// Type definitions for Web Speech API
interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionError extends Event {
  error: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionError) => void) | null;
  onend: (() => void) | null;
}

// Add global definitions
declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognition;
    webkitSpeechRecognition?: new () => SpeechRecognition;
  }
}

interface UseSpeechRecognitionProps {
  onResult?: (transcript: string) => void;
  onEnd?: () => void;
  continuous?: boolean;
  language?: string;
}

export function useSpeechRecognition({
  onResult,
  onEnd,
  continuous = false,
  language = 'en-US'
}: UseSpeechRecognitionProps = {}) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [supported, setSupported] = useState(true);
  const recognitionRef = useRef<SpeechRecognition | null>(null); // Use ref for consistent access across renders

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window === 'undefined') return;

    console.log("Speech Recognition: Initializing...");

    // Check if browser supports speech recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      console.error("Speech Recognition: Not supported in this browser");
      setSupported(false);
      setError('Speech recognition is not supported in this browser.');
      return;
    }

    console.log("Speech Recognition: API is available");
    
    // Create a new recognition instance
    const recognitionInstance = new SpeechRecognition();
    recognitionInstance.continuous = continuous;
    recognitionInstance.interimResults = true;
    recognitionInstance.lang = language;
    
    // Store in ref for reliable access across component lifecycle
    recognitionRef.current = recognitionInstance;

    console.log(`Speech Recognition: Configured with continuous=${continuous}, language=${language}`);

    // Using a ref allows us to maintain consistent access to the recognition instance
    // across renders and avoids issues with stale closures

    // Set up event handlers for the recognition instance
    recognitionInstance.onresult = (event: SpeechRecognitionEvent) => {
      let interimTranscript = '';
      let finalTranscript = '';

      console.log(`Speech Recognition: Result received with ${event.results.length} results`);

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
          console.log(`Speech Recognition: Final transcript: "${transcript}"`);
          
          // Immediately call onResult with final transcript for faster response
          if (onResult && finalTranscript.trim()) {
            console.log(`Speech Recognition: Immediately calling onResult with final transcript: "${finalTranscript}"`);
            onResult(finalTranscript);
            
            // Reset transcript after processing
            setTranscript('');
            return;
          }
        } else {
          interimTranscript += transcript;
          console.log(`Speech Recognition: Interim transcript: "${transcript}"`);
        }
      }

      // Only use interim transcript for UI feedback, not for triggering callbacks
      const currentTranscript = finalTranscript || interimTranscript;
      setTranscript(currentTranscript);
      
      // Only call onResult with finalized speech
      if (onResult && finalTranscript && finalTranscript.trim() !== '') {
        console.log(`Speech Recognition: Calling onResult with transcript: "${finalTranscript}"`);
        onResult(finalTranscript);
      }
    };

    recognitionInstance.onerror = (event: SpeechRecognitionError) => {
      console.error(`Speech Recognition: Error - ${event.error}`, event);
      setError(event.error);
      // Don't call stop here as it can cause circular references
      setIsListening(false);
    };

    recognitionInstance.onend = () => {
      console.log("Speech Recognition: Recognition ended");
      setIsListening(false);
      
      // Auto-restart if this was not manually stopped and continuous mode is enabled
      if (continuous) {
        console.log("Speech Recognition: Auto-restarting because continuous mode is enabled");
        try {
          // Small delay to avoid race conditions
          setTimeout(() => {
            if (recognitionRef.current) {
              recognitionRef.current.start();
              console.log("Speech Recognition: Auto-restarted successfully");
              setIsListening(true);
            }
          }, 300);
        } catch (err) {
          console.error("Speech Recognition: Failed to auto-restart", err);
        }
      }
      
      if (onEnd) {
        onEnd();
      }
    };

    // Return cleanup function
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        try {
          recognitionRef.current.stop();
        } catch (e) {
          console.log("Error stopping recognition on cleanup:", e);
        }
      }
    };
  }, [continuous, language, onEnd, onResult]);

  const start = useCallback(() => {
    // Use the ref for more reliable access
    if (!recognitionRef.current) {
      console.error("Speech Recognition: Cannot start - recognition not initialized");
      return;
    }
    
    console.log("Speech Recognition: Starting...");
    setError(null);
    try {
      recognitionRef.current.start();
      console.log("Speech Recognition: Started successfully");
      setIsListening(true);
    } catch (err) {
      console.error("Speech Recognition: Error starting recognition", err);
      setError('Failed to start speech recognition.');
      setIsListening(false);
    }
  }, []);

  const stop = useCallback(() => {
    // Use the ref for more reliable access
    if (!recognitionRef.current) {
      console.log("Speech Recognition: Cannot stop - recognition not initialized");
      return;
    }
    
    console.log("Speech Recognition: Stopping...");
    try {
      recognitionRef.current.stop();
      console.log("Speech Recognition: Stopped successfully");
      setIsListening(false);
    } catch (err) {
      console.error("Speech Recognition: Error stopping recognition", err);
      setError('Failed to stop speech recognition.');
    }
  }, []);

  const clear = useCallback(() => {
    setTranscript('');
  }, []);

  return {
    isListening,
    transcript,
    start,
    stop,
    clear,
    error,
    supported
  };
}

export default useSpeechRecognition;
