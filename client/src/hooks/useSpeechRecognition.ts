import { useState, useEffect, useCallback } from 'react';

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
  const [recognition, setRecognition] = useState<SpeechRecognition | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [supported, setSupported] = useState(true);

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
    
    const recognition = new SpeechRecognition();
    recognition.continuous = continuous;
    recognition.interimResults = true;
    recognition.lang = language;

    console.log(`Speech Recognition: Configured with continuous=${continuous}, language=${language}`);

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interimTranscript = '';
      let finalTranscript = '';

      console.log(`Speech Recognition: Result received with ${event.results.length} results`);

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
          console.log(`Speech Recognition: Final transcript: "${transcript}"`);
        } else {
          interimTranscript += transcript;
          console.log(`Speech Recognition: Interim transcript: "${transcript}"`);
        }
      }

      const currentTranscript = finalTranscript || interimTranscript;
      setTranscript(currentTranscript);
      
      if (onResult) {
        console.log(`Speech Recognition: Calling onResult with transcript: "${currentTranscript}"`);
        onResult(currentTranscript);
      }
    };

    recognition.onerror = (event: SpeechRecognitionError) => {
      console.error(`Speech Recognition: Error - ${event.error}`, event);
      setError(event.error);
      stop();
    };

    recognition.onend = () => {
      console.log("Speech Recognition: Recognition ended");
      setIsListening(false);
      if (onEnd) {
        onEnd();
      }
    };

    setRecognition(recognition);

    return () => {
      if (recognition) {
        recognition.onresult = null;
        recognition.onerror = null;
        recognition.onend = null;
        stop();
      }
    };
  }, [continuous, language, onEnd, onResult]);

  const start = useCallback(() => {
    if (!recognition) {
      console.error("Speech Recognition: Cannot start - recognition not initialized");
      return;
    }
    
    console.log("Speech Recognition: Starting...");
    setError(null);
    try {
      recognition.start();
      console.log("Speech Recognition: Started successfully");
      setIsListening(true);
    } catch (err) {
      console.error("Speech Recognition: Error starting recognition", err);
      setError('Failed to start speech recognition.');
      setIsListening(false);
    }
  }, [recognition]);

  const stop = useCallback(() => {
    if (!recognition) {
      console.log("Speech Recognition: Cannot stop - recognition not initialized");
      return;
    }
    
    console.log("Speech Recognition: Stopping...");
    try {
      recognition.stop();
      console.log("Speech Recognition: Stopped successfully");
      setIsListening(false);
    } catch (err) {
      console.error("Speech Recognition: Error stopping recognition", err);
      setError('Failed to stop speech recognition.');
    }
  }, [recognition]);

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
