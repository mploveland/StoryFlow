import React, { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX, PlayCircle, PauseCircle, FastForward } from 'lucide-react';
import { Button } from './button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';
import { Slider } from './slider';

interface AudioPlayerProps {
  audioUrl: string | null;
  autoPlay?: boolean;
  onPlayStateChange?: (isPlaying: boolean) => void;
  className?: string;
  playbackSpeed?: number;
  onPlaybackSpeedChange?: (speed: number) => void;
}

/**
 * A component that handles audio playback with better browser compatibility
 */
export function AudioPlayer({ 
  audioUrl, 
  autoPlay = false,
  onPlayStateChange,
  onPlaybackSpeedChange,
  className = '',
  playbackSpeed: externalPlaybackSpeed
}: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(externalPlaybackSpeed || 1.0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);

  // The available speed options
  const speedOptions = [0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0];

  useEffect(() => {
    // Create audio element if it doesn't exist
    if (!audioRef.current) {
      console.log('AudioPlayer: Creating new audio element');
      audioRef.current = new Audio();
      
      // Set initial playback speed
      audioRef.current.playbackRate = playbackSpeed;
      
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
  
  // Update internal playback speed when external prop changes
  useEffect(() => {
    if (externalPlaybackSpeed && externalPlaybackSpeed !== playbackSpeed) {
      setPlaybackSpeed(externalPlaybackSpeed);
    }
  }, [externalPlaybackSpeed]);

  // Update playback speed when it changes
  useEffect(() => {
    if (audioRef.current) {
      console.log(`AudioPlayer: Setting playback speed to ${playbackSpeed}x`);
      audioRef.current.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed]);
  
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

  const handleSpeedChange = (value: string) => {
    const newSpeed = parseFloat(value);
    setPlaybackSpeed(newSpeed);
    onPlaybackSpeedChange?.(newSpeed);
  };
  
  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {/* Play/Pause Button */}
      <Button
        variant="ghost" 
        size="sm"
        onClick={togglePlayback}
        className="p-1 h-8 w-8"
      >
        {isPlaying ? 
          <PauseCircle size={16} /> : 
          <PlayCircle size={16} />
        }
      </Button>
      
      {/* Mute Button */}
      <Button
        variant="ghost" 
        size="sm"
        onClick={toggleMute}
        className="p-1 h-8 w-8"
      >
        {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
      </Button>
      
      {/* Playback Speed Selector */}
      <div className="flex items-center ml-2">
        <FastForward size={14} className="mr-1 text-muted-foreground" />
        <Select 
          value={playbackSpeed.toString()} 
          onValueChange={handleSpeedChange}
        >
          <SelectTrigger className="h-7 w-16 text-xs">
            <SelectValue placeholder={`${playbackSpeed}x`} />
          </SelectTrigger>
          <SelectContent>
            {speedOptions.map(speed => (
              <SelectItem key={speed} value={speed.toString()} className="text-xs">
                {speed}x
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}