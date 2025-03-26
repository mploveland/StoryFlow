import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Globe, BookOpen, Upload, RefreshCw, Check, FileText, Wand2, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { WorldData } from '../world/WorldDesigner';
import { InspirationData } from './InspirationGatherer';

interface WorldBuilderProps {
  inspirationData: InspirationData;
  onWorldComplete: (worldData: WorldData) => void;
  onCustomWorld: () => void;
}

interface WorldTemplate {
  id: string;
  name: string;
  description: string;
  preview: string;
  source: string;
  selected: boolean;
}

const WorldBuilder: React.FC<WorldBuilderProps> = ({ 
  inspirationData, 
  onWorldComplete,
  onCustomWorld
}) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('templates');
  const [worldTemplates, setWorldTemplates] = useState<WorldTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<WorldTemplate | null>(null);
  const [worldComplexity, setWorldComplexity] = useState(3);
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
    magicSystem: '',
    politicalSystem: '',
    description: '',
    complexity: 3
  });

  // Discover world templates from the research data
  const discoverWorldTemplates = () => {
    if (worldTemplates.length > 0) {
      toast({
        title: "Worlds Already Discovered",
        description: "You've already discovered world templates from your research.",
      });
      return;
    }

    setIsLoading(true);

    // Simulate AI processing time
    setTimeout(() => {
      // Generate world templates based on inspiration data
      const discoveredTemplates: WorldTemplate[] = [];

      // Generate templates from books
      inspirationData.bookTitles.forEach(book => {
        discoveredTemplates.push({
          id: `book-${book.replace(/\s+/g, '-').toLowerCase()}`,
          name: `World of ${book}`,
          description: `A world inspired by the setting and atmosphere of ${book}.`,
          preview: `This world captures the essence of ${book}, with its unique blend of settings, cultural dynamics, and thematic underpinnings. The geography, societies, and conflicts mirror those found in the source material while offering opportunities for new stories.`,
          source: book,
          selected: false,
        });
      });

      // Generate templates from authors' typical worlds
      inspirationData.authors.forEach(author => {
        discoveredTemplates.push({
          id: `author-${author.replace(/\s+/g, '-').toLowerCase()}`,
          name: `${author}-inspired World`,
          description: `A world capturing the essence and style of ${author}'s fictional settings.`,
          preview: `This world embodies the characteristic elements found in ${author}'s works: the atmosphere, thematic concerns, and worldbuilding approach that define the author's unique style. The setting provides a foundation for stories in the tradition of ${author} while allowing for your own creative direction.`,
          source: author,
          selected: false,
        });
      });

      // Generate templates from genres
      inspirationData.genres.forEach(genre => {
        let worldName = '';
        let worldDesc = '';
        
        switch(genre.toLowerCase()) {
          case 'fantasy':
            worldName = 'Mythic Realm';
            worldDesc = 'A high fantasy world with magic, mythical creatures, and epic conflicts between good and evil.';
            break;
          case 'sci-fi':
            worldName = 'Futuristic Federation';
            worldDesc = 'A space-faring civilization with advanced technology, interplanetary politics, and explorations of the human condition.';
            break;
          case 'dystopian':
            worldName = 'Fractured Society';
            worldDesc = 'A post-collapse world where humanity struggles under oppressive systems and environmental degradation.';
            break;
          case 'historical':
            worldName = 'Reimagined Past';
            worldDesc = 'An alternate history setting that explores historical periods with fictional elements and what-if scenarios.';
            break;
          default:
            worldName = `${genre} Universe`;
            worldDesc = `A world built around the conventions and expectations of the ${genre} genre.`;
        }

        discoveredTemplates.push({
          id: `genre-${genre.replace(/\s+/g, '-').toLowerCase()}`,
          name: worldName,
          description: worldDesc,
          preview: `This world incorporates the quintessential elements of ${genre} fiction, providing an ideal foundation for stories in this tradition. The setting is designed to support the typical character journeys, conflicts, and thematic explorations associated with the genre.`,
          source: genre,
          selected: false,
        });
      });

      // Generate templates from thematic elements
      if (inspirationData.thematicElements.length > 0) {
        const combinedThemes = inspirationData.thematicElements.join(', ');
        discoveredTemplates.push({
          id: 'theme-based',
          name: 'Theme-Centered World',
          description: `A world specifically designed to explore themes of ${combinedThemes}.`,
          preview: `This world is architected to illuminate and examine the themes of ${combinedThemes} through its setting, conflicts, and societal structures. Every aspect of the world, from its geography to its history, provides opportunities to delve into these thematic concerns in meaningful ways.`,
          source: 'Thematic Elements',
          selected: false,
        });
      }

      // Add a template based on uploaded ebooks if any
      if (inspirationData.uploadedEbooks.length > 0) {
        const ebookTitles = inspirationData.uploadedEbooks.map(ebook => ebook.name.split('.')[0]).join(', ');
        discoveredTemplates.push({
          id: 'ebook-based',
          name: 'Extracted World',
          description: `A world synthesized from the uploaded content: ${ebookTitles}.`,
          preview: `This world is derived from our analysis of your uploaded content, extracting key world-building elements, settings, atmospheric qualities, and thematic underpinnings. The result is a unique setting that captures the essence of your uploaded material while providing a fresh canvas for new stories.`,
          source: 'Uploaded Content',
          selected: false,
        });
      }

      // Add a fusion template that combines elements from multiple sources
      if (discoveredTemplates.length > 1) {
        discoveredTemplates.push({
          id: 'fusion',
          name: 'Fusion World',
          description: 'A unique blend of elements from all your inspiration sources.',
          preview: 'This world represents a creative synthesis of all your inspiration sources, combining elements of each into a cohesive and original setting. The fusion creates something greater than the sum of its parts, with distinctive characteristics that reflect the diverse influences while forming something entirely new.',
          source: 'Multiple Sources',
          selected: false,
        });
      }

      setWorldTemplates(discoveredTemplates);
      setIsLoading(false);

      toast({
        title: "World Templates Discovered",
        description: `Found ${discoveredTemplates.length} world templates based on your research!`,
      });
    }, 2500);
  };

  // Select a world template
  const selectWorldTemplate = (template: WorldTemplate) => {
    const updatedTemplates = worldTemplates.map(t => ({
      ...t,
      selected: t.id === template.id
    }));
    
    setWorldTemplates(updatedTemplates);
    setSelectedTemplate(template);
    
    // Set basic world data from template
    setWorldData({
      ...worldData,
      name: template.name,
      description: template.preview,
    });
  };

  // Generate detailed world data from selected template
  const generateDetailedWorld = () => {
    if (!selectedTemplate) {
      toast({
        title: "No Template Selected",
        description: "Please select a world template first.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    // Simulate AI processing
    setTimeout(() => {
      // In a real implementation, this would call the OpenAI API
      const template = selectedTemplate;
      let genre = '';
      let setting = '';
      let timeframe = '';
      
      // Determine genre, setting, and timeframe based on the template source
      if (template.source === 'Multiple Sources') {
        genre = inspirationData.genres.length > 0 
          ? inspirationData.genres.join(', ') 
          : 'Mixed Genre';
        setting = 'Diverse landscapes reflecting multiple influences';
        timeframe = 'Various periods with a cohesive timeline';
      } else if (inspirationData.genres.includes(template.source)) {
        genre = template.source;
        
        switch(template.source.toLowerCase()) {
          case 'fantasy':
            setting = 'Medieval-inspired realm with magical landscapes';
            timeframe = 'Age of legends and magic';
            break;
          case 'sci-fi':
            setting = 'Space stations, colonized planets, and interstellar vessels';
            timeframe = 'Far future';
            break;
          case 'historical':
            setting = 'Historically accurate locations with fictional elements';
            timeframe = 'Based on a significant historical period';
            break;
          case 'dystopian':
            setting = 'Post-apocalyptic landscape or oppressive urban environment';
            timeframe = 'Near future after societal collapse';
            break;
          default:
            setting = 'Distinctive environment suited to the genre';
            timeframe = 'Period appropriate for the genre';
        }
      } else {
        // For author or book-based templates
        genre = inspirationData.genres.length > 0
          ? inspirationData.genres[0]
          : 'Speculative Fiction';
        setting = 'Rich and immersive environment';
        timeframe = 'Period that best serves the narrative';
      }

      // Generate regions
      const regions = [
        'Central homeland of the protagonists',
        'Frontier territory with unique dangers',
        'Ancient land with historical significance',
        'Urban center of power and intrigue'
      ];

      // Generate conflicts
      const conflicts = [
        'Power struggle between competing factions',
        'Existential threat to the world or civilization',
        'Internal conflict within the protagonist\'s community',
        'Moral dilemma that challenges societal norms'
      ];

      // Generate important figures
      const figures = [
        'Legendary hero from a past age',
        'Current ruler or authority figure',
        'Mysterious figure with hidden agendas',
        'Cultural or spiritual leader'
      ];

      // Set detailed world data
      const detailedWorld: WorldData = {
        name: template.name,
        genre,
        setting,
        timeframe,
        regions,
        keyConflicts: conflicts,
        importantFigures: figures,
        culturalSetting: 'Diverse societies with distinct customs, beliefs, and traditions that shape characters\' worldviews',
        technology: genre.toLowerCase() === 'sci-fi' 
          ? 'Advanced technology that influences all aspects of society' 
          : 'Technology level appropriate to the setting, with potential fantastical elements',
        magicSystem: genre.toLowerCase() === 'fantasy' 
          ? 'Consistent magic system with clear rules and limitations'
          : 'Minimal or no magical elements, focusing on realistic interactions',
        politicalSystem: 'Complex political landscape with competing interests and power dynamics',
        description: template.preview,
        complexity: worldComplexity
      };

      setWorldData(detailedWorld);
      setIsLoading(false);

      toast({
        title: "World Generated",
        description: "Detailed world data has been created based on your selected template!",
      });
    }, 3000);
  };

  // Complete world building
  const completeWorldBuilding = () => {
    // Check if all required fields are filled
    const requiredFields: (keyof WorldData)[] = [
      'name', 'genre', 'setting', 'description'
    ];
    
    const missingFields = requiredFields.filter(field => !worldData[field]);
    
    if (missingFields.length > 0) {
      toast({
        title: "Missing Information",
        description: `Please fill in all required fields: ${missingFields.join(', ')}`,
        variant: "destructive",
      });
      return;
    }

    // Pass the world data to the parent component
    onWorldComplete(worldData as WorldData);
    
    toast({
      title: "World Created",
      description: "Your world has been created successfully!",
    });
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto px-4">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-primary mb-2">World Building</h1>
        <p className="text-muted-foreground">
          Create a world for your story based on your research or design one from scratch
        </p>
      </div>

      <Tabs defaultValue="templates" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-2 mb-4">
          <TabsTrigger value="templates">
            <Globe className="h-4 w-4 mr-2" />
            Research-Based Worlds
          </TabsTrigger>
          <TabsTrigger value="custom">
            <Wand2 className="h-4 w-4 mr-2" />
            Custom World Creation
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="templates" className="space-y-4">
          <div className="flex items-center justify-between">
            <Button
              onClick={discoverWorldTemplates}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Discovering Worlds...
                </>
              ) : (
                <>
                  <BookOpen className="h-4 w-4" />
                  Discover Worlds From Research
                </>
              )}
            </Button>
          </div>
          
          {worldTemplates.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <ScrollArea className="h-[500px] rounded-md border p-4">
                  <div className="space-y-4">
                    {worldTemplates.map((template) => (
                      <Card 
                        key={template.id} 
                        className={`cursor-pointer transition-colors ${template.selected ? 'border-primary' : 'hover:border-muted'}`}
                        onClick={() => selectWorldTemplate(template)}
                      >
                        <CardHeader className="pb-2">
                          <CardTitle className="text-md flex items-center justify-between">
                            {template.name}
                            {template.selected && (
                              <Check className="h-4 w-4 text-primary" />
                            )}
                          </CardTitle>
                          <CardDescription>Source: {template.source}</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm">{template.description}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              <div>
                <Card className="h-full flex flex-col">
                  <CardHeader>
                    <CardTitle>World Details</CardTitle>
                    <CardDescription>
                      {selectedTemplate 
                        ? `Customize the details of ${selectedTemplate.name}` 
                        : 'Select a world template to begin customization'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex-grow">
                    {selectedTemplate ? (
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="complexity">World Complexity</Label>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">Simple</span>
                            <Slider
                              id="complexity"
                              defaultValue={[3]}
                              max={5}
                              min={1}
                              step={1}
                              onValueChange={(value) => setWorldComplexity(value[0])}
                              className="flex-grow"
                            />
                            <span className="text-sm text-muted-foreground">Complex</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Higher complexity creates more detailed worlds with richer histories and systems
                          </p>
                        </div>
                        
                        <div>
                          <Label htmlFor="preview">World Preview</Label>
                          <Textarea
                            id="preview"
                            value={selectedTemplate.preview}
                            readOnly
                            className="h-32 mt-1"
                          />
                        </div>

                        <Button 
                          className="w-full" 
                          onClick={generateDetailedWorld}
                          disabled={isLoading}
                        >
                          {isLoading ? (
                            <>
                              <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                              Generating Detailed World...
                            </>
                          ) : (
                            <>
                              <Download className="h-4 w-4 mr-2" />
                              Generate Detailed World
                            </>
                          )}
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <p className="text-muted-foreground">Select a world template from the left</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 border rounded-md">
              <Globe className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No World Templates Yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Discover world templates from your research by clicking the button above
              </p>
            </div>
          )}

          {Object.keys(worldData).length > 4 && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Generated World: {worldData.name}</CardTitle>
                <CardDescription>Review and customize your world before finalizing</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="world-name">World Name</Label>
                      <Input
                        id="world-name"
                        value={worldData.name || ''}
                        onChange={(e) => setWorldData({...worldData, name: e.target.value})}
                        className="mt-1"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="world-genre">Genre</Label>
                      <Input
                        id="world-genre"
                        value={worldData.genre || ''}
                        onChange={(e) => setWorldData({...worldData, genre: e.target.value})}
                        className="mt-1"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="world-setting">Setting</Label>
                      <Input
                        id="world-setting"
                        value={worldData.setting || ''}
                        onChange={(e) => setWorldData({...worldData, setting: e.target.value})}
                        className="mt-1"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="world-timeframe">Timeframe</Label>
                      <Input
                        id="world-timeframe"
                        value={worldData.timeframe || ''}
                        onChange={(e) => setWorldData({...worldData, timeframe: e.target.value})}
                        className="mt-1"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="world-description">World Description</Label>
                    <Textarea
                      id="world-description"
                      value={worldData.description || ''}
                      onChange={(e) => setWorldData({...worldData, description: e.target.value})}
                      className="h-[185px] mt-1"
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end">
                <Button onClick={completeWorldBuilding}>
                  Continue with this World
                </Button>
              </CardFooter>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="custom" className="space-y-4">
          <div className="text-center py-12 border rounded-md">
            <Wand2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Create a Custom World</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Build your world from scratch using our comprehensive world building tools
            </p>
            <Button onClick={onCustomWorld}>
              Continue to World Designer
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default WorldBuilder;