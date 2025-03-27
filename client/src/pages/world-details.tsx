import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useLocation } from "wouter";
import { ScrollArea } from '@/components/ui/scroll-area';
import { WorldData } from '../components/world/WorldDesigner';
import { Check, Edit, Globe, Landmark, Mountain, Users, Sparkle, Sword, BookOpen } from 'lucide-react';

export default function WorldDetailsPage() {
  const [_, navigate] = useLocation();
  const [worldData, setWorldData] = React.useState<WorldData | null>(null);
  
  // In a real app, we would load this from a server or storage
  // For now, we'll use a demo value for display purposes
  React.useEffect(() => {
    // Check local storage for world details
    const storedWorld = localStorage.getItem('storyflow_world');
    if (storedWorld) {
      try {
        setWorldData(JSON.parse(storedWorld));
      } catch (e) {
        console.error('Error parsing stored world:', e);
        setWorldData(getDemoWorld());
      }
    } else {
      // Use demo data for now
      setWorldData(getDemoWorld());
    }
  }, []);
  
  if (!worldData) {
    return <div className="p-6">Loading world details...</div>;
  }

  return (
    <div className="flex flex-col w-full h-[calc(100vh-4rem)]">
      <div className="border-b border-border p-4 flex justify-between items-center bg-card">
        <div>
          <h1 className="text-2xl font-bold">{worldData.name}</h1>
          <p className="text-muted-foreground">{worldData.genre} world</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => navigate('/genre-details')}
            className="gap-1"
          >
            <BookOpen className="h-4 w-4" />
            Genre Details
          </Button>
          <Button 
            variant="outline" 
            onClick={() => navigate('/voice-story-creation')}
            className="gap-1"
          >
            <Edit className="h-4 w-4" />
            Edit in Interview
          </Button>
          <Button 
            onClick={() => navigate('/character-details')}
            className="gap-1"
          >
            Continue to Characters
            <Check className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      <div className="flex flex-1 overflow-hidden">
        <ScrollArea className="flex-1 p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-7xl mx-auto">
            {/* Main World Card */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  World Overview
                </CardTitle>
                <CardDescription>
                  Comprehensive details about your story's world
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium">Description</h3>
                  <p className="mt-2 text-muted-foreground">{worldData.description}</p>
                </div>
                
                <Separator />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-medium flex items-center gap-2">
                      <Mountain className="h-4 w-4" /> 
                      Setting
                    </h3>
                    <p className="mt-1 text-muted-foreground">{worldData.setting}</p>
                    
                    <h4 className="mt-3 font-medium">Timeframe</h4>
                    <p className="text-muted-foreground">{worldData.timeframe}</p>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-medium flex items-center gap-2">
                      <Sword className="h-4 w-4" /> 
                      Key Conflicts
                    </h3>
                    <ul className="mt-1 pl-5 list-disc space-y-1 text-muted-foreground">
                      {worldData.keyConflicts.map((conflict, index) => (
                        <li key={index}>{conflict}</li>
                      ))}
                    </ul>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium flex items-center gap-2">
                    <Landmark className="h-4 w-4" /> 
                    Regions & Geography
                  </h3>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {worldData.regions.map((region, index) => (
                      <Badge key={index} variant="secondary">{region}</Badge>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium flex items-center gap-2">
                    <Users className="h-4 w-4" /> 
                    Important Figures
                  </h3>
                  <ul className="mt-2 pl-5 list-disc space-y-1 text-muted-foreground">
                    {worldData.importantFigures.map((figure, index) => (
                      <li key={index}>{figure}</li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
            
            {/* Societal Elements */}
            <Card className="h-fit">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Landmark className="h-5 w-5" />
                  Society & Culture
                </CardTitle>
                <CardDescription>
                  Social structures and cultural elements
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-medium">Cultural Setting</h3>
                  <p className="text-sm text-muted-foreground">{worldData.culturalSetting}</p>
                </div>
                
                <div>
                  <h3 className="font-medium">Political System</h3>
                  <p className="text-sm text-muted-foreground">{worldData.politicalSystem}</p>
                </div>
                
                <div>
                  <h3 className="font-medium">Technology Level</h3>
                  <p className="text-sm text-muted-foreground">{worldData.technology}</p>
                </div>
                
                {worldData.magicSystem && (
                  <div>
                    <h3 className="font-medium flex items-center gap-1">
                      <Sparkle className="h-4 w-4" />
                      Magic System
                    </h3>
                    <p className="text-sm text-muted-foreground">{worldData.magicSystem}</p>
                  </div>
                )}
                
                <Separator />
                
                <div className="flex items-center justify-between">
                  <span className="text-sm">World Complexity</span>
                  <div className="relative w-24 h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="absolute top-0 left-0 h-full bg-primary rounded-full"
                      style={{ width: `${(worldData.complexity / 5) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm">{worldData.complexity}/5</span>
                </div>
              </CardContent>
            </Card>
            
            {/* Map Placeholder */}
            <Card className="md:col-span-3">
              <CardHeader>
                <CardTitle>World Map</CardTitle>
                <CardDescription>
                  Visual representation of your world (placeholder for now)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="aspect-video bg-card border border-dashed border-border rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-muted-foreground mb-2">World map visualization coming soon</p>
                    <Button size="sm">Generate Map</Button>
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

// Demo world for development and display purposes
function getDemoWorld(): WorldData {
  return {
    id: 1,
    name: "Aurea",
    genre: "Western Gold Rush Fiction",
    setting: "Gold Rush Era California, 1848-1855",
    timeframe: "Mid 19th century",
    regions: [
      "Sierra Nevada Mountains", 
      "Sacramento Valley", 
      "San Francisco Bay", 
      "Mining Camps", 
      "Boom Towns"
    ],
    keyConflicts: [
      "Land disputes between settlers and native tribes",
      "Competition for mining claims",
      "Law vs. lawlessness in frontier towns",
      "Environmental devastation vs. economic growth"
    ],
    importantFigures: [
      "Governor Mason",
      "John Sutter",
      "James Marshall",
      "Levi Strauss",
      "Sam Brannan"
    ],
    culturalSetting: "Diverse society of Americans, European immigrants, Chinese laborers, Mexican residents, and Native American tribes all converging on California during the gold rush period.",
    technology: "Mid-19th century technology with specialized mining equipment, steam power starting to emerge, and primitive transportation networks.",
    magicSystem: undefined,
    politicalSystem: "Transitional governance from Mexican territory to U.S. statehood, with mining camps establishing their own local laws and claim systems.",
    description: "Aurea is set during the historical California Gold Rush, portraying a realistic version of this pivotal period in American history. The world captures the chaos, opportunity, and dramatic societal changes brought about by the sudden influx of gold seekers, entrepreneurs, and adventurers from around the world. From primitive mining camps to rapidly growing cities like San Francisco, the setting showcases both the untamed wilderness and emerging civilization of 1850s California.",
    complexity: 4
  };
}