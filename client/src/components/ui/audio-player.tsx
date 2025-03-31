import React, { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX, PlayCircle, PauseCircle, FastForward } from 'lucide-react';
import { Button } from './button';
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

  // Min and max playback speed values
  const MIN_SPEED = 0.5;
  const MAX_SPEED = 2.0;
  const SPEED_STEP = 0.1;

  useEffect(() => {
    // Always create a fresh audio element when the URL changes to prevent echo
    console.log('AudioPlayer: Creating new audio element for URL change');
    
    // Always stop any existing audio first
    if (audioRef.current) {
      // Pause the audio
      console.log('AudioPlayer: Stopping previous audio playback');
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      
      // Try to remove the source attribute to ensure complete cleanup
      try {
        audioRef.current.removeAttribute('src');
      } catch (e) {
        console.log('AudioPlayer: Could not remove src attribute');
      }
      
      // Remove event listeners to prevent memory leaks
      audioRef.current.onplay = null;
      audioRef.current.onended = null;
      audioRef.current.onpause = null;
      audioRef.current.onerror = null;
      audioRef.current.oncanplaythrough = null;
      audioRef.current.onloadeddata = null;
      
      // Set to null to ensure garbage collection
      audioRef.current = null;
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
        console.log('AudioPlayer: Cleaning up audio element on unmount');
        newAudio.pause();
        
        // Reset to beginning
        newAudio.currentTime = 0;
        
        // Remove source
        try {
          newAudio.src = '';
          newAudio.removeAttribute('src');
        } catch (e) {
          console.log('AudioPlayer: Could not remove src on cleanup');
        }
        
        // Remove event listeners
        newAudio.onplay = null;
        newAudio.onended = null;
        newAudio.onpause = null;
        newAudio.onerror = null;
        newAudio.oncanplaythrough = null;
        newAudio.onloadeddata = null;
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
      console.log('AudioPlayer: Pausing audio completely');
      
      // Thoroughly stop the audio
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      
      // Try to remove the source to prevent any lingering audio
      try {
        audioRef.current.src = '';
        audioRef.current.removeAttribute('src');
      } catch (e) {
        console.log('AudioPlayer: Could not remove src on pause');
      }
      
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

  const handleSpeedChange = (value: number[]) => {
    if (value.length > 0) {
      // Round to 1 decimal place for cleaner display
      const newSpeed = Math.round(value[0] * 10) / 10;
      setPlaybackSpeed(newSpeed);
      onPlaybackSpeedChange?.(newSpeed);
    }
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
      
      {/* Playback Speed Slider */}
      <div className="flex items-center ml-2 space-x-2">
        <FastForward size={14} className="text-muted-foreground" />
        <Slider
          value={[playbackSpeed]}
          min={MIN_SPEED}
          max={MAX_SPEED}
          step={SPEED_STEP}
          onValueChange={handleSpeedChange}
          className="w-24"
        />
        <span className="text-xs font-medium w-10 text-center">
          {playbackSpeed.toFixed(1)}x
        </span>
      </div>
    </div>
  );
}