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
import { ArrowLeft, RefreshCw, User, Users, Plus } from 'lucide-react';

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
  
  // Create character mutation
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
      const response = await apiRequest('POST', '/api/characters', characterData);
      return response.json();
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
  
  // If loading foundation or character (when viewing existing)
  if (isLoadingFoundation || (!isCreating && isLoadingCharacter)) {
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
                    <h2 className="text-xl font-bold mb-2">{character?.name}</h2>
                    <p className="text-neutral-600 mb-6">{character?.role}</p>
                    
                    <div>
                      <h3 className="font-semibold text-lg mb-2">Appearance</h3>
                      <p className="text-neutral-600 mb-4">{character?.appearance}</p>
                    </div>
                    
                    <div>
                      <h3 className="font-semibold text-lg mb-2">Voice</h3>
                      <p className="text-neutral-600">{character?.voice}</p>
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
                <Card>
                  <CardContent className="p-6">
                    <h3 className="text-xl font-bold mb-4">Background</h3>
                    <p className="text-neutral-600 whitespace-pre-line">{character?.background}</p>
                  </CardContent>
                </Card>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardContent className="p-6">
                      <h3 className="text-xl font-bold mb-4">Personality Traits</h3>
                      <ul className="list-disc list-inside text-neutral-600">
                        {character?.personality && typeof character.personality === 'string' && 
                          character.personality.split(',').map((trait: string, index: number) => (
                            <li key={index}>{trait.trim()}</li>
                          ))}
                      </ul>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-6">
                      <h3 className="text-xl font-bold mb-4">Skills & Abilities</h3>
                      <ul className="list-disc list-inside text-neutral-600">
                        {character?.skills && typeof character.skills === 'string' && 
                          character.skills.split(',').map((skill: string, index: number) => (
                            <li key={index}>{skill.trim()}</li>
                          ))}
                      </ul>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-6">
                      <h3 className="text-xl font-bold mb-4">Goals</h3>
                      <ul className="list-disc list-inside text-neutral-600">
                        {character?.goals && typeof character.goals === 'string' && 
                          character.goals.split(',').map((goal: string, index: number) => (
                            <li key={index}>{goal.trim()}</li>
                          ))}
                      </ul>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-6">
                      <h3 className="text-xl font-bold mb-4">Fears</h3>
                      <ul className="list-disc list-inside text-neutral-600">
                        {character?.fears && typeof character.fears === 'string' && 
                          character.fears.split(',').map((fear: string, index: number) => (
                            <li key={index}>{fear.trim()}</li>
                          ))}
                      </ul>
                    </CardContent>
                  </Card>
                </div>
                
                {character?.relationships && (
                  <Card>
                    <CardContent className="p-6">
                      <h3 className="text-xl font-bold mb-4">Relationships</h3>
                      <ul className="list-disc list-inside text-neutral-600">
                        {typeof character.relationships === 'string' && 
                          character.relationships.split(',').map((relationship: string, index: number) => (
                            <li key={index}>{relationship.trim()}</li>
                          ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
                
                {character?.secrets && (
                  <Card>
                    <CardContent className="p-6">
                      <h3 className="text-xl font-bold mb-4">Secrets</h3>
                      <p className="text-neutral-600 whitespace-pre-line">{character?.secrets}</p>
                    </CardContent>
                  </Card>
                )}
                
                {character?.quirks && (
                  <Card>
                    <CardContent className="p-6">
                      <h3 className="text-xl font-bold mb-4">Quirks</h3>
                      <ul className="list-disc list-inside text-neutral-600">
                        {typeof character.quirks === 'string' && 
                          character.quirks.split(',').map((quirk: string, index: number) => (
                            <li key={index}>{quirk.trim()}</li>
                          ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
                
                {character?.motivations && (
                  <Card>
                    <CardContent className="p-6">
                      <h3 className="text-xl font-bold mb-4">Motivations</h3>
                      <ul className="list-disc list-inside text-neutral-600">
                        {typeof character.motivations === 'string' && 
                          character.motivations.split(',').map((motivation: string, index: number) => (
                            <li key={index}>{motivation.trim()}</li>
                          ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
                
                {character?.flaws && (
                  <Card>
                    <CardContent className="p-6">
                      <h3 className="text-xl font-bold mb-4">Flaws</h3>
                      <ul className="list-disc list-inside text-neutral-600">
                        {typeof character.flaws === 'string' && 
                          character.flaws.split(',').map((flaw: string, index: number) => (
                            <li key={index}>{flaw.trim()}</li>
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