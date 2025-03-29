import React, { useEffect, useState } from 'react';
import { useLocation, Link } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/contexts/AuthContext';
import { Foundation, Character } from '@shared/schema';
import { ArrowLeft, RefreshCw, User, Users, Plus, Edit } from 'lucide-react';

// Type definition for the significant events in character evolution
interface SignificantEvent {
  title: string;
  date: string;
  description: string;
  impact: string;
}

// Extended type definition for Character Details
interface CharacterDetails {
  id?: number;
  foundationId: number;
  character_name: string;
  age?: number;
  gender?: string;
  occupation?: string;
  nationality_ethnicity?: string;
  current_residence?: string;
  
  // Physical attributes
  height_build?: string;
  hair_description?: string;
  eye_description?: string;
  skin_complexion?: string;
  facial_features?: string;
  distinctive_features?: string;
  body_type?: string;
  posture_body_language?: string;
  typical_attire?: string;
  
  // Backstory
  birthplace_family_background?: string;
  childhood_experiences?: string;
  education_training?: string;
  major_life_events?: string;
  current_life_circumstances?: string;
  
  // Personality
  personality_type?: string;
  core_beliefs_values?: string;
  fears_insecurities?: string;
  emotional_stability?: string;
  dominant_mood?: string;
  
  // Relationships
  family_dynamics?: string;
  friendships_social_life?: string;
  romantic_relationships?: string;
  professional_relationships?: string;
  enemies_rivals?: string;
  
  // Legacy fields
  role?: string;
  background?: string;
  personality?: string[];
  goals?: string[];
  fears?: string[];
  skills?: string[];
  appearance?: string;
  voice?: string;
  secrets?: string;
  quirks?: string[];
  motivations?: string[];
  flaws?: string[];
  
  // Character evolution
  character_type?: string;
  evolutionStage?: number;
  significantEvents?: SignificantEvent[];
  
  createdAt?: string;
  updatedAt?: string;
}

// Import type definition only
type DetailedCharacter = {
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
  secrets?: string;
  quirks?: string[];
  motivations?: string[];
  flaws?: string[];
};

