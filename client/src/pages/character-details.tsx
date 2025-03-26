import React, { useEffect, useState } from 'react';
import { useLocation, useParams } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { apiRequest } from '@/lib/queryClient';
import { CharacterData } from '@/components/character/CharacterBuilder';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export default function CharacterDetailsPage() {
  const [, setLocation] = useLocation();
  const params = useParams();
  const characterId = params.id;
  
  const [loading, setLoading] = useState(true);
  const [character, setCharacter] = useState<CharacterData | null>(null);
  
  // Fetch character data
  useEffect(() => {
    // In a real app, this would fetch from the API
    // For now, we'll just use mock data based on the character ID
    
    // This would be an API call in a production app:
    // apiRequest(`/api/characters/${characterId}`)
    //   .then(data => {
    //     setCharacter(data);
    //     setLoading(false);
    //   })
    //   .catch(err => {
    //     console.error("Error loading character data", err);
    //     setLoading(false);
    //   });
    
    // For now, we'll just set some placeholder data
    setTimeout(() => {
      const characterData = {
        id: parseInt(characterId || '1'),
        name: "Elara Moonwhisper",
        role: "Protagonist",
        background: "Born under a rare blue moon in the village of Willowbrook, Elara discovered her talent for sensing magical currents at a young age. After her village was threatened by a dark enchantment, she left to seek knowledge that could protect her home and loved ones.",
        personality: ["Curious", "Determined", "Compassionate", "Quick-witted"],
        goals: ["Discover the source of the spreading darkness", "Master the ancient art of moonlight magic", "Protect those who cannot protect themselves"],
        fears: ["Failing those who depend on her", "Losing her connection to magic", "The darkness within herself"],
        relationships: ["Mentor - Thistlewick the Sage", "Friend - Rowan the Hunter", "Rival - Valerian of the High Tower"],
        skills: ["Moonlight Sensing", "Herbal Remedies", "Ancient Languages", "Quick Reflexes"],
        appearance: "Slender with flowing silver-white hair and striking violet eyes. Often wears practical travel clothes with a moonstone pendant that glows softly in the dark.",
        voice: "Melodic and calming, with a subtle accent that hints at her rural origins.",
        depth: 4
      };
      
      setCharacter(characterData as CharacterData);
      setLoading(false);
    }, 1000);
  }, [characterId]);
  
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-pulse text-primary">Loading character details...</div>
      </div>
    );
  }
  
  if (!character) {
    return (
      <div className="flex h-screen items-center justify-center flex-col gap-4">
        <h1 className="text-2xl font-bold">Character not found</h1>
        <p>We couldn't find the character you're looking for.</p>
        <Button onClick={() => setLocation('/voice-story-creation')}>
          Create a new story
        </Button>
      </div>
    );
  }
  
  // Generate a color based on the character name for the avatar fallback
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };
  
  const getRandomColor = (name: string) => {
    const colors = [
      'bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-yellow-500', 
      'bg-lime-500', 'bg-green-500', 'bg-emerald-500', 'bg-teal-500', 
      'bg-cyan-500', 'bg-sky-500', 'bg-blue-500', 'bg-indigo-500', 
      'bg-violet-500', 'bg-purple-500', 'bg-fuchsia-500', 'bg-pink-500', 
      'bg-rose-500'
    ];
    
    // Using character name to generate a consistent color
    let sum = 0;
    for (let i = 0; i < name.length; i++) {
      sum += name.charCodeAt(i);
    }
    
    return colors[sum % colors.length];
  };
  
  return (
    <div className="container mx-auto py-6 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{character.name}</h1>
          <p className="text-muted-foreground">
            {character.role}
          </p>
        </div>
        <Button onClick={() => setLocation('/voice-story-creation')}>
          Back to Story
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Basic details about this character</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <Avatar className="h-48 w-48">
              {/* Replace with actual character image if available */}
              {/* <AvatarImage src={character.image} alt={character.name} /> */}
              <AvatarFallback className={`text-5xl ${getRandomColor(character.name)}`}>
                {getInitials(character.name)}
              </AvatarFallback>
            </Avatar>
            
            <div className="mt-6 text-center">
              <h2 className="text-xl font-bold">{character.name}</h2>
              <p className="text-sm text-muted-foreground">{character.role}</p>
            </div>
            
            <Separator className="my-4" />
            
            <div className="w-full space-y-2">
              <div>
                <h3 className="text-sm font-medium">Voice</h3>
                <p className="text-sm text-muted-foreground">{character.voice}</p>
              </div>
              
              <div>
                <h3 className="text-sm font-medium">Appearance</h3>
                <p className="text-sm text-muted-foreground">{character.appearance}</p>
              </div>
            </div>
            
            <Separator className="my-4" />
            
            <Button variant="outline" className="w-full">
              Generate Character Image
            </Button>
          </CardContent>
        </Card>
        
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Character Overview</CardTitle>
            <CardDescription>The key aspects of {character.name}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="font-medium mb-2">Background</h3>
                <p className="text-muted-foreground">{character.background}</p>
              </div>
              
              <Separator />
              
              <div>
                <h3 className="font-medium mb-2">Personality</h3>
                <div className="flex flex-wrap gap-2">
                  {character.personality.map((trait, i) => (
                    <Badge key={i} variant="secondary">{trait}</Badge>
                  ))}
                </div>
              </div>
              
              <Separator />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-medium mb-2">Goals</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    {character.goals.map((goal, i) => (
                      <li key={i} className="text-muted-foreground">{goal}</li>
                    ))}
                  </ul>
                </div>
                
                <div>
                  <h3 className="font-medium mb-2">Fears</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    {character.fears.map((fear, i) => (
                      <li key={i} className="text-muted-foreground">{fear}</li>
                    ))}
                  </ul>
                </div>
              </div>
              
              <Separator />
              
              <div>
                <h3 className="font-medium mb-2">Skills & Abilities</h3>
                <div className="flex flex-wrap gap-2">
                  {character.skills.map((skill, i) => (
                    <Badge key={i} variant="outline">{skill}</Badge>
                  ))}
                </div>
              </div>
              
              <Separator />
              
              <div>
                <h3 className="font-medium mb-2">Relationships</h3>
                {character.relationships && character.relationships.length > 0 ? (
                  <ul className="list-disc pl-5 space-y-1">
                    {character.relationships.map((relationship, i) => (
                      <li key={i} className="text-muted-foreground">{relationship}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground">No established relationships yet.</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Story Journal</CardTitle>
            <CardDescription>Track {character.name}'s journey through the narrative</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border border-dashed border-muted-foreground/50 rounded-md p-6 text-center">
              <p className="text-muted-foreground mb-4">
                As your story progresses, significant events and character developments
                will be recorded here to help you track {character.name}'s journey.
              </p>
              <Button variant="outline">Begin Journey</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}