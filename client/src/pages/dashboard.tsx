import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/contexts/AuthContext';
import NewStoryModal from '@/components/dashboard/NewStoryModal';
import { BookOpen, Plus, Search, Sparkles, Globe, Users } from 'lucide-react';
import { Story, Foundation } from '@shared/schema';

const Dashboard: React.FC = () => {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isNewStoryModalOpen, setIsNewStoryModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFoundation, setSelectedFoundation] = useState<Foundation | null>(null);

  useEffect(() => {
    // Redirect to home if not logged in
    if (!user) {
      navigate('/');
    }
  }, [user, navigate]);

  // Query foundations
  const { 
    data: foundations = [], 
    isLoading: isLoadingFoundations, 
    error: foundationsError 
  } = useQuery<Foundation[]>({
    queryKey: [`/api/foundations?userId=${user?.id}`],
    enabled: !!user,
  });

  // Query stories for selected foundation
  const { 
    data: stories = [], 
    isLoading: isLoadingStories, 
    error: storiesError,
    refetch: refetchStories
  } = useQuery<Story[]>({
    queryKey: [`/api/stories?foundationId=${selectedFoundation?.id}`],
    enabled: !!selectedFoundation,
  });

  // Create foundation mutation
  const createFoundationMutation = useMutation({
    mutationFn: async (foundationData: { name: string; description: string; genre?: string }) => {
      const response = await apiRequest('POST', '/api/foundations', {
        ...foundationData,
        userId: user?.id,
      });
      return response.json();
    },
    onSuccess: (newFoundation) => {
      toast({
        title: 'Foundation created successfully',
        description: 'Your new story foundation has been created.',
      });
      // Refresh foundations list
      queryClient.invalidateQueries({ queryKey: [`/api/foundations?userId=${user?.id}`] });
      // Select the newly created foundation
      setSelectedFoundation(newFoundation);
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to create foundation',
        description: error.message || 'An error occurred while creating your story foundation.',
        variant: 'destructive',
      });
    },
  });

  // Create story mutation
  const createStoryMutation = useMutation({
    mutationFn: async (storyData: { title: string; genre?: string; theme?: string; setting?: string; foundationId: number }) => {
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
      refetchStories();
      setIsNewStoryModalOpen(false);
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

  const handleCreateFoundation = () => {
    createFoundationMutation.mutate({
      name: "New Story Foundation",
      description: "A collection of related stories, characters, and worlds",
      genre: "Undecided"
    });
  };

  const handleCreateStory = () => {
    if (!selectedFoundation) {
      toast({
        title: 'No foundation selected',
        description: 'Please select a foundation first to create a story.',
        variant: 'destructive',
      });
      return;
    }
    
    createStoryMutation.mutate({
      title: "New Voice Story",
      genre: "Draft",
      foundationId: selectedFoundation.id
    });
  };

  const handleOpenStory = (storyId: number) => {
    navigate(`/voice-story-creation?storyId=${storyId}`);
  };

  // Filter stories based on search query
  const filteredStories = searchQuery
    ? stories.filter((story) =>
        story.title.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : stories;

  // Filter foundations based on search query
  const filteredFoundations = searchQuery
    ? foundations.filter((foundation) =>
        foundation.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : foundations;

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="bg-white border-b border-neutral-200 py-4">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <h1 className="text-primary-600 text-2xl font-bold">StoryFlow</h1>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-neutral-600">
              Welcome, {user?.displayName || user?.username || 'Writer'}
            </span>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-neutral-800">My Story Foundations</h2>
          <div className="flex space-x-3">
            {selectedFoundation && (
              <Button 
                onClick={handleCreateStory}
                variant="outline" 
                className="bg-gradient-to-r from-primary-500 to-violet-500 text-white hover:from-primary-600 hover:to-violet-600 border-0"
                disabled={createStoryMutation.isPending}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Create Voice Story
              </Button>
            )}
            <Button onClick={handleCreateFoundation} disabled={createFoundationMutation.isPending}>
              <Plus className="h-4 w-4 mr-2" />
              New Foundation
            </Button>
          </div>
        </div>

        <div className="relative max-w-md mb-8">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400 h-4 w-4" />
          <Input
            type="text"
            placeholder="Search..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {isLoadingFoundations ? (
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
        ) : foundationsError ? (
          <div className="text-center p-8 bg-white rounded-lg shadow">
            <p className="text-neutral-600 mb-4">Failed to load your story foundations.</p>
            <Button onClick={() => queryClient.invalidateQueries({ queryKey: [`/api/foundations?userId=${user?.id}`] })}>
              Try Again
            </Button>
          </div>
        ) : filteredFoundations.length === 0 ? (
          <div className="text-center p-12 bg-white rounded-lg shadow-sm border border-neutral-200">
            {searchQuery ? (
              <>
                <p className="text-neutral-600 mb-4">No foundations found matching "{searchQuery}"</p>
                <Button variant="outline" onClick={() => setSearchQuery('')}>
                  Clear Search
                </Button>
              </>
            ) : (
              <>
                <h3 className="text-xl font-bold text-neutral-800 mb-4">You don't have any story foundations yet</h3>
                <p className="text-neutral-600 mb-6">
                  Create your first story foundation to get started with StoryFlow.
                </p>
                <Button 
                  onClick={handleCreateFoundation}
                  disabled={createFoundationMutation.isPending}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Story Foundation
                </Button>
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left sidebar: Foundations */}
            <div className="col-span-1">
              <h3 className="text-xl font-bold mb-4">Your Foundations</h3>
              <div className="space-y-4">
                {filteredFoundations.map((foundation) => (
                  <Card 
                    key={foundation.id} 
                    className={`bg-white shadow-sm hover:shadow transition-shadow cursor-pointer ${selectedFoundation?.id === foundation.id ? 'border-2 border-primary-500' : ''}`}
                    onClick={() => setSelectedFoundation(foundation)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="text-lg font-semibold text-neutral-800 mb-1">{foundation.name}</h4>
                          {foundation.genre && (
                            <p className="text-sm text-neutral-500 mb-1">Genre: {foundation.genre}</p>
                          )}
                          {foundation.updatedAt && (
                            <p className="text-xs text-neutral-400">
                              Updated: {new Date(foundation.updatedAt).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                        <Globe className="h-5 w-5 text-primary-500" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Right content: Selected foundation details and stories */}
            <div className="col-span-1 lg:col-span-2">
              {selectedFoundation ? (
                <>
                  <div className="mb-6">
                    <h3 className="text-xl font-bold mb-2">Foundation: {selectedFoundation.name}</h3>
                    <p className="text-neutral-600 mb-4">{selectedFoundation.description}</p>
                    
                    <div className="flex space-x-3 mb-6">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => navigate(`/genre-details?foundationId=${selectedFoundation.id}`)}
                      >
                        View Genre Details
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => navigate(`/world-details?foundationId=${selectedFoundation.id}`)}
                      >
                        View World Details
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => navigate(`/character-details?foundationId=${selectedFoundation.id}`)}
                      >
                        <Users className="h-4 w-4 mr-1" /> Characters
                      </Button>
                    </div>
                  </div>

                  <div className="mb-4 flex justify-between items-center">
                    <h3 className="text-xl font-bold">Stories in this Foundation</h3>
                    <Button 
                      onClick={handleCreateStory}
                      disabled={createStoryMutation.isPending}
                      size="sm"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      New Story
                    </Button>
                  </div>

                  {isLoadingStories ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[1, 2].map((i) => (
                        <Card key={i} className="bg-white shadow-sm h-32 animate-pulse">
                          <CardContent className="p-4">
                            <div className="h-6 bg-neutral-200 rounded w-3/4 mb-2"></div>
                            <div className="h-4 bg-neutral-200 rounded w-1/2 mb-2"></div>
                            <div className="h-4 bg-neutral-200 rounded w-2/3"></div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : storiesError ? (
                    <div className="text-center p-6 bg-white rounded-lg shadow-sm border border-neutral-200">
                      <p className="text-neutral-600 mb-3">Failed to load stories.</p>
                      <Button 
                        onClick={() => refetchStories()}
                        variant="outline"
                        size="sm"
                      >
                        Try Again
                      </Button>
                    </div>
                  ) : filteredStories.length === 0 ? (
                    <div className="text-center p-8 bg-white rounded-lg shadow-sm border border-neutral-200">
                      <h4 className="text-lg font-semibold mb-2">No stories yet</h4>
                      <p className="text-neutral-600 mb-4">
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {filteredStories.map((story) => (
                        <Card 
                          key={story.id} 
                          className="bg-white shadow-sm hover:shadow transition-shadow cursor-pointer"
                          onClick={() => handleOpenStory(story.id)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div>
                                <h4 className="text-lg font-semibold text-neutral-800 mb-1">{story.title}</h4>
                                {story.status && (
                                  <p className="text-sm text-neutral-500 mb-1">Status: {story.status}</p>
                                )}
                                {story.updatedAt && (
                                  <p className="text-xs text-neutral-400">
                                    Updated: {new Date(story.updatedAt).toLocaleDateString()}
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
                </>
              ) : (
                <div className="flex items-center justify-center h-64 bg-white rounded-lg shadow-sm border border-neutral-200">
                  <div className="text-center p-8">
                    <Globe className="h-12 w-12 text-primary-300 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-neutral-800 mb-2">Select a Foundation</h3>
                    <p className="text-neutral-600">
                      Choose a story foundation from the left to view its stories and details.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
