import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Map, Globe, BookOpen, Clock, Mountain, Users, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface WorldDesignerProps {
  onWorldCreated: (worldData: WorldData) => void;
}

export interface WorldData {
  name: string;
  genre: string;
  setting: string;
  timeframe: string;
  regions: string[];
  keyConflicts: string[];
  importantFigures: string[];
  culturalSetting: string;
  technology: string;
  magicSystem?: string;
  politicalSystem: string;
  description: string;
  complexity: number;
}

const GENRES = [
  { value: 'fantasy', label: 'Fantasy' },
  { value: 'sci-fi', label: 'Science Fiction' },
  { value: 'historical', label: 'Historical Fiction' },
  { value: 'mystery', label: 'Mystery' },
  { value: 'cyberpunk', label: 'Cyberpunk' },
  { value: 'steampunk', label: 'Steampunk' },
  { value: 'post-apocalyptic', label: 'Post-Apocalyptic' },
  { value: 'urban-fantasy', label: 'Urban Fantasy' },
  { value: 'alternate-history', label: 'Alternate History' },
];

const HISTORICAL_PERIODS = [
  { value: 'ancient', label: 'Ancient (3000 BCE - 500 CE)' },
  { value: 'medieval', label: 'Medieval (500 - 1500 CE)' },
  { value: 'renaissance', label: 'Renaissance (14th - 17th Century)' },
  { value: 'industrial', label: 'Industrial Revolution (18th - 19th Century)' },
  { value: 'modern', label: 'Modern Era (20th Century)' },
  { value: 'contemporary', label: 'Contemporary (21st Century)' },
];

