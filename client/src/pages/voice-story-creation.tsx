import React, { useState } from 'react';
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

const VoiceStoryCreationPage: React.FC = () => {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [worldData, setWorldData] = useState<Partial<WorldData> | undefined>(undefined);
  const [characters, setCharacters] = useState<CharacterData[]>([]);
  const [storyStarted, setStoryStarted] = useState(false);
  
  // Handle world creation from voice guidance
  const handleWorldCreated = (world: WorldData) => {
    setWorldData(world);
    
    toast({
      title: 'World Created',
      description: `The world of ${world.name} is ready for your story.`,
    });
  };
  
  // Handle character creation from voice guidance
  const handleCharacterCreated = (character: CharacterData) => {
    // Add unique ID if not present
    if (!character.id) {
      character.id = Date.now();
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
    
    toast({
      title: 'Character Created',
      description: `${character.name} has been added to your story.`,
    });
  };
  
  // Start the story experience when ready
  const handleStoryReady = (world: WorldData, storyCharacters: CharacterData[]) => {
    // Make sure we have the world
    setWorldData(world);
    
    // Ensure all characters are in the state
    storyCharacters.forEach(char => {
      handleCharacterCreated(char);
    });
    
    // Begin the story
    setStoryStarted(true);
    
    toast({
      title: 'Story Ready',
      description: 'Your interactive story is ready to begin!',
    });
  };
  
  // Handle saving the story
  const handleSaveStory = () => {
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
  
  // State to track completed stages
  const [stageStatus, setStageStatus] = useState({
    genre: { isComplete: false, details: undefined },
    world: { isComplete: false, details: worldData },
    characters: { isComplete: false, details: characters.length > 0 ? characters : undefined },
    influences: { isComplete: false, items: [] },
    details: { isComplete: false }
  });
  
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
              onWorldCreated={(world) => {
                handleWorldCreated(world);
                setStageStatus(prev => ({
                  ...prev,
                  world: { isComplete: true, details: world }
                }));
              }}
              onCharacterCreated={(character) => {
                handleCharacterCreated(character);
                setStageStatus(prev => ({
                  ...prev,
                  characters: { 
                    isComplete: true, 
                    details: [...characters, character] 
                  }
                }));
              }}
              onStoryReady={(world, chars) => {
                handleStoryReady(world, chars);
                setStageStatus(prev => ({
                  ...prev,
                  genre: { isComplete: true, details: undefined },
                  world: { isComplete: true, details: world },
                  characters: { isComplete: true, details: chars },
                  details: { isComplete: true }
                }));
              }}
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