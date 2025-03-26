import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CheckIcon, ChevronDownIcon, SearchIcon, PlusIcon, RefreshCw, Wand2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { CharacterData } from '../character/CharacterBuilder';
import { InspirationData } from './InspirationGatherer';

interface CharacterImporterProps {
  inspirationData: InspirationData;
  onCharactersImported: (characters: CharacterData[]) => void;
  onGenerateNew: () => void;
}

interface ImportedCharacter {
  name: string;
  source: string;
  description: string;
  role: string;
  personality: string[];
  selected: boolean;
}

const CharacterImporter: React.FC<CharacterImporterProps> = ({ 
  inspirationData, 
  onCharactersImported,
  onGenerateNew
}) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('discover');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [importedCharacters, setImportedCharacters] = useState<ImportedCharacter[]>([]);

  // Filter options for character sources
  const filterOptions = [
    { value: 'all', label: 'All Sources' },
    ...inspirationData.authors.map(author => ({ value: author, label: author })),
    ...inspirationData.bookTitles.map(book => ({ value: book, label: book })),
  ];

  // Simulate discovering characters from the research data
  const discoverCharacters = () => {
    if (importedCharacters.length > 0) {
      toast({
        title: "Characters Already Discovered",
        description: "You've already discovered characters from your research.",
      });
      return;
    }

    setIsLoading(true);

    // Simulate AI processing time
    setTimeout(() => {
      // Generate mock characters based on inspiration data
      const discoveredCharacters: ImportedCharacter[] = [];

      // Generate a character for each author (if any)
      inspirationData.authors.forEach(author => {
        const personality = ['determined', 'complex', 'introspective'];
        if (inspirationData.thematicElements.length > 0) {
          personality.push(inspirationData.thematicElements[Math.floor(Math.random() * inspirationData.thematicElements.length)]);
        }

        discoveredCharacters.push({
          name: `Character from ${author}'s style`,
          source: author,
          description: `A character inspired by ${author}'s typical protagonists. Exhibits depth and nuance that reflects the author's signature style.`,
          role: 'Protagonist',
          personality,
          selected: false,
        });

        discoveredCharacters.push({
          name: `Antagonist in ${author}'s style`,
          source: author,
          description: `A complex antagonist with motivations and depth typical of ${author}'s works.`,
          role: 'Antagonist',
          personality: ['conflicted', 'ambitious', 'determined'],
          selected: false,
        });
      });

      // Generate a character for each book (if any)
      inspirationData.bookTitles.forEach(book => {
        const personality = ['charismatic', 'resourceful', 'adaptable'];
        if (inspirationData.thematicElements.length > 0) {
          personality.push(inspirationData.thematicElements[Math.floor(Math.random() * inspirationData.thematicElements.length)]);
        }

        discoveredCharacters.push({
          name: `Main character from ${book}`,
          source: book,
          description: `The protagonist from ${book}, known for their journey through the narrative and growth throughout the story.`,
          role: 'Protagonist',
          personality,
          selected: false,
        });

        discoveredCharacters.push({
          name: `Supporting character from ${book}`,
          source: book,
          description: `A key supporting character from ${book} who plays a crucial role in the protagonist's journey.`,
          role: 'Supporting Character',
          personality: ['loyal', 'insightful', 'pragmatic'],
          selected: false,
        });
      });

      // Add a few generic characters based on genres if available
      if (inspirationData.genres.length > 0) {
        inspirationData.genres.forEach(genre => {
          let characterType = '';
          let traits = [];

          switch(genre.toLowerCase()) {
            case 'fantasy':
              characterType = 'Wizard';
              traits = ['wise', 'mysterious', 'powerful'];
              break;
            case 'sci-fi':
              characterType = 'Space Captain';
              traits = ['brave', 'resourceful', 'adventurous'];
              break;
            case 'thriller':
              characterType = 'Detective';
              traits = ['observant', 'determined', 'cynical'];
              break;
            case 'romance':
              characterType = 'Love Interest';
              traits = ['passionate', 'complex', 'charismatic'];
              break;
            case 'horror':
              characterType = 'Survivor';
              traits = ['resilient', 'cautious', 'adaptive'];
              break;
            default:
              characterType = 'Genre Archetype';
              traits = ['distinctive', 'memorable', 'complex'];
          }

          discoveredCharacters.push({
            name: `${characterType} from ${genre}`,
            source: genre,
            description: `A character archetype typical of the ${genre} genre, with characteristics readers would expect.`,
            role: 'Genre Character',
            personality: traits,
            selected: false,
          });
        });
      }

      setImportedCharacters(discoveredCharacters);
      setIsLoading(false);

      toast({
        title: "Characters Discovered",
        description: `Found ${discoveredCharacters.length} characters in your research!`,
      });
    }, 2500);
  };

  // Toggle character selection
  const toggleCharacterSelection = (index: number) => {
    const updatedCharacters = [...importedCharacters];
    updatedCharacters[index].selected = !updatedCharacters[index].selected;
    setImportedCharacters(updatedCharacters);
  };

  // Filter characters based on search term and selected filter
  const filteredCharacters = importedCharacters.filter(character => {
    const matchesSearch = searchTerm === '' || 
      character.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      character.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = selectedFilter === 'all' || character.source === selectedFilter;
    
    return matchesSearch && matchesFilter;
  });

  // Import selected characters
  const importSelectedCharacters = () => {
    const selectedCharacters = importedCharacters.filter(char => char.selected);
    
    if (selectedCharacters.length === 0) {
      toast({
        title: "No Characters Selected",
        description: "Please select at least one character to import.",
        variant: "destructive",
      });
      return;
    }

    // Convert imported characters to the app's character format
    const formattedCharacters: CharacterData[] = selectedCharacters.map(char => ({
      name: char.name,
      role: char.role,
      background: `${char.description} (Imported from: ${char.source})`,
      personality: char.personality,
      goals: ['To be defined'],
      fears: ['To be defined'],
      relationships: [],
      skills: [],
      appearance: `Character inspired by ${char.source}`,
      voice: 'Natural and authentic to the character',
      depth: 3
    }));

    onCharactersImported(formattedCharacters);
    
    toast({
      title: "Characters Imported",
      description: `Successfully imported ${selectedCharacters.length} characters.`,
    });
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto px-4">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-primary mb-2">Character Creation</h1>
        <p className="text-muted-foreground">
          Discover characters from your inspiration sources or create new ones from scratch
        </p>
      </div>

      <Tabs defaultValue="discover" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-2 mb-4">
          <TabsTrigger value="discover">
            <SearchIcon className="h-4 w-4 mr-2" />
            Discover From Research
          </TabsTrigger>
          <TabsTrigger value="new">
            <PlusIcon className="h-4 w-4 mr-2" />
            Create New Characters
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="discover" className="space-y-4">
          <div className="flex items-center justify-between">
            <Button
              onClick={discoverCharacters}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Discovering Characters...
                </>
              ) : (
                <>
                  <Wand2 className="h-4 w-4" />
                  Discover Characters From Research
                </>
              )}
            </Button>
            
            <div className="flex items-center gap-2">
              <Input
                placeholder="Search characters..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-[200px]"
              />
              
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="flex items-center gap-1 w-[180px] justify-between">
                    {selectedFilter === 'all' ? 'All Sources' : selectedFilter}
                    <ChevronDownIcon className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="p-0" align="end">
                  <Command>
                    <CommandInput placeholder="Search source..." />
                    <CommandList>
                      <CommandEmpty>No results found.</CommandEmpty>
                      <CommandGroup>
                        {filterOptions.map((option) => (
                          <CommandItem
                            key={option.value}
                            onSelect={() => setSelectedFilter(option.value)}
                            className="flex items-center gap-2"
                          >
                            {selectedFilter === option.value && (
                              <CheckIcon className="h-4 w-4" />
                            )}
                            <span className={selectedFilter === option.value ? 'font-medium' : ''}>
                              {option.label}
                            </span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </div>
          
          {importedCharacters.length > 0 ? (
            <div className="space-y-4">
              <ScrollArea className="h-[400px] rounded-md border p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredCharacters.map((character, index) => (
                    <Card 
                      key={index} 
                      className={`cursor-pointer transition-colors ${character.selected ? 'border-primary' : 'hover:border-muted'}`}
                      onClick={() => toggleCharacterSelection(importedCharacters.indexOf(character))}
                    >
                      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                        <div>
                          <CardTitle className="text-md">{character.name}</CardTitle>
                          <CardDescription>{character.role}</CardDescription>
                        </div>
                        <Avatar className="h-9 w-9">
                          <AvatarFallback>{character.name.substring(0, 2)}</AvatarFallback>
                        </Avatar>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground mb-2">{character.description}</p>
                        <div>
                          <Label className="text-xs">Source</Label>
                          <Badge variant="outline" className="mt-1">{character.source}</Badge>
                        </div>
                        <div className="mt-2">
                          <Label className="text-xs">Personality Traits</Label>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {character.personality.map((trait, i) => (
                              <Badge key={i} variant="secondary" className="text-xs">{trait}</Badge>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                      <CardFooter>
                        <div className={`h-4 w-4 rounded-sm border flex items-center justify-center transition-colors ${character.selected ? 'bg-primary border-primary' : 'border-input'}`}>
                          {character.selected && <CheckIcon className="h-3 w-3 text-primary-foreground" />}
                        </div>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
                
                {filteredCharacters.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No characters match your search criteria.
                  </div>
                )}
              </ScrollArea>
              
              <div className="flex justify-between">
                <div>
                  <span className="text-sm text-muted-foreground">
                    {importedCharacters.filter(c => c.selected).length} of {importedCharacters.length} characters selected
                  </span>
                </div>
                <Button onClick={importSelectedCharacters}>
                  Import Selected Characters
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 border rounded-md">
              <SearchIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Characters Discovered Yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Discover characters from your research by clicking the button above
              </p>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="new" className="space-y-4">
          <div className="text-center py-12 border rounded-md">
            <PlusIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Create New Characters</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Build custom characters from scratch or let our AI suggest characters based on your research
            </p>
            <Button onClick={onGenerateNew}>
              Continue to Character Builder
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CharacterImporter;