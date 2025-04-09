import React, { useEffect, useState, useRef } from 'react';
import { useLocation, Link } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/contexts/AuthContext';
import { Foundation, Story, Character } from '../types';
import { ArrowLeft, BookOpen, Edit, Globe, Users, Sparkles, Palette, Mountain, Plus, MessageSquare, Trash2, AlertTriangle, Pencil } from 'lucide-react';

// GenreDetails interface
interface GenreDetails {
  id: number;
  foundationId: number;
  mainGenre: string;
  description?: string;
  themes?: string[];
  threadId?: string;
}
import FoundationChatInterfaceNew, { FoundationChatInterfaceRef } from '@/components/foundation/FoundationChatInterfaceNew';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
  
  // A unique key to force complete component remounting
  const [componentKey, setComponentKey] = useState(Date.now());
  
  // Reset the component key when the foundation ID changes
  useEffect(() => {
    if (foundationId > 0) {
      setComponentKey(Date.now());
    }
  }, [foundationId]);
  
  // State for delete confirmation dialog
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isForceDeleteDialogOpen, setIsForceDeleteDialogOpen] = useState(false);
  const [storyCount, setStoryCount] = useState(0);
  
  // State for rename dialog
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [newFoundationName, setNewFoundationName] = useState('');
  
  // State to track if foundation components should be shown (overrides isFoundationComplete)
  // Initialize with a default value, will be updated when foundation loads
  const [showFoundationComponents, setShowFoundationComponents] = useState(false);
  
  // State to track if genre details should be shown
  // Genre details are now always hidden from main view
  
  // Chat interface ref for accessing the component's methods
  const chatInterfaceRef = useRef<FoundationChatInterfaceRef>(null);
  
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
  
  // Log the threadId and update visibility when foundation is loaded
  useEffect(() => {
    if (foundation) {
      console.log(`Foundation loaded with threadId: ${foundation.threadId || 'undefined'}`);
      
      // Only set showFoundationComponents to true if at least one stage is completed
      // This controls the initial visibility of the side columns
      if (foundation.genreCompleted || foundation.environmentCompleted || 
          foundation.worldCompleted || foundation.charactersCompleted) {
        setShowFoundationComponents(true);
      } else {
        setShowFoundationComponents(false);
      }
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
  
  // Query genre details for this foundation
  const { 
    data: genreDetails, 
    isLoading: isLoadingGenreDetails 
  } = useQuery<GenreDetails>({
    queryKey: [`/api/foundations/${foundationId}/genre`],
    enabled: !!foundationId,
  });
  
  // Query messages for this foundation - add timestamp to prevent caching
  const { 
    data: messages = [], 
    isLoading: isLoadingMessages,
    refetch: refetchMessages 
  } = useQuery<{id: number, role: 'user' | 'assistant', content: string}[]>({
    queryKey: [`/api/foundations/${foundationId}/messages`, Date.now()],
    enabled: !!foundationId,
  });
  
  // Function to check if foundation is complete (has genre, world details, and at least one character)
  // Currently always returning false to hide stage cards until explicitly requested
  const isFoundationComplete = (foundation?: Foundation, characters?: Character[]) => {
    if (!foundation) return false;
    
    // Check if all required foundation stages are completed
    return foundation.genreCompleted === true && 
           foundation.worldCompleted === true && 
           foundation.environmentCompleted === true && 
           foundation.charactersCompleted === true;
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
  
  // Update Foundation mutation for various properties
  const updateFoundationMutation = useMutation({
    mutationFn: async (updateData: { id: number, threadId?: string, genre?: string, currentStage?: string, name?: string }) => {
      // Only include properties that are defined
      const updatePayload: any = {};
      if (updateData.threadId !== undefined) updatePayload.threadId = updateData.threadId;
      if (updateData.genre !== undefined) updatePayload.genre = updateData.genre;
      if (updateData.currentStage !== undefined) updatePayload.currentStage = updateData.currentStage;
      if (updateData.name !== undefined) updatePayload.name = updateData.name;
      
      const response = await apiRequest('PUT', `/api/foundations/${updateData.id}`, updatePayload);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/foundations/${foundationId}`] });
      // Also invalidate the list of foundations on the dashboard
      queryClient.invalidateQueries({ queryKey: ['/api/foundations'] });
    },
    onError: (error) => {
      console.error('Error updating foundation:', error);
    }
  });
  
  // Auto-transition to environment stage when genre details are available
  // Modified to include a delay and check additional conditions to prevent premature transitions
  useEffect(() => {
    // Check if we have valid genre details with mainGenre
    if (genreDetails && genreDetails.mainGenre) {
      console.log('Genre details available', genreDetails);
      
      // If the foundation is in the genre stage and genre is marked as completed,
      // then auto-update it to environment stage
      if (foundation && 
          foundation.currentStage === 'genre' && 
          foundation.genreCompleted === true) {
        console.log('Auto-transitioning from genre to environment stage (with 2s delay)');
        
        // First update the UI state to show components
        setShowFoundationComponents(true);
        
        // Add a delay to ensure the user sees the genre details first
        const transitionTimer = setTimeout(() => {
          // Then update the backend stage
          updateFoundationMutation.mutate({
            id: foundation.id,
            currentStage: 'environment'
          });
          
          // Auto-notify the user about the transition
          toast({
            title: 'Moving to environment creation',
            description: 'Now that we have your genre details saved, we can start working on the environment.',
            duration: 3000
          });
        }, 2000); // 2-second delay to ensure user sees genre details
        
        // Clean up timer if component unmounts
        return () => clearTimeout(transitionTimer);
      } else {
        console.log('Not transitioning yet because:', 
          foundation?.currentStage !== 'genre' ? 'not in genre stage' : 'genre not marked as completed');
      }
    }
  }, [genreDetails, foundation, updateFoundationMutation, toast]);
  
  // Handle transition from environment to world stage when user chooses to advance
  useEffect(() => {
    // Only proceed if foundation data is available and messages are loaded
    if (!foundation || !messages || messages.length === 0) return;
    
    // Check if we're in environment stage and have environment details completed
    if (foundation.currentStage === 'environment' && foundation.environmentCompleted === true) {
      console.log('Environment is completed, watching for world stage transition request');
      
      // Check for transition messages from the user
      const transitionRequested = messages.some(msg => {
        const content = msg.content.toLowerCase();
        return (
          msg.role === 'user' && 
          (content.includes('move to world') || 
           content.includes('world stage') || 
           content.includes('proceed to world') ||
           content.includes('start world building') ||
           content.includes('go to world'))
        );
      });
      
      if (transitionRequested) {
        console.log('User requested transition to world stage, updating foundation');
        
        // Update the foundation's stage to world
        updateFoundationMutation.mutate({
          id: foundation.id,
          currentStage: 'world'
        });
        
        // Notify the user about the transition
        toast({
          title: 'Moving to world building',
          description: 'Now that we have your environment details, we can start building your world.',
          duration: 3000
        });
        
        // Update the chat interface state if we have the ref
        if (chatInterfaceRef.current) {
          chatInterfaceRef.current.setCurrentStage('world');
        }
      }
    }
  }, [foundation, messages, updateFoundationMutation, toast]);
  
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
  
  // Handle opening the rename dialog
  const handleRenameFoundation = () => {
    if (foundation) {
      setNewFoundationName(foundation.name);
      setIsRenameDialogOpen(true);
    }
  };
  
  // Handle submitting the new foundation name
  const handleRenameSubmit = () => {
    if (!foundation || !newFoundationName.trim()) return;
    
    updateFoundationMutation.mutate({
      id: foundation.id,
      name: newFoundationName.trim()
    });
    
    toast({
      title: 'Foundation renamed',
      description: 'Your foundation has been successfully renamed.'
    });
    
    setIsRenameDialogOpen(false);
  };
  
  // Helper function to navigate to genre details page
  const navigateToGenreDetails = () => {
    if (!foundation) return;
    
    // Create the URL to check what we're using
    const genreURL = `/genre-details?foundationId=${foundation.id}`;
    
    console.log('Navigating to genre details page:', {
      foundationId: foundation.id,
      url: genreURL,
      foundationType: typeof foundation.id
    });
    
    // Force a full page refresh to ensure clean state
    window.location.href = genreURL;
  };
  
  // Function to send messages to the foundation chat
  const sendFoundationChatMessage = async (message: string, threadId?: string, chatInterface?: any): Promise<{
    content: string;
    suggestions?: string[];
    threadId?: string;
    currentStage?: string;
  }> => {
    try {
      if (!foundation) {
        throw new Error('Foundation not found');
      }
      
      // Check for special commands to show/hide foundation components
      const lowerCaseMessage = message.toLowerCase().trim();
      if (lowerCaseMessage === 'show components' || 
          lowerCaseMessage === 'show cards' || 
          lowerCaseMessage === 'show details' ||
          lowerCaseMessage === 'show foundation') {
        setShowFoundationComponents(true);
        return {
          content: "I've made all foundation components visible in the sidebars. You can now see your genre, world, characters, and story cards.",
          suggestions: ['Thanks!', 'Can you explain what I can do with these cards?', 'Hide them again please']
        };
      }
      
      if (lowerCaseMessage === 'hide components' || 
          lowerCaseMessage === 'hide cards' || 
          lowerCaseMessage === 'hide details' ||
          lowerCaseMessage === 'hide foundation') {
        setShowFoundationComponents(false);
        return {
          content: "I've hidden the foundation components from the sidebars. The chat interface is now centered for a more focused experience.",
          suggestions: ['Thanks!', 'Show them again please', 'Let\'s continue with our story development']
        };
      }
      
      // Detect commands to show genre details
      if (lowerCaseMessage === 'show genre details' || 
          lowerCaseMessage === 'reveal genre details' || 
          lowerCaseMessage === 'show genre card' ||
          lowerCaseMessage === 'open genre details') {
        if (genreDetails && genreDetails.mainGenre) {
          // Navigate directly to the genre details page
          navigate(`/genre-details?foundationId=${foundation.id}`);
          return {
            content: "I'll take you to your genre details page where you can see all the information.",
            suggestions: ['Thanks!', 'Can you tell me more about this genre?', 'Let\'s work on the environment now']
          };
        } else {
          return {
            content: "You need to create genre details first. Let's work on defining your genre details.",
            suggestions: ['Tell me about genre details', 'How do I create genre details?', 'Let\'s define our genre']
          };
        }
      }
      
      // Use the foundation's threadId if available and no specific threadId was provided
      const chatThreadId = threadId || foundation.threadId;
      
      // Simplify stage determination by relying on the foundation's currentStage
      // The backend will properly determine the appropriate assistant based on completion flags
      const currentAssistantType = foundation.currentStage || 'genre';
      
      // Set the current stage in the chat interface if it's provided
      if (chatInterface && typeof chatInterface.setCurrentStage === 'function') {
        chatInterface.setCurrentStage(currentAssistantType);
      }
      
      console.log(`Processing chat message. Foundation ID: ${foundation.id}, Current stage: ${currentAssistantType}`);
      console.log(`Thread ID: ${chatThreadId || 'none'}`);
      
      // Let the backend determine the correct assistant based on completion flags
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
        
        // Update the current stage in the chat interface
        if (chatInterface && typeof chatInterface.setCurrentStage === 'function') {
          chatInterface.setCurrentStage(data.contextType);
        }
        
        // Update the current stage in the foundation record
        updateFoundationMutation.mutate({
          id: foundation.id,
          currentStage: data.contextType
        });
        
        // Show foundation components when transitioning from genre to any other stage
        if (data.contextType && data.contextType !== 'genre') {
          setShowFoundationComponents(true);
        }
        
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
        suggestions: data.suggestions || [],
        currentStage: data.contextType || currentAssistantType
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
                  navigate(specificUrl);
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
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 ml-2" onClick={handleRenameFoundation}>
              <Pencil className="h-4 w-4 text-neutral-500" />
            </Button>
          </div>
          
          <div className="flex space-x-2 mt-4 md:mt-0">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={handleDeleteFoundation}>
              <Trash2 className="h-4 w-4 text-neutral-500" />
            </Button>
          </div>
        </div>
        
        {/* Main content with 3-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Genre Details Card - now removed in favor of direct navigation to genre details page */}
          
          {/* Empty space on the left when items are hidden - for centering */}
          <div className={`lg:col-span-3 ${showFoundationComponents ? 'hidden' : 'lg:block'}`}></div>
          
          {/* Left side: Genre/World/Character cards - only show if foundation is complete or explicitly requested */}
          <div className={`lg:col-span-3 ${!showFoundationComponents ? 'hidden lg:hidden' : 'lg:block'}`}>
            <div className="space-y-4">
              {/* Genre Card - Only visible when Genre is completed */}
              {foundation.genreCompleted && foundation.genre && (
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
                      onClick={navigateToGenreDetails}
                    >
                      View Details
                    </Button>
                  </CardFooter>
                </Card>
              )}
              
              {/* Environment Card - Only visible when Environment is completed */}
              {foundation.environmentCompleted && (
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
                    onClick={() => navigate(`/environment-details?foundationId=${foundation.id}`)}
                  >
                    View Details
                  </Button>
                </CardFooter>
              </Card>
              )}
              
              {/* World Card - Only visible when World is completed */}
              {foundation.worldCompleted && foundation.description && (
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
              
              {/* Characters Card - Only visible when Characters are completed */}
              {foundation.charactersCompleted && characters.length > 0 && (
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
                      View All Characters
                    </Button>
                  </CardFooter>
                </Card>
              )}
            </div>
          </div>
          
          {/* Center: Chat window - always show */}
          <div className="lg:col-span-6">
            <div className="h-[calc(100vh-220px)] min-h-[400px]">
              {/* Completely remount chat interface using componentKey when foundation changes */}
              {foundation && (
                <FoundationChatInterfaceNew 
                  key={`foundation-chat-${foundation.id}-${componentKey}`} 
                  foundation={foundation}
                  title={`Building ${foundation.name}`}
                  description="Discuss and develop your story foundation through natural conversation"
                  foundationId={foundation.id}
                  messageHandler={(message, threadId) => sendFoundationChatMessage(
                    message, 
                    threadId, 
                    chatInterfaceRef.current
                  )}
                  initialThreadId={foundation.threadId || undefined}
                  ref={chatInterfaceRef}
                />
              )}
            </div>
          </div>
          
          {/* Helper text on the right - shown when other components are hidden */}
          <div className={`lg:col-span-3 ${showFoundationComponents ? 'hidden' : 'lg:block'}`}>
            <Card className="bg-blue-50/50 border-blue-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center">
                  <MessageSquare className="mr-2 h-5 w-5 text-blue-500" />
                  Chat Interface Guide
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="space-y-4">
                  {/* First section - Current Stage */}
                  <div>
                    <h3 className="font-semibold text-blue-700 mb-2 text-center bg-blue-50 py-2 rounded-full border border-blue-100">
                      Current Stage: {foundation.currentStage === 'genre' ? 'Genre Selection' : 
                                     foundation.currentStage === 'environment' ? 'Environment Creation' :
                                     foundation.currentStage === 'world' ? 'World Building' :
                                     foundation.currentStage === 'character' ? 'Character Creation' : 'Foundation Setup'}
                    </h3>
                  </div>
                  
                  {/* Second section - Messages & Suggestions */}
                  <div>
                    <h3 className="font-semibold text-blue-700 mb-2">Using the Chat Interface</h3>
                    <div className="space-y-2">
                      <div className="flex items-start">
                        <div className="bg-blue-100 text-blue-600 rounded w-8 h-6 flex items-center justify-center mr-2 mt-0.5 flex-shrink-0 text-xs font-semibold">CHAT</div>
                        <p>Type freely in the message box - you can be as brief or as detailed as you like. Longer, descriptive responses will create more personalized results.</p>
                      </div>
                      
                      <div className="flex items-start">
                        <div className="bg-blue-100 text-blue-600 rounded w-8 h-6 flex items-center justify-center mr-2 mt-0.5 flex-shrink-0 text-xs font-semibold">TIPS</div>
                        <p>Suggestion bubbles appear below your messages. <strong>Click multiple suggestions</strong> to combine them, then add your own text for personalized responses.</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Third section - Voice/Audio */}
                  <div>
                    <h3 className="font-semibold text-blue-700 mb-2">Voice Interaction</h3>
                    <div className="flex items-start">
                      <div className="bg-blue-100 text-blue-600 rounded w-8 h-6 flex items-center justify-center mr-2 mt-0.5 flex-shrink-0 text-xs font-semibold">AUDIO</div>
                      <p>Click the microphone icon to speak your responses. Click the audio icon to hear the assistant's responses read aloud.</p>
                    </div>
                  </div>
                  
                  {/* Conditional command tip based on message count */}
                  {messages && messages.filter((m: {role: string}) => m.role === 'user').length >= 2 && (
                    <div className="pt-2 border-t border-blue-100">
                      <p className="text-blue-700 flex items-center">
                        <span className="bg-blue-100 text-blue-600 rounded-full w-5 h-5 flex items-center justify-center mr-2 flex-shrink-0 text-xs">✓</span>
                        Type <span className="font-mono bg-blue-100 px-1 rounded mx-1">Finish it</span> to let AI complete this stage for you.
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Right side: Stories list and create button - only shown when ALL foundation stages are complete */}
          <div className={`lg:col-span-3 ${!showFoundationComponents || !isFoundationComplete(foundation, characters) ? 'hidden lg:hidden' : ''}`}>
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
                  disabled={createStoryMutation.isPending}
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
      
      {/* Rename Foundation Dialog */}
      <Dialog open={isRenameDialogOpen} onOpenChange={setIsRenameDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Rename Foundation</DialogTitle>
            <DialogDescription>
              Enter a new name for your foundation
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input 
                id="name" 
                value={newFoundationName} 
                onChange={(e) => setNewFoundationName(e.target.value)}
                className="col-span-3"
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRenameDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleRenameSubmit} disabled={!newFoundationName.trim() || newFoundationName.trim() === foundation?.name}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FoundationDetails;
