import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { WorldData } from '@/components/world/WorldDesigner';
import { CharacterData } from '@/components/character/CharacterBuilder';
import StoryExperience from '@/components/story/StoryExperience';
import VoiceGuidedCreation from '@/components/creation/VoiceGuidedCreation';
import { useToast } from '@/hooks/use-toast';

const VoiceStoryCreationPage: React.FC = () => {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [worldData, setWorldData] = useState<WorldData | null>(null);
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
    if (!worldData) {
      setWorldData(world);
    }
    
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
  
  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      <div className="container mx-auto px-4 py-8 flex-grow">
        {!storyStarted ? (
          <VoiceGuidedCreation
            onWorldCreated={handleWorldCreated}
            onCharacterCreated={handleCharacterCreated}
            onStoryReady={handleStoryReady}
          />
        ) : (
          <>
            <div className="flex justify-between items-center mb-4">
              <h1 className="text-2xl font-bold text-primary">
                {worldData?.name}: An Interactive Story
              </h1>
              <Button variant="outline" onClick={resetStory}>
                Return to Creation
              </Button>
            </div>
            
            <div className="h-[80vh] border rounded-lg overflow-hidden bg-white shadow-sm">
              <StoryExperience 
                world={worldData as WorldData} 
                characters={characters}
                onSaveStory={handleSaveStory}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default VoiceStoryCreationPage;