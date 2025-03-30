import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/contexts/AuthContext';
import NewStoryModal from '@/components/dashboard/NewStoryModal';
import { BookOpen, Plus, Search, Sparkles, Globe, Users, Trash2, AlertTriangle } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Story, Foundation } from '@shared/schema';

const Dashboard: React.FC = () => {
  const [, navigate] = useLocation();
  const { user, login, register } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isNewStoryModalOpen, setIsNewStoryModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFoundation, setSelectedFoundation] = useState<Foundation | null>(null);
  
  // State for delete confirmation dialog
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isForceDeleteDialogOpen, setIsForceDeleteDialogOpen] = useState(false);
  const [foundationToDelete, setFoundationToDelete] = useState<Foundation | null>(null);
  const [storyCount, setStoryCount] = useState(0);

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
      
      // We need to ensure the foundation ID is properly passed
      console.log(`Redirecting to new foundation: ${newFoundation.id}`);
      
      // Construct URL properly to ensure query params are handled correctly
      const url = new URL(`${window.location.origin}/foundation-details`);
      url.searchParams.set('foundationId', newFoundation.id.toString());
      console.log('Navigating to new foundation URL:', url.toString());
      
      // Force a hard navigation to ensure the query params are properly passed
      window.location.href = url.toString();
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

  const handleCreateFoundation = async () => {
    try {
      // Make sure we have a demo user set up in the database
      if (!user) {
        try {
          // First try to register a new demo user
          await register('demo', 'password', 'Demo User', 'demo@example.com');
        } catch (error) {
          // If that fails (user likely exists), try logging in
          await login('demo', 'password');
        }
      }
      
      // Now create the foundation
      createFoundationMutation.mutate({
        name: "New Story Foundation",
        description: "A collection of related stories, characters, and worlds",
        genre: "Undecided"
      });
    } catch (error) {
      console.error("Error in foundation creation process:", error);
      toast({
        title: 'Failed to create foundation',
        description: 'There was an error setting up your account. Please try again.',
        variant: 'destructive',
      });
    }
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
  
  // Delete foundation mutation
  const deleteFoundationMutation = useMutation<unknown, Error, { foundationId: number, force: boolean }>({
    mutationFn: async ({ foundationId, force }) => {
      console.log(`Deleting foundation ${foundationId} with force=${force}`);
      const url = `/api/foundations/${foundationId}${force ? '?force=true' : ''}`;
      const response = await apiRequest('DELETE', url);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete foundation');
      }
      return response.status === 204 ? {} : response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Foundation deleted',
        description: 'The foundation and all its stories have been deleted.',
      });
      
      // Refresh foundations list with multiple query key formats to ensure all caches are invalidated
      queryClient.invalidateQueries({ queryKey: [`/api/foundations`] });
      
      // Ensure we have a user ID before trying to invalidate user-specific queries
      if (user?.id) {
        queryClient.invalidateQueries({ queryKey: [`/api/foundations?userId=${user.id}`] });
      }
      
      // Also invalidate this specific foundation's details if we know which one was deleted
      if (foundationToDelete?.id) {
        queryClient.invalidateQueries({ queryKey: [`/api/foundations/${foundationToDelete.id}`] });
      }
      
      // Clear selected foundation if it was the one that was deleted
      if (selectedFoundation?.id === foundationToDelete?.id) {
        setSelectedFoundation(null);
      }
      
      // Reset state
      setFoundationToDelete(null);
      setIsDeleteDialogOpen(false);
      setIsForceDeleteDialogOpen(false);
      
      // Explicitly refetch foundations to ensure the UI is updated
      const refetchFoundations = async () => {
        try {
          await queryClient.fetchQuery({ 
            queryKey: [`/api/foundations?userId=${user?.id}`]
          });
          console.log('Foundations refetched after deletion');
        } catch (error) {
          console.error('Error refetching foundations:', error);
        }
      };
      
      refetchFoundations();
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to delete foundation',
        description: error.message || 'An error occurred while deleting the foundation.',
        variant: 'destructive',
      });
    },
  });
  
  // Function to handle foundation deletion
  const handleDeleteFoundation = (foundation: Foundation) => {
    setFoundationToDelete(foundation);
    
    // Check if the foundation has stories
    const foundationStories = stories.filter(story => story.foundationId === foundation.id);
    setStoryCount(foundationStories.length);
    
    if (foundationStories.length > 0) {
      // If there are stories, show the warning dialog
      setIsDeleteDialogOpen(true);
    } else {
      // If no stories, show the regular confirmation dialog
      setIsForceDeleteDialogOpen(true);
    }
  };
  
  // Function to confirm deletion
  const confirmDelete = () => {
    if (foundationToDelete) {
      deleteFoundationMutation.mutate({ 
        foundationId: foundationToDelete.id,
        force: isDeleteDialogOpen // If we're using the story warning dialog, we want to force delete
      });
    }
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
                    className={`bg-white shadow-sm hover:shadow transition-shadow ${selectedFoundation?.id === foundation.id ? 'border-2 border-primary-500' : ''}`}
                    onClick={() => {
                      try {
                        // First set the selected foundation in state
                        setSelectedFoundation(foundation);
                        
                        // Make sure foundation has a valid ID before navigating
                        if (foundation && typeof foundation.id === 'number' && foundation.id > 0) {
                          const foundationId = foundation.id;
                          console.log(`Attempting to navigate to foundation ${foundationId}`);
                          
                          // For debugging, log the foundation object
                          console.log('Foundation object:', foundation);
                          
                          // Ensure we're constructing the URL correctly
                          const url = new URL(`${window.location.origin}/foundation-details`);
                          url.searchParams.set('foundationId', foundationId.toString());
                          
                          console.log('Navigating to URL:', url.toString());
                          
                          // Skip wouter and use direct navigation to ensure query params are preserved
                          window.location.href = url.toString();
                        } else {
                          console.error('Invalid foundation ID:', foundation);
                          toast({
                            title: 'Error',
                            description: 'Could not access this foundation. Please try again.',
                            variant: 'destructive',
                          });
                        }
                      } catch (error) {
                        console.error('Error navigating to foundation:', error);
                        toast({
                          title: 'Navigation Error',
                          description: 'An error occurred while accessing the foundation.',
                          variant: 'destructive',
                        });
                      }
                    }}
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
                              Updated: {new Date(foundation.updatedAt).toLocaleString(undefined, {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          )}
                        </div>
                        <Globe className="h-5 w-5 text-primary-500" />
                      </div>
                      
                      <div className="mt-3 flex justify-end">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1"
                          onClick={(e) => {
                            e.stopPropagation(); // Prevent card click
                            handleDeleteFoundation(foundation);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Delete</span>
                        </Button>
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
                        onClick={() => {
                          const url = new URL(`${window.location.origin}/genre-details`);
                          url.searchParams.set('foundationId', selectedFoundation.id.toString());
                          console.log('Navigating to genre details:', url.toString());
                          window.location.href = url.toString();
                        }}
                      >
                        View Genre Details
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          const url = new URL(`${window.location.origin}/world-details`);
                          url.searchParams.set('foundationId', selectedFoundation.id.toString());
                          console.log('Navigating to world details:', url.toString());
                          window.location.href = url.toString();
                        }}
                      >
                        View World Details
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          const url = new URL(`${window.location.origin}/character-details`);
                          url.searchParams.set('foundationId', selectedFoundation.id.toString());
                          console.log('Navigating to character details:', url.toString());
                          window.location.href = url.toString();
                        }}
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
                                    Updated: {new Date(story.updatedAt).toLocaleString(undefined, {
                                      year: 'numeric',
                                      month: 'short',
                                      day: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
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
      {/* Delete Confirmation Dialog with Story Warning */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-yellow-500 mr-2" />
              Confirm Foundation Deletion
            </AlertDialogTitle>
            <AlertDialogDescription>
              <p className="mb-4">
                This foundation contains <strong>{storyCount} {storyCount === 1 ? 'story' : 'stories'}</strong>. 
                Deleting this foundation will permanently delete all stories, characters, and other content within it.
              </p>
              <p className="font-medium">This action cannot be undone. Are you sure you want to delete "{foundationToDelete?.name}"?</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteFoundationMutation.isPending}
            >
              {deleteFoundationMutation.isPending ? 'Deleting...' : 'Delete Foundation'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog without Story Warning */}
      <AlertDialog open={isForceDeleteDialogOpen} onOpenChange={setIsForceDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{foundationToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteFoundationMutation.isPending}
            >
              {deleteFoundationMutation.isPending ? 'Deleting...' : 'Delete Foundation'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Dashboard;
