import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { WorldData } from '@/components/world/WorldDesigner';
import { CharacterData } from '@/components/character/CharacterBuilder';
import StoryExperience from '@/components/story/StoryExperience';
import { VoiceGuidedCreation } from '@/components/creation/VoiceGuidedCreation';
import { useToast } from '@/hooks/use-toast';
import { StageSidebar } from '@/components/creation/StageSidebar';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';

const VoiceStoryCreationPage: React.FC = () => {
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const [worldData, setWorldData] = useState<Partial<WorldData> | undefined>(undefined);
  const [characters, setCharacters] = useState<CharacterData[]>([]);
  const [storyStarted, setStoryStarted] = useState(false);
  
  // Get storyId from URL params
  const params = new URLSearchParams(window.location.search);
  const storyId = params.get('storyId');
  
  console.log('Voice story creation - storyId:', storyId, 'type:', typeof storyId);
  
  // Redirect to dashboard only if explicitly missing storyId
  useEffect(() => {
    // Only redirect if storyId is explicitly null
    if (storyId === null) {
      console.log('No story ID provided (null), redirecting to dashboard');
      toast({
        title: 'Missing parameters',
        description: 'No story ID was provided. Redirecting to dashboard.',
      });
      navigate('/dashboard');
    } else {
      console.log('Voice story creation - using storyId:', storyId);
    }
  }, [storyId, navigate, toast]);
  
  // Define the story data interface
  interface StoryData {
    id: number;
    title: string;
    genre?: string;
    theme?: string;
    setting?: string;
    worldData?: string; // JSON string of WorldData
    characters?: string; // JSON string of CharacterData[]
    creationProgress?: string; // JSON string of creation progress
    status?: string;
    userId: number;
    createdAt?: string;
    updatedAt?: string;
  }
  
  // Fetch story data if we have an ID
  const { data: storyData, isLoading } = useQuery<StoryData>({
    queryKey: [storyId ? `/api/stories/${storyId}` : null],
    enabled: !!storyId,
  });
  
  // Update story mutation
  const updateStoryMutation = useMutation({
    mutationFn: async (updateData: any) => {
      if (!storyId) throw new Error('No story ID to update');
      
      const response = await apiRequest('PUT', `/api/stories/${storyId}`, updateData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/stories/${storyId}`] });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to save story progress',
        description: error.message || 'An error occurred',
        variant: 'destructive',
      });
    },
  });
  
  // Load story data when available
  useEffect(() => {
    if (storyData) {
      // Initialize state from saved story data
      if (storyData.worldData) {
        try {
          setWorldData(JSON.parse(storyData.worldData));
        } catch (e) {
          console.error('Error parsing world data', e);
        }
      }
      
      if (storyData.characters) {
        try {
          setCharacters(JSON.parse(storyData.characters));
        } catch (e) {
          console.error('Error parsing characters data', e);
        }
      }
      
      // If we have saved stage data
      if (storyData.creationProgress) {
        try {
          const progress = JSON.parse(storyData.creationProgress);
          setCurrentStage(progress.currentStage || 'genre');
          setStageStatus(progress.stageStatus || {
            genre: { isComplete: false, details: undefined },
            world: { isComplete: false, details: undefined },
            characters: { isComplete: false, details: undefined },
            influences: { isComplete: false, items: [] },
            details: { isComplete: false }
          });
        } catch (e) {
          console.error('Error parsing creation progress data', e);
        }
      }
    }
  }, [storyData]);
  
  // Handle world creation from voice guidance
  const handleWorldCreated = (world: WorldData, worldConversation?: any) => {
    setWorldData(world);
    
    // Update stage status to include conversation state
    setStageStatus(prev => ({
      ...prev,
      world: { 
        isComplete: true, 
        details: world,
        worldConversation: worldConversation || prev.world.worldConversation
      }
    }));
    
    // Save to database if we have a story ID
    if (storyId) {
      updateStoryMutation.mutate({
        worldData: JSON.stringify(world)
      });
    }
    
    toast({
      title: 'World Created',
      description: `The world of ${world.name} is ready for your story.`,
    });
  };
  
  // Handle character creation from voice guidance
  const handleCharacterCreated = (character: CharacterData, characterConversation?: any) => {
    // Add unique ID if not present
    if (!character.id) {
      character.id = Date.now();
    }
    
    // Save character to both tables if we have a foundation ID
    const foundationId = parseInt(params.get('foundationId') || '0');
    if (foundationId > 0) {
      // Use our combined character creation endpoint
      apiRequest('POST', '/api/character-creation/combined', {
        name: character.name,
        role: character.role || 'Supporting Character',
        foundationId: foundationId,
        appearance: character.appearance,
        background: character.background,
        personality: character.personality,
        goals: character.goals,
        fears: character.fears,
        relationships: character.relationships,
        skills: character.skills,
        voice: character.voice,
        secrets: character.secrets,
        quirks: character.quirks,
        motivations: character.motivations,
        flaws: character.flaws,
        evolutionStage: 1,
        significantEvents: []
      }).then(response => {
        console.log('Character saved to database with combined approach');
      }).catch(error => {
        console.error('Error saving character to database:', error);
      });
    }
    
    setCharacters(prev => {
      // Check if this character already exists (by name)
      const existing = prev.findIndex(c => c.name === character.name);
      if (existing >= 0) {
        // Replace existing character
        const updated = [...prev];
        updated[existing] = character;
        return updated;
      }
      // Add new character
      return [...prev, character];
    });
    
    // Update stage status to include conversation state
    setStageStatus(prev => {
      // Get the current character list from the stage status or use an empty array
      const currentCharacters = prev.characters.details || [];
      
      // Check if this character already exists in the stage status
      let existingIndex = -1;
      if (Array.isArray(currentCharacters)) {
        existingIndex = currentCharacters.findIndex((c: CharacterData) => c.name === character.name);
      }
      
      let updatedCharacters;
      if (existingIndex >= 0) {
        // Replace existing character
        updatedCharacters = [...currentCharacters];
        updatedCharacters[existingIndex] = character;
      } else {
        // Add new character
        updatedCharacters = [...currentCharacters, character];
      }
      
      return {
        ...prev,
        characters: {
          isComplete: true,
          details: updatedCharacters,
          characterConversation: characterConversation || prev.characters.characterConversation
        }
      };
    });
    
    // Save updated characters list to database
    if (storyId) {
      const updatedCharacters = characters.some(c => c.name === character.name) 
        ? characters.map(c => c.name === character.name ? character : c)
        : [...characters, character];
        
      updateStoryMutation.mutate({
        characters: JSON.stringify(updatedCharacters)
      });
    }
    
    toast({
      title: 'Character Created',
      description: `${character.name} has been added to your story.`,
    });
  };
  
  // Start the story experience when ready
  const handleStoryReady = (
    world: WorldData, 
    storyCharacters: CharacterData[],
    genreConversation?: any,
    worldConversation?: any,
    characterConversation?: any
  ) => {
    // Make sure we have the world
    setWorldData(world);
    
    // Ensure all characters are in the state
    storyCharacters.forEach(char => {
      handleCharacterCreated(char);
    });
    
    // Update stage status to include conversation states
    setStageStatus(prev => ({
      ...prev,
      genre: {
        ...prev.genre,
        isComplete: true,
        genreConversation: genreConversation || prev.genre.genreConversation
      },
      world: {
        ...prev.world,
        isComplete: true,
        details: world,
        worldConversation: worldConversation || prev.world.worldConversation
      },
      characters: {
        ...prev.characters,
        isComplete: true,
        details: storyCharacters,
        characterConversation: characterConversation || prev.characters.characterConversation
      },
      details: { isComplete: true }
    }));
    
    // Begin the story
    setStoryStarted(true);
    
    // Save story progress
    if (storyId) {
      updateStoryMutation.mutate({
        status: 'ready',
        worldData: JSON.stringify(world),
        characters: JSON.stringify(storyCharacters)
      });
    }
    
    toast({
      title: 'Story Ready',
      description: 'Your interactive story is ready to begin!',
    });
  };
  
  // Create progress object with conversation states
  const createProgressObject = () => {
    return {
      currentStage,
      stageStatus
      // Additional conversation states would be added here via callbacks 
      // from the VoiceGuidedCreation component in a full implementation
    };
  };
  
  // Handle saving the story
  const handleSaveStory = () => {
    if (storyId) {
      // Save current progress to database
      updateStoryMutation.mutate({
        worldData: worldData ? JSON.stringify(worldData) : null,
        characters: characters.length > 0 ? JSON.stringify(characters) : null,
        creationProgress: JSON.stringify(createProgressObject())
      });
    }
    
    toast({
      title: 'Story Bookmarked',
      description: 'Your current progress has been saved.',
    });
  };
  
  // Reset the story creation process
  const resetStory = () => {
    setStoryStarted(false);
  };
  
  // State to track current creation stage
  const [currentStage, setCurrentStage] = useState<'genre' | 'world' | 'characters' | 'influences' | 'details' | 'ready'>('genre');
  
  // Define interface for stage status to include conversation state
  interface StageStatus {
    genre: { 
      isComplete: boolean; 
      details?: any; 
      genreConversation?: {
        messages: { role: 'user' | 'assistant', content: string }[];
        isComplete: boolean;
        summary?: any;
        threadId?: string;
      };
    };
    world: { 
      isComplete: boolean; 
      details?: Partial<WorldData>;
      worldConversation?: {
        messages: { role: 'user' | 'assistant', content: string }[];
        isComplete: boolean;
        summary?: Partial<WorldData>;
        threadId?: string;
      }; 
    };
    characters: { 
      isComplete: boolean; 
      details?: CharacterData[]; 
      characterConversation?: {
        messages: { role: 'user' | 'assistant', content: string }[];
        isComplete: boolean;
        summary?: Partial<CharacterData>;
        threadId?: string;
      };
    };
    influences: { isComplete: boolean; items: string[] };
    details: { isComplete: boolean };
  }
  
  // State to track completed stages
  const [stageStatus, setStageStatus] = useState<StageStatus>({
    genre: { isComplete: false, details: undefined },
    world: { isComplete: false, details: worldData },
    characters: { isComplete: false, details: characters.length > 0 ? characters : undefined },
    influences: { isComplete: false, items: [] },
    details: { isComplete: false }
  });
  
  // Save progress whenever stage status changes
  useEffect(() => {
    if (storyId && !isLoading) {
      updateStoryMutation.mutate({
        creationProgress: JSON.stringify(createProgressObject())
      });
    }
  }, [currentStage, stageStatus, storyId, isLoading]);
  
  // Handle stage selection
  const handleStageSelect = (stage: 'genre' | 'world' | 'characters' | 'influences' | 'details' | 'ready') => {
    if (stage === 'genre' && stageStatus.genre.isComplete) {
      navigate('/genre-details');
      return;
    } 
    
    if (stage === 'world' && stageStatus.world.isComplete) {
      navigate('/world-details');
      return;
    }
    
    if (stage === 'characters' && stageStatus.characters.isComplete) {
      navigate('/character-details');
      return;
    }
    
    if (stage === 'ready' && stageStatus.genre.isComplete && stageStatus.world.isComplete && stageStatus.characters.isComplete) {
      setStoryStarted(true);
      return;
    }
    
    setCurrentStage(stage);
  };

  return (
    <div className="h-[calc(100vh-4rem)] bg-neutral-50 flex flex-col">
      {!storyStarted ? (
        <div className="flex h-full">
          {/* Only show StageSidebar in the non-story experience mode */}
          <StageSidebar 
            stages={stageStatus}
            onStageSelect={handleStageSelect}
            currentStage={currentStage}
          />
          
          <div className="flex-1">
            <VoiceGuidedCreation
              onWorldCreated={(world, worldConversation) => {
                handleWorldCreated(world, worldConversation);
              }}
              onCharacterCreated={(character, characterConversation) => {
                handleCharacterCreated(character, characterConversation);
              }}
              onStoryReady={(world, chars, genreConversation, worldConversation, characterConversation) => {
                handleStoryReady(world, chars, genreConversation, worldConversation, characterConversation);
              }}
              initialStage={storyData?.creationProgress ? JSON.parse(storyData.creationProgress).currentStage : undefined}
              initialGenreConversation={storyData?.creationProgress ? 
                (JSON.parse(storyData.creationProgress).genreConversation || undefined) : undefined}
              initialWorldConversation={storyData?.creationProgress ? 
                (JSON.parse(storyData.creationProgress).worldConversation || undefined) : undefined}
              initialCharacterConversation={storyData?.creationProgress ? 
                (JSON.parse(storyData.creationProgress).characterConversation || undefined) : undefined}
            />
          </div>
        </div>
      ) : (
        <div className="container mx-auto px-4 py-8 flex-grow">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-bold text-primary">
              {worldData?.name}: An Interactive Story
            </h1>
            <Button variant="outline" onClick={resetStory}>
              Return to Creation
            </Button>
          </div>
          
          <div className="h-[80vh] border rounded-lg overflow-hidden bg-white shadow-sm">
            {worldData && characters.length > 0 ? (
              <StoryExperience 
                world={worldData as WorldData} 
                characters={characters}
                onSaveStory={handleSaveStory}
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <p className="text-lg text-muted-foreground">
                  Loading story experience...
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default VoiceStoryCreationPage;