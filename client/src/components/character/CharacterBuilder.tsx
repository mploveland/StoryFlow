import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { User, Brain, BookOpen, Heart, Sparkles, Sword, Bookmark, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { WorldData } from '../world/WorldDesigner';

interface CharacterBuilderProps {
  worldData: WorldData;
  onCharacterCreated: (characterData: CharacterData) => void;
}

export interface CharacterData {
  id?: number;
  name: string;
  role: string;
  background: string;
  personality: string[];
  goals: string[];
  fears: string[];
  relationships: string[];
  skills: string[];
  appearance: string;
  voice: string;
  depth: number;
}

interface TraitSectionProps {
  title: string;
  items: string[];
  placeholder: string;
  icon: React.ReactNode;
  onAdd: (item: string) => void;
  onRemove: (index: number) => void;
}

const VOICE_TYPES = [
  { value: 'gentle', label: 'Gentle and Soft-Spoken' },
  { value: 'bold', label: 'Bold and Confident' },
  { value: 'mysterious', label: 'Mysterious and Cryptic' },
  { value: 'formal', label: 'Formal and Eloquent' },
  { value: 'casual', label: 'Casual and Relaxed' },
  { value: 'intellectual', label: 'Intellectual and Analytical' },
  { value: 'humorous', label: 'Humorous and Witty' },
  { value: 'poetic', label: 'Poetic and Artistic' },
  { value: 'aggressive', label: 'Aggressive and Imposing' },
  { value: 'childlike', label: 'Childlike and Innocent' },
];

const CharacterBuilder: React.FC<CharacterBuilderProps> = ({ worldData, onCharacterCreated }) => {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  const [character, setCharacter] = useState<Partial<CharacterData>>({
    name: '',
    role: '',
    background: '',
    personality: [],
    goals: [],
    fears: [],
    relationships: [],
    skills: [],
    appearance: '',
    voice: '',
    depth: 50,
  });
  
  const [newTrait, setNewTrait] = useState({
    personality: '',
    goals: '',
    fears: '',
    relationships: '',
    skills: '',
  });

  const handleInputChange = (field: keyof CharacterData, value: string | string[] | number) => {
    setCharacter(prev => ({ ...prev, [field]: value }));
  };

  const handleAddTrait = (field: keyof typeof newTrait, value: string) => {
    if (!value.trim()) return;
    
    setCharacter(prev => ({
      ...prev,
      [field]: [...(prev[field] as string[] || []), value.trim()],
    }));
    
    setNewTrait(prev => ({ ...prev, [field]: '' }));
  };

  const handleRemoveTrait = (field: keyof typeof newTrait, index: number) => {
    setCharacter(prev => ({
      ...prev,
      [field]: (prev[field] as string[] || []).filter((_, i) => i !== index),
    }));
  };

  const handleGenerateCharacter = async () => {
    // Validate required fields
    if (!character.name) {
      toast({
        title: 'Missing Information',
        description: 'Please provide at least a character name.',
        variant: 'destructive',
      });
      return;
    }

    setIsGenerating(true);

    try {
      // In a real implementation, this would call the OpenAI API to generate character details
      // For now, we'll simulate a response with a timeout
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Generate mock character details based on user input and world context
      const enhancedCharacter: CharacterData = {
        ...character as CharacterData,
        personality: character.personality?.length ? character.personality : 
          ['Determined', 'Resourceful', 'Compassionate'],
        goals: character.goals?.length ? character.goals : 
          ['Discover the truth about their past', 'Protect their loved ones'],
        fears: character.fears?.length ? character.fears : 
          ['Losing their identity', 'Failing those who depend on them'],
        relationships: character.relationships?.length ? character.relationships : 
          ['Mentor to a young protégé', 'Rivalry with a powerful figure'],
        skills: character.skills?.length ? character.skills : 
          ['Strategic thinking', 'Persuasive speaking'],
        background: character.background || `A character shaped by the ${worldData.setting} environment, with a complex history tied to the conflicts of this world.`,
        appearance: character.appearance || 'A distinctive appearance that reflects their role and personality.',
        voice: character.voice || 'casual'
      };

      toast({
        title: 'Character Created',
        description: `"${character.name}" has been generated successfully!`,
      });

      onCharacterCreated(enhancedCharacter);
    } catch (error) {
      console.error('Error generating character:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate character. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const TraitSection: React.FC<TraitSectionProps> = ({ 
    title, 
    items, 
    placeholder, 
    icon, 
    onAdd, 
    onRemove 
  }) => {
    const [inputValue, setInputValue] = useState('');
    
    return (
      <div className="space-y-3">
        <Label>{title}</Label>
        <div className="flex space-x-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={placeholder}
            className="flex-grow"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                onAdd(inputValue);
                setInputValue('');
              }
            }}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              onAdd(inputValue);
              setInputValue('');
            }}
          >
            Add
          </Button>
        </div>
        
        <div className="flex flex-wrap gap-2 mt-2">
          {items.map((item, index) => (
            <Badge 
              key={index} 
              variant="outline" 
              className="flex items-center gap-1 py-1.5 px-3"
            >
              {icon}
              <span>{item}</span>
              <XCircle
                className="h-4 w-4 ml-1 cursor-pointer hover:text-destructive"
                onClick={() => onRemove(index)}
              />
            </Badge>
          ))}
          {items.length === 0 && (
            <p className="text-sm text-neutral-500 italic">No {title.toLowerCase()} added yet</p>
          )}
        </div>
      </div>
    );
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Character Builder</CardTitle>
        <CardDescription>
          Create characters that will inhabit the world of {worldData.name}. Provide details or let the AI generate a deep character profile.
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid grid-cols-3">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="personality">Personality</TabsTrigger>
            <TabsTrigger value="details">Details</TabsTrigger>
          </TabsList>
          
          <TabsContent value="basic" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="character-name">Character Name</Label>
              <Input
                id="character-name"
                value={character.name || ''}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Enter character name"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="character-role">Role in Story</Label>
              <Input
                id="character-role"
                value={character.role || ''}
                onChange={(e) => handleInputChange('role', e.target.value)}
                placeholder="e.g., Protagonist, Villain, Mentor, etc."
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="character-background">Background</Label>
              <Textarea
                id="character-background"
                value={character.background || ''}
                onChange={(e) => handleInputChange('background', e.target.value)}
                placeholder="Describe the character's history and origin"
                rows={4}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="character-appearance">Physical Appearance</Label>
              <Textarea
                id="character-appearance"
                value={character.appearance || ''}
                onChange={(e) => handleInputChange('appearance', e.target.value)}
                placeholder="Describe how the character looks"
                rows={3}
              />
            </div>
          </TabsContent>
          
          <TabsContent value="personality" className="space-y-4">
            <TraitSection
              title="Personality Traits"
              items={character.personality || []}
              placeholder="e.g., Courageous, Thoughtful, Impulsive"
              icon={<Brain className="h-3.5 w-3.5" />}
              onAdd={(value) => handleAddTrait('personality', value)}
              onRemove={(index) => handleRemoveTrait('personality', index)}
            />
            
            <TraitSection
              title="Goals & Motivations"
              items={character.goals || []}
              placeholder="e.g., Find lost brother, Achieve redemption"
              icon={<Bookmark className="h-3.5 w-3.5" />}
              onAdd={(value) => handleAddTrait('goals', value)}
              onRemove={(index) => handleRemoveTrait('goals', index)}
            />
            
            <TraitSection
              title="Fears & Weaknesses"
              items={character.fears || []}
              placeholder="e.g., Fear of heights, Trust issues"
              icon={<Heart className="h-3.5 w-3.5" />}
              onAdd={(value) => handleAddTrait('fears', value)}
              onRemove={(index) => handleRemoveTrait('fears', index)}
            />
          </TabsContent>
          
          <TabsContent value="details" className="space-y-4">
            <TraitSection
              title="Key Relationships"
              items={character.relationships || []}
              placeholder="e.g., Sister of the king, Enemy of faction X"
              icon={<User className="h-3.5 w-3.5" />}
              onAdd={(value) => handleAddTrait('relationships', value)}
              onRemove={(index) => handleRemoveTrait('relationships', index)}
            />
            
            <TraitSection
              title="Skills & Abilities"
              items={character.skills || []}
              placeholder="e.g., Master swordsman, Expert diplomat"
              icon={<Sword className="h-3.5 w-3.5" />}
              onAdd={(value) => handleAddTrait('skills', value)}
              onRemove={(index) => handleRemoveTrait('skills', index)}
            />
            
            <div className="space-y-2">
              <Label htmlFor="character-voice">Character's Voice</Label>
              <Select 
                value={character.voice || ''} 
                onValueChange={(value) => handleInputChange('voice', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a voice style" />
                </SelectTrigger>
                <SelectContent>
                  {VOICE_TYPES.map((voice) => (
                    <SelectItem key={voice.value} value={voice.value}>
                      {voice.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-3 pt-4">
              <div className="flex justify-between">
                <Label>Character Depth</Label>
                <span className="text-sm text-neutral-500">
                  {character.depth === 0 ? 'Simple' : 
                   character.depth === 100 ? 'Complex' : 
                   `${character.depth}%`}
                </span>
              </div>
              <Slider
                value={[character.depth || 50]}
                min={0}
                max={100}
                step={10}
                onValueChange={(value) => handleInputChange('depth', value[0])}
              />
              <p className="text-sm text-neutral-500 italic mt-2">
                Higher depth creates more nuanced characters with complex motivations and consistent behaviors.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
      
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={() => setActiveTab(activeTab === 'basic' ? 'basic' : activeTab === 'personality' ? 'basic' : 'personality')}>
          {activeTab === 'basic' ? 'Cancel' : 'Back'}
        </Button>
        
        {activeTab === 'details' ? (
          <Button onClick={handleGenerateCharacter} disabled={isGenerating}>
            {isGenerating ? 'Generating...' : 'Generate Character'}
          </Button>
        ) : (
          <Button onClick={() => setActiveTab(activeTab === 'basic' ? 'personality' : 'details')}>
            Next
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};

export default CharacterBuilder;