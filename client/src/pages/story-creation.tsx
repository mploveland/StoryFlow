import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import WorldDesigner, { WorldData } from '@/components/world/WorldDesigner';
import CharacterBuilder, { CharacterData } from '@/components/character/CharacterBuilder';
import StoryExperience from '@/components/story/StoryExperience';
import InspirationGatherer, { InspirationData } from '@/components/inspiration/InspirationGatherer';
import WorldBuilder from '@/components/inspiration/WorldBuilder';
import CharacterImporter from '@/components/inspiration/CharacterImporter';
import { useToast } from '@/hooks/use-toast';

type CreationStep = 'inspiration' | 'world' | 'characters' | 'story';

const StoryCreationPage: React.FC = () => {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [creationStep, setCreationStep] = useState<CreationStep>('inspiration');
  const [inspirationData, setInspirationData] = useState<InspirationData | null>(null);
  const [worldData, setWorldData] = useState<WorldData | null>(null);
  const [characters, setCharacters] = useState<CharacterData[]>([]);
  const [activeTab, setActiveTab] = useState<string>('inspiration');
  
  const handleWorldCreated = (world: WorldData) => {
    setWorldData(world);
    setCreationStep('characters');
    setActiveTab('characters');
    
    toast({
      title: 'World Created',
      description: `The world of ${world.name} is ready for your story.`,
    });
  };
  
  const handleCharacterCreated = (character: CharacterData) => {
    // Add unique ID if not present
    if (!character.id) {
      character.id = Date.now();
    }
    
    setCharacters(prev => [...prev, character]);
    
    toast({
      title: 'Character Created',
      description: `${character.name} has been added to your story.`,
    });
    
    // If at least one character has been created, enable story step
    if (characters.length === 0) {
      toast({
        title: 'First Character Created',
        description: 'You can now begin your interactive story, or create more characters.',
        action: (
          <Button 
            onClick={() => {
              setCreationStep('story');
              setActiveTab('story');
            }}
            variant="outline"
            size="sm"
          >
            Begin Story
          </Button>
        ),
      });
    }
  };
  
  const handleStoryCreationComplete = () => {
    toast({
      title: 'Story Saved',
      description: 'Your interactive story has been saved.',
    });
    
    // In a real app, we'd save the story data to a server
    navigate('/dashboard');
  };
  
  const handleSaveStory = () => {
    toast({
      title: 'Story Bookmarked',
      description: 'Your current progress has been saved.',
    });
  };
  
  // Handle inspiration data
  const handleInspirationComplete = (data: InspirationData) => {
    setInspirationData(data);
    setCreationStep('world');
    setActiveTab('world');
    
    toast({
      title: 'Inspiration Gathered',
      description: 'Your inspiration has been collected and analyzed. Now create your world.',
    });
  };
  
  // Handle world building from inspiration
  const handleWorldComplete = (world: WorldData) => {
    setWorldData(world);
    setCreationStep('characters');
    setActiveTab('characters');
    
    toast({
      title: 'World Created',
      description: `The world of ${world.name} is ready for your story.`,
    });
  };
  
  // Handle character importing from inspiration
  const handleCharactersImported = (importedCharacters: CharacterData[]) => {
    const charactersWithIds = importedCharacters.map(character => ({
      ...character,
      id: character.id || Date.now() + Math.floor(Math.random() * 1000)
    }));
    
    setCharacters(prev => [...prev, ...charactersWithIds]);
    setCreationStep('story');
    setActiveTab('story');
    
    toast({
      title: 'Characters Imported',
      description: `Successfully imported ${charactersWithIds.length} characters for your story.`,
    });
  };
  
  // Use standard components without inspiration
  const handleUseCustomWorld = () => {
    setActiveTab('world');
    setCreationStep('world');
  };
  
  const handleUseCustomCharacter = () => {
    if (!worldData) {
      toast({
        title: 'World Required',
        description: 'Please create a world first before creating characters.',
        variant: 'destructive'
      });
      return;
    }
    
    setActiveTab('characters');
    setCreationStep('characters');
  };
  
  // Prevent users from moving forward without completing necessary steps
  const canAccessWorld = true; // Anyone can access world creation
  const canAccessCharacters = !!worldData;
  const canAccessStory = !!worldData && characters.length > 0;
  
  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      <div className="container mx-auto px-4 py-8 flex-grow">
        <Tabs 
          value={activeTab} 
          onValueChange={setActiveTab}
          className="space-y-8"
        >
          <div className="flex justify-center">
            <TabsList className="grid grid-cols-4 w-full max-w-3xl">
              <TabsTrigger value="inspiration">
                1. Inspiration
              </TabsTrigger>
              <TabsTrigger value="world" disabled={creationStep === 'inspiration'}>
                2. World Design
              </TabsTrigger>
              <TabsTrigger value="characters" disabled={!canAccessCharacters}>
                3. Characters
              </TabsTrigger>
              <TabsTrigger value="story" disabled={!canAccessStory}>
                4. Story
              </TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="inspiration" className="pt-4">
            <InspirationGatherer onInspirationComplete={handleInspirationComplete} />
          </TabsContent>
          
          <TabsContent value="world" className="pt-4">
            {inspirationData ? (
              <WorldBuilder 
                inspirationData={inspirationData} 
                onWorldComplete={handleWorldComplete} 
                onCustomWorld={handleUseCustomWorld} 
              />
            ) : (
              <WorldDesigner onWorldCreated={handleWorldCreated} />
            )}
          </TabsContent>
          
          <TabsContent value="characters" className="pt-4">
            {worldData ? (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-2xl font-bold">Characters for {worldData.name}</h2>
                    <p className="text-neutral-500">
                      Create characters to populate your world. You need at least one character to begin your story.
                    </p>
                  </div>
                  
                  {characters.length > 0 && (
                    <Button
                      onClick={() => {
                        setCreationStep('story');
                        setActiveTab('story');
                      }}
                    >
                      Begin Story
                    </Button>
                  )}
                </div>
                
                {characters.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                    {characters.map(character => (
                      <Card key={character.id} className="p-4">
                        <h3 className="text-xl font-semibold">{character.name}</h3>
                        <p className="text-sm text-neutral-600">{character.role}</p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {character.personality.slice(0, 3).map((trait, i) => (
                            <span key={i} className="text-xs bg-neutral-100 px-2 py-1 rounded-full">
                              {trait}
                            </span>
                          ))}
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
                
                <CharacterBuilder worldData={worldData} onCharacterCreated={handleCharacterCreated} />
              </div>
            ) : (
              <div className="text-center py-12">
                <p>Please create a world first.</p>
                <Button 
                  onClick={() => setActiveTab('world')} 
                  variant="outline" 
                  className="mt-4"
                >
                  Go to World Designer
                </Button>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="story" className="pt-4">
            {canAccessStory ? (
              <div className="h-[80vh] border rounded-lg overflow-hidden bg-white shadow-sm">
                <StoryExperience 
                  world={worldData as WorldData} 
                  characters={characters}
                  onSaveStory={handleSaveStory}
                />
              </div>
            ) : (
              <div className="text-center py-12">
                <p>Please create a world and at least one character first.</p>
                <Button 
                  onClick={() => setActiveTab(worldData ? 'characters' : 'world')} 
                  variant="outline" 
                  className="mt-4"
                >
                  Go to {worldData ? 'Character Creator' : 'World Designer'}
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default StoryCreationPage;