const WorldDesigner: React.FC<WorldDesignerProps> = ({ onWorldCreated }) => {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  const [worldData, setWorldData] = useState<Partial<WorldData>>({
    name: '',
    genre: '',
    setting: '',
    timeframe: '',
    regions: [],
    keyConflicts: [],
    importantFigures: [],
    culturalSetting: '',
    technology: '',
    politicalSystem: '',
    description: '',
    complexity: 50,
  });

  const handleInputChange = (field: keyof WorldData, value: string | string[] | number) => {
    setWorldData(prev => ({ ...prev, [field]: value }));
  };

  const handleGenerateWorld = async () => {
    // Validate required fields
    if (!worldData.name || !worldData.genre) {
      toast({
        title: 'Missing Information',
        description: 'Please provide at least a world name and genre.',
        variant: 'destructive',
      });
      return;
    }

    setIsGenerating(true);

    try {
      // In a real implementation, this would call the OpenAI API to generate world details
      // For now, we'll simulate a response with a timeout
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Generate mock world details based on user input
      const enhancedWorldData: WorldData = {
        ...worldData as WorldData,
        regions: worldData.regions || ['Generated Region 1', 'Generated Region 2'],
        keyConflicts: worldData.keyConflicts || ['Political power struggles', 'Resource scarcity'],
        importantFigures: worldData.importantFigures || ['Leader of the resistance', 'Corrupt official'],
        culturalSetting: worldData.culturalSetting || 'A rich cultural landscape with diverse customs and traditions.',
        technology: worldData.technology || 'Technology appropriate for the setting and time period.',
        description: worldData.description || 'An immersive world waiting to be explored.',
      };

      toast({
        title: 'World Created',
        description: `"${worldData.name}" has been generated successfully!`,
      });

      onWorldCreated(enhancedWorldData);
    } catch (error) {
      console.error('Error generating world:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate world. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAddElement = (field: 'regions' | 'keyConflicts' | 'importantFigures', value: string) => {
    if (!value.trim()) return;
    
    setWorldData(prev => ({
      ...prev,
      [field]: [...(prev[field] as string[] || []), value.trim()],
    }));
  };

  const handleRemoveElement = (field: 'regions' | 'keyConflicts' | 'importantFigures', index: number) => {
    setWorldData(prev => ({
      ...prev,
      [field]: (prev[field] as string[] || []).filter((_, i) => i !== index),
    }));
  };

  const renderElementList = (
    field: 'regions' | 'keyConflicts' | 'importantFigures',
    label: string,
    placeholder: string,
    icon: React.ReactNode
  ) => {
    const [newElement, setNewElement] = useState('');
    
    return (
      <div className="space-y-3">
        <Label>{label}</Label>
        <div className="flex space-x-2">
          <Input
            value={newElement}
            onChange={(e) => setNewElement(e.target.value)}
            placeholder={placeholder}
            className="flex-grow"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              handleAddElement(field, newElement);
              setNewElement('');
            }}
          >
            Add
          </Button>
        </div>
        
        <div className="space-y-2 mt-2">
          {(worldData[field] as string[] || []).map((item, index) => (
            <div key={index} className="flex items-center space-x-2 bg-neutral-50 p-2 rounded-md">
              {icon}
              <span className="flex-grow">{item}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleRemoveElement(field, index)}
                className="h-8 w-8 p-0"
              >
                &times;
              </Button>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>World Designer</CardTitle>
        <CardDescription>
          Create an immersive world for your story. Provide basic details or let AI fill in the gaps.
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid grid-cols-3">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="details">World Details</TabsTrigger>
            <TabsTrigger value="elements">Key Elements</TabsTrigger>
          </TabsList>
          
          <TabsContent value="basic" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="world-name">World Name</Label>
              <Input
                id="world-name"
                value={worldData.name || ''}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Enter a name for your world"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="genre">Genre</Label>
              <Select 
                value={worldData.genre || ''} 
                onValueChange={(value) => handleInputChange('genre', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a genre" />
                </SelectTrigger>
                <SelectContent>
                  {GENRES.map((genre) => (
                    <SelectItem key={genre.value} value={genre.value}>
                      {genre.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="setting">General Setting</Label>
              <Input
                id="setting"
                value={worldData.setting || ''}
                onChange={(e) => handleInputChange('setting', e.target.value)}
                placeholder="e.g., Medieval kingdom, Space colony, etc."
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="timeframe">Time Period</Label>
              {worldData.genre === 'historical' || worldData.genre === 'alternate-history' ? (
                <Select 
                  value={worldData.timeframe || ''} 
                  onValueChange={(value) => handleInputChange('timeframe', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a time period" />
                  </SelectTrigger>
                  <SelectContent>
                    {HISTORICAL_PERIODS.map((period) => (
                      <SelectItem key={period.value} value={period.value}>
                        {period.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  id="timeframe"
                  value={worldData.timeframe || ''}
                  onChange={(e) => handleInputChange('timeframe', e.target.value)}
                  placeholder="e.g., Far future, 1000 years after the great war, etc."
                />
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="details" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="culturalSetting">Cultural Setting</Label>
              <Textarea
                id="culturalSetting"
                value={worldData.culturalSetting || ''}
                onChange={(e) => handleInputChange('culturalSetting', e.target.value)}
                placeholder="Describe the cultures, customs, beliefs of your world"
                rows={3}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="technology">Technology Level</Label>
              <Textarea
                id="technology"
                value={worldData.technology || ''}
                onChange={(e) => handleInputChange('technology', e.target.value)}
                placeholder="Describe the technology available in your world"
                rows={3}
              />
            </div>
            
            {(worldData.genre === 'fantasy' || worldData.genre === 'urban-fantasy') && (
              <div className="space-y-2">
                <Label htmlFor="magicSystem">Magic System</Label>
                <Textarea
                  id="magicSystem"
                  value={worldData.magicSystem || ''}
                  onChange={(e) => handleInputChange('magicSystem', e.target.value)}
                  placeholder="Describe how magic works in your world"
                  rows={3}
                />
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="politicalSystem">Political System</Label>
              <Textarea
                id="politicalSystem"
                value={worldData.politicalSystem || ''}
                onChange={(e) => handleInputChange('politicalSystem', e.target.value)}
                placeholder="Describe the governing structures and power dynamics"
                rows={3}
              />
            </div>
          </TabsContent>
          
          <TabsContent value="elements" className="space-y-4">
            {renderElementList(
              'regions',
              'Key Regions or Locations',
              'Add a region or location',
              <Map className="h-4 w-4 text-neutral-500" />
            )}
            
            {renderElementList(
              'keyConflicts',
              'Key Conflicts or Tensions',
              'Add a conflict',
              <Users className="h-4 w-4 text-neutral-500" />
            )}
            
            {renderElementList(
              'importantFigures',
              'Important Figures',
              'Add an important figure',
              <Users className="h-4 w-4 text-neutral-500" />
            )}
            
            <div className="space-y-3 pt-4">
              <div className="flex justify-between">
                <Label>World Complexity</Label>
                <span className="text-sm text-neutral-500">
                  {worldData.complexity === 0 ? 'Simple' : 
                   worldData.complexity === 100 ? 'Complex' : 
                   `${worldData.complexity}%`}
                </span>
              </div>
              <Slider
                value={[worldData.complexity || 50]}
                min={0}
                max={100}
                step={10}
                onValueChange={(value) => handleInputChange('complexity', value[0])}
              />
              <p className="text-sm text-neutral-500 italic mt-2">
                Higher complexity means more detailed world generation with intricate systems and relationships.
              </p>
            </div>
          </TabsContent>
        </Tabs>
        
        <div className="space-y-2 mt-6">
          <Label htmlFor="description">World Description</Label>
          <Textarea
            id="description"
            value={worldData.description || ''}
            onChange={(e) => handleInputChange('description', e.target.value)}
            placeholder="Provide any additional details or context about your world"
            rows={4}
          />
        </div>
      </CardContent>
      
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={() => setActiveTab(activeTab === 'basic' ? 'basic' : activeTab === 'details' ? 'basic' : 'details')}>
          {activeTab === 'basic' ? 'Cancel' : 'Back'}
        </Button>
        
        {activeTab === 'elements' ? (
          <Button onClick={handleGenerateWorld} disabled={isGenerating}>
            {isGenerating ? 'Generating...' : 'Generate World'}
          </Button>
        ) : (
          <Button onClick={() => setActiveTab(activeTab === 'basic' ? 'details' : 'elements')}>
            Next
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};

export default WorldDesigner;