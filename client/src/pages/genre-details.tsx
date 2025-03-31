import React, { useEffect, useState } from 'react';
import { useLocation, Link } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/contexts/AuthContext';
import { Foundation } from '@shared/schema';
import { ArrowLeft, Palette, RefreshCw } from 'lucide-react';

// Define the GenreDetails type locally
interface GenreDetails {
  id: number;
  foundationId: number;
  // Basic genre information
  mainGenre: string;
  genreRationale?: string;
  audienceExpectations?: string;
  // Subgenre information
  subgenres?: string;
  subgenreRationale?: string;
  subgenreInteraction?: string;
  subgenreTropes?: string;
  // Mood and tone
  tone?: string;
  mood?: string;
  emotionalImpact?: string;
  // Setting elements
  timePeriod?: string;
  technologyLevel?: string;
  physicalEnvironment?: string;
  geography?: string;
  // Social elements
  societalStructures?: string;
  culturalNorms?: string;
  // Tropes and speculative elements
  keyTropes?: string;
  tropeStrategy?: string;
  speculativeElements?: string;
  speculativeRules?: string;
  // Atmosphere and style
  atmosphere?: string;
  sensoryDetails?: string;
  atmosphericStyle?: string;
  thematicEnvironmentTieins?: string;
  // Inspirations
  inspirations?: string;
  inspirationDetails?: string;
  divergenceFromInspirations?: string;
  // Metadata fields
  name?: string;
  description?: string;
  threadId?: string;
  
  // Legacy fields (maintained for compatibility)
  themes?: string[];
  tropes?: string[];
  commonSettings?: string[];
  typicalCharacters?: string[];
  plotStructures?: string[];
  styleGuide?: {
    tone?: string;
    pacing?: string;
    perspective?: string;
    dialogueStyle?: string;
  };
  recommendedReading?: string[];
  popularExamples?: string[];
  worldbuildingElements?: string[];
};