const CharacterDetailsPage: React.FC = () => {
  const [location, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Get params from URL
  const params = new URLSearchParams(location.split('?')[1]);
  const foundationId = parseInt(params.get('foundationId') || '0');
  const characterId = parseInt(params.get('characterId') || '0');
  const isCreating = params.get('action') === 'create';
  
  // State to track if character is being generated
  const [isGenerating, setIsGenerating] = useState(false);
  const [characterName, setCharacterName] = useState('');
  const [characterRole, setCharacterRole] = useState('');
  
  // State for multi-character creation
  const [showAddMoreDialog, setShowAddMoreDialog] = useState(false);
  const [justCreatedCharacter, setJustCreatedCharacter] = useState<any>(null);
  
  // Query foundation
  const { 
    data: foundation, 
    isLoading: isLoadingFoundation
  } = useQuery<Foundation>({
    queryKey: [`/api/foundations/${foundationId}`],
    enabled: !!foundationId,
  });
  
  // Query character if not creating
  const {
    data: character,
    isLoading: isLoadingCharacter,
    refetch: refetchCharacter
  } = useQuery<Character>({
    queryKey: [`/api/characters/${characterId}`],
    enabled: !!characterId && !isCreating,
  });
  
  // Query character details if not creating
  const {
    data: characterDetails,
    isLoading: isLoadingCharacterDetails,
    refetch: refetchCharacterDetails
  } = useQuery<CharacterDetails>({
    queryKey: [`/api/character-details/${characterId}`],
    enabled: !!characterId && !isCreating,
  });
  
  // Query all characters for the foundation
  const {
    data: foundationCharacters = [],
    refetch: refetchFoundationCharacters
  } = useQuery<Character[]>({
    queryKey: [`/api/foundations/${foundationId}/characters`],
    enabled: !!foundationId,
  });
  
  // Generate character details mutation
  const generateCharacterMutation = useMutation({
    mutationFn: async (characterInput: { 
      name: string; 
      role?: string; 
      genre?: string;
      setting?: string;
      foundationId: number;
    }) => {
      const response = await apiRequest('POST', '/api/ai/detailed-character', {
        ...characterInput,
        foundationId: foundationId
      });
      return response.json();
    },
    onMutate: () => {
      setIsGenerating(true);
    },
    onSuccess: (generatedCharacter: DetailedCharacter) => {
      toast({
        title: 'Character generated',
        description: `${generatedCharacter.name} has been created.`,
      });
      
      // Save character to database
      createCharacterMutation.mutate({
        name: generatedCharacter.name,
        role: generatedCharacter.role,
        foundationId: foundationId,
        appearance: generatedCharacter.appearance,
        background: generatedCharacter.background,
        personality: generatedCharacter.personality.join(', '),
        goals: generatedCharacter.goals.join(', '),
        fears: generatedCharacter.fears.join(', '),
        relationships: generatedCharacter.relationships.join(', '),
        skills: generatedCharacter.skills.join(', '),
        voice: generatedCharacter.voice,
        secrets: generatedCharacter.secrets,
        quirks: generatedCharacter.quirks?.join(', '),
        motivations: generatedCharacter.motivations?.join(', '),
        flaws: generatedCharacter.flaws?.join(', ')
      });
      
      setIsGenerating(false);
    },
    onError: (error: any) => {
      toast({
        title: 'Generation failed',
        description: error.message || 'An error occurred while generating the character.',
        variant: 'destructive',
      });
      setIsGenerating(false);
    },
  });
  
  // Create character and character details mutation
  const createCharacterMutation = useMutation({
    mutationFn: async (characterData: { 
      name: string; 
      role: string; 
      foundationId: number;
      appearance?: string;
      background?: string;
      personality?: string;
      goals?: string;
      fears?: string;
      relationships?: string;
      skills?: string;
      voice?: string;
      secrets?: string;
      quirks?: string;
      motivations?: string;
      flaws?: string;
    }) => {
      // Use the combined endpoint to create character in both tables
      const response = await apiRequest('POST', '/api/character-creation/combined', {
        ...characterData,
        evolutionStage: 1,
        significantEvents: []
      });
      
      const result = await response.json();
      return result.character;
    },
    onSuccess: (newCharacter) => {
      // Save the created character for possible use in the dialog
      setJustCreatedCharacter(newCharacter);
      
      toast({
        title: 'Character created',
        description: `${newCharacter.name} has been saved to your foundation.`,
      });
      
      // Refresh character list
      refetchFoundationCharacters();
      
      // Check if this is the first character for this foundation
      if (foundationCharacters.length === 0) {
        // Show the dialog asking if they want to create more characters
        setShowAddMoreDialog(true);
      } else {
        // If not the first character, just navigate to the character view
        navigate(`/character-details?foundationId=${foundationId}&characterId=${newCharacter.id}`);
      }
    },
    onError: (error: any) => {
      toast({
        title: 'Save failed',
        description: error.message || 'An error occurred while saving the character.',
        variant: 'destructive',
      });
    },
  });
  
  // Update character mutation
  const updateCharacterMutation = useMutation({
    mutationFn: async (characterData: { 
      id: number;
      name?: string; 
      role?: string;
      [key: string]: any;
    }) => {
      const response = await apiRequest('PUT', `/api/characters/${characterData.id}`, characterData);
      return response.json();
    },
    onSuccess: (updatedCharacter) => {
      toast({
        title: 'Character updated',
        description: `${updatedCharacter.name} has been updated.`,
      });
      
      // Refresh character
      refetchCharacter();
    },
    onError: (error: any) => {
      toast({
        title: 'Update failed',
        description: error.message || 'An error occurred while updating the character.',
        variant: 'destructive',
      });
    },
  });
  
  const handleGenerateCharacter = () => {
    if (!characterName) {
      toast({
        title: 'Name required',
        description: 'Please enter a name for your character.',
        variant: 'destructive',
      });
      return;
    }
    
    generateCharacterMutation.mutate({
      name: characterName,
      role: characterRole,
      genre: foundation?.genre || '',
      setting: foundation?.description || '',
      foundationId: foundationId
    });
  };
  
  // Functions to handle creating more characters or viewing the created one
  const handleCreateMore = () => {
    // Reset form for creating another character
    setCharacterName('');
    setCharacterRole('');
    setShowAddMoreDialog(false);
    
    // Stay on the creation page with a clean form
    navigate(`/character-details?foundationId=${foundationId}&action=create`);
    
    toast({
      title: 'Create Another Character',
      description: 'Ready to create your next character!',
    });
  };
  
  const handleViewCharacter = () => {
    // Close the dialog
    setShowAddMoreDialog(false);
    
    // Navigate to the character details page
    if (justCreatedCharacter?.id) {
      navigate(`/character-details?foundationId=${foundationId}&characterId=${justCreatedCharacter.id}`);
    } else {
      // Fallback
      navigate(`/foundation-details?foundationId=${foundationId}`);
    }
  };
  
  // If loading foundation or character data (when viewing existing)
  if (isLoadingFoundation || (!isCreating && (isLoadingCharacter || isLoadingCharacterDetails))) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center mb-8">
          <Button variant="ghost" onClick={() => navigate(`/foundation-details?foundationId=${foundationId}`)} className="mr-4">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <div className="h-6 bg-neutral-200 rounded w-1/4 animate-pulse"></div>
        </div>
        
        <div className="grid grid-cols-1 gap-6">
          <div className="bg-white rounded-lg shadow-sm p-6 animate-pulse">
            <div className="h-8 bg-neutral-200 rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-neutral-200 rounded w-2/3 mb-2"></div>
            <div className="h-4 bg-neutral-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }
  
  if (!foundation) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center mb-8">
          <Button variant="ghost" onClick={() => navigate('/dashboard')} className="mr-4">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <h1 className="text-2xl font-bold">Foundation Not Found</h1>
        </div>
        
        <div className="text-center p-8 bg-white rounded-lg shadow-sm">
          <p className="text-neutral-600 mb-4">The foundation you're looking for could not be found.</p>
          <Button onClick={() => navigate('/dashboard')}>Return to Dashboard</Button>
        </div>
      </div>
    );
  }
  
  if (!isCreating && !character) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center mb-8">
          <Button variant="ghost" onClick={() => navigate(`/foundation-details?foundationId=${foundationId}`)} className="mr-4">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <h1 className="text-2xl font-bold">Character Not Found</h1>
        </div>
        
        <div className="text-center p-8 bg-white rounded-lg shadow-sm">
          <p className="text-neutral-600 mb-4">The character you're looking for could not be found.</p>
          <Button onClick={() => navigate(`/foundation-details?foundationId=${foundationId}`)}>Return to Foundation</Button>
        </div>
      </div>
    );
  }
  
  return (
    <>
      <div className="min-h-screen bg-neutral-50">
        <header className="bg-white border-b border-neutral-200 py-4">
          <div className="container mx-auto px-4 flex justify-between items-center">
            <div className="flex items-center">
              <Link href="/dashboard">
                <a className="text-primary-600 text-2xl font-bold">StoryFlow</a>
              </Link>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-neutral-600">
                Welcome, {user?.displayName || user?.username || 'Writer'}
              </span>
            </div>
          </div>
        </header>
        
        <main className="container mx-auto p-6">
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center">
              <Button 
                variant="ghost" 
                onClick={() => navigate(`/foundation-details?foundationId=${foundationId}`)} 
                className="mr-4"
              >
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
              </Button>
              <div>
                <h1 className="text-2xl font-bold flex items-center">
                  <User className="mr-2 h-6 w-6 text-primary-500" /> 
                  {isCreating ? 'Create Character' : character?.name}
                </h1>
                <p className="text-neutral-600">Foundation: {foundation.name}</p>
              </div>
            </div>
            
            {!isCreating && (
              <Button variant="outline" onClick={() => navigate(`/character-details?foundationId=${foundationId}&action=create`)}>
                <Plus className="mr-2 h-4 w-4" />
                New Character
              </Button>
            )}
          </div>

          {isCreating ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1">
                <Card>
                  <CardContent className="p-6">
                    <h2 className="text-xl font-bold mb-4">Character Creation</h2>
                    <p className="text-neutral-600 mb-6">
                      Let AI help you create a detailed character for your story world.
                      Provide a name and optional role, and we'll generate a complete character profile.
                    </p>
                    
                    <div className="space-y-4">
                      <div>
                        <label htmlFor="name" className="block text-sm font-medium text-neutral-700 mb-1">
                          Character Name *
                        </label>
                        <input
                          type="text"
                          id="name"
                          className="w-full p-2 border border-neutral-300 rounded-md"
                          value={characterName}
                          onChange={(e) => setCharacterName(e.target.value)}
                          placeholder="e.g. Alara Blackwood"
                        />
                      </div>
                      
                      <div>
                        <label htmlFor="role" className="block text-sm font-medium text-neutral-700 mb-1">
                          Character Role (Optional)
                        </label>
                        <input
                          type="text"
                          id="role"
                          className="w-full p-2 border border-neutral-300 rounded-md"
                          value={characterRole}
                          onChange={(e) => setCharacterRole(e.target.value)}
                          placeholder="e.g. Protagonist, Mentor, Villain"
                        />
                      </div>
                      
                      <Button 
                        onClick={handleGenerateCharacter} 
                        className="w-full"
                        disabled={isGenerating || generateCharacterMutation.isPending || createCharacterMutation.isPending}
                      >
                        <RefreshCw className={`mr-2 h-4 w-4 ${isGenerating ? 'animate-spin' : ''}`} />
                        {isGenerating ? 'Generating...' : 'Generate Character'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
                
                {foundationCharacters.length > 0 && (
                  <Card className="mt-6">
                    <CardContent className="p-6">
                      <h2 className="text-xl font-bold mb-4 flex items-center">
                        <Users className="mr-2 h-5 w-5" />
                        Existing Characters
                      </h2>
                      <div className="space-y-3">
                        {foundationCharacters.map((char) => (
                          <Button 
                            key={char.id} 
                            variant="outline" 
                            className="w-full justify-start"
                            onClick={() => navigate(`/character-details?foundationId=${foundationId}&characterId=${char.id}`)}
                          >
                            <User className="mr-2 h-4 w-4" />
                            {char.name}
                          </Button>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
              
              <div className="lg:col-span-2">
                {isGenerating ? (
                  <Card>
                    <CardContent className="p-6">
                      <div className="text-center py-12">
                        <RefreshCw className="h-12 w-12 text-primary-500 animate-spin mx-auto mb-4" />
                        <h2 className="text-xl font-bold mb-2">Generating Character...</h2>
                        <p className="text-neutral-600 max-w-md mx-auto">
                          We're crafting a detailed character profile including personality, background,
                          goals, fears, and more. This may take a moment.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="p-6">
                      <div className="text-center py-12">
                        <User className="h-16 w-16 text-neutral-300 mx-auto mb-4" />
                        <h2 className="text-xl font-bold mb-2">Character Creation</h2>
                        <p className="text-neutral-600 mb-6 max-w-md mx-auto">
                          Enter a name for your character and click "Generate Character" to create a detailed
                          character profile using AI.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          ) : (
            // Character details view
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1 space-y-6">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-2">
                      <h2 className="text-xl font-bold">{characterDetails?.character_name || character?.name}</h2>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => navigate(`/character-details?foundationId=${foundationId}&characterId=${characterId}&action=edit`)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-neutral-600 mb-6">{characterDetails?.occupation || character?.role}</p>
                    
                    <div>
                      <h3 className="font-semibold text-lg mb-2">Basic Information</h3>
                      <div className="space-y-3">
                        {characterDetails?.age && (
                          <div>
                            <span className="text-sm font-medium text-neutral-500">Age:</span>
                            <p className="text-neutral-600">{characterDetails.age}</p>
                          </div>
                        )}
                        {characterDetails?.gender && (
                          <div>
                            <span className="text-sm font-medium text-neutral-500">Gender:</span>
                            <p className="text-neutral-600">{characterDetails.gender}</p>
                          </div>
                        )}
                        {characterDetails?.nationality_ethnicity && (
                          <div>
                            <span className="text-sm font-medium text-neutral-500">Nationality/Ethnicity:</span>
                            <p className="text-neutral-600">{characterDetails.nationality_ethnicity}</p>
                          </div>
                        )}
                        {characterDetails?.current_residence && (
                          <div>
                            <span className="text-sm font-medium text-neutral-500">Current Residence:</span>
                            <p className="text-neutral-600">{characterDetails.current_residence}</p>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="mt-6">
                      <h3 className="font-semibold text-lg mb-2">Appearance</h3>
                      <div className="space-y-3">
                        {characterDetails?.height_build && (
                          <div>
                            <span className="text-sm font-medium text-neutral-500">Height/Build:</span>
                            <p className="text-neutral-600">{characterDetails.height_build}</p>
                          </div>
                        )}
                        {characterDetails?.hair_description && (
                          <div>
                            <span className="text-sm font-medium text-neutral-500">Hair:</span>
                            <p className="text-neutral-600">{characterDetails.hair_description}</p>
                          </div>
                        )}
                        {characterDetails?.eye_description && (
                          <div>
                            <span className="text-sm font-medium text-neutral-500">Eyes:</span>
                            <p className="text-neutral-600">{characterDetails.eye_description}</p>
                          </div>
                        )}
                        {characterDetails?.skin_complexion && (
                          <div>
                            <span className="text-sm font-medium text-neutral-500">Skin Complexion:</span>
                            <p className="text-neutral-600">{characterDetails.skin_complexion}</p>
                          </div>
                        )}
                        {characterDetails?.facial_features && (
                          <div>
                            <span className="text-sm font-medium text-neutral-500">Facial Features:</span>
                            <p className="text-neutral-600">{characterDetails.facial_features}</p>
                          </div>
                        )}
                        {characterDetails?.distinctive_features && (
                          <div>
                            <span className="text-sm font-medium text-neutral-500">Distinctive Features:</span>
                            <p className="text-neutral-600">{characterDetails.distinctive_features}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                {foundationCharacters.length > 0 && (
                  <Card>
                    <CardContent className="p-6">
                      <h2 className="text-xl font-bold mb-4 flex items-center">
                        <Users className="mr-2 h-5 w-5" />
                        Other Characters
                      </h2>
                      <div className="space-y-3">
                        {foundationCharacters
                          .filter((char) => char.id !== character?.id)
                          .map((char) => (
                            <Button 
                              key={char.id} 
                              variant="outline" 
                              className="w-full justify-start"
                              onClick={() => navigate(`/character-details?foundationId=${foundationId}&characterId=${char.id}`)}
                            >
                              <User className="mr-2 h-4 w-4" />
                              {char.name}
                            </Button>
                          ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
              
              <div className="lg:col-span-2 space-y-6">
                {/* Background Section */}
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-xl font-bold mb-4">Background</h3>
                    {characterDetails?.birthplace_family_background || characterDetails?.childhood_experiences ? (
                      <div className="space-y-4">
                        {characterDetails.birthplace_family_background && (
                          <div>
                            <h4 className="font-semibold text-md mb-1">Family & Origins</h4>
                            <p className="text-neutral-600 whitespace-pre-line">{characterDetails.birthplace_family_background}</p>
                          </div>
                        )}
                        {characterDetails.childhood_experiences && (
                          <div>
                            <h4 className="font-semibold text-md mb-1">Childhood</h4>
                            <p className="text-neutral-600 whitespace-pre-line">{characterDetails.childhood_experiences}</p>
                          </div>
                        )}
                        {characterDetails.education_training && (
                          <div>
                            <h4 className="font-semibold text-md mb-1">Education & Training</h4>
                            <p className="text-neutral-600 whitespace-pre-line">{characterDetails.education_training}</p>
                          </div>
                        )}
                        {characterDetails.major_life_events && (
                          <div>
                            <h4 className="font-semibold text-md mb-1">Major Life Events</h4>
                            <p className="text-neutral-600 whitespace-pre-line">{characterDetails.major_life_events}</p>
                          </div>
                        )}
                        {characterDetails.current_life_circumstances && (
                          <div>
                            <h4 className="font-semibold text-md mb-1">Current Circumstances</h4>
                            <p className="text-neutral-600 whitespace-pre-line">{characterDetails.current_life_circumstances}</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-neutral-600 whitespace-pre-line">{character?.background}</p>
                    )}
                  </CardContent>
                </Card>
                
                {/* Personality and Psychology Section */}
                {(characterDetails?.personality_type || 
                 characterDetails?.core_beliefs_values || 
                 characterDetails?.fears_insecurities ||
                 characterDetails?.emotional_stability ||
                 characterDetails?.dominant_mood) && (
                  <Card>
                    <CardContent className="p-6">
                      <h3 className="text-xl font-bold mb-4">Personality & Psychology</h3>
                      <div className="space-y-4">
                        {characterDetails.personality_type && (
                          <div>
                            <h4 className="font-semibold text-md mb-1">Personality Type</h4>
                            <p className="text-neutral-600">{characterDetails.personality_type}</p>
                          </div>
                        )}
                        {characterDetails.core_beliefs_values && (
                          <div>
                            <h4 className="font-semibold text-md mb-1">Core Beliefs & Values</h4>
                            <p className="text-neutral-600">{characterDetails.core_beliefs_values}</p>
                          </div>
                        )}
                        {characterDetails.fears_insecurities && (
                          <div>
                            <h4 className="font-semibold text-md mb-1">Fears & Insecurities</h4>
                            <p className="text-neutral-600">{characterDetails.fears_insecurities}</p>
                          </div>
                        )}
                        {characterDetails.emotional_stability && (
                          <div>
                            <h4 className="font-semibold text-md mb-1">Emotional Stability</h4>
                            <p className="text-neutral-600">{characterDetails.emotional_stability}</p>
                          </div>
                        )}
                        {characterDetails.dominant_mood && (
                          <div>
                            <h4 className="font-semibold text-md mb-1">Dominant Mood</h4>
                            <p className="text-neutral-600">{characterDetails.dominant_mood}</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardContent className="p-6">
                      <h3 className="text-xl font-bold mb-4">Personality Traits</h3>
                      <ul className="list-disc list-inside text-neutral-600">
                        {character?.personality && Array.isArray(character.personality) && 
                          character.personality.map((trait: string, index: number) => (
                            <li key={index}>{trait}</li>
                          ))
                        }
                      </ul>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-6">
                      <h3 className="text-xl font-bold mb-4">Skills & Abilities</h3>
                      <ul className="list-disc list-inside text-neutral-600">
                        {character?.skills && Array.isArray(character.skills) && 
                          character.skills.map((skill: string, index: number) => (
                            <li key={index}>{skill}</li>
                          ))
                        }
                      </ul>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-6">
                      <h3 className="text-xl font-bold mb-4">Goals</h3>
                      <ul className="list-disc list-inside text-neutral-600">
                        {character?.goals && Array.isArray(character.goals) && 
                          character.goals.map((goal: string, index: number) => (
                            <li key={index}>{goal}</li>
                          ))
                        }
                      </ul>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-6">
                      <h3 className="text-xl font-bold mb-4">Fears</h3>
                      <ul className="list-disc list-inside text-neutral-600">
                        {character?.fears && Array.isArray(character.fears) && 
                          character.fears.map((fear: string, index: number) => (
                            <li key={index}>{fear}</li>
                          ))
                        }
                      </ul>
                    </CardContent>
                  </Card>
                </div>
                
                {/* Character Evolution Section */}
                {Boolean((characterDetails?.evolutionStage && characterDetails.evolutionStage > 1) || 
                 (characterDetails?.significantEvents && Array.isArray(characterDetails.significantEvents) && characterDetails.significantEvents.length > 0)) && (
                  <Card>
                    <CardContent className="p-6">
                      <h3 className="text-xl font-bold mb-4">Character Evolution</h3>
                      <div className="mb-4">
                        <h4 className="font-semibold text-md mb-1">Evolution Stage</h4>
                        <p className="text-neutral-600">
                          {characterDetails?.evolutionStage === 1 ? 'Initial character development' : 
                           characterDetails?.evolutionStage === 2 ? 'Character development in progress' :
                           characterDetails?.evolutionStage === 3 ? 'Advanced character development' :
                           characterDetails?.evolutionStage === 4 ? 'Fully developed character' :
                           'Character evolution not tracked'}
                        </p>
                      </div>
                      
                      {Boolean(characterDetails?.significantEvents && Array.isArray(characterDetails.significantEvents) && characterDetails.significantEvents.length > 0) && (
                        <div>
                          <h4 className="font-semibold text-md mb-2">Significant Events</h4>
                          <ul className="divide-y divide-neutral-100">
                            {Array.isArray(characterDetails?.significantEvents) && characterDetails.significantEvents.map((event: SignificantEvent, index: number) => (
                              <li key={index} className="py-3">
                                <p className="font-medium text-neutral-700">{event.title}</p>
                                <p className="text-sm text-neutral-500">{new Date(event.date).toLocaleDateString()}</p>
                                <p className="mt-1 text-neutral-600">{event.description}</p>
                                <p className="mt-1 text-sm text-neutral-500">Impact: {event.impact}</p>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
                
                {/* Relationships Section */}
                
                {Boolean(characterDetails?.family_dynamics || 
                  characterDetails?.friendships_social_life || 
                  characterDetails?.romantic_relationships || 
                  characterDetails?.professional_relationships || 
                  characterDetails?.enemies_rivals) && (
                  <Card>
                    <CardContent className="p-6">
                      <h3 className="text-xl font-bold mb-4">Relationships</h3>
                      <div className="space-y-4">
                        {characterDetails?.family_dynamics && (
                          <div>
                            <h4 className="font-semibold text-md mb-1">Family Dynamics</h4>
                            <p className="text-neutral-600">{characterDetails.family_dynamics}</p>
                          </div>
                        )}
                        {characterDetails?.friendships_social_life && (
                          <div>
                            <h4 className="font-semibold text-md mb-1">Friendships & Social Life</h4>
                            <p className="text-neutral-600">{characterDetails.friendships_social_life}</p>
                          </div>
                        )}
                        {characterDetails?.romantic_relationships && (
                          <div>
                            <h4 className="font-semibold text-md mb-1">Romantic Relationships</h4>
                            <p className="text-neutral-600">{characterDetails.romantic_relationships}</p>
                          </div>
                        )}
                        {characterDetails?.professional_relationships && (
                          <div>
                            <h4 className="font-semibold text-md mb-1">Professional Relationships</h4>
                            <p className="text-neutral-600">{characterDetails.professional_relationships}</p>
                          </div>
                        )}
                        {characterDetails?.enemies_rivals && (
                          <div>
                            <h4 className="font-semibold text-md mb-1">Enemies & Rivals</h4>
                            <p className="text-neutral-600">{characterDetails.enemies_rivals}</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
                
                {character?.secrets && (
                  <Card>
                    <CardContent className="p-6">
                      <h3 className="text-xl font-bold mb-4">Secrets</h3>
                      <p className="text-neutral-600 whitespace-pre-line">{character.secrets}</p>
                    </CardContent>
                  </Card>
                )}
                
                {character?.quirks && Array.isArray(character.quirks) && (
                  <Card>
                    <CardContent className="p-6">
                      <h3 className="text-xl font-bold mb-4">Quirks</h3>
                      <ul className="list-disc list-inside text-neutral-600">
                        {character.quirks.map((quirk: string, index: number) => (
                          <li key={index}>{quirk}</li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
                
                {character?.motivations && Array.isArray(character.motivations) && (
                  <Card>
                    <CardContent className="p-6">
                      <h3 className="text-xl font-bold mb-4">Motivations</h3>
                      <ul className="list-disc list-inside text-neutral-600">
                        {character.motivations.map((motivation: string, index: number) => (
                          <li key={index}>{motivation}</li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
                
                {character?.flaws && Array.isArray(character.flaws) && (
                  <Card>
                    <CardContent className="p-6">
                      <h3 className="text-xl font-bold mb-4">Flaws</h3>
                      <ul className="list-disc list-inside text-neutral-600">
                        {character.flaws.map((flaw: string, index: number) => (
                          <li key={index}>{flaw}</li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
      
      {/* Dialog to ask about creating more characters */}
      <AlertDialog open={showAddMoreDialog} onOpenChange={setShowAddMoreDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Create Additional Characters?</AlertDialogTitle>
            <AlertDialogDescription>
              You've successfully created your first character: <strong>{justCreatedCharacter?.name}</strong>. 
              Would you like to create more characters for your foundation?
              (You can always add more characters later.)
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleViewCharacter}>
              No, View Character
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleCreateMore}>
              Yes, Create Another
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default CharacterDetailsPage;