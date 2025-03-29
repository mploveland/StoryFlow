import React, { useEffect, useState } from 'react';
import { useLocation, Link } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/contexts/AuthContext';
import { Foundation, Story, Character } from '../types';
import { ArrowLeft, BookOpen, Edit, Globe, Users, Sparkles, Palette, Mountain, Plus, MessageSquare, Trash2, AlertTriangle } from 'lucide-react';
import FoundationChatInterface from '@/components/foundation/FoundationChatInterface';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const FoundationDetails: React.FC = () => {
  const [location, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Get foundationId from URL query params or path params
  let foundationIdParam: string | null = null;
  
  try {
    // ALWAYS use window.location.search for query parameters
    // This works regardless of the component location path
    const urlParams = new URLSearchParams(window.location.search);
    foundationIdParam = urlParams.get('foundationId');
    
    if (foundationIdParam) {
      console.log('Found query parameter in URL:', foundationIdParam);
    } else if (location.includes('/foundation/')) {
      // If no query param, try to extract from path e.g. /foundation/35
      const routeMatch = location.match(/\/foundation\/(\d+)/);
      if (routeMatch && routeMatch[1]) {
        foundationIdParam = routeMatch[1];
        console.log('Found path parameter:', routeMatch[1]);
      }
    }
  } catch (error) {
    console.error('Error parsing URL parameters:', error);
  }
  
  // For debugging - log all url parameter formats
  console.log('URL details:', {
    location,
    windowLocation: window.location.toString(),
    searchParams: window.location.search,
    foundationIdParam,
    paramType: typeof foundationIdParam
  });
  
  // Parse as an integer, ensure it's a valid positive number
  const foundationId = foundationIdParam ? parseInt(foundationIdParam, 10) : 0;
  console.log('Parsed foundation ID:', foundationId, typeof foundationId);
  
  // Only redirect if we have an invalid ID (not just a missing one)
  useEffect(() => {
    if (foundationIdParam !== null && foundationIdParam !== undefined) {
      // Only validate if a parameter was actually provided
      if (isNaN(foundationId) || foundationId <= 0) {
        console.log('Invalid foundation ID detected, redirecting to dashboard');
        toast({
          title: 'Invalid Foundation ID',
          description: 'The foundation ID is invalid. Redirecting to dashboard.',
        });
        navigate('/dashboard');
      } else {
        console.log('Foundation ID is valid:', foundationId);
      }
    }
  }, [foundationId, foundationIdParam, navigate, toast]);
  
  // State to track if UI has been initialized
  const [initialized, setInitialized] = useState(false);
  
  // State for delete confirmation dialog
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isForceDeleteDialogOpen, setIsForceDeleteDialogOpen] = useState(false);
  const [storyCount, setStoryCount] = useState(0);
  
  // Query foundation details with extra debugging 
  console.log(`About to query foundation with ID: ${foundationId}, enabled: ${!!foundationId}`);
  
  const { 
    data: foundation, 
    isLoading: isLoadingFoundation, 
    error: foundationError 
  } = useQuery<Foundation>({
    queryKey: [`/api/foundations/${foundationId}`],
    enabled: !!foundationId,
    // Use properly typed success and error handlers
    onSuccess: (data: Foundation) => console.log('Foundation query succeeded:', data),
    onError: (error: Error) => console.error('Foundation query failed:', error)
  } as any); // Using type assertion to work around type error
  
  // Log the threadId when foundation is loaded
  useEffect(() => {
    if (foundation) {
      console.log(`Foundation loaded with threadId: ${foundation.threadId || 'undefined'}`);
    }
  }, [foundation]);
  
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
  
  // Function to check if foundation is complete (has genre, world details, and at least one character)
  const isFoundationComplete = (foundation?: Foundation, characters?: Character[]) => {
    if (!foundation) return false;
    
    const hasGenre = foundation.genre && foundation.genre.trim() !== '' && foundation.genre !== 'Undecided';
    const hasWorldDetails = foundation.description && foundation.description.trim() !== '';
    const hasCharacters = characters && characters.length > 0;
    
    return hasGenre && hasWorldDetails;
  };
  
  // Auto-initialize the UI state based on foundation data
  useEffect(() => {
    if (foundation && characters && !initialized) {
      setInitialized(true);
      
      if (stories?.length) {
        setStoryCount(stories.length);
      }
    }
  }, [foundation, characters, initialized, stories]);
  
  // Create a new story
  const createStoryMutation = useMutation({
    mutationFn: async (storyData: { title: string; genre?: string; foundationId: number }) => {
      const response = await apiRequest('POST', '/api/stories', {
        ...storyData,
        status: 'draft'
      });
      
      return await response.json();
    },
    onSuccess: (newStory) => {
      toast({
        title: 'Story created!',
        description: 'Your new story has been created successfully.'
      });
      
      queryClient.invalidateQueries({ queryKey: [`/api/stories?foundationId=${foundationId}`] });
      
      // Navigate to the story creation page
      navigate(`/voice-story-creation?storyId=${newStory.id}`);
    },
    onError: (error) => {
      toast({
        title: 'Error creating story',
        description: 'There was an error creating your story. Please try again.',
        variant: 'destructive'
      });
    },
  });
  
  // Handle creating a new story
  const handleCreateStory = () => {
    if (!foundation) return;
    
    createStoryMutation.mutate({
      title: `${foundation.name} - New Story`,
      genre: foundation.genre || undefined,
      foundationId: foundation.id
    });
  };
  
  // Handle editing the foundation
  const handleEditFoundation = () => {
    // Navigate to the foundation editing page
    navigate(`/foundation-edit?foundationId=${foundationId}`);
  };
  
  // Handle deleting the foundation
  const handleDeleteFoundation = () => {
    if (stories && stories.length > 0) {
      setStoryCount(stories.length);
      setIsDeleteDialogOpen(true);
    } else {
      setIsDeleteDialogOpen(true);
    }
  };
  
  // Delete Foundation mutation
  const deleteFoundationMutation = useMutation({
    mutationFn: async (options: { id: number, force?: boolean }) => {
      const url = `/api/foundations/${options.id}${options.force ? '?force=true' : ''}`;
      
      try {
        const response = await apiRequest('DELETE', url);
        
        if (response.status === 204) {
          return { success: true };
        }
        
        const data = await response.json();
        return data;
      } catch (error) {
        console.error('Error deleting foundation:', error);
        throw error;
      }
    },
    onSuccess: (_, variables) => {
      if (variables.force) {
        toast({
          title: 'Foundation deleted',
          description: 'The foundation and all associated stories have been permanently deleted.'
        });
      } else {
        toast({
          title: 'Foundation deleted',
          description: 'The foundation has been successfully deleted.'
        });
      }
      
      queryClient.invalidateQueries({ queryKey: ['/api/foundations'] });
    },
    onError: (error) => {
      toast({
        title: 'Error deleting foundation',
        description: 'There was an error deleting the foundation. Please try again.',
        variant: 'destructive'
      });
    },
  });
  
  // Confirm deleting the foundation
  const confirmDeleteFoundation = (force: boolean = false) => {
    deleteFoundationMutation.mutate({ 
      id: foundationId,
      force 
    });
    
    setIsDeleteDialogOpen(false);
    setIsForceDeleteDialogOpen(false);
    
    // Navigate back to dashboard after deletion
    navigate('/dashboard');
  };
  
  // Update Foundation mutation for various properties
  const updateFoundationMutation = useMutation({
    mutationFn: async (updateData: { id: number, threadId?: string, genre?: string }) => {
      // Only include properties that are defined
      const updatePayload: any = {};
      if (updateData.threadId !== undefined) updatePayload.threadId = updateData.threadId;
      if (updateData.genre !== undefined) updatePayload.genre = updateData.genre;
      
      const response = await apiRequest('PUT', `/api/foundations/${updateData.id}`, updatePayload);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/foundations/${foundationId}`] });
    },
    onError: (error) => {
      console.error('Error updating foundation:', error);
    }
  });
  
  // Function to send messages to the foundation chat
  const sendFoundationChatMessage = async (message: string, threadId?: string): Promise<{
    content: string;
    suggestions?: string[];
    threadId?: string;
  }> => {
    try {
      if (!foundation) {
        throw new Error('Foundation not found');
      }
      
      // Use the foundation's threadId if available and no specific threadId was provided
      const chatThreadId = threadId || foundation.threadId;
      
      // For the purpose of thread state tracking, check if we have a defined genre
      const hasDefinedGenre = foundation.genre && foundation.genre.trim() !== '' && foundation.genre !== 'Undecided';
      
      console.log(`Processing chat message with dynamic assistant. Foundation genre: "${foundation.genre || 'none'}"`);
      
      // Use the dynamic assistant API that automatically determines the appropriate assistant
      const currentAssistantType = hasDefinedGenre ? 
        (foundation.description ? 'character' : 'world') : 
        'genre';
        
      const payload = {
        message,
        foundationId: foundation.id,
        threadId: chatThreadId,
        currentAssistantType
      };
      
      console.log('Sending to dynamic assistant:', payload);
      
      const response = await apiRequest('POST', `/api/foundations/${foundation.id}/dynamic-assistant`, payload);
      const data = await response.json();
      console.log('Dynamic assistant response:', data);
      
      // If we received an auto-transition flag, we need to update the UI to reflect the transition
      if (data.isAutoTransition) {
        console.log(`Auto-transitioning from ${currentAssistantType} to ${data.contextType}`);
        toast({
          title: `Moving to ${data.contextType} creation`,
          description: `We're now developing the ${data.contextType} for your story.`,
          duration: 3000
        });
      }
      
      // Always update the foundationId if it changed
      if (data.threadId && data.threadId !== chatThreadId) {
        console.log(`Updating foundation with new threadId: ${data.threadId}`);
        updateFoundationMutation.mutate({
          id: foundation.id,
          threadId: data.threadId
        });
      }
      
      // Return standardized response format
      return {
        content: data.content,
        threadId: data.threadId,
        suggestions: data.suggestions || []
      };
    } catch (error) {
      console.error('Error sending message to foundation AI:', error);
      throw error;
    }
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
    console.error('Foundation error details:', {
      foundationError,
      foundationId,
      foundationIdParam,
      queryKey: `/api/foundations/${foundationId}`
    });
    
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
          <p className="text-neutral-500 mb-4">Debug Info: Foundation ID = {foundationId} (Type: {typeof foundationId})</p>
          <p className="text-neutral-500 mb-2">URL Parameter = {foundationIdParam} (Type: {typeof foundationIdParam})</p>
          
          {foundationId > 0 && (
            <div className="mb-4">
              <Button 
                variant="outline" 
                onClick={() => {
                  const specificUrl = `/foundation-details?foundationId=35`;
                  console.log('Trying hardcoded URL:', specificUrl);
                  window.location.href = specificUrl;
                }}
                className="mb-2"
              >
                Try Specific Foundation (ID: 35)
              </Button>
            </div>
          )}
          
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
          
          <div className="flex space-x-2 mt-4 md:mt-0">
            <Button variant="outline" onClick={handleEditFoundation}>
              <Edit className="mr-2 h-4 w-4" /> Edit Foundation
            </Button>
            <Button variant="outline" className="text-red-600" onClick={handleDeleteFoundation}>
              <Trash2 className="mr-2 h-4 w-4" /> Delete
            </Button>
          </div>
        </div>
        
        {/* Main content with 3-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Empty space on the left when items are hidden - for centering */}
          <div className={`lg:col-span-3 ${isFoundationComplete(foundation, characters) ? '' : 'lg:block'}`}></div>

          {/* Left side: Genre/World/Character cards - only show if foundation is complete */}
          <div className={`lg:col-span-3 ${!isFoundationComplete(foundation, characters) ? 'hidden lg:hidden' : 'lg:block'}`}>
            <div className="space-y-4">
              {foundation.genre && (
                <Card className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center text-lg">
                      <Palette className="mr-2 h-5 w-5 text-primary-500" /> 
                      Genre
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pb-2">
                    <p className="text-sm text-neutral-600">{foundation.genre}</p>
                  </CardContent>
                  <CardFooter className="pt-2">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="w-full text-primary-600" 
                      onClick={() => navigate(`/genre-details?foundationId=${foundation.id}`)}
                    >
                      View Details
                    </Button>
                  </CardFooter>
                </Card>
              )}
              
              {foundation.description && (
                <Card className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center text-lg">
                      <Globe className="mr-2 h-5 w-5 text-primary-500" /> 
                      World
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pb-2">
                    <p className="text-sm text-neutral-600 line-clamp-2">{foundation.description}</p>
                  </CardContent>
                  <CardFooter className="pt-2">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="w-full text-primary-600" 
                      onClick={() => window.location.href = `/world-details?foundationId=${foundation.id}`}
                    >
                      View Details
                    </Button>
                  </CardFooter>
                </Card>
              )}
              
              {characters.length > 0 && (
                <Card className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center text-lg">
                      <Users className="mr-2 h-5 w-5 text-primary-500" /> 
                      Characters
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pb-2">
                    <p className="text-sm text-neutral-600">{characters.length} character{characters.length !== 1 ? 's' : ''}</p>
                    <div className="mt-2">
                      {characters.slice(0, 3).map((character) => (
                        <div key={character.id} className="text-sm text-neutral-600 truncate">{character.name}</div>
                      ))}
                      {characters.length > 3 && <div className="text-xs text-neutral-400">+ {characters.length - 3} more</div>}
                    </div>
                  </CardContent>
                  <CardFooter className="pt-2">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="w-full text-primary-600"
                      onClick={() => window.location.href = `/character-details?foundationId=${foundation.id}`}
                    >
                      View All Characters
                    </Button>
                  </CardFooter>
                </Card>
              )}
              
              {/* Add more foundation components */}
              <Card className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center text-lg">
                    <Mountain className="mr-2 h-5 w-5 text-primary-500" /> 
                    Environments
                  </CardTitle>
                </CardHeader>
                <CardContent className="pb-2">
                  <p className="text-sm text-neutral-600">Define locations and their details</p>
                </CardContent>
                <CardFooter className="pt-2">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="w-full text-primary-600" 
                    onClick={() => window.location.href = `/environment-details?foundationId=${foundation.id}`}
                  >
                    View Details
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </div>
          
          {/* Center: Chat window - always show */}
          <div className="lg:col-span-6">
            <div className="h-[calc(100vh-220px)] min-h-[400px]">
              <FoundationChatInterface 
                title={`Building ${foundation.name}`}
                description="Discuss and develop your story foundation through natural conversation"
                foundationId={foundation.id}
                sendMessage={sendFoundationChatMessage}
                initialThreadId={foundation.threadId || undefined}
                initialMessages={!foundation.threadId ? [{
                  id: 'welcome',
                  content: `Welcome to Foundation Builder the starting point for your story creation journey! In this interview, we'll build the foundation for a living story world that will evolve as you create characters and narratives within it. We'll start by exploring genre elements to establish the tone and themes that will bring your world to life. What type of genre would you like to explore for your story world?`,
                  sender: 'ai',
                  timestamp: new Date(),
                  suggestions: []
                }] : []}
              />
            </div>
          </div>
          
          {/* Empty space on the right when items are hidden - for centering */}
          <div className={`lg:col-span-3 ${isFoundationComplete(foundation, characters) ? 'hidden' : 'lg:block'}`}></div>
          
          {/* Right side: Stories list and create button - only shown when foundation is complete */}
          <div className={`lg:col-span-3 ${!isFoundationComplete(foundation, characters) ? 'hidden lg:hidden' : ''}`}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BookOpen className="mr-2 h-5 w-5 text-primary-500" /> 
                  Stories
                </CardTitle>
                <CardDescription>Stories based on this foundation</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingStories ? (
                  <div className="space-y-2">
                    <div className="h-8 bg-neutral-100 rounded animate-pulse"></div>
                    <div className="h-8 bg-neutral-100 rounded animate-pulse"></div>
                  </div>
                ) : stories.length === 0 ? (
                  <div className="text-center py-4 text-neutral-500">
                    <p>No stories yet</p>
                    <p className="text-sm mt-1">Create your first story to start writing</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {stories.map((story) => (
                      <div
                        key={story.id}
                        className="p-3 rounded-md bg-neutral-50 hover:bg-neutral-100 cursor-pointer"
                        onClick={() => navigate(`/story-editor?storyId=${story.id}`)}
                      >
                        <div className="font-medium">{story.title}</div>
                        <div className="text-xs text-neutral-500 mt-1">
                          {story.status === 'draft' ? 'Draft' : 'Published'} · {new Date(story.createdAt as Date).toLocaleDateString()}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
              <CardFooter>
                <Button 
                  onClick={handleCreateStory} 
                  className="w-full"
                  disabled={!isFoundationComplete(foundation, characters) || createStoryMutation.isPending}
                >
                  <Plus className="mr-2 h-4 w-4" /> Create Story
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </main>
      
      {/* Delete Foundation Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this foundation?</AlertDialogTitle>
            <AlertDialogDescription>
              {storyCount > 0 ? (
                <>
                  <p className="mb-2">This foundation has {storyCount} {storyCount === 1 ? 'story' : 'stories'} associated with it.</p>
                  <div className="flex items-center p-3 bg-amber-50 border border-amber-200 rounded-md mb-2">
                    <AlertTriangle className="h-5 w-5 text-amber-500 mr-2" />
                    <p className="text-sm text-amber-800">Deleting this foundation will make these stories inaccessible.</p>
                  </div>
                </>
              ) : (
                <p>This will permanently delete the foundation and all its details.</p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => confirmDeleteFoundation(false)}
            >
              Delete Foundation
            </AlertDialogAction>
            {storyCount > 0 && (
              <AlertDialogAction 
                onClick={() => setIsForceDeleteDialogOpen(true)} 
                className="bg-red-500 hover:bg-red-600 text-white"
              >
                Delete Foundation and Stories
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Force Delete Confirmation Dialog */}
      <AlertDialog open={isForceDeleteDialogOpen} onOpenChange={setIsForceDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600">Permanently Delete Everything?</AlertDialogTitle>
            <AlertDialogDescription>
              <div className="flex items-center p-3 bg-red-50 border border-red-200 rounded-md mb-2">
                <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
                <p className="text-sm text-red-800">This will permanently delete this foundation AND all {storyCount} {storyCount === 1 ? 'story' : 'stories'} associated with it.</p>
              </div>
              <p className="mt-2">This action cannot be undone.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => confirmDeleteFoundation(true)} 
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              Permanently Delete Everything
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default FoundationDetails;
