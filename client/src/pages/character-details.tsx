import React, { useEffect, useState } from 'react';
import { useLocation, useParams } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { apiRequest } from '@/lib/queryClient';
import { CharacterData } from '@/components/character/CharacterBuilder';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Camera, User, RefreshCw, Heart, Bookmark, Brain, BookOpen, MessageCircle, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { generateCharacterPortrait, generateCharacterScene } from '@/lib/image-generation';

// Extended character interface based on Hyper-Realistic Character Creator
interface ExtendedCharacter extends CharacterData {
  // Basic Info
  age?: string;
  gender?: string;
  occupation?: string;
  nationality?: string;
  residence?: string;
  
  // Physical Description
  height?: string;
  build?: string;
  hairDetails?: string;
  eyeDetails?: string;
  skinTone?: string;
  facialFeatures?: { [key: string]: string };
  distinctiveFeatures?: string[];
  bodyType?: string;
  posture?: string;
  typicalAttire?: string;
  generalImpression?: string;
  
  // Psychological and Emotional Profile
  personalityType?: string;
  coreBeliefs?: string[];
  emotionalTriggers?: string[];
  emotionalStrengths?: string[];
  emotionalWeaknesses?: string[];
  conflictResponse?: string;
  
  // Speech and Preferences
  accent?: string;
  speechPace?: string;
  commonPhrases?: string[];
  formalityLevel?: string;
  hobbies?: string[];
  favorites?: { [key: string]: string };
  petPeeves?: string[];
  
  // Secrets and Internal Conflicts
  hiddenAspects?: string[];
  contradictions?: string[];
  internalConflicts?: string[];
  
  // Generated Images
  avatar?: string;
  images?: string[];
}