const GenreDetailsPage: React.FC = () => {
  const [location, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Get foundationId from URL query params
  const params = new URLSearchParams(location.split('?')[1]);
  const foundationIdParam = params.get('foundationId');
  const foundationId = foundationIdParam ? parseInt(foundationIdParam) : 0;
  
  console.log('Genre details - params:', { foundationIdParam, foundationId, type: typeof foundationId });
  
  // Redirect to dashboard only if explicitly invalid
  useEffect(() => {
    // Only redirect if explicitly invalid (NaN or explicitly passed as 0)
    if (isNaN(foundationId) || (foundationIdParam !== null && foundationId === 0)) {
      console.log('Invalid foundation ID detected, redirecting to dashboard');
      toast({
        title: 'Invalid parameters',
        description: 'The foundation ID is invalid. Redirecting to dashboard.',
      });
      navigate('/dashboard');
    } else {
      console.log('Genre details - foundation ID is valid:', foundationId);
    }
  }, [foundationId, foundationIdParam, navigate, toast]);
  
  // State to track if genre is being generated
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Query foundation
  const { 
    data: foundation, 
    isLoading: isLoadingFoundation, 
    error: foundationError 
  } = useQuery<Foundation>({
    queryKey: [`/api/foundations/${foundationId}`],
    enabled: !!foundationId,
  });
  
  // Query genre details
  const { 
    data: genreDetails, 
    isLoading: isLoadingGenre,
    error: genreError,
    refetch: refetchGenre 
  } = useQuery<GenreDetails>({
    queryKey: [`/api/foundations/${foundationId}/genre`],
    enabled: !!foundationId,
  });
  
  // Generate genre details mutation
  const generateGenreMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/ai/genre-details', {
        genreContext: foundation?.genre || '',
        userInterests: foundation?.description || '',
        foundationId: foundationId
      });
      return response.json();
    },
    onMutate: () => {
      setIsGenerating(true);
    },
    onSuccess: () => {
      toast({
        title: 'Genre details generated',
        description: 'Your genre has been generated successfully.',
      });
      // Refresh genre details
      refetchGenre();
      setIsGenerating(false);
    },
    onError: (error: any) => {
      toast({
        title: 'Generation failed',
        description: error.message || 'An error occurred while generating genre details.',
        variant: 'destructive',
      });
      setIsGenerating(false);
    },
  });
  
  const handleGenerateGenre = () => {
    generateGenreMutation.mutate();
  };
  
  if (isLoadingFoundation) {
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
  
  if (foundationError || !foundation) {
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
  
  return (
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
                <Palette className="mr-2 h-6 w-6 text-primary-500" /> 
                Genre Details
              </h1>
              <p className="text-neutral-600">Foundation: {foundation.name}</p>
            </div>
          </div>
          <Button 
            onClick={handleGenerateGenre} 
            disabled={isGenerating || generateGenreMutation.isPending}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isGenerating ? 'animate-spin' : ''}`} />
            {isGenerating ? 'Generating...' : 'Generate Genre'}
          </Button>
        </div>

        {isLoadingGenre || !genreDetails ? (
          <div className="bg-white rounded-lg shadow-sm p-8">
            {isLoadingGenre ? (
              <div className="space-y-4 animate-pulse">
                <div className="h-8 bg-neutral-200 rounded w-1/3"></div>
                <div className="h-4 bg-neutral-200 rounded w-2/3"></div>
                <div className="h-4 bg-neutral-200 rounded w-1/2"></div>
                <div className="h-4 bg-neutral-200 rounded w-3/4"></div>
              </div>
            ) : (
              <div className="text-center">
                <Palette className="h-16 w-16 text-neutral-300 mx-auto mb-4" />
                <h2 className="text-xl font-bold mb-2">No Genre Details Yet</h2>
                <p className="text-neutral-600 mb-6 max-w-md mx-auto">
                  Generate genre details to define the style, themes, and characteristics of stories in this foundation.
                </p>
                <Button 
                  onClick={handleGenerateGenre} 
                  disabled={isGenerating || generateGenreMutation.isPending}
                >
                  <RefreshCw className={`mr-2 h-4 w-4 ${isGenerating ? 'animate-spin' : ''}`} />
                  {isGenerating ? 'Generating...' : 'Generate Genre'}
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left sidebar - Basic info */}
            <div className="lg:col-span-1 space-y-6">
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-xl font-bold mb-4">{genreDetails.name || genreDetails.mainGenre}</h2>
                  {genreDetails.description && (
                    <p className="text-neutral-600 mb-6">{genreDetails.description}</p>
                  )}
                  
                  {/* Basic genre information */}
                  <div className="space-y-4 mb-6">
                    <div>
                      <h3 className="font-semibold text-lg mb-2">Main Genre</h3>
                      <p className="text-neutral-600">{genreDetails.mainGenre}</p>
                    </div>

                    {genreDetails.genreRationale && (
                      <div>
                        <h3 className="font-semibold text-lg mb-2">Genre Rationale</h3>
                        <p className="text-neutral-600">{genreDetails.genreRationale}</p>
                      </div>
                    )}

                    {genreDetails.audienceExpectations && (
                      <div>
                        <h3 className="font-semibold text-lg mb-2">Audience Expectations</h3>
                        <p className="text-neutral-600">{genreDetails.audienceExpectations}</p>
                      </div>
                    )}
                  </div>
                  
                  {/* Inspirations Section */}
                  {(genreDetails.inspirations || genreDetails.inspirationDetails || genreDetails.divergenceFromInspirations) && (
                    <div className="mb-6">
                      <h2 className="text-xl font-bold mb-4">Inspirations</h2>
                      
                      {genreDetails.inspirations && (
                        <div className="mb-4">
                          <h3 className="font-semibold text-lg mb-2">Key Inspirations</h3>
                          <p className="text-neutral-600">{genreDetails.inspirations}</p>
                        </div>
                      )}
                      
                      {genreDetails.inspirationDetails && (
                        <div className="mb-4">
                          <h3 className="font-semibold text-lg mb-2">Inspiration Details</h3>
                          <p className="text-neutral-600">{genreDetails.inspirationDetails}</p>
                        </div>
                      )}
                      
                      {genreDetails.divergenceFromInspirations && (
                        <div>
                          <h3 className="font-semibold text-lg mb-2">Divergence From Inspirations</h3>
                          <p className="text-neutral-600">{genreDetails.divergenceFromInspirations}</p>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Legacy fields for backward compatibility */}
                  {genreDetails.popularExamples && Array.isArray(genreDetails.popularExamples) && genreDetails.popularExamples.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-lg mb-2">Popular Examples</h3>
                      <ul className="list-disc list-inside mb-4 text-neutral-600">
                        {genreDetails.popularExamples.map((example, index) => (
                          <li key={index}>{example}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {genreDetails.recommendedReading && Array.isArray(genreDetails.recommendedReading) && genreDetails.recommendedReading.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-lg mb-2">Recommended Reading</h3>
                      <ul className="list-disc list-inside mb-4 text-neutral-600">
                        {genreDetails.recommendedReading.map((book, index) => (
                          <li key={index}>{book}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
            
            {/* Main content area */}
            <div className="lg:col-span-2 space-y-6">
              {/* Subgenre Details Card */}
              {(genreDetails.subgenres || genreDetails.subgenreRationale || genreDetails.subgenreInteraction || genreDetails.subgenreTropes) && (
                <Card>
                  <CardContent className="p-6">
                    <h2 className="text-xl font-bold mb-4">Subgenre Details</h2>
                    
                    <div className="grid grid-cols-1 gap-6">
                      {genreDetails.subgenres && (
                        <div>
                          <h3 className="font-semibold text-lg mb-2">Subgenres</h3>
                          <p className="text-neutral-600">{genreDetails.subgenres}</p>
                        </div>
                      )}
                      
                      {genreDetails.subgenreRationale && (
                        <div>
                          <h3 className="font-semibold text-lg mb-2">Subgenre Rationale</h3>
                          <p className="text-neutral-600">{genreDetails.subgenreRationale}</p>
                        </div>
                      )}
                      
                      {genreDetails.subgenreInteraction && (
                        <div>
                          <h3 className="font-semibold text-lg mb-2">Subgenre Interaction</h3>
                          <p className="text-neutral-600">{genreDetails.subgenreInteraction}</p>
                        </div>
                      )}
                      
                      {genreDetails.subgenreTropes && (
                        <div>
                          <h3 className="font-semibold text-lg mb-2">Subgenre Tropes</h3>
                          <p className="text-neutral-600">{genreDetails.subgenreTropes}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {/* Mood and Tone Card */}
              {(genreDetails.tone || genreDetails.mood || genreDetails.emotionalImpact) && (
                <Card>
                  <CardContent className="p-6">
                    <h2 className="text-xl font-bold mb-4">Mood and Tone</h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {genreDetails.tone && (
                        <div>
                          <h3 className="font-semibold text-lg mb-2">Tone</h3>
                          <p className="text-neutral-600">{genreDetails.tone}</p>
                        </div>
                      )}
                      
                      {genreDetails.mood && (
                        <div>
                          <h3 className="font-semibold text-lg mb-2">Mood</h3>
                          <p className="text-neutral-600">{genreDetails.mood}</p>
                        </div>
                      )}
                      
                      {genreDetails.emotionalImpact && (
                        <div className="md:col-span-2">
                          <h3 className="font-semibold text-lg mb-2">Emotional Impact</h3>
                          <p className="text-neutral-600">{genreDetails.emotionalImpact}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {/* Setting Elements Card */}
              {(genreDetails.timePeriod || genreDetails.technologyLevel || genreDetails.physicalEnvironment || genreDetails.geography) && (
                <Card>
                  <CardContent className="p-6">
                    <h2 className="text-xl font-bold mb-4">Setting Elements</h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {genreDetails.timePeriod && (
                        <div>
                          <h3 className="font-semibold text-lg mb-2">Time Period</h3>
                          <p className="text-neutral-600">{genreDetails.timePeriod}</p>
                        </div>
                      )}
                      
                      {genreDetails.technologyLevel && (
                        <div>
                          <h3 className="font-semibold text-lg mb-2">Technology Level</h3>
                          <p className="text-neutral-600">{genreDetails.technologyLevel}</p>
                        </div>
                      )}
                      
                      {genreDetails.physicalEnvironment && (
                        <div>
                          <h3 className="font-semibold text-lg mb-2">Physical Environment</h3>
                          <p className="text-neutral-600">{genreDetails.physicalEnvironment}</p>
                        </div>
                      )}
                      
                      {genreDetails.geography && (
                        <div>
                          <h3 className="font-semibold text-lg mb-2">Geography</h3>
                          <p className="text-neutral-600">{genreDetails.geography}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {/* Social Elements Card */}
              {(genreDetails.societalStructures || genreDetails.culturalNorms) && (
                <Card>
                  <CardContent className="p-6">
                    <h2 className="text-xl font-bold mb-4">Social Elements</h2>
                    
                    <div className="grid grid-cols-1 gap-6">
                      {genreDetails.societalStructures && (
                        <div>
                          <h3 className="font-semibold text-lg mb-2">Societal Structures</h3>
                          <p className="text-neutral-600">{genreDetails.societalStructures}</p>
                        </div>
                      )}
                      
                      {genreDetails.culturalNorms && (
                        <div>
                          <h3 className="font-semibold text-lg mb-2">Cultural Norms</h3>
                          <p className="text-neutral-600">{genreDetails.culturalNorms}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {/* Tropes and Speculative Elements Card */}
              {(genreDetails.keyTropes || genreDetails.tropeStrategy || genreDetails.speculativeElements || genreDetails.speculativeRules) && (
                <Card>
                  <CardContent className="p-6">
                    <h2 className="text-xl font-bold mb-4">Tropes and Speculative Elements</h2>
                    
                    <div className="grid grid-cols-1 gap-6">
                      {genreDetails.keyTropes && (
                        <div>
                          <h3 className="font-semibold text-lg mb-2">Key Tropes</h3>
                          <p className="text-neutral-600">{genreDetails.keyTropes}</p>
                        </div>
                      )}
                      
                      {genreDetails.tropeStrategy && (
                        <div>
                          <h3 className="font-semibold text-lg mb-2">Trope Strategy</h3>
                          <p className="text-neutral-600">{genreDetails.tropeStrategy}</p>
                        </div>
                      )}
                      
                      {genreDetails.speculativeElements && (
                        <div>
                          <h3 className="font-semibold text-lg mb-2">Speculative Elements</h3>
                          <p className="text-neutral-600">{genreDetails.speculativeElements}</p>
                        </div>
                      )}
                      
                      {genreDetails.speculativeRules && (
                        <div>
                          <h3 className="font-semibold text-lg mb-2">Speculative Rules</h3>
                          <p className="text-neutral-600">{genreDetails.speculativeRules}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {/* Atmosphere and Style Card */}
              {(genreDetails.atmosphere || genreDetails.sensoryDetails || genreDetails.atmosphericStyle || genreDetails.thematicEnvironmentTieins) && (
                <Card>
                  <CardContent className="p-6">
                    <h2 className="text-xl font-bold mb-4">Atmosphere and Style</h2>
                    
                    <div className="grid grid-cols-1 gap-6">
                      {genreDetails.atmosphere && (
                        <div>
                          <h3 className="font-semibold text-lg mb-2">Atmosphere</h3>
                          <p className="text-neutral-600">{genreDetails.atmosphere}</p>
                        </div>
                      )}
                      
                      {genreDetails.sensoryDetails && (
                        <div>
                          <h3 className="font-semibold text-lg mb-2">Sensory Details</h3>
                          <p className="text-neutral-600">{genreDetails.sensoryDetails}</p>
                        </div>
                      )}
                      
                      {genreDetails.atmosphericStyle && (
                        <div>
                          <h3 className="font-semibold text-lg mb-2">Atmospheric Style</h3>
                          <p className="text-neutral-600">{genreDetails.atmosphericStyle}</p>
                        </div>
                      )}
                      
                      {genreDetails.thematicEnvironmentTieins && (
                        <div>
                          <h3 className="font-semibold text-lg mb-2">Thematic Environment Tie-ins</h3>
                          <p className="text-neutral-600">{genreDetails.thematicEnvironmentTieins}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {/* Legacy Elements - Show only if available */}
              {genreDetails.themes && Array.isArray(genreDetails.themes) && genreDetails.themes.length > 0 && (
                <Card>
                  <CardContent className="p-6">
                    <h2 className="text-xl font-bold mb-4">Genre Elements</h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h3 className="font-semibold text-lg mb-2">Themes</h3>
                        <ul className="list-disc list-inside mb-4 text-neutral-600">
                          {genreDetails.themes.map((theme, index) => (
                            <li key={index}>{theme}</li>
                          ))}
                        </ul>
                      </div>
                      
                      {genreDetails.tropes && Array.isArray(genreDetails.tropes) && genreDetails.tropes.length > 0 && (
                        <div>
                          <h3 className="font-semibold text-lg mb-2">Tropes</h3>
                          <ul className="list-disc list-inside mb-4 text-neutral-600">
                            {genreDetails.tropes.map((trope, index) => (
                              <li key={index}>{trope}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {genreDetails.commonSettings && Array.isArray(genreDetails.commonSettings) && genreDetails.commonSettings.length > 0 && (
                        <div>
                          <h3 className="font-semibold text-lg mb-2">Common Settings</h3>
                          <ul className="list-disc list-inside mb-4 text-neutral-600">
                            {genreDetails.commonSettings.map((setting, index) => (
                              <li key={index}>{setting}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {genreDetails.typicalCharacters && Array.isArray(genreDetails.typicalCharacters) && genreDetails.typicalCharacters.length > 0 && (
                        <div>
                          <h3 className="font-semibold text-lg mb-2">Typical Characters</h3>
                          <ul className="list-disc list-inside mb-4 text-neutral-600">
                            {genreDetails.typicalCharacters.map((character, index) => (
                              <li key={index}>{character}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {genreDetails.plotStructures && Array.isArray(genreDetails.plotStructures) && genreDetails.plotStructures.length > 0 && (
                <Card>
                  <CardContent className="p-6">
                    <h2 className="text-xl font-bold mb-4">Story Structure</h2>
                    
                    <div className="mb-6">
                      <h3 className="font-semibold text-lg mb-2">Plot Structures</h3>
                      <ul className="list-disc list-inside mb-4 text-neutral-600">
                        {genreDetails.plotStructures.map((structure, index) => (
                          <li key={index}>{structure}</li>
                        ))}
                      </ul>
                    </div>
                    
                    {genreDetails.styleGuide && (
                      <>
                        <h2 className="text-xl font-bold mb-4">Style Guide</h2>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {genreDetails.styleGuide.tone && (
                            <div>
                              <h3 className="font-semibold text-lg mb-2">Tone</h3>
                              <p className="text-neutral-600">{genreDetails.styleGuide.tone}</p>
                            </div>
                          )}
                          
                          {genreDetails.styleGuide.pacing && (
                            <div>
                              <h3 className="font-semibold text-lg mb-2">Pacing</h3>
                              <p className="text-neutral-600">{genreDetails.styleGuide.pacing}</p>
                            </div>
                          )}
                          
                          {genreDetails.styleGuide.perspective && (
                            <div>
                              <h3 className="font-semibold text-lg mb-2">Perspective</h3>
                              <p className="text-neutral-600">{genreDetails.styleGuide.perspective}</p>
                            </div>
                          )}
                          
                          {genreDetails.styleGuide.dialogueStyle && (
                            <div>
                              <h3 className="font-semibold text-lg mb-2">Dialogue Style</h3>
                              <p className="text-neutral-600">{genreDetails.styleGuide.dialogueStyle}</p>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              )}
              
              {genreDetails.worldbuildingElements && Array.isArray(genreDetails.worldbuildingElements) && genreDetails.worldbuildingElements.length > 0 && (
                <Card>
                  <CardContent className="p-6">
                    <h2 className="text-xl font-bold mb-4">Worldbuilding Elements</h2>
                    <ul className="list-disc list-inside text-neutral-600">
                      {genreDetails.worldbuildingElements.map((element, index) => (
                        <li key={index}>{element}</li>
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
  );
};

export default GenreDetailsPage;