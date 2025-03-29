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
  name: string;
  description: string;
  themes: string[];
  tropes: string[];
  commonSettings: string[];
  typicalCharacters: string[];
  plotStructures: string[];
  styleGuide: {
    tone: string;
    pacing: string;
    perspective: string;
    dialogueStyle: string;
  };
  recommendedReading: string[];
  popularExamples: string[];
  worldbuildingElements: string[];
  threadId?: string;
};

const GenreDetailsPage: React.FC = () => {
  const [location, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Get foundationId from URL query params
  const params = new URLSearchParams(location.split('?')[1]);
  const foundationId = parseInt(params.get('foundationId') || '0');
  
  // Redirect to dashboard if foundationId is invalid
  useEffect(() => {
    if (!foundationId || foundationId <= 0) {
      console.log('Invalid foundation ID, redirecting to dashboard');
      toast({
        title: 'Invalid parameters',
        description: 'The foundation ID is invalid. Redirecting to dashboard.',
      });
      navigate('/dashboard');
    }
  }, [foundationId, navigate, toast]);
  
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
            <div className="lg:col-span-1 space-y-6">
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-xl font-bold mb-4">{genreDetails.name}</h2>
                  <p className="text-neutral-600 mb-6">{genreDetails.description}</p>
                  
                  <h3 className="font-semibold text-lg mb-2">Popular Examples</h3>
                  <ul className="list-disc list-inside mb-4 text-neutral-600">
                    {genreDetails.popularExamples.map((example, index) => (
                      <li key={index}>{example}</li>
                    ))}
                  </ul>
                  
                  <h3 className="font-semibold text-lg mb-2">Recommended Reading</h3>
                  <ul className="list-disc list-inside mb-4 text-neutral-600">
                    {genreDetails.recommendedReading.map((book, index) => (
                      <li key={index}>{book}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
            
            <div className="lg:col-span-2 space-y-6">
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
                    
                    <div>
                      <h3 className="font-semibold text-lg mb-2">Tropes</h3>
                      <ul className="list-disc list-inside mb-4 text-neutral-600">
                        {genreDetails.tropes.map((trope, index) => (
                          <li key={index}>{trope}</li>
                        ))}
                      </ul>
                    </div>
                    
                    <div>
                      <h3 className="font-semibold text-lg mb-2">Common Settings</h3>
                      <ul className="list-disc list-inside mb-4 text-neutral-600">
                        {genreDetails.commonSettings.map((setting, index) => (
                          <li key={index}>{setting}</li>
                        ))}
                      </ul>
                    </div>
                    
                    <div>
                      <h3 className="font-semibold text-lg mb-2">Typical Characters</h3>
                      <ul className="list-disc list-inside mb-4 text-neutral-600">
                        {genreDetails.typicalCharacters.map((character, index) => (
                          <li key={index}>{character}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
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
                  
                  <h2 className="text-xl font-bold mb-4">Style Guide</h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="font-semibold text-lg mb-2">Tone</h3>
                      <p className="text-neutral-600">{genreDetails.styleGuide.tone}</p>
                    </div>
                    
                    <div>
                      <h3 className="font-semibold text-lg mb-2">Pacing</h3>
                      <p className="text-neutral-600">{genreDetails.styleGuide.pacing}</p>
                    </div>
                    
                    <div>
                      <h3 className="font-semibold text-lg mb-2">Perspective</h3>
                      <p className="text-neutral-600">{genreDetails.styleGuide.perspective}</p>
                    </div>
                    
                    <div>
                      <h3 className="font-semibold text-lg mb-2">Dialogue Style</h3>
                      <p className="text-neutral-600">{genreDetails.styleGuide.dialogueStyle}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
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
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default GenreDetailsPage;