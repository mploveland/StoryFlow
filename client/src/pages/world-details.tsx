import React, { useEffect, useState } from 'react';
import { useLocation, useParams } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { apiRequest } from '@/lib/queryClient';

// Define WorldData interface here since it's specific to this page
interface WorldData {
  id?: number;
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

export default function WorldDetailsPage() {
  const [, setLocation] = useLocation();
  const params = useParams();
  const worldId = params.id;
  
  const [loading, setLoading] = useState(true);
  const [world, setWorld] = useState<WorldData | null>(null);
  const [regions, setRegions] = useState<{
    name: string;
    description: string;
    image?: string;
    notable_locations?: string[];
  }[]>([]);
  
  // Fetch world data
  useEffect(() => {
    // In a real app, this would fetch from the API
    // For now, we'll just use mock data based on the world ID
    
    // This would be an API call in a production app:
    // apiRequest(`/api/worlds/${worldId}`)
    //   .then(data => {
    //     setWorld(data);
    //     setLoading(false);
    //   })
    //   .catch(err => {
    //     console.error("Error loading world data", err);
    //     setLoading(false);
    //   });
    
    // For now, we'll just set some placeholder data
    setTimeout(() => {
      const worldData = {
        id: parseInt(worldId || '1'),
        name: "Aetheria",
        genre: "Fantasy",
        setting: "Medieval fantasy realm with magical elements",
        timeframe: "Timeless era resembling medieval period",
        regions: ["Central Kingdoms", "Misty Shores", "Eastern Plains", "Forbidden Mountains"],
        keyConflicts: ["Power struggle between royal houses", "Magic vs Technology debate", "Ancient evil awakening"],
        importantFigures: ["The High Council", "The Forgotten King", "The Oracle of the East"],
        culturalSetting: "Diverse cultures with varying traditions and beliefs around magic",
        technology: "Mix of medieval technology with magical enhancements",
        magicSystem: "Elemental magic drawn from nature's power",
        politicalSystem: "Feudal system with independent regions and a central authority",
        description: "A vast realm where magic flows through the land itself, creating wonders and dangers in equal measure. Ancient prophecies guide the destiny of its people.",
        complexity: 4
      };
      
      const regionData = [
        {
          name: "Central Kingdoms",
          description: "The heart of civilization in Aetheria, where the High Council resides and most political decisions are made. Rich farmlands and prosperous cities dot the landscape.",
          notable_locations: ["Royal City of Caelum", "The High Council Chambers", "Grand Library of Arcana"]
        },
        {
          name: "Misty Shores",
          description: "A foggy coastal region with mysterious islands offshore. Home to seafaring people who are said to commune with ocean spirits.",
          notable_locations: ["Port Haven", "The Lighthouse of Souls", "Mermaid's Cove"]
        },
        {
          name: "Eastern Plains",
          description: "Vast grasslands where nomadic tribes follow ancient traditions. Known for their excellent horses and prophetic seers.",
          notable_locations: ["The Moving City of Tents", "Oracle's Sanctuary", "Ancestor Stones"]
        },
        {
          name: "Forbidden Mountains",
          description: "Treacherous peaks where few dare to venture. Rumors speak of hidden valleys where creatures of legend still roam.",
          notable_locations: ["The Dragon's Spine Peak", "Forgotten Monastery", "Crystal Caves"]
        }
      ];
      
      setWorld(worldData as WorldData);
      setRegions(regionData);
      setLoading(false);
    }, 1000);
  }, [worldId]);
  
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-pulse text-primary">Loading world details...</div>
      </div>
    );
  }
  
  if (!world) {
    return (
      <div className="flex h-screen items-center justify-center flex-col gap-4">
        <h1 className="text-2xl font-bold">World not found</h1>
        <p>We couldn't find the world you're looking for.</p>
        <Button onClick={() => setLocation('/voice-story-creation')}>
          Create a new story
        </Button>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-6 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{world.name}</h1>
          <p className="text-muted-foreground">
            {world.genre} • {world.setting}
          </p>
        </div>
        <Button onClick={() => setLocation('/voice-story-creation')}>
          Back to Story
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>World Overview</CardTitle>
            <CardDescription>The key aspects of this world</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="font-medium mb-2">Description</h3>
                <p className="text-muted-foreground">{world.description}</p>
              </div>
              
              <Separator />
              
              <div>
                <h3 className="font-medium mb-2">Time Period</h3>
                <p className="text-muted-foreground">{world.timeframe}</p>
              </div>
              
              <Separator />
              
              <div>
                <h3 className="font-medium mb-2">Key Conflicts</h3>
                <div className="flex flex-wrap gap-2">
                  {world.keyConflicts.map((conflict: string, i: number) => (
                    <Badge key={i} variant="secondary">{conflict}</Badge>
                  ))}
                </div>
              </div>
              
              <Separator />
              
              <div>
                <h3 className="font-medium mb-2">Important Figures</h3>
                <div className="flex flex-wrap gap-2">
                  {world.importantFigures.map((figure: string, i: number) => (
                    <Badge key={i} variant="outline">{figure}</Badge>
                  ))}
                </div>
              </div>
              
              <Separator />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-medium mb-2">Cultural Setting</h3>
                  <p className="text-muted-foreground">{world.culturalSetting}</p>
                </div>
                
                <div>
                  <h3 className="font-medium mb-2">Political System</h3>
                  <p className="text-muted-foreground">{world.politicalSystem}</p>
                </div>
              </div>
              
              <Separator />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-medium mb-2">Technology</h3>
                  <p className="text-muted-foreground">{world.technology}</p>
                </div>
                
                <div>
                  <h3 className="font-medium mb-2">Magic System</h3>
                  <p className="text-muted-foreground">{world.magicSystem || "No prevalent magic in this world"}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Regions</CardTitle>
            <CardDescription>Explore the different areas of {world.name}</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue={regions[0]?.name.toLowerCase().replace(/\s+/g, '-')}>
              <TabsList className="w-full mb-4">
                {regions.map((region, i) => (
                  <TabsTrigger 
                    key={i} 
                    value={region.name.toLowerCase().replace(/\s+/g, '-')}
                    className="flex-1"
                  >
                    {region.name.split(' ')[0]}
                  </TabsTrigger>
                ))}
              </TabsList>
              
              {regions.map((region, i) => (
                <TabsContent 
                  key={i} 
                  value={region.name.toLowerCase().replace(/\s+/g, '-')}
                  className="space-y-4"
                >
                  <h3 className="font-medium text-lg">{region.name}</h3>
                  <p className="text-muted-foreground">{region.description}</p>
                  
                  {region.notable_locations && region.notable_locations.length > 0 && (
                    <>
                      <h4 className="font-medium mt-4">Notable Locations</h4>
                      <ul className="list-disc pl-5 space-y-1">
                        {region.notable_locations.map((location, j) => (
                          <li key={j} className="text-muted-foreground">{location}</li>
                        ))}
                      </ul>
                    </>
                  )}
                  
                  {/* If we had region images, they would go here */}
                  {/* <div className="aspect-video bg-muted rounded-md mt-4 flex items-center justify-center">
                    {region.image ? (
                      <img 
                        src={region.image} 
                        alt={region.name} 
                        className="rounded-md object-cover w-full h-full"
                      />
                    ) : (
                      <div className="text-muted-foreground text-sm">No image available</div>
                    )}
                  </div> */}
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      </div>
      
      <div className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Story Map</CardTitle>
            <CardDescription>A visualization of {world.name}'s geography</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="aspect-[2/1] bg-muted rounded-md flex items-center justify-center">
              {/* This would be a map visualization component in a real app */}
              <div className="text-center p-6">
                <p className="text-muted-foreground mb-4">
                  The map of {world.name} will be generated as your story unfolds, revealing new locations
                  and landmarks as characters travel through the world.
                </p>
                <Button variant="outline">Generate World Map</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}