import { useState, useEffect, useCallback } from 'react';

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

    // Check if browser supports speech recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setSupported(false);
      setError('Speech recognition is not supported in this browser.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = continuous;
    recognition.interimResults = true;
    recognition.lang = language;

    recognition.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      const currentTranscript = finalTranscript || interimTranscript;
      setTranscript(currentTranscript);
      
      if (onResult) {
        onResult(currentTranscript);
      }
    };

    recognition.onerror = (event) => {
      setError(event.error);
      stop();
    };

    recognition.onend = () => {
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
    if (!recognition) return;
    
    setError(null);
    try {
      recognition.start();
      setIsListening(true);
    } catch (err) {
      setError('Failed to start speech recognition.');
      setIsListening(false);
    }
  }, [recognition]);

  const stop = useCallback(() => {
    if (!recognition) return;
    
    try {
      recognition.stop();
      setIsListening(false);
    } catch (err) {
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
