import { useState, useEffect, useCallback } from 'react';

interface UseSpeechSynthesisProps {
  onEnd?: () => void;
  onBoundary?: (event: SpeechSynthesisEvent) => void;
  onError?: (event: SpeechSynthesisErrorEvent) => void;
}

export function useSpeechSynthesis({
  onEnd,
  onBoundary,
  onError
}: UseSpeechSynthesisProps = {}) {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [speaking, setSpeaking] = useState(false);
  const [supported, setSupported] = useState(true);
  const [currentVoice, setCurrentVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [utterance, setUtterance] = useState<SpeechSynthesisUtterance | null>(null);

  // Initialize speech synthesis
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check if browser supports speech synthesis
    if (!('speechSynthesis' in window)) {
      setSupported(false);
      return;
    }

    // Function to load available voices
    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      if (availableVoices.length > 0) {
        setVoices(availableVoices);
        // Set a default voice (usually the first English voice)
        const defaultVoice = availableVoices.find(voice => voice.lang.includes('en-')) || availableVoices[0];
        setCurrentVoice(defaultVoice);
      }
    };

    // Initial load of voices
    loadVoices();

    // Chrome loads voices asynchronously, so we need to wait for the onvoiceschanged event
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  // Create a new utterance when text changes
  const speak = useCallback((text: string, rate = 1, pitch = 1) => {
    if (!supported || !text) return;

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    // Create a new utterance
    const newUtterance = new SpeechSynthesisUtterance(text);
    
    if (currentVoice) {
      newUtterance.voice = currentVoice;
    }
    
    newUtterance.rate = rate;
    newUtterance.pitch = pitch;

    // Set up event handlers
    newUtterance.onend = () => {
      setSpeaking(false);
      setIsPaused(false);
      if (onEnd) onEnd();
    };

    newUtterance.onboundary = (event) => {
      if (onBoundary) onBoundary(event);
    };

    newUtterance.onerror = (event) => {
      setSpeaking(false);
      setIsPaused(false);
      if (onError) onError(event);
    };

    // Store the utterance
    setUtterance(newUtterance);
    setSpeaking(true);
    setIsPaused(false);

    // Start speaking
    window.speechSynthesis.speak(newUtterance);
  }, [currentVoice, onBoundary, onEnd, onError, supported]);

  const pause = useCallback(() => {
    if (!supported || !speaking) return;
    
    window.speechSynthesis.pause();
    setIsPaused(true);
  }, [speaking, supported]);

  const resume = useCallback(() => {
    if (!supported || !isPaused) return;
    
    window.speechSynthesis.resume();
    setIsPaused(false);
  }, [isPaused, supported]);

  const cancel = useCallback(() => {
    if (!supported) return;
    
    window.speechSynthesis.cancel();
    setSpeaking(false);
    setIsPaused(false);
  }, [supported]);

  const changeVoice = useCallback((voice: SpeechSynthesisVoice) => {
    setCurrentVoice(voice);
  }, []);

  return {
    speak,
    cancel,
    pause,
    resume,
    speaking,
    isPaused,
    voices,
    currentVoice,
    changeVoice,
    supported
  };
}

export default useSpeechSynthesis;
