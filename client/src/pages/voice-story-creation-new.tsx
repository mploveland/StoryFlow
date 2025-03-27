import React from 'react';
import { CharacterData } from '@/components/character/CharacterBuilder';
import { WorldData } from '@/components/world/WorldDesigner';
import { VoiceGuidedCreation } from '@/components/creation/VoiceGuidedCreation';
import { StageSidebar } from '@/components/creation/StageSidebar';

// This component will be a wrapper around VoiceGuidedCreation that includes the StageSidebar
export default function VoiceStoryCreationPage() {
  const [location, setLocation] = React.useState<string>('/voice-story-creation');

  const handleWorldCreated = (world: WorldData) => {
    console.log('World created:', world);
    setLocation('/story-experience');
  };

  const handleCharacterCreated = (character: CharacterData) => {
    console.log('Character created:', character);
  };

  const handleStoryReady = (world: WorldData, storyCharacters: CharacterData[]) => {
    console.log('Story ready!', { world, characters: storyCharacters });
    setLocation('/story-experience');
  };

  return (
    <div className="h-[calc(100vh-4rem)]">
      <VoiceGuidedCreation
        onWorldCreated={handleWorldCreated}
        onCharacterCreated={handleCharacterCreated}
        onStoryReady={handleStoryReady}
      />
    </div>
  );
}