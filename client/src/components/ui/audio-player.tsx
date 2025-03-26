import React, { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { Button } from './button';

interface AudioPlayerProps {
  audioUrl: string | null;
  autoPlay?: boolean;
  onPlayStateChange?: (isPlaying: boolean) => void;
  className?: string;
}

/**
 * A component that handles audio playback with better browser compatibility
 */
export function AudioPlayer({ 
  audioUrl, 
  autoPlay = false,
  onPlayStateChange,
  className = ''
}: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);

  useEffect(() => {
    // Create audio element if it doesn't exist
    if (!audioRef.current) {
      console.log('AudioPlayer: Creating new audio element');
      audioRef.current = new Audio();
      
      // Add event listeners
      audioRef.current.addEventListener('play', () => {
        console.log('AudioPlayer: Audio started playing');
        setIsPlaying(true);
        onPlayStateChange?.(true);
      });
      
      audioRef.current.addEventListener('ended', () => {
        console.log('AudioPlayer: Audio playback ended');
        setIsPlaying(false);
        onPlayStateChange?.(false);
      });
      
      audioRef.current.addEventListener('pause', () => {
        console.log('AudioPlayer: Audio paused');
        setIsPlaying(false);
        onPlayStateChange?.(false);
      });
      
      audioRef.current.addEventListener('error', (e) => {
        console.error('AudioPlayer: Audio error:', e);
        console.error('AudioPlayer: Error code:', audioRef.current?.error?.code);
        console.error('AudioPlayer: Error message:', audioRef.current?.error?.message);
        setIsPlaying(false);
        onPlayStateChange?.(false);
      });

      // Add canplaythrough event for debugging
      audioRef.current.addEventListener('canplaythrough', () => {
        console.log('AudioPlayer: Audio can play through without buffering');
      });

      // Add loadeddata event for debugging
      audioRef.current.addEventListener('loadeddata', () => {
        console.log('AudioPlayer: Audio data is loaded');
      });
    }
    
    // Setup audio context for better browser compatibility
    try {
      if (!audioContextRef.current) {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContext) {
          audioContextRef.current = new AudioContext();
        }
      }
      
      // Update source and connect to context
      if (audioUrl && audioRef.current && audioContextRef.current) {
        // Disconnect any existing source node
        if (sourceNodeRef.current) {
          sourceNodeRef.current.disconnect();
        }
        
        // Set the source of the audio element
        audioRef.current.src = audioUrl;
        
        // Create a new source node from the audio element
        sourceNodeRef.current = audioContextRef.current.createMediaElementSource(audioRef.current);
        sourceNodeRef.current.connect(audioContextRef.current.destination);
        
        // Resume audio context if suspended
        if (audioContextRef.current.state === 'suspended') {
          audioContextRef.current.resume();
        }
        
        // Auto-play if specified
        if (autoPlay) {
          playAudio();
        }
      }
    } catch (error) {
      console.warn('Advanced audio context setup failed, using basic audio playback', error);
      
      // Fallback to basic audio element
      if (audioUrl && audioRef.current) {
        audioRef.current.src = audioUrl;
        if (autoPlay) {
          playAudio();
        }
      }
    }
    
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, [audioUrl, autoPlay, onPlayStateChange]);
  
  const playAudio = () => {
    if (!audioRef.current || !audioUrl) return;
    
    const playPromise = audioRef.current.play();
    if (playPromise !== undefined) {
      playPromise.catch(error => {
        console.error('Error playing audio:', error);
        
        // Try playing on next user interaction
        const handleUserInteraction = () => {
          if (audioRef.current) {
            audioRef.current.play().catch(e => console.error('Play attempt failed again:', e));
          }
          document.removeEventListener('click', handleUserInteraction);
        };
        
        document.addEventListener('click', handleUserInteraction, { once: true });
      });
    }
  };
  
  const pauseAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
  };
  
  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !audioRef.current.muted;
      setIsMuted(!isMuted);
    }
  };
  
  const togglePlayback = () => {
    if (isPlaying) {
      pauseAudio();
    } else {
      playAudio();
    }
  };
  
  return (
    <div className={`flex items-center ${className}`}>
      <Button
        variant="ghost" 
        size="sm"
        onClick={toggleMute}
        className="p-1 h-6 w-6"
      >
        {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
      </Button>
    </div>
  );
}