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
  const [volume, setVolume] = useState(1.0); // Default to maximum volume
  const [playbackSpeed, setPlaybackSpeed] = useState(externalPlaybackSpeed || 1.0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);

  // The available speed options
  const speedOptions = [0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0];

  useEffect(() => {
    // Always create a fresh audio element when the URL changes to prevent echo
    console.log('AudioPlayer: Creating new audio element for URL change');
    
    // Always stop any existing audio first
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      
      // Remove event listeners to prevent memory leaks
      audioRef.current.onplay = null;
      audioRef.current.onended = null;
      audioRef.current.onpause = null;
      audioRef.current.onerror = null;
      audioRef.current.oncanplaythrough = null;
      audioRef.current.onloadeddata = null;
    }
    
    // Create a completely new audio element
    const newAudio = new Audio();
    
    // Set volume from state
    newAudio.volume = volume;
    
    // Make sure audio is not muted
    newAudio.muted = false;
    
    // Set initial playback speed
    newAudio.playbackRate = playbackSpeed;
    
    // Add event listeners to the new element
    newAudio.onplay = () => {
      console.log('AudioPlayer: Audio started playing');
      setIsPlaying(true);
      onPlayStateChange?.(true);
    };
    
    newAudio.onended = () => {
      console.log('AudioPlayer: Audio playback ended');
      setIsPlaying(false);
      onPlayStateChange?.(false);
    };
    
    newAudio.onpause = () => {
      console.log('AudioPlayer: Audio paused');
      setIsPlaying(false);
      onPlayStateChange?.(false);
    };
    
    newAudio.onerror = (e) => {
      console.error('AudioPlayer: Audio error:', e);
      console.error('AudioPlayer: Error code:', newAudio.error?.code);
      console.error('AudioPlayer: Error message:', newAudio.error?.message);
      setIsPlaying(false);
      onPlayStateChange?.(false);
    };

    // Add canplaythrough event for debugging
    newAudio.oncanplaythrough = () => {
      console.log('AudioPlayer: Audio can play through without buffering');
    };

    // Add loadeddata event for debugging
    newAudio.onloadeddata = () => {
      console.log('AudioPlayer: Audio data is loaded');
    };
    
    // Set the new audio reference
    audioRef.current = newAudio;
    
    // If we have a URL, set it and potentially play
    if (audioUrl) {
      // Set the source on the fresh audio element
      newAudio.src = audioUrl;
      
      // Auto-play if specified
      if (autoPlay) {
        console.log('AudioPlayer: Auto-playing new audio');
        const playPromise = newAudio.play();
        if (playPromise !== undefined) {
          playPromise.catch(error => {
            console.error('Error auto-playing audio:', error);
          });
        }
      }
    }
    
    return () => {
      // Clean up on unmount or URL change
      if (newAudio) {
        console.log('AudioPlayer: Cleaning up audio element');
        newAudio.pause();
        newAudio.src = '';
      }
    };
  }, [audioUrl, autoPlay, onPlayStateChange, playbackSpeed, volume]);
  
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
  
  // Update volume when it changes
  useEffect(() => {
    if (audioRef.current) {
      console.log(`AudioPlayer: Setting volume to ${volume}`);
      audioRef.current.volume = volume;
    }
  }, [volume]);
  
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
      // Thoroughly stop the audio
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      
      // Make sure the UI reflects the stopped state
      setIsPlaying(false);
      onPlayStateChange?.(false);
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
  
  const handleVolumeChange = (value: number[]) => {
    if (value.length > 0) {
      const newVolume = value[0];
      setVolume(newVolume);
      
      if (audioRef.current) {
        audioRef.current.volume = newVolume;
        
        // If volume is changed from zero, unmute
        if (newVolume > 0 && isMuted) {
          audioRef.current.muted = false;
          setIsMuted(false);
        }
        
        // If volume is set to zero, mute
        if (newVolume === 0 && !isMuted) {
          audioRef.current.muted = true;
          setIsMuted(true);
        }
      }
    }
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
      
      {/* Volume Control */}
      <div className="flex items-center space-x-1">
        <Button
          variant="ghost" 
          size="sm"
          onClick={toggleMute}
          className="p-1 h-8 w-8"
        >
          {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </Button>
        <Slider
          value={[isMuted ? 0 : volume]}
          min={0}
          max={1}
          step={0.1}
          onValueChange={handleVolumeChange}
          className="w-16"
        />
      </div>
      
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