import React, { useEffect, useState } from 'react';
import { useLocation, Link } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/contexts/AuthContext';
import { Foundation, Story, Character } from '@shared/schema';
import { ArrowLeft, BookOpen, Edit, Globe, Users, Sparkles, Palette, Mountain, Plus } from 'lucide-react';

const FoundationDetails: React.FC = () => {
  const [location, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Get foundationId from URL query params
  const params = new URLSearchParams(location.split('?')[1]);
  const foundationId = parseInt(params.get('foundationId') || '0');
  
  const [activeTab, setActiveTab] = useState('overview');
  
  // Query foundation details
  const { 
    data: foundation, 
    isLoading: isLoadingFoundation, 
    error: foundationError 
  } = useQuery<Foundation>({
    queryKey: [`/api/foundations/${foundationId}`],
    enabled: !!foundationId,
  });
  
  // Query stories for this foundation
  const { 
    data: stories = [], 
    isLoading: isLoadingStories 
  } = useQuery<Story[]>({
    queryKey: [`/api/stories?foundationId=${foundationId}`],
    enabled: !!foundationId,
  });
  
  // Query characters for this foundation
  const { 
    data: characters = [], 
    isLoading: isLoadingCharacters 
  } = useQuery<Character[]>({
    queryKey: [`/api/foundations/${foundationId}/characters`],
    enabled: !!foundationId,
  });
  
  // Create story mutation
  const createStoryMutation = useMutation({
    mutationFn: async (storyData: { title: string; genre?: string; foundationId: number }) => {
      const response = await apiRequest('POST', '/api/stories', {
        ...storyData,
        userId: user?.id,
      });
      return response.json();
    },
    onSuccess: (newStory) => {
      toast({
        title: 'Story created successfully',
        description: 'Your new story has been created.',
      });
      // Refresh stories list
      queryClient.invalidateQueries({ queryKey: [`/api/stories?foundationId=${foundationId}`] });
      // Navigate to the voice story creation page
      navigate(`/voice-story-creation?storyId=${newStory.id}`);
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to create story',
        description: error.message || 'An error occurred while creating your story.',
        variant: 'destructive',
      });
    },
  });
  
  const handleCreateStory = () => {
    if (!foundation) return;
    
    createStoryMutation.mutate({
      title: "New Voice Story",
      genre: foundation.genre || "Draft",
      foundationId: foundation.id
    });
  };
  
  const handleEditFoundation = () => {
    // Will be implemented later
    toast({
      title: 'Coming Soon',
      description: 'Foundation editing will be available soon.',
    });
  };
  
  if (isLoadingFoundation) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center mb-8">
          <Button variant="ghost" onClick={() => navigate('/dashboard')} className="mr-4">
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
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <div className="flex items-center">
            <Button variant="ghost" onClick={() => navigate('/dashboard')} className="mr-4">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
            <h1 className="text-2xl font-bold">{foundation.name}</h1>
          </div>
          <div className="flex mt-4 md:mt-0">
            <Button variant="outline" onClick={handleEditFoundation} className="mr-2">
              <Edit className="mr-2 h-4 w-4" /> Edit Foundation
            </Button>
            <Button onClick={handleCreateStory} disabled={createStoryMutation.isPending}>
              <Plus className="mr-2 h-4 w-4" /> New Story
            </Button>
          </div>
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="stories">Stories</TabsTrigger>
            <TabsTrigger value="characters">Characters</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Foundation Details</CardTitle>
                <CardDescription>Basic information about this story foundation</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-medium">Description</h3>
                    <p className="text-neutral-600">{foundation.description || "No description available."}</p>
                  </div>
                  
                  {foundation.genre && (
                    <div>
                      <h3 className="text-lg font-medium">Genre</h3>
                      <p className="text-neutral-600">{foundation.genre}</p>
                    </div>
                  )}
                  
                  <div>
                    <h3 className="text-lg font-medium">Created</h3>
                    <p className="text-neutral-600">
                      {foundation.createdAt ? new Date(foundation.createdAt).toLocaleDateString() : "Unknown"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Palette className="mr-2 h-5 w-5 text-primary-500" /> 
                    Genre Details
                  </CardTitle>
                  <CardDescription>Explore the genre characteristics and styles</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-neutral-600">
                    View and define the themes, tropes, and narrative structures of your foundation's genre.
                  </p>
                </CardContent>
                <CardFooter>
                  <Button 
                    variant="outline" 
                    className="w-full" 
                    onClick={() => navigate(`/genre-details?foundationId=${foundation.id}`)}
                  >
                    View Genre
                  </Button>
                </CardFooter>
              </Card>
              
              <Card className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Globe className="mr-2 h-5 w-5 text-primary-500" /> 
                    World Details
                  </CardTitle>
                  <CardDescription>Define the world where your stories take place</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-neutral-600">
                    Explore the history, geography, cultures, and systems that make up your story world.
                  </p>
                </CardContent>
                <CardFooter>
                  <Button 
                    variant="outline" 
                    className="w-full" 
                    onClick={() => navigate(`/world-details?foundationId=${foundation.id}`)}
                  >
                    View World
                  </Button>
                </CardFooter>
              </Card>
              
              <Card className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Mountain className="mr-2 h-5 w-5 text-primary-500" /> 
                    Environments
                  </CardTitle>
                  <CardDescription>The settings and locations in your world</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-neutral-600">
                    Define the physical settings, locations, and environments where your stories unfold.
                  </p>
                </CardContent>
                <CardFooter>
                  <Button 
                    variant="outline" 
                    className="w-full" 
                    onClick={() => navigate(`/environment-details?foundationId=${foundation.id}`)}
                  >
                    View Environments
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="stories" className="space-y-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Stories</h2>
              <Button onClick={handleCreateStory} disabled={createStoryMutation.isPending} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                New Story
              </Button>
            </div>
            
            {isLoadingStories ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="bg-white shadow-sm h-48 animate-pulse">
                    <CardContent className="p-6">
                      <div className="h-6 bg-neutral-200 rounded w-3/4 mb-4"></div>
                      <div className="h-4 bg-neutral-200 rounded w-1/2 mb-2"></div>
                      <div className="h-4 bg-neutral-200 rounded w-1/3 mb-2"></div>
                      <div className="h-4 bg-neutral-200 rounded w-2/3 mb-2"></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : stories.length === 0 ? (
              <div className="text-center p-12 bg-white rounded-lg shadow-sm border border-neutral-200">
                <BookOpen className="h-12 w-12 text-neutral-300 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-neutral-800 mb-2">No Stories Yet</h3>
                <p className="text-neutral-600 mb-6">
                  Create your first story in this foundation to start your adventure.
                </p>
                <Button 
                  onClick={handleCreateStory}
                  disabled={createStoryMutation.isPending}
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Create Your First Story
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {stories.map((story) => (
                  <Card 
                    key={story.id} 
                    className="bg-white shadow-sm hover:shadow transition-shadow cursor-pointer"
                    onClick={() => navigate(`/voice-story-creation?storyId=${story.id}`)}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-lg font-semibold text-neutral-800 mb-2">{story.title}</h3>
                          {story.status && (
                            <p className="text-sm text-neutral-500 mb-1">Status: {story.status}</p>
                          )}
                          {story.updatedAt && (
                            <p className="text-sm text-neutral-500">
                              Last updated: {new Date(story.updatedAt).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                        <BookOpen className="h-5 w-5 text-primary-500" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="characters" className="space-y-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Characters</h2>
              <Button 
                onClick={() => navigate(`/character-details?foundationId=${foundation.id}&action=create`)} 
                size="sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Character
              </Button>
            </div>
            
            {isLoadingCharacters ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="bg-white shadow-sm h-48 animate-pulse">
                    <CardContent className="p-6">
                      <div className="h-6 bg-neutral-200 rounded w-3/4 mb-4"></div>
                      <div className="h-4 bg-neutral-200 rounded w-1/2 mb-2"></div>
                      <div className="h-4 bg-neutral-200 rounded w-1/3 mb-2"></div>
                      <div className="h-4 bg-neutral-200 rounded w-2/3 mb-2"></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : characters.length === 0 ? (
              <div className="text-center p-12 bg-white rounded-lg shadow-sm border border-neutral-200">
                <Users className="h-12 w-12 text-neutral-300 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-neutral-800 mb-2">No Characters Yet</h3>
                <p className="text-neutral-600 mb-6">
                  Add characters to this foundation to populate your story world.
                </p>
                <Button onClick={() => navigate(`/character-details?foundationId=${foundation.id}&action=create`)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Character
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {characters.map((character) => (
                  <Card 
                    key={character.id} 
                    className="bg-white shadow-sm hover:shadow transition-shadow cursor-pointer"
                    onClick={() => navigate(`/character-details?foundationId=${foundation.id}&characterId=${character.id}`)}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-lg font-semibold text-neutral-800 mb-2">{character.name}</h3>
                          {character.role && (
                            <p className="text-sm text-neutral-500 mb-1">Role: {character.role}</p>
                          )}
                          {character.updatedAt && (
                            <p className="text-sm text-neutral-500">
                              Last updated: {new Date(character.updatedAt).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                        <Users className="h-5 w-5 text-primary-500" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default FoundationDetails;