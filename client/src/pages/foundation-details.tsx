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
  
  // Get foundationId from URL query params
  console.log('URL location:', location);
  
  // Handle URL parsing safely
  let foundationId = 0;
  try {
    const params = new URLSearchParams(window.location.search);
    const foundationIdParam = params.get('foundationId');
    
    console.log('Raw foundation ID param from window.location.search:', foundationIdParam);
    
    // Validate foundationId is a proper number
    if (foundationIdParam && foundationIdParam.trim() !== '' && !isNaN(parseInt(foundationIdParam))) {
      foundationId = parseInt(foundationIdParam);
      console.log('Parsed foundation ID:', foundationId);
    } else {
      console.error('Invalid foundation ID in URL:', foundationIdParam);
      // Try parsing from the location directly as a fallback
      const fallbackParams = new URLSearchParams(location.split('?')[1] || '');
      const fallbackId = fallbackParams.get('foundationId');
      console.log('Fallback ID param:', fallbackId);
      
      if (fallbackId && !isNaN(parseInt(fallbackId))) {
        foundationId = parseInt(fallbackId);
        console.log('Using fallback parsed ID:', foundationId);
      }
    }
  } catch (error) {
    console.error('Error parsing foundation ID:', error);
  }
  
  const [activeTab, setActiveTab] = useState('overview');
  
  // State to track if UI has been initialized
  const [initialized, setInitialized] = useState(false);
  
  // State for delete confirmation dialog
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isForceDeleteDialogOpen, setIsForceDeleteDialogOpen] = useState(false);
  const [storyCount, setStoryCount] = useState(0);
  
  // Query foundation details
  const { 
    data: foundation, 
    isLoading: isLoadingFoundation, 
    error: foundationError 
  } = useQuery<Foundation>({
    queryKey: [`/api/foundations/${foundationId}`],
    enabled: !!foundationId,
  });
  
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
    
    // Check if genre is defined
    const hasGenre = !!foundation.genre;
    
    // Check if world details exist
    const hasWorldDetails = !!foundation.description;
    
    // Check if at least one character exists
    const hasCharacters = Array.isArray(characters) && characters.length > 0;
    
    return hasGenre && hasWorldDetails && hasCharacters;
  };
  
  // Effect to automatically switch to chat tab when foundation is incomplete
  useEffect(() => {
    if (!initialized && foundation && characters) {
      const isComplete = isFoundationComplete(foundation, characters);
      if (!isComplete) {
        setActiveTab('chat');
      }
      setInitialized(true);
    }
  }, [foundation, characters, initialized]);
  
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
  
  // Delete foundation mutation
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
        throw error;
      }
    },
    onSuccess: (result) => {
      if (result.hasStories) {
        // If the foundation has stories, show confirmation dialog with story count
        setStoryCount(result.storyCount);
        setIsForceDeleteDialogOpen(true);
        return;
      }
      
      toast({
        title: 'Foundation deleted',
        description: 'The foundation has been successfully deleted.',
      });
      navigate('/dashboard');
      queryClient.invalidateQueries({ queryKey: ['/api/foundations'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to delete foundation',
        description: error.message || 'An error occurred while deleting the foundation.',
        variant: 'destructive',
      });
    },
  });
  
  const handleDeleteFoundation = () => {
    setIsDeleteDialogOpen(true);
  };
  
  const confirmDeleteFoundation = (force = false) => {
    if (!foundation) return;
    
    deleteFoundationMutation.mutate({
      id: foundation.id,
      force
    });
    
    // Close the dialogs
    setIsDeleteDialogOpen(false);
    setIsForceDeleteDialogOpen(false);
  };
  
  // Update foundation mutation to store threadId and/or genre
  const updateFoundationMutation = useMutation({
    mutationFn: async (updateData: { id: number, threadId?: string, genre?: string }) => {
      // Only include properties that are defined
      const updatePayload: any = {};
      if (updateData.threadId) updatePayload.threadId = updateData.threadId;
      if (updateData.genre) updatePayload.genre = updateData.genre;
      
      console.log('Updating foundation with:', updatePayload);
      
      const response = await apiRequest('PUT', `/api/foundations/${updateData.id}`, updatePayload);
      return response.json();
    },
    onSuccess: (data) => {
      console.log('Foundation updated successfully:', data);
      queryClient.invalidateQueries({ queryKey: [`/api/foundations/${foundationId}`] });
    },
    onError: (error: any) => {
      console.error('Failed to update foundation:', error);
    }
  });

  // Function to send messages to the foundation chat
  const sendFoundationChatMessage = async (message: string, threadId?: string) => {
    try {
      if (!foundation) {
        throw new Error('Foundation not found');
      }
      
      // Use the foundation's threadId if available and no specific threadId was provided
      const chatThreadId = threadId || foundation.threadId;
      
      // IMPORTANT: Force using the genre-details endpoint for the initial conversation
      // Only switch to world-details after the genre has been established
      const hasDefinedGenre = foundation.genre && foundation.genre.trim() !== '' && foundation.genre !== 'Undecided';
      
      const endpoint = hasDefinedGenre ? '/api/ai/world-details' : '/api/ai/genre-details';
      
      console.log(`Using endpoint ${endpoint} for foundation chat message. Foundation genre: "${foundation.genre || 'none'}"`);
      
      // Special handling for genre initialization
      const isInitializing = !chatThreadId;
      
      if (endpoint === '/api/ai/genre-details') {
        // Genre details payload
        const genrePayload = {
          userInterests: message,
          foundationId: foundationId,
          threadId: chatThreadId,
          isInitialStage: isInitializing
        };
        
        console.log('Sending to genre assistant:', genrePayload);
        
        const response = await apiRequest('POST', endpoint, genrePayload);
        const data = await response.json();
        console.log('Genre assistant response:', data);
        
        // Special handling for conversation in progress response
        if (data.conversationInProgress && data.question) {
          console.log('Conversation in progress, received question:', data.question);
          
          // Just return the question from the assistant
          return {
            content: data.question,
            suggestions: data.suggestions || [
              "I love fantasy books like Lord of the Rings",
              "I'm a fan of sci-fi like Dune",
              "My favorite authors are Stephen King and Neil Gaiman",
              "I enjoy books with complex characters and deep worldbuilding"
            ],
            threadId: data.threadId
          };
        }
        
        // ONLY update the threadId for now, not the genre
        // This ensures we stay in the genre creation flow until we get a final summary
        if (data.threadId) {
          // Always update with the current threadId even if it appears same as stored one
          // This guarantees we're using the latest one
          console.log(`Updating foundation with threadId: ${data.threadId}`);
          updateFoundationMutation.mutate({
            id: foundation.id,
            threadId: data.threadId
          });
        }
        
        // SPECIAL CASE: If the response indicates a conversation in progress, we definitely don't update genre
        if (data.conversationInProgress || data.needsMoreInput) {
          console.log('Conversation still in progress, not updating genre');
          return {
            content: data.question || 'Please tell me more about the genre you want.',
            suggestions: data.suggestions || [
              "I love fantasy books like Lord of the Rings",
              "I'm a fan of sci-fi like Dune",
              "My favorite authors are Stephen King and Neil Gaiman",
              "I enjoy books with complex characters and deep worldbuilding"
            ],
            threadId: data.threadId
          };
        }
        
        // Only update the genre when we have a complete conversation 
        // and it's not just a question (we need a complete genre description)
        const questionWords = ["?", "would you", "could you", "do you", "tell me", "what", "how", "which"];
        const hasQuestion = questionWords.some(word => data.description?.includes(word));
        
        const hasCompleteGenreDescription = data.description && 
          data.description.length > 200 && // Must be longer
          !hasQuestion &&  // No questions
          data.themes && 
          data.themes.length > 0 &&  // Must have themes
          data.name?.length > 3;     // Must have a proper name
          
        if (data.name && !hasDefinedGenre && hasCompleteGenreDescription) {
          console.log(`Updating foundation with complete genre: ${data.name}`);
          updateFoundationMutation.mutate({
            id: foundation.id,
            genre: data.name
          });
        } else {
          console.log('Genre description not complete yet, continuing conversation');
          console.log(`Description length: ${data.description?.length}, has question: ${hasQuestion}, themes: ${data.themes?.length}, name length: ${data.name?.length}`);
        }
        
        // Extract the content from the response, prioritizing different fields
        let content;
        if (data.question) {
          content = data.question;
        } else if (data.description) {
          content = data.description;
        } else if (data.name) {
          content = `Your genre has been set to: ${data.name}`;
        } else {
          content = 'I\'m the Genre Creator assistant. Let\'s explore what genre would work best for your story foundation.';
        }
        
        console.log('Returning genre content:', content);
        
        return {
          content: content,
          suggestions: data.suggestions || [
            "I want to create a fantasy world",
            "Let's explore science fiction",
            "I'm thinking of a mystery/thriller",
            "I'd like to write historical fiction"
          ],
          threadId: data.threadId
        };
      } else {
        // World details payload
        const worldPayload = {
          genreContext: foundation.genre,
          message: message,
          foundationId: foundationId,
          threadId: chatThreadId,
        };
        
        console.log('Sending to world builder:', worldPayload);
        
        const response = await apiRequest('POST', endpoint, worldPayload);
        const data = await response.json();
        console.log('World builder response:', data);
        
        // Always update with the latest threadId to maintain conversation state
        if (data.threadId) {
          console.log(`Updating foundation with world threadId: ${data.threadId}`);
          updateFoundationMutation.mutate({
            id: foundation.id,
            threadId: data.threadId
          });
        }
        
        return {
          content: data.description || data.name || data.question || 'Sorry, I could not process your request. Please try again.',
          suggestions: data.suggestions || [
            'Tell me more about this world',
            'What kind of geography exists here?',
            'How can I develop the culture?',
            'What conflicts exist in this world?'
          ],
          threadId: data.threadId
        };
      }
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
            {isFoundationComplete(foundation, characters) && (
              <Button variant="outline" onClick={handleEditFoundation} className="mr-2">
                <Edit className="mr-2 h-4 w-4" /> Edit Foundation
              </Button>
            )}
            <Button 
              variant="ghost" 
              size="icon"
              onClick={handleDeleteFoundation}
              className="text-neutral-500 hover:text-red-500"
            >
              <Trash2 className="h-5 w-5" />
            </Button>
          </div>
        </div>
        
        {/* Main content with 3-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left side: Genre/World/Character cards - only show if foundation is complete */}
          <div className="lg:col-span-3">
            {isFoundationComplete(foundation, characters) && (
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
                        onClick={() => navigate(`/world-details?foundationId=${foundation.id}`)}
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
                        onClick={() => navigate(`/character-details?foundationId=${foundation.id}`)}
                      >
                        View Characters
                      </Button>
                    </CardFooter>
                  </Card>
                )}
                
                <Card className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center text-lg">
                      <Mountain className="mr-2 h-5 w-5 text-primary-500" /> 
                      Environments
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pb-2">
                    <p className="text-sm text-neutral-600">Define your story settings</p>
                  </CardContent>
                  <CardFooter className="pt-2">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="w-full text-primary-600" 
                      onClick={() => navigate(`/environment-details?foundationId=${foundation.id}`)}
                    >
                      View Details
                    </Button>
                  </CardFooter>
                </Card>
              </div>
            )}
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
                  content: `Welcome to StoryFlow! I'm your AI storytelling partner, and I'm excited to help you create "${foundation.name}". Let's start by defining a genre that will shape this story world. What type of genre interests you?`,
                  sender: 'ai',
                  timestamp: new Date(),
                  suggestions: [
                    "Fantasy",
                    "Science Fiction",
                    "Mystery",
                    "Romance",
                    "Horror",
                    "Historical Fiction",
                    "Surprise me!"
                  ]
                }] : undefined}
              />
            </div>
          </div>
          
          {/* Right side: Stories - only show if foundation is complete */}
          <div className="lg:col-span-3">
            {isFoundationComplete(foundation, characters) && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-semibold">Stories</h2>
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
                  <div className="space-y-3">
                    {[1, 2].map((i) => (
                      <Card key={i} className="animate-pulse">
                        <CardContent className="p-4">
                          <div className="h-5 bg-neutral-200 rounded w-3/4 mb-2"></div>
                          <div className="h-4 bg-neutral-200 rounded w-1/2 mb-2"></div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : stories.length === 0 ? (
                  <Card className="bg-white shadow-sm border border-neutral-200">
                    <CardContent className="p-4 text-center">
                      <BookOpen className="h-8 w-8 text-neutral-300 mx-auto mb-2" />
                      <p className="text-sm text-neutral-600 mb-3">
                        No stories created yet
                      </p>
                      <Button 
                        onClick={handleCreateStory}
                        disabled={createStoryMutation.isPending}
                        size="sm"
                        className="w-full"
                      >
                        <Sparkles className="h-4 w-4 mr-2" />
                        Create First Story
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {stories.map((story) => (
                      <Card 
                        key={story.id} 
                        className="bg-white shadow-sm hover:shadow transition-shadow cursor-pointer"
                        onClick={() => navigate(`/voice-story-creation?storyId=${story.id}`)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="font-semibold text-neutral-800">{story.title}</h3>
                              {story.updatedAt && (
                                <p className="text-xs text-neutral-500">
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
              </div>
            )}
          </div>
        </div>
      </main>
      
      {/* Delete confirmation dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Foundation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this foundation? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => confirmDeleteFoundation()} 
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Force delete dialog for foundations with stories */}
      <AlertDialog open={isForceDeleteDialogOpen} onOpenChange={setIsForceDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center text-red-500">
              <AlertTriangle className="h-5 w-5 mr-2" /> Warning: Stories Will Be Deleted
            </AlertDialogTitle>
            <AlertDialogDescription>
              This foundation contains {storyCount} {storyCount === 1 ? 'story' : 'stories'} that will be permanently deleted along with the foundation.
              <div className="mt-2 p-3 bg-red-50 text-red-800 rounded-md">
                <p className="font-semibold">This action is irreversible!</p>
                <p>All stories, characters, and content created within this foundation will be lost.</p>
              </div>
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