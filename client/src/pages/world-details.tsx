import React, { useEffect, useState } from 'react';
import { useLocation, Link } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/contexts/AuthContext';
import { Foundation } from '@shared/schema';
import { ArrowLeft, Globe, RefreshCw, Map, History, Building, Coins, Wand2, MessageSquare } from 'lucide-react';
import FoundationChatInterface from '@/components/foundation/FoundationChatInterface';

// Define WorldDetails type locally
interface WorldDetails {
  name: string;
  description: string;
  era: string;
  geography: string[];
  locations: string[];
  threadId?: string;
  culture: {
    socialStructure: string;
    beliefs: string;
    customs: string[];
    languages: string[];
  };
  politics: {
    governmentType: string;
    powerDynamics: string;
    majorFactions: string[];
  };
  economy: {
    resources: string[];
    trade: string;
    currency: string;
  };
  technology: {
    level: string;
    innovations: string[];
    limitations: string;
  };
  conflicts: string[];
  history: {
    majorEvents: string[];
    legends: string[];
  };
  magicSystem?: {
    rules: string;
    limitations: string;
    practitioners: string;
  };
};

const WorldDetailsPage: React.FC = () => {
  const [location, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Get foundationId from URL query params
  const params = new URLSearchParams(location.split('?')[1]);
  const foundationId = parseInt(params.get('foundationId') || '0');
  
  // State to track if world is being generated
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Query foundation
  const { 
    data: foundation, 
    isLoading: isLoadingFoundation, 
    error: foundationError 
  } = useQuery<Foundation>({
    queryKey: [`/api/foundations/${foundationId}`],
    enabled: !!foundationId,
  });
  
  // Query world details
  const { 
    data: worldDetails, 
    isLoading: isLoadingWorld,
    error: worldError,
    refetch: refetchWorld 
  } = useQuery<WorldDetails>({
    queryKey: [`/api/foundations/${foundationId}/environment`],
    enabled: !!foundationId,
  });
  
  // Generate world details mutation
  const generateWorldMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/ai/world-details', {
        genreContext: foundation?.genre || '',
        setting: foundation?.description || '',
        foundationId: foundationId
      });
      return response.json();
    },
    onMutate: () => {
      setIsGenerating(true);
    },
    onSuccess: () => {
      toast({
        title: 'World details generated',
        description: 'Your world has been generated successfully.',
      });
      // Refresh world details
      refetchWorld();
      setIsGenerating(false);
    },
    onError: (error: any) => {
      toast({
        title: 'Generation failed',
        description: error.message || 'An error occurred while generating world details.',
        variant: 'destructive',
      });
      setIsGenerating(false);
    },
  });
  
  // Handle sending chat messages to the AI
  const sendWorldChatMessage = async (message: string, threadId?: string) => {
    try {
      const response = await apiRequest('POST', '/api/ai/world-details', {
        genreContext: foundation?.genre || '',
        setting: message, // Use the user's message as input
        threadId: threadId,
        previousMessages: threadId ? undefined : [], // Only pass empty array when creating new thread
        foundationId: foundationId
      });
      
      const data = await response.json();
      
      // Create suggested responses based on the context
      let suggestions: string[] = [];
      if (data.name) {
        suggestions = [
          "Tell me more about the geography",
          "How does the economy work?",
          "What conflicts exist in this world?",
          "Describe the cultural aspects"
        ];
      }
      
      return {
        content: data.description || data.message || "I've updated the world details based on your input.",
        threadId: data.threadId,
        suggestions
      };
    } catch (error) {
      console.error('Error sending message to world AI:', error);
      throw error;
    }
  };
  
  const handleGenerateWorld = () => {
    generateWorldMutation.mutate();
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
                <Globe className="mr-2 h-6 w-6 text-primary-500" /> 
                World Details
              </h1>
              <p className="text-neutral-600">Foundation: {foundation.name}</p>
            </div>
          </div>
          <Button 
            onClick={handleGenerateWorld} 
            disabled={isGenerating || generateWorldMutation.isPending}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isGenerating ? 'animate-spin' : ''}`} />
            {isGenerating ? 'Generating...' : 'Generate World'}
          </Button>
        </div>

        {isLoadingWorld || !worldDetails ? (
          <div className="bg-white rounded-lg shadow-sm p-8">
            {isLoadingWorld ? (
              <div className="space-y-4 animate-pulse">
                <div className="h-8 bg-neutral-200 rounded w-1/3"></div>
                <div className="h-4 bg-neutral-200 rounded w-2/3"></div>
                <div className="h-4 bg-neutral-200 rounded w-1/2"></div>
                <div className="h-4 bg-neutral-200 rounded w-3/4"></div>
              </div>
            ) : (
              <div className="text-center">
                <Globe className="h-16 w-16 text-neutral-300 mx-auto mb-4" />
                <h2 className="text-xl font-bold mb-2">No World Details Yet</h2>
                <p className="text-neutral-600 mb-6 max-w-md mx-auto">
                  Generate world details to define the geography, culture, politics, and history of your story world.
                </p>
                <Button 
                  onClick={handleGenerateWorld} 
                  disabled={isGenerating || generateWorldMutation.isPending}
                >
                  <RefreshCw className={`mr-2 h-4 w-4 ${isGenerating ? 'animate-spin' : ''}`} />
                  {isGenerating ? 'Generating...' : 'Generate World'}
                </Button>
              </div>
            )}
          </div>
        ) : (
          <>
            <Card className="mb-6">
              <CardContent className="p-6">
                <h2 className="text-2xl font-bold mb-2">{worldDetails.name}</h2>
                <p className="text-neutral-700 mb-4 text-lg">{worldDetails.era}</p>
                <p className="text-neutral-600">{worldDetails.description}</p>
              </CardContent>
            </Card>
          
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="mb-6">
                <TabsTrigger value="overview" className="flex items-center">
                  <Globe className="mr-2 h-4 w-4" /> Overview
                </TabsTrigger>
                <TabsTrigger value="geography" className="flex items-center">
                  <Map className="mr-2 h-4 w-4" /> Geography & Locations
                </TabsTrigger>
                <TabsTrigger value="society" className="flex items-center">
                  <Building className="mr-2 h-4 w-4" /> Society & Politics
                </TabsTrigger>
                <TabsTrigger value="economy" className="flex items-center">
                  <Coins className="mr-2 h-4 w-4" /> Economy & Technology
                </TabsTrigger>
                <TabsTrigger value="history" className="flex items-center">
                  <History className="mr-2 h-4 w-4" /> History & Conflicts
                </TabsTrigger>
                {worldDetails.magicSystem && (
                  <TabsTrigger value="magic" className="flex items-center">
                    <Wand2 className="mr-2 h-4 w-4" /> Magic System
                  </TabsTrigger>
                )}
                <TabsTrigger value="chat" className="flex items-center">
                  <MessageSquare className="mr-2 h-4 w-4" /> Chat with AI
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="overview">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardContent className="p-6">
                      <h3 className="text-xl font-bold mb-4">Geography Highlights</h3>
                      <ul className="list-disc list-inside mb-4 text-neutral-600">
                        {worldDetails.geography.slice(0, 3).map((item, index) => (
                          <li key={index}>{item}</li>
                        ))}
                      </ul>
                      
                      <h3 className="text-xl font-bold mb-4">Key Locations</h3>
                      <ul className="list-disc list-inside mb-4 text-neutral-600">
                        {worldDetails.locations.slice(0, 3).map((item, index) => (
                          <li key={index}>{item}</li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-6">
                      <h3 className="text-xl font-bold mb-4">Culture Overview</h3>
                      <p className="text-neutral-600 mb-2">
                        <span className="font-semibold">Social Structure:</span> {worldDetails.culture.socialStructure}
                      </p>
                      <p className="text-neutral-600 mb-4">
                        <span className="font-semibold">Beliefs:</span> {worldDetails.culture.beliefs}
                      </p>
                      
                      <h3 className="text-xl font-bold mb-4">Politics Overview</h3>
                      <p className="text-neutral-600">
                        <span className="font-semibold">Government:</span> {worldDetails.politics.governmentType}
                      </p>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-6">
                      <h3 className="text-xl font-bold mb-4">Major Conflicts</h3>
                      <ul className="list-disc list-inside mb-4 text-neutral-600">
                        {worldDetails.conflicts.slice(0, 3).map((item, index) => (
                          <li key={index}>{item}</li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-6">
                      <h3 className="text-xl font-bold mb-4">Technology Level</h3>
                      <p className="text-neutral-600 mb-4">{worldDetails.technology.level}</p>
                      
                      <h3 className="text-xl font-bold mb-4">Key Innovations</h3>
                      <ul className="list-disc list-inside mb-4 text-neutral-600">
                        {worldDetails.technology.innovations.slice(0, 3).map((item, index) => (
                          <li key={index}>{item}</li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
              
              <TabsContent value="geography">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardContent className="p-6">
                      <h3 className="text-xl font-bold mb-4">Geography Features</h3>
                      <ul className="list-disc list-inside mb-4 text-neutral-600">
                        {worldDetails.geography.map((item, index) => (
                          <li key={index}>{item}</li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-6">
                      <h3 className="text-xl font-bold mb-4">Important Locations</h3>
                      <ul className="list-disc list-inside mb-4 text-neutral-600">
                        {worldDetails.locations.map((item, index) => (
                          <li key={index}>{item}</li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
              
              <TabsContent value="society">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardContent className="p-6">
                      <h3 className="text-xl font-bold mb-4">Culture</h3>
                      <p className="text-neutral-600 mb-2">
                        <span className="font-semibold">Social Structure:</span> {worldDetails.culture.socialStructure}
                      </p>
                      <p className="text-neutral-600 mb-4">
                        <span className="font-semibold">Beliefs:</span> {worldDetails.culture.beliefs}
                      </p>
                      
                      <h4 className="text-lg font-semibold mb-2">Key Customs</h4>
                      <ul className="list-disc list-inside mb-4 text-neutral-600">
                        {worldDetails.culture.customs.map((item, index) => (
                          <li key={index}>{item}</li>
                        ))}
                      </ul>
                      
                      <h4 className="text-lg font-semibold mb-2">Languages</h4>
                      <ul className="list-disc list-inside mb-4 text-neutral-600">
                        {worldDetails.culture.languages.map((item, index) => (
                          <li key={index}>{item}</li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-6">
                      <h3 className="text-xl font-bold mb-4">Politics</h3>
                      <p className="text-neutral-600 mb-2">
                        <span className="font-semibold">Government Type:</span> {worldDetails.politics.governmentType}
                      </p>
                      <p className="text-neutral-600 mb-4">
                        <span className="font-semibold">Power Dynamics:</span> {worldDetails.politics.powerDynamics}
                      </p>
                      
                      <h4 className="text-lg font-semibold mb-2">Major Factions</h4>
                      <ul className="list-disc list-inside mb-4 text-neutral-600">
                        {worldDetails.politics.majorFactions.map((item, index) => (
                          <li key={index}>{item}</li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
              
              <TabsContent value="economy">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardContent className="p-6">
                      <h3 className="text-xl font-bold mb-4">Economy</h3>
                      <p className="text-neutral-600 mb-2">
                        <span className="font-semibold">Trade:</span> {worldDetails.economy.trade}
                      </p>
                      <p className="text-neutral-600 mb-4">
                        <span className="font-semibold">Currency:</span> {worldDetails.economy.currency}
                      </p>
                      
                      <h4 className="text-lg font-semibold mb-2">Key Resources</h4>
                      <ul className="list-disc list-inside mb-4 text-neutral-600">
                        {worldDetails.economy.resources.map((item, index) => (
                          <li key={index}>{item}</li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-6">
                      <h3 className="text-xl font-bold mb-4">Technology</h3>
                      <p className="text-neutral-600 mb-2">
                        <span className="font-semibold">Technology Level:</span> {worldDetails.technology.level}
                      </p>
                      <p className="text-neutral-600 mb-4">
                        <span className="font-semibold">Limitations:</span> {worldDetails.technology.limitations}
                      </p>
                      
                      <h4 className="text-lg font-semibold mb-2">Key Innovations</h4>
                      <ul className="list-disc list-inside mb-4 text-neutral-600">
                        {worldDetails.technology.innovations.map((item, index) => (
                          <li key={index}>{item}</li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
              
              <TabsContent value="history">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardContent className="p-6">
                      <h3 className="text-xl font-bold mb-4">Major Historical Events</h3>
                      <ul className="list-disc list-inside mb-4 text-neutral-600">
                        {worldDetails.history.majorEvents.map((item, index) => (
                          <li key={index}>{item}</li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-6">
                      <h3 className="text-xl font-bold mb-4">Legends & Folklore</h3>
                      <ul className="list-disc list-inside mb-4 text-neutral-600">
                        {worldDetails.history.legends.map((item, index) => (
                          <li key={index}>{item}</li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                  
                  <Card className="md:col-span-2">
                    <CardContent className="p-6">
                      <h3 className="text-xl font-bold mb-4">Major Conflicts</h3>
                      <ul className="list-disc list-inside mb-4 text-neutral-600">
                        {worldDetails.conflicts.map((item, index) => (
                          <li key={index}>{item}</li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
              
              {worldDetails.magicSystem && (
                <TabsContent value="magic">
                  <Card>
                    <CardContent className="p-6">
                      <h3 className="text-xl font-bold mb-4">Magic System</h3>
                      <div className="space-y-4">
                        <div>
                          <h4 className="text-lg font-semibold mb-2">Rules & Mechanics</h4>
                          <p className="text-neutral-600">{worldDetails.magicSystem.rules}</p>
                        </div>
                        
                        <div>
                          <h4 className="text-lg font-semibold mb-2">Limitations</h4>
                          <p className="text-neutral-600">{worldDetails.magicSystem.limitations}</p>
                        </div>
                        
                        <div>
                          <h4 className="text-lg font-semibold mb-2">Practitioners</h4>
                          <p className="text-neutral-600">{worldDetails.magicSystem.practitioners}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              )}
              
              <TabsContent value="chat">
                <div className="w-full h-[600px]">
                  <FoundationChatInterface
                    title={`Chat about ${worldDetails.name}`}
                    description="Discuss and develop your world with AI assistance. Ask questions or request changes to any aspect of your world."
                    foundationId={Number(foundationId)}
                    threadId={worldDetails.threadId}
                    onSendMessage={sendWorldChatMessage}
                    initialMessages={[
                      {
                        id: 'welcome',
                        content: `Welcome to the world of ${worldDetails.name}! This is an interactive chat where you can ask me questions about this world or suggest changes to its details. What would you like to explore?`,
                        sender: 'ai',
                        timestamp: new Date(),
                        suggestions: [
                          "Tell me more about the geography",
                          "How does the economy work?",
                          "What conflicts exist in this world?",
                          "Describe the cultural aspects"
                        ]
                      }
                    ]}
                  />
                </div>
              </TabsContent>
            </Tabs>
          </>
        )}
      </main>
    </div>
  );
};

export default WorldDetailsPage;