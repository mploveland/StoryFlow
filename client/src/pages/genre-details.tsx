import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useLocation } from "wouter";
import { GenreDetails } from '@/lib/openai';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BookOpen, Box, Check, Edit, List, Sparkles, ThumbsUp, Users } from 'lucide-react';

export default function GenreDetailsPage() {
  const [_, navigate] = useLocation();
  const [genreDetails, setGenreDetails] = React.useState<GenreDetails | null>(null);
  
  // In a real app, we would load this from a server or storage
  // For now, we'll use a demo value for display purposes
  React.useEffect(() => {
    // Check local storage for genre details
    const storedGenre = localStorage.getItem('storyflow_genre');
    if (storedGenre) {
      try {
        setGenreDetails(JSON.parse(storedGenre));
      } catch (e) {
        console.error('Error parsing stored genre:', e);
        setGenreDetails(getDemoGenre());
      }
    } else {
      // Use demo data for now
      setGenreDetails(getDemoGenre());
    }
  }, []);
  
  if (!genreDetails) {
    return <div className="p-6">Loading genre details...</div>;
  }

  return (
    <div className="flex flex-col w-full h-[calc(100vh-4rem)]">
      <div className="border-b border-border p-4 flex justify-between items-center bg-card">
        <div>
          <h1 className="text-2xl font-bold">{genreDetails.name}</h1>
          <p className="text-muted-foreground">Genre Details</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/voice-story-creation')}>
            <Edit className="mr-2 h-4 w-4" />
            Edit in Interview
          </Button>
          <Button onClick={() => navigate('/world-details')}>
            Continue to World Building
            <Check className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
      
      <div className="flex flex-1 overflow-hidden">
        <ScrollArea className="flex-1 p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-7xl mx-auto">
            {/* Main Genre Card */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BookOpen className="h-5 w-5 mr-2" />
                  Genre Overview
                </CardTitle>
                <CardDescription>
                  Comprehensive details about your story's genre
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium">Description</h3>
                  <p className="mt-2 text-muted-foreground">{genreDetails.description}</p>
                </div>
                
                <Separator />
                
                <div>
                  <h3 className="text-lg font-medium flex items-center">
                    <Sparkles className="h-4 w-4 mr-2" /> 
                    Themes
                  </h3>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {genreDetails.themes.map((theme, index) => (
                      <Badge key={index} variant="secondary">{theme}</Badge>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium flex items-center">
                    <Box className="h-4 w-4 mr-2" /> 
                    Tropes
                  </h3>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {genreDetails.tropes.map((trope, index) => (
                      <Badge key={index} variant="outline">{trope}</Badge>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium flex items-center">
                    <Users className="h-4 w-4 mr-2" /> 
                    Typical Characters
                  </h3>
                  <ul className="mt-2 pl-5 list-disc space-y-1 text-muted-foreground">
                    {genreDetails.typicalCharacters.map((character, index) => (
                      <li key={index}>{character}</li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
            
            {/* Style Guide and Additional Elements */}
            <Card className="h-fit">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <List className="h-5 w-5 mr-2" />
                  Style Guide
                </CardTitle>
                <CardDescription>
                  Recommended elements for your genre
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-medium">Tone</h3>
                  <p className="text-sm text-muted-foreground">{genreDetails.styleGuide.tone}</p>
                </div>
                
                <div>
                  <h3 className="font-medium">Pacing</h3>
                  <p className="text-sm text-muted-foreground">{genreDetails.styleGuide.pacing}</p>
                </div>
                
                <div>
                  <h3 className="font-medium">Perspective</h3>
                  <p className="text-sm text-muted-foreground">{genreDetails.styleGuide.perspective}</p>
                </div>
                
                <div>
                  <h3 className="font-medium">Dialogue Style</h3>
                  <p className="text-sm text-muted-foreground">{genreDetails.styleGuide.dialogueStyle}</p>
                </div>
                
                <Separator />
                
                <div>
                  <h3 className="font-medium flex items-center">
                    <ThumbsUp className="h-4 w-4 mr-2" />
                    Recommended Reading
                  </h3>
                  <ul className="mt-2 pl-5 list-disc text-sm text-muted-foreground">
                    {genreDetails.recommendedReading.slice(0, 5).map((book, index) => (
                      <li key={index}>{book}</li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
            
            {/* World Building Elements */}
            <Card className="md:col-span-3">
              <CardHeader>
                <CardTitle>World Building Elements</CardTitle>
                <CardDescription>
                  Key elements to consider when building your world
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-medium mb-2">Common Settings</h3>
                    <ul className="pl-5 list-disc space-y-1 text-muted-foreground">
                      {genreDetails.commonSettings.map((setting, index) => (
                        <li key={index}>{setting}</li>
                      ))}
                    </ul>
                  </div>
                  
                  <div>
                    <h3 className="font-medium mb-2">Plot Structures</h3>
                    <ul className="pl-5 list-disc space-y-1 text-muted-foreground">
                      {genreDetails.plotStructures.map((structure, index) => (
                        <li key={index}>{structure}</li>
                      ))}
                    </ul>
                  </div>
                  
                  <div className="md:col-span-2">
                    <h3 className="font-medium mb-2">Worldbuilding Elements</h3>
                    <div className="flex flex-wrap gap-2">
                      {genreDetails.worldbuildingElements.map((element, index) => (
                        <Badge key={index} variant="secondary">{element}</Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}

// Demo genre for development and display purposes
function getDemoGenre(): GenreDetails {
  return {
    name: "Western Gold Rush Fiction",
    description: "A subgenre that combines elements of Western fiction with historical exploration of the American Gold Rush era. These stories typically feature fortune seekers, frontier challenges, and themes of ambition and survival in the untamed wilderness of 1840s-1850s California and other gold rush locations.",
    themes: [
      "Frontier spirit",
      "Survival",
      "Greed vs. morality",
      "Fortune and misfortune",
      "Lawlessness",
      "Class struggle",
      "Man vs. nature"
    ],
    tropes: [
      "Unlikely partnerships",
      "Boom towns",
      "The big strike",
      "Claim jumping",
      "Snake oil salesmen",
      "Frontier justice",
      "The journey west",
      "Lost fortunes"
    ],
    commonSettings: [
      "Mining camps",
      "Frontier towns",
      "Wilderness trails",
      "Mining operations",
      "Saloons and gambling halls",
      "San Francisco during gold rush",
      "Sutter's Mill and similar historical locations"
    ],
    typicalCharacters: [
      "Greenhorn prospector",
      "Experienced miner",
      "Entrepreneurial merchant",
      "Frontier doctor",
      "Saloon owner",
      "Wealthy investor",
      "Claim jumper/bandit",
      "Indigenous people affected by the rush"
    ],
    plotStructures: [
      "Rags to riches (or riches to rags)",
      "Dangerous journey to the goldfields",
      "Building and defending a claim",
      "Murder mystery in a mining town",
      "Con artist schemes and frontier justice",
      "Historical events told through fictional perspectives"
    ],
    styleGuide: {
      tone: "Gritty realism with moments of hope and despair",
      pacing: "Alternating between slow frontier life and intense action sequences",
      perspective: "Often first-person or close third-person from the prospector's viewpoint",
      dialogueStyle: "Period-appropriate with regional dialects and mining terminology"
    },
    recommendedReading: [
      "The Sisters Brothers by Patrick deWitt",
      "Gold Fever by Steve Boggan",
      "Daughter of Fortune by Isabel Allende",
      "The Luminaries by Eleanor Catton",
      "How Much of These Hills Is Gold by C Pam Zhang"
    ],
    popularExamples: [
      "Deadwood (TV series)",
      "There Will Be Blood (film)",
      "Pale Rider (film)",
      "The Luminaries (novel and series)"
    ],
    worldbuildingElements: [
      "Mining techniques and terminology",
      "Period-appropriate technology",
      "California Trail realities",
      "Multicultural elements (Chinese immigrants, Mexican residents, etc.)",
      "Economic systems (gold dust as currency, inflation)",
      "Environmental impacts of mining",
      "Historical events and figures"
    ]
  };
}