export default function CharacterDetailsPage() {
  const [, setLocation] = useLocation();
  const params = useParams();
  const characterId = params.id;
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [character, setCharacter] = useState<ExtendedCharacter | null>(null);
  const [isGeneratingAvatar, setIsGeneratingAvatar] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  
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
      const characterData: ExtendedCharacter = {
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
        depth: 4,
        
        // Extended information
        age: "22",
        gender: "Female",
        occupation: "Apprentice Mage",
        nationality: "Willowbrook Native",
        residence: "The Arcane Academy",
        
        height: "5'7\"",
        build: "Slender and graceful",
        hairDetails: "Long, flowing silver-white hair that seems to shimmer in moonlight",
        eyeDetails: "Striking violet eyes with an unusual depth that hints at magical sensitivity",
        skinTone: "Pale with a subtle luminescence",
        facialFeatures: {
          nose: "Small and straight",
          jawline: "Delicate but defined",
          cheekbones: "High and elegant",
          lips: "Full and often curved in a curious smile"
        },
        distinctiveFeatures: [
          "A small crescent moon birthmark behind her right ear",
          "Fingers that occasionally emit a faint blue glow when she's emotional",
          "Eyes that seem to shift in color intensity with the phases of the moon"
        ],
        bodyType: "Lithe and agile, moving with natural grace",
        posture: "Poised and balanced, always alert and ready",
        typicalAttire: "Practical traveling clothes in blues and silvers, always wearing her protective moonstone pendant, comfortable boots, and a cloak that seems to blend with shadows",
        
        personalityType: "INFJ - The Advocate",
        coreBeliefs: [
          "Knowledge should be used to protect and heal",
          "All living things are connected by invisible threads of energy",
          "True strength comes from understanding, not dominance"
        ],
        emotionalTriggers: [
          "Memories of the dark enchantment that threatened her village",
          "Witnessing the abuse of power or magic used for harm",
          "Being underestimated due to her gentle appearance"
        ],
        emotionalStrengths: ["Empathy", "Resilience", "Self-awareness"],
        emotionalWeaknesses: ["Self-doubt", "Tendency to carry others' burdens", "Occasional melancholy"],
        conflictResponse: "Initially seeks peaceful resolution through understanding and compromise. If forced to fight, uses strategy and preparation rather than brute force, often finding unexpected solutions.",
        
        accent: "Soft countryside accent with a musical quality",
        speechPace: "Measured and thoughtful, speeding up when excited about discoveries",
        commonPhrases: [
          "The moon reveals what the sun conceals",
          "In stillness, the currents speak clearly",
          "Every shadow holds a secret"
        ],
        formalityLevel: "Adapts easily between formal academic language and warm, casual conversation",
        hobbies: ["Stargazing", "Collecting unusual herbs", "Creating minor enchantments", "Playing the reed flute"],
        favorites: {
          food: "Elderberry tarts",
          drink: "Moonmint tea",
          place: "The ancient willow grove outside the Academy",
          book: "The Hidden Languages of Natural Magic"
        },
        petPeeves: ["Closed-mindedness", "Disregard for nature", "Misuse of knowledge"],
        
        hiddenAspects: [
          "Fears her growing powers may be linked to the same darkness that threatened her village",
          "Occasionally hears whispers from the moonstone pendant that no one else can hear"
        ],
        contradictions: [
          "Despite her gentle nature, can be fiercely determined to the point of recklessness",
          "Seeks connection yet maintains a mysterious distance from even close friends"
        ],
        internalConflicts: [
          "Drawn to ancient, potentially dangerous knowledge while fearing its consequences",
          "Struggles between her duty to her village and her desire to explore the wider world",
          "Questions whether her unique abilities are a gift or a burden"
        ],
        
        // Generated Images (would be populated by API)
        images: []
      };
      
      setCharacter(characterData);
      setLoading(false);
    }, 1000);
  }, [characterId]);
  
  // Generate character avatar
  const generateAvatar = async () => {
    if (!character) return;
    
    setIsGeneratingAvatar(true);
    try {
      const imageUrl = await generateCharacterPortrait({
        name: character.name,
        appearance: character.appearance,
        gender: character.gender,
        age: character.age,
        hairDetails: character.hairDetails,
        eyeDetails: character.eyeDetails
      });
      
      toast({
        title: "Avatar Generated",
        description: "Successfully generated portrait of " + character.name,
      });
      
      // Update the character's avatar
      setCharacter(prev => prev ? { ...prev, avatar: imageUrl } : null);
    } catch (error) {
      console.error("Error generating avatar:", error);
      toast({
        title: "Generation Failed",
        description: "Unable to generate a character avatar. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGeneratingAvatar(false);
    }
  };
  
  // Generate character scene image
  const generateImage = async () => {
    if (!character) return;
    
    setIsGeneratingImage(true);
    try {
      const imageUrl = await generateCharacterScene({
        name: character.name,
        appearance: character.appearance,
        typicalAttire: character.typicalAttire
      });
      
      toast({
        title: "Scene Generated",
        description: "Successfully generated a scene featuring " + character.name,
      });
      
      // Update the character's images array
      const newImages = character.images ? [...character.images, imageUrl] : [imageUrl];
      setCharacter(prev => prev ? { ...prev, images: newImages } : null);
    } catch (error) {
      console.error("Error generating image:", error);
      toast({
        title: "Generation Failed",
        description: "Unable to generate a character scene. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGeneratingImage(false);
    }
  };
  
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
            {character.role} • {character.occupation}
          </p>
        </div>
        <Button onClick={() => setLocation('/voice-story-creation')}>
          Back to Story
        </Button>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - Character portrait and basic info */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Character Profile</CardTitle>
            <CardDescription>Visual representation and basic details</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <div className="relative">
              <Avatar className="h-48 w-48 border-2 border-primary/20">
                {character.avatar ? (
                  <AvatarImage src={character.avatar} alt={character.name} />
                ) : (
                  <AvatarFallback className={`text-5xl ${getRandomColor(character.name)}`}>
                    {getInitials(character.name)}
                  </AvatarFallback>
                )}
              </Avatar>
              <Button 
                variant="secondary" 
                size="icon" 
                className="absolute bottom-0 right-0 rounded-full" 
                onClick={generateAvatar}
                disabled={isGeneratingAvatar}
              >
                {isGeneratingAvatar ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
              </Button>
            </div>
            
            <div className="mt-6 text-center">
              <h2 className="text-xl font-bold">{character.name}</h2>
              <p className="text-sm text-muted-foreground">{character.role} • {character.age} • {character.gender}</p>
            </div>
            
            <Separator className="my-4" />
            
            <div className="w-full space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <h3 className="text-sm font-medium">Occupation</h3>
                  <p className="text-sm text-muted-foreground">{character.occupation || 'Unknown'}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium">Nationality</h3>
                  <p className="text-sm text-muted-foreground">{character.nationality || 'Unknown'}</p>
                </div>
              </div>
              
              <div>
                <h3 className="text-sm font-medium">Current Residence</h3>
                <p className="text-sm text-muted-foreground">{character.residence || 'Unknown'}</p>
              </div>
              
              <div>
                <h3 className="text-sm font-medium">Voice</h3>
                <p className="text-sm text-muted-foreground">{character.voice}</p>
              </div>
              
              <div>
                <h3 className="text-sm font-medium">Personality Type</h3>
                <p className="text-sm text-muted-foreground">{character.personalityType || 'Unknown'}</p>
              </div>
            </div>
            
            <Separator className="my-4" />
            
            <div className="space-y-3 w-full">
              <Button 
                variant="outline" 
                className="w-full flex items-center gap-2" 
                onClick={generateImage}
                disabled={isGeneratingImage}
              >
                {isGeneratingImage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                Generate Character Scene
              </Button>
              
              <Button variant="secondary" className="w-full flex items-center gap-2">
                <MessageCircle className="h-4 w-4" />
                Talk to Character
              </Button>
            </div>
          </CardContent>
        </Card>
        
        {/* Right column - Character details in tabs */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <Tabs defaultValue="overview">
              <TabsList className="grid grid-cols-4 mb-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="physical">Physical</TabsTrigger>
                <TabsTrigger value="psychological">Psychology</TabsTrigger>
                <TabsTrigger value="gallery">Gallery</TabsTrigger>
              </TabsList>
              
              <TabsContent value="overview" className="mt-0">
                <CardTitle>Character Overview</CardTitle>
                <CardDescription>The essential aspects of {character.name}'s character</CardDescription>
              </TabsContent>
              
              <TabsContent value="physical" className="mt-0">
                <CardTitle>Physical Description</CardTitle>
                <CardDescription>How {character.name} appears to others</CardDescription>
              </TabsContent>
              
              <TabsContent value="psychological" className="mt-0">
                <CardTitle>Psychological Profile</CardTitle>
                <CardDescription>The inner workings of {character.name}'s mind</CardDescription>
              </TabsContent>
              
              <TabsContent value="gallery" className="mt-0">
                <CardTitle>Character Gallery</CardTitle>
                <CardDescription>Visual renditions of {character.name} in various scenes</CardDescription>
              </TabsContent>
            </Tabs>
          </CardHeader>
          
          <CardContent>
            <Tabs defaultValue="overview">
              {/* OVERVIEW TAB */}
              <TabsContent value="overview" className="mt-0">
                <ScrollArea className="h-[60vh] pr-4">
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-medium mb-2 flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-primary" />
                        Background
                      </h3>
                      <p className="text-muted-foreground">{character.background}</p>
                    </div>
                    
                    <Separator />
                    
                    <div>
                      <h3 className="font-medium mb-2 flex items-center gap-2">
                        <User className="h-4 w-4 text-primary" />
                        Personality
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {character.personality.map((trait, i) => (
                          <Badge key={i} variant="secondary">{trait}</Badge>
                        ))}
                      </div>
                    </div>
                    
                    <Separator />
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h3 className="font-medium mb-2 flex items-center gap-2">
                          <Bookmark className="h-4 w-4 text-primary" />
                          Goals
                        </h3>
                        <ul className="list-disc pl-5 space-y-1">
                          {character.goals.map((goal, i) => (
                            <li key={i} className="text-muted-foreground">{goal}</li>
                          ))}
                        </ul>
                      </div>
                      
                      <div>
                        <h3 className="font-medium mb-2 flex items-center gap-2">
                          <Heart className="h-4 w-4 text-primary" />
                          Fears
                        </h3>
                        <ul className="list-disc pl-5 space-y-1">
                          {character.fears.map((fear, i) => (
                            <li key={i} className="text-muted-foreground">{fear}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                    
                    <Separator />
                    
                    <div>
                      <h3 className="font-medium mb-2 flex items-center gap-2">
                        <Brain className="h-4 w-4 text-primary" />
                        Core Beliefs
                      </h3>
                      {character.coreBeliefs && character.coreBeliefs.length > 0 ? (
                        <ul className="list-disc pl-5 space-y-1">
                          {character.coreBeliefs.map((belief, i) => (
                            <li key={i} className="text-muted-foreground">{belief}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-muted-foreground">No core beliefs have been defined yet.</p>
                      )}
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
                    
                    <Separator />
                    
                    <div>
                      <h3 className="font-medium mb-2">Hidden Aspects & Secrets</h3>
                      {character.hiddenAspects && character.hiddenAspects.length > 0 ? (
                        <ul className="list-disc pl-5 space-y-1">
                          {character.hiddenAspects.map((secret, i) => (
                            <li key={i} className="text-muted-foreground">{secret}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-muted-foreground">No hidden aspects revealed yet.</p>
                      )}
                    </div>
                  </div>
                </ScrollArea>
              </TabsContent>
              
              {/* PHYSICAL DESCRIPTION TAB */}
              <TabsContent value="physical" className="mt-0">
                <ScrollArea className="h-[60vh] pr-4">
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-medium mb-2">Appearance</h3>
                      <p className="text-muted-foreground">{character.appearance}</p>
                    </div>
                    
                    <Separator />
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h3 className="font-medium mb-2">Height & Build</h3>
                        <p className="text-muted-foreground">{character.height || 'Unknown'}, {character.build || 'Unknown'}</p>
                      </div>
                      
                      <div>
                        <h3 className="font-medium mb-2">Body Type</h3>
                        <p className="text-muted-foreground">{character.bodyType || 'Unknown'}</p>
                      </div>
                    </div>
                    
                    <Separator />
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h3 className="font-medium mb-2">Hair</h3>
                        <p className="text-muted-foreground">{character.hairDetails || 'Unknown'}</p>
                      </div>
                      
                      <div>
                        <h3 className="font-medium mb-2">Eyes</h3>
                        <p className="text-muted-foreground">{character.eyeDetails || 'Unknown'}</p>
                      </div>
                    </div>
                    
                    <Separator />
                    
                    <div>
                      <h3 className="font-medium mb-2">Skin Tone</h3>
                      <p className="text-muted-foreground">{character.skinTone || 'Unknown'}</p>
                    </div>
                    
                    <Separator />
                    
                    <div>
                      <h3 className="font-medium mb-2">Facial Features</h3>
                      {character.facialFeatures ? (
                        <div className="grid grid-cols-2 gap-3">
                          {Object.entries(character.facialFeatures).map(([feature, description]) => (
                            <div key={feature}>
                              <h4 className="text-sm font-medium capitalize">{feature}</h4>
                              <p className="text-sm text-muted-foreground">{description}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-muted-foreground">No detailed facial features recorded.</p>
                      )}
                    </div>
                    
                    <Separator />
                    
                    <div>
                      <h3 className="font-medium mb-2">Distinctive Features</h3>
                      {character.distinctiveFeatures && character.distinctiveFeatures.length > 0 ? (
                        <ul className="list-disc pl-5 space-y-1">
                          {character.distinctiveFeatures.map((feature, i) => (
                            <li key={i} className="text-muted-foreground">{feature}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-muted-foreground">No distinctive features recorded.</p>
                      )}
                    </div>
                    
                    <Separator />
                    
                    <div>
                      <h3 className="font-medium mb-2">Posture & Body Language</h3>
                      <p className="text-muted-foreground">{character.posture || 'No specific posture or body language recorded.'}</p>
                    </div>
                    
                    <Separator />
                    
                    <div>
                      <h3 className="font-medium mb-2">Typical Attire</h3>
                      <p className="text-muted-foreground">{character.typicalAttire || 'No specific clothing preferences recorded.'}</p>
                    </div>
                  </div>
                </ScrollArea>
              </TabsContent>
              
              {/* PSYCHOLOGICAL PROFILE TAB */}
              <TabsContent value="psychological" className="mt-0">
                <ScrollArea className="h-[60vh] pr-4">
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-medium mb-2">Personality Type</h3>
                      <p className="text-muted-foreground">{character.personalityType || 'Unknown personality type'}</p>
                    </div>
                    
                    <Separator />
                    
                    <div>
                      <h3 className="font-medium mb-2">Core Beliefs & Values</h3>
                      {character.coreBeliefs && character.coreBeliefs.length > 0 ? (
                        <ul className="list-disc pl-5 space-y-1">
                          {character.coreBeliefs.map((belief, i) => (
                            <li key={i} className="text-muted-foreground">{belief}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-muted-foreground">No core beliefs have been defined yet.</p>
                      )}
                    </div>
                    
                    <Separator />
                    
                    <div>
                      <h3 className="font-medium mb-2">Emotional Triggers</h3>
                      {character.emotionalTriggers && character.emotionalTriggers.length > 0 ? (
                        <ul className="list-disc pl-5 space-y-1">
                          {character.emotionalTriggers.map((trigger, i) => (
                            <li key={i} className="text-muted-foreground">{trigger}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-muted-foreground">No emotional triggers have been identified yet.</p>
                      )}
                    </div>
                    
                    <Separator />
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h3 className="font-medium mb-2">Emotional Strengths</h3>
                        {character.emotionalStrengths && character.emotionalStrengths.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {character.emotionalStrengths.map((strength, i) => (
                              <Badge key={i} variant="secondary">{strength}</Badge>
                            ))}
                          </div>
                        ) : (
                          <p className="text-muted-foreground">No emotional strengths identified yet.</p>
                        )}
                      </div>
                      
                      <div>
                        <h3 className="font-medium mb-2">Emotional Weaknesses</h3>
                        {character.emotionalWeaknesses && character.emotionalWeaknesses.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {character.emotionalWeaknesses.map((weakness, i) => (
                              <Badge key={i} variant="outline">{weakness}</Badge>
                            ))}
                          </div>
                        ) : (
                          <p className="text-muted-foreground">No emotional weaknesses identified yet.</p>
                        )}
                      </div>
                    </div>
                    
                    <Separator />
                    
                    <div>
                      <h3 className="font-medium mb-2">Response to Conflict</h3>
                      <p className="text-muted-foreground">{character.conflictResponse || 'No specific conflict response pattern recorded.'}</p>
                    </div>
                    
                    <Separator />
                    
                    <div>
                      <h3 className="font-medium mb-2">Speech Patterns</h3>
                      <div className="space-y-2">
                        <div>
                          <h4 className="text-sm font-medium">Accent & Pace</h4>
                          <p className="text-sm text-muted-foreground">
                            {character.accent ? character.accent + ', ' : ''}
                            {character.speechPace || 'No specific speech patterns recorded.'}
                          </p>
                        </div>
                        
                        {character.commonPhrases && character.commonPhrases.length > 0 && (
                          <div>
                            <h4 className="text-sm font-medium">Common Phrases</h4>
                            <ul className="list-disc pl-5 space-y-1">
                              {character.commonPhrases.map((phrase, i) => (
                                <li key={i} className="text-sm text-muted-foreground italic">"{phrase}"</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <Separator />
                    
                    <div>
                      <h3 className="font-medium mb-2">Internal Conflicts</h3>
                      {character.internalConflicts && character.internalConflicts.length > 0 ? (
                        <ul className="list-disc pl-5 space-y-1">
                          {character.internalConflicts.map((conflict, i) => (
                            <li key={i} className="text-muted-foreground">{conflict}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-muted-foreground">No internal conflicts have been identified yet.</p>
                      )}
                    </div>
                    
                    <Separator />
                    
                    <div>
                      <h3 className="font-medium mb-2">Personal Contradictions</h3>
                      {character.contradictions && character.contradictions.length > 0 ? (
                        <ul className="list-disc pl-5 space-y-1">
                          {character.contradictions.map((contradiction, i) => (
                            <li key={i} className="text-muted-foreground">{contradiction}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-muted-foreground">No personal contradictions have been identified yet.</p>
                      )}
                    </div>
                  </div>
                </ScrollArea>
              </TabsContent>
              
              {/* GALLERY TAB */}
              <TabsContent value="gallery" className="mt-0">
                <div className="space-y-4">
                  {character.images && character.images.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {character.images.map((image, i) => (
                        <div key={i} className="rounded-md overflow-hidden">
                          <img 
                            src={image} 
                            alt={`${character.name} scene ${i+1}`} 
                            className="w-full h-auto aspect-video object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-muted rounded-lg p-6 text-center">
                      <p className="text-muted-foreground mb-4">
                        No images have been generated for this character yet.
                      </p>
                      <Button onClick={generateImage} disabled={isGeneratingImage}>
                        {isGeneratingImage ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <Camera className="h-4 w-4 mr-2" />
                            Generate First Image
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                  
                  {character.images && character.images.length > 0 && (
                    <div className="flex justify-center mt-4">
                      <Button 
                        onClick={generateImage} 
                        disabled={isGeneratingImage}
                        className="flex items-center gap-2"
                      >
                        {isGeneratingImage ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <Camera className="h-4 w-4" />
                            Generate New Image
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
      
      <div className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Character Companion</CardTitle>
            <CardDescription>Have a conversation with {character.name} to learn more about them</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border border-dashed border-muted-foreground/50 rounded-md p-6 text-center">
              <p className="text-muted-foreground mb-4">
                You can ask {character.name} questions about their past, their motivations, or how they would 
                react in specific situations. This helps deepen your understanding of the character.
              </p>
              <div className="flex gap-2 justify-center">
                <Button variant="outline" className="flex items-center gap-2">
                  <Send className="h-4 w-4" />
                  Start Conversation
                </Button>
                <Button variant="secondary" className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Analyze Character
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}