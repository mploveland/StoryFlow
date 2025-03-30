import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface SettingsContextType {
  autoPlayMessages: boolean;
  setAutoPlayMessages: (autoPlay: boolean) => void;
  preferOpenAIVoices: boolean;
  setPreferOpenAIVoices: (prefer: boolean) => void;
  playbackSpeed: number;
  setPlaybackSpeed: (speed: number) => void;
}

// Create context with default values
export const SettingsContext = createContext<SettingsContextType>({
  autoPlayMessages: true,
  setAutoPlayMessages: () => {},
  preferOpenAIVoices: true,
  setPreferOpenAIVoices: () => {},
  playbackSpeed: 1.0,
  setPlaybackSpeed: () => {},
});

// Custom hook to use the settings context
export const useSettings = () => useContext(SettingsContext);

// Provider component
export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Initialize state with values from localStorage or defaults
  const [autoPlayMessages, setAutoPlayMessages] = useState<boolean>(() => {
    const saved = localStorage.getItem('autoPlayMessages');
    return saved !== null ? JSON.parse(saved) : true;
  });

  const [preferOpenAIVoices, setPreferOpenAIVoices] = useState<boolean>(() => {
    const saved = localStorage.getItem('preferOpenAIVoices');
    return saved !== null ? JSON.parse(saved) : true;
  });

  const [playbackSpeed, setPlaybackSpeed] = useState<number>(() => {
    const saved = localStorage.getItem('playbackSpeed');
    return saved !== null ? parseFloat(saved) : 1.0;
  });

  // Save settings to localStorage when they change
  useEffect(() => {
    localStorage.setItem('autoPlayMessages', JSON.stringify(autoPlayMessages));
  }, [autoPlayMessages]);

  useEffect(() => {
    localStorage.setItem('preferOpenAIVoices', JSON.stringify(preferOpenAIVoices));
  }, [preferOpenAIVoices]);

  useEffect(() => {
    localStorage.setItem('playbackSpeed', playbackSpeed.toString());
  }, [playbackSpeed]);

  return (
    <SettingsContext.Provider
      value={{
        autoPlayMessages,
        setAutoPlayMessages,
        preferOpenAIVoices,
        setPreferOpenAIVoices,
        playbackSpeed,
        setPlaybackSpeed,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};