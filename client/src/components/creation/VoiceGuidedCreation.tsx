import React from 'react';
import { useState, useEffect, useRef } from 'react';
import { useLocation, Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Mic, MicOff, Send, RefreshCw, VolumeX, Volume2, 
  Map, User, Sparkles, Wand2, ArrowRight, 
  BookText, BookOpen, Scroll, Gamepad, Flame 
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { fetchInteractiveStoryResponse, fetchGenreDetails, GenreCreationInput, GenreDetails } from '@/lib/openai';
import { CharacterData } from '../character/CharacterBuilder';
import { WorldData } from '../world/WorldDesigner';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { useTTS } from '@/hooks/useTTS';
import { AudioPlayer } from '@/components/ui/audio-player';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface VoiceGuidedCreationProps {
  onWorldCreated: (world: WorldData) => void;
  onCharacterCreated: (character: CharacterData) => void;
  onStoryReady: (world: WorldData, characters: CharacterData[]) => void;
}

// Story type definitions
export type StoryType = 'novel' | 'novella' | 'short_story' | 'game';

export interface StoryTypeInfo {
  id: StoryType;
  name: string;
  description: string;
  wordCount?: string;
  icon: React.ReactNode;
}

// Message types for the conversation
interface Message {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  interviewStage?: 'genre' | 'influences' | 'world' | 'characters' | 'details' | 'ready';
  inspiration?: string[];
  suggestions?: string[];
  worldData?: Partial<WorldData>;
  characterData?: Partial<CharacterData>;
  showStoryTypeSelector?: boolean;
}

export const VoiceGuidedCreation: React.FC<VoiceGuidedCreationProps> = ({
  onWorldCreated,
  onCharacterCreated,
  onStoryReady
}) => {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [partialWorld, setPartialWorld] = useState<Partial<WorldData>>({});
  const [partialCharacters, setPartialCharacters] = useState<Partial<CharacterData>[]>([]);
  const [inspirations, setInspirations] = useState<string[]>([]);
  const [storyType, setStoryType] = useState<StoryType>('short_story');
  const scrollRef = useRef<HTMLDivElement>(null);
  const autoSubmitTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Track conversation state within each assistant
  const [genreConversation, setGenreConversation] = useState<{
    messages: { role: 'user' | 'assistant', content: string }[];
    isComplete: boolean;
    summary?: GenreDetails;
  }>({
    messages: [],
    isComplete: false
  });
  
  const [worldConversation, setWorldConversation] = useState<{
    messages: { role: 'user' | 'assistant', content: string }[];
    isComplete: boolean;
    summary?: Partial<WorldData>;
  }>({
    messages: [],
    isComplete: false
  });
  
  const [characterConversation, setCharacterConversation] = useState<{
    messages: { role: 'user' | 'assistant', content: string }[];
    isComplete: boolean;
    summary?: Partial<CharacterData>;
  }>({
    messages: [],
    isComplete: false
  });
  
  // Define story type options
  const storyTypeOptions: StoryTypeInfo[] = [
    {
      id: 'novel',
      name: 'Novel',
      description: 'A complete story with detailed narrative, character development, and complex plot.',
      wordCount: '40,000+ words',
      icon: <BookOpen className="h-4 w-4" />
    },
    {
      id: 'novella',
      name: 'Novella',
      description: 'A focused narrative with a single storyline and moderate character development.',
      wordCount: '17,500 - 40,000 words',
      icon: <BookText className="h-4 w-4" />
    },
    {
      id: 'short_story',
      name: 'Short Story',
      description: 'A concise narrative focusing on a single incident or character.',
      wordCount: '1,000 - 10,000 words',
      icon: <Scroll className="h-4 w-4" />
    },
    {
      id: 'game',
      name: 'Game Setting',
      description: 'World-building and character development for an interactive game experience.',
      icon: <Gamepad className="h-4 w-4" />
    }
  ];
  
  // Speech recognition setup - use continuous mode like ChatGPT iOS app
  const { transcript, isListening, start: startRecognition, stop: stopRecognition } = useSpeechRecognition({
    onResult: (text) => {
      if (text.trim() !== '') {
        setInputText(text);
        
        // Auto-submit after a brief pause if the text is substantial
        if (text.trim().length > 10 && !isProcessing && !isSpeaking) {
          const cleanText = text.trim();
          if (autoSubmitTimerRef.current) {
            clearTimeout(autoSubmitTimerRef.current);
          }
          
          autoSubmitTimerRef.current = setTimeout(() => {
            console.log("Auto-submitting voice input:", cleanText);
            setInputText(cleanText);
            handleSendMessage();
          }, 2000); // 2-second pause after speaking
        }
      }
    },
    onEnd: () => {
      console.log("Speech recognition ended");
      
      // Auto-restart recognition to maintain continuous listening
      if (voiceEnabled) {
        console.log("Auto-restarting voice recognition...");
        setTimeout(() => {
          startRecognition();
        }, 500);
      }
    },
    continuous: true
  });
  
  // Speech synthesis setup - using OpenAI TTS instead of ElevenLabs
  const { speak, isPlaying, stop: stopSpeaking, voices, voicesLoading, selectedVoice, changeVoice, currentAudioUrl } = useTTS({
    defaultVoiceId: "alloy", // Use OpenAI's Alloy voice
    defaultProvider: "openai"
  });
  
  // Log any TTS-related state changes
  useEffect(() => {
    console.log("TTS State: isPlaying=", isPlaying, "voicesLoading=", voicesLoading);
    if (voices.length > 0) {
      console.log("Available voices:", voices.map(v => `${v.name} (${v.provider})`).join(", "));
    }
    if (selectedVoice) {
      console.log("Selected voice:", selectedVoice.name, "Provider:", selectedVoice.provider);
    }
  }, [isPlaying, voices, voicesLoading, selectedVoice]);
  
  // Track interview stage
  const [interviewStage, setInterviewStage] = useState<
    'genre' | 'world' | 'characters' | 'influences' | 'details' | 'ready'
  >('genre');
  
  // Initialize with a welcoming AI message
  useEffect(() => {
    const initialMessage: Message = {
      id: Date.now().toString(),
      content: "Welcome to StoryFlow! I'll help you create an amazing interactive story through our conversation. We'll follow this process: first exploring genre, then building your world, creating characters, discussing influences, adding details, and finally starting your story. To begin, what kind of stories do you enjoy, or what themes or genres would you like to explore?",
      sender: 'ai',
      timestamp: new Date(),
      interviewStage: 'genre',
      suggestions: [
        "I love fantasy stories with magic and adventure",
        "I'm interested in sci-fi exploring future technology",
        "I enjoy mysteries and detective stories",
        "I'd like a story about personal growth and discovery"
      ]
    };
    
    setMessages([initialMessage]);
    
    // Use OpenAI's Alloy voice if available
    if (voices.length > 0) {
      const preferredVoice = voices.find(v => 
        v.id === "alloy" || // Alloy from OpenAI
        v.name.includes('Alloy') || 
        v.provider === 'openai'
      );
      if (preferredVoice) {
        console.log("Setting preferred voice:", preferredVoice.name);
        changeVoice(preferredVoice.id, preferredVoice.provider);
      }
    }
    
    // Always enable voice by default and auto-start speech and recognition
    setVoiceEnabled(true);
    
    // Auto-speak the welcome message (with improved retry mechanism)
    const speakWithRetry = (retryCount = 0) => {
      console.log(`Attempting to speak welcome message (attempt ${retryCount + 1})`);
      
      // Force a retry if no voices are loaded yet or maximum retries not reached
      if ((voices.length === 0 || !selectedVoice) && retryCount < 10) {
        // Voices not loaded yet, wait and retry
        console.log("Voices not loaded yet or no voice selected, waiting to retry...");
        setTimeout(() => speakWithRetry(retryCount + 1), 1000);
        return;
      }
      
      // This is a workaround to ensure we have a valid voice and the DOM is fully loaded
      setTimeout(() => {
        console.log("Speaking welcome message with voice:", selectedVoice?.name || "default");
        
        // Explicitly select OpenAI voice if not already selected
        if (!selectedVoice) {
          const openAIVoice = voices.find(v => v.provider === 'openai' && v.id === 'alloy');
          if (openAIVoice) {
            console.log("Explicitly setting OpenAI voice:", openAIVoice.name);
            changeVoice(openAIVoice.id, openAIVoice.provider);
          }
        }
        
        // Use a longer delay to ensure everything is initialized
        setTimeout(() => {
          console.log("Actually speaking welcome message now");
          speakMessage(initialMessage.content);
          
          // Also auto-start continuous voice recognition
          if (!isListening) {
            console.log("Auto-starting voice recognition");
            startRecognition();
          }
        }, 1000);
      }, 2000);
    };
    
    // Start the speech process
    speakWithRetry();
  }, [voices]);
  
  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      // Use setTimeout to ensure the DOM has updated before scrolling
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
          console.log("Scrolling to bottom:", scrollRef.current.scrollHeight);
        }
      }, 100);
    }
  }, [messages]);
  
  // Utility function to speak a message using TTS
  const speakMessage = async (text: string) => {
    if (!voiceEnabled) return;
    
    console.log("Speaking message:", text.slice(0, 50) + "...");
    setIsSpeaking(true);
    
    try {
      // Use the speak function from useTTS hook (with OpenAI's voice)
      await speak(text);
    } catch (error) {
      console.error("Error speaking message:", error);
      toast({
        title: "Voice Error",
        description: "Could not play voice. Text-to-speech service might be unavailable.",
        variant: "destructive",
      });
    } finally {
      setIsSpeaking(false);
    }
  };
  
  // Toggle voice recognition on/off
  const toggleVoiceRecognition = () => {
    if (isListening) {
      console.log("Stopping voice recognition");
      stopRecognition();
    } else {
      console.log("Starting voice recognition");
      startRecognition();
    }
  };
  
  // Toggle voice output on/off
  const toggleVoiceOutput = () => {
    setVoiceEnabled(!voiceEnabled);
    if (isPlaying) {
      stopSpeaking();
    }
  };
  
  // Handle stage selection (from sidebar)
  const handleStageSelect = (stage: 'genre' | 'world' | 'characters' | 'influences' | 'details' | 'ready') => {
    console.log("Selected stage:", stage);
    setInterviewStage(stage);
    
    // Generate appropriate AI message for the selected stage
    let stageMessage = '';
    let suggestions: string[] = [];
    
    switch (stage) {
      case 'genre':
        stageMessage = "Let's explore the genre for your story. What kind of stories do you enjoy reading or watching?";
        suggestions = [
          "I love fantasy stories with magic and adventure",
          "I'm interested in sci-fi exploring future technology",
          "I enjoy mysteries and detective stories",
          "I'd like a story about personal growth and discovery"
        ];
        break;
      case 'world':
        stageMessage = "Now, let's build the world for your story. What kind of setting do you envision?";
        suggestions = [
          "A medieval kingdom with castles and forests",
          "A futuristic city with advanced technology",
          "A modern-day setting but with secret magic",
          "A post-apocalyptic world being rebuilt"
        ];
        break;
      case 'characters':
        stageMessage = "Let's create some characters for your story. Who would you like the main character to be?";
        suggestions = [
          "Someone who discovers they have special abilities",
          "A person seeking redemption from past mistakes",
          "An ordinary person thrust into extraordinary circumstances",
          "Someone challenging the established order"
        ];
        break;
      case 'influences':
        stageMessage = "What books, movies, or other stories have influenced your taste? Mention any that you'd like to draw inspiration from.";
        suggestions = [
          "I love the worldbuilding in Lord of the Rings",
          "The character depth in stories by Jane Austen",
          "The plot twists in Agatha Christie's mysteries",
          "The emotional journey in Pixar films"
        ];
        break;
      case 'details':
        stageMessage = "Let's add some final details to your story. What themes or messages would you like to explore?";
        suggestions = [
          "The importance of friendship and loyalty",
          "Overcoming personal fears and limitations",
          "Finding balance between technology and nature",
          "The complexity of moral choices"
        ];
        break;
      case 'ready':
        stageMessage = "Great! We have all we need to start your interactive story. Are you ready to begin?";
        suggestions = [
          "Yes, let's start the story!",
          "I'd like to review the details first",
          "Can we make some final adjustments?",
          "Tell me how the interactive part works"
        ];
        break;
    }
    
    // Add the AI message to the conversation
    const stageChangeMessage: Message = {
      id: Date.now().toString(),
      content: stageMessage,
      sender: 'ai',
      timestamp: new Date(),
      interviewStage: stage,
      suggestions
    };
    
    setMessages(prev => [...prev, stageChangeMessage]);
    
    // Speak the stage message
    speakMessage(stageMessage);
  };
  
  // Handle story type selection
  const handleStoryTypeSelect = (type: StoryType) => {
    setStoryType(type);
    console.log("Selected story type:", type);
    
    const selectedType = storyTypeOptions.find(t => t.id === type);
    
    // Add a message acknowledging the choice
    const typeMessage: Message = {
      id: Date.now().toString(),
      content: `You've selected a ${selectedType?.name}. ${selectedType?.description || ''} Let's start building your world. What kind of setting did you have in mind?`,
      sender: 'ai',
      timestamp: new Date(),
      interviewStage: 'world',
      suggestions: [
        "A medieval fantasy kingdom",
        "A futuristic space colony",
        "A modern city with supernatural elements",
        "A post-apocalyptic wasteland"
      ]
    };
    
    setMessages(prev => [...prev, typeMessage]);
    setInterviewStage('world');
    
    // Speak the message
    speakMessage(typeMessage.content);
  };
  
  // Determine the next stage based on user input and current stage
  const determineNextStage = (currentStage: 'genre' | 'world' | 'characters' | 'influences' | 'details' | 'ready', userInput: string): 'genre' | 'world' | 'characters' | 'influences' | 'details' | 'ready' => {
    const input = userInput.toLowerCase();
    
    // Check for explicit stage transition requests
    if (input.includes('next stage') || input.includes('move on') || input.includes('continue')) {
      switch (currentStage) {
        case 'genre': return 'world';
        case 'world': return 'characters';
        case 'characters': return 'influences';
        case 'influences': return 'details';
        case 'details': return 'ready';
        default: return currentStage;
      }
    }
    
    // Look for stage-specific completion indicators
    if (currentStage === 'genre' && 
        (input.includes('world') || input.includes('setting') || input.includes('place'))) {
      return 'world';
    }
    
    if (currentStage === 'world' && 
        (input.includes('character') || input.includes('person') || input.includes('people'))) {
      return 'characters';
    }
    
    if (currentStage === 'characters' && 
        (input.includes('inspire') || input.includes('influence') || input.includes('like'))) {
      return 'influences';
    }
    
    if (currentStage === 'influences' && 
        (input.includes('detail') || input.includes('more') || input.includes('add'))) {
      return 'details';
    }
    
    if (currentStage === 'details' && 
        (input.includes('start') || input.includes('begin') || input.includes('ready'))) {
      return 'ready';
    }
    
    return currentStage; // Stay at the current stage if there's no clear indicator
  };
  
  // Generate suggestions based on the current stage and conversation
  const generateSuggestions = (stage: 'genre' | 'world' | 'characters' | 'influences' | 'details' | 'ready', worldData: Partial<WorldData>, characters: Partial<CharacterData>[]) => {
    let suggestions: string[] = [];
    
    switch (stage) {
      case 'genre':
        suggestions = [
          "I enjoy epic fantasy stories",
          "I'd like a science fiction setting",
          "I prefer mystery and suspense",
          "Can we create a romantic story?"
        ];
        break;
      case 'world':
        suggestions = [
          "A medieval kingdom with castles and forests",
          "A futuristic space colony on a distant planet",
          "A modern city with hidden supernatural elements",
          "A mysterious island with ancient secrets"
        ];
        break;
      case 'characters':
        suggestions = [
          "A hero with a mysterious past",
          "Someone discovering special abilities",
          "A reluctant leader forced into action",
          "A character seeking redemption"
        ];
        break;
      case 'influences':
        suggestions = [
          "I love the style of Harry Potter",
          "Game of Thrones has amazing character work",
          "The storytelling in The Last of Us",
          "The world-building of Star Wars"
        ];
        break;
      case 'details':
        suggestions = [
          "I'd like to explore themes of friendship",
          "Can we add some political intrigue?",
          "I want moral dilemmas as a central theme",
          "I'd like humor to balance the serious parts"
        ];
        break;
      case 'ready':
        suggestions = [
          "Yes, I'm ready to start my story!",
          "Let's review what we've created first",
          "Can we make some final adjustments?",
          "How will the interactive parts work?"
        ];
        break;
    }
    
    return suggestions;
  };
  
  // Handle sending a user message
  const handleSendMessage = async () => {
    if (inputText.trim() === '' || isProcessing) return;
    
    // Get current interview stage
    const lastAiMessage = messages.findLast(msg => msg.sender === 'ai');
    const currentStage = lastAiMessage?.interviewStage || interviewStage;
    
    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputText,
      sender: 'user',
      timestamp: new Date(),
      interviewStage: currentStage
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsProcessing(true);
    
    try {
      // Process the message based on the current stage
      const nextStage = determineNextStage(currentStage, inputText);
      
      // Create the AI response
      const aiResponse: Message = {
        id: Date.now().toString(),
        content: `Processing your input about: "${inputText.substring(0, 30)}..."`,
        sender: 'ai',
        timestamp: new Date(),
        interviewStage: nextStage,
        suggestions: generateSuggestions(nextStage, partialWorld, partialCharacters)
      };
      
      // Add placeholder response while processing
      setMessages(prev => [...prev, aiResponse]);
      
      // Process the user's input and generate a real response based on the current stage
      let responseContent = '';
      
      if (currentStage === 'genre') {
        try {
          console.log('Fetching genre details...');
          // Create genre input based on user message
          const genreInput: GenreCreationInput = {
            userInterests: inputText
          };
          
          // Add the user message to genre conversation
          setGenreConversation(prev => ({
            ...prev,
            messages: [...prev.messages, { role: 'user', content: inputText }]
          }));
          
          // Call the OpenAI API to get genre details
          const genreDetails = await fetchGenreDetails(genreInput);
          console.log('Received genre details:', genreDetails);
          
          // Update the genre conversation with the response
          setGenreConversation(prev => ({
            messages: [
              ...prev.messages, 
              { role: 'assistant', content: `I've created a ${genreDetails.name} genre for you.` }
            ],
            isComplete: true,
            summary: genreDetails
          }));
          
          responseContent = `I've created a custom "${genreDetails.name}" genre for your story! This genre is ${genreDetails.description} Would you like to move on to creating your world now?`;
        } catch (error) {
          console.error('Error fetching genre details:', error);
          responseContent = 'I had some trouble creating a genre based on your input. Could you try giving me a bit more detail about what kind of story you want to create?';
        }
      } else {
        // For other stages, use placeholder responses for now
        switch (nextStage) {
          case 'world':
            responseContent = "Let's develop your world! What kind of setting did you have in mind?";
            break;
          case 'characters':
            responseContent = "Now let's create some interesting characters. Tell me about who you'd like to be in your story.";
            break;
          case 'influences':
            responseContent = "What books, movies or stories have influenced your idea? This helps me understand your taste better.";
            break;
          case 'details':
            responseContent = "Let's add some final details to make your story unique. Any specific themes or elements you want to include?";
            break;
          case 'ready':
            responseContent = "Excellent! We have everything we need to create your interactive story. Ready to begin?";
            break;
          default:
            responseContent = "Tell me more about your ideas for the story.";
        }
      }
      
      // Update the AI message with the actual response
      setMessages(prev => {
        const updatedMessages = [...prev];
        const lastAiMessageIndex = updatedMessages.findLastIndex(msg => msg.sender === 'ai');
        
        if (lastAiMessageIndex !== -1) {
          updatedMessages[lastAiMessageIndex] = {
            ...updatedMessages[lastAiMessageIndex],
            content: responseContent
          };
        }
        
        return updatedMessages;
      });
      
      setIsProcessing(false);
      setInterviewStage(nextStage);
      
    } catch (error) {
      console.error('Error processing message:', error);
      setIsProcessing(false);
      
      // Add error message
      const errorMessage: Message = {
        id: Date.now().toString(),
        content: 'Sorry, I had trouble processing that. Could you try again?',
        sender: 'ai',
        timestamp: new Date(),
        interviewStage: currentStage
      };
      
      setMessages(prev => [...prev, errorMessage]);
    }
  };
  
  // Prepare the stages for the sidebar display
  const sidebarStages = {
    genre: {
      isComplete: genreConversation.isComplete,
      details: genreConversation.summary
    },
    world: {
      isComplete: worldConversation.isComplete,
      details: partialWorld
    },
    characters: {
      isComplete: partialCharacters.length > 0,
      details: partialCharacters.length > 0 ? partialCharacters : undefined
    },
    influences: {
      isComplete: inspirations.length > 0,
      items: inspirations.length > 0 ? inspirations : undefined
    },
    details: {
      isComplete: interviewStage === 'ready'
    }
  };
  
  // UI for the voice-guided creation experience
  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden p-4">
        <div className="flex items-center mb-4 gap-2">
          <h1 className="text-2xl font-bold flex-1">Create Your Story</h1>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="icon" 
              onClick={toggleVoiceRecognition}
              className={isListening ? "bg-red-100 dark:bg-red-900" : ""}
            >
              {isListening ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
            </Button>
            <Button 
              variant="outline" 
              size="icon" 
              onClick={toggleVoiceOutput}
            >
              {voiceEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </Button>
          </div>
        </div>
        
        <Card className="flex-1 overflow-hidden">
          <ScrollArea className="h-[50vh]" ref={scrollRef}>
            <CardContent className="p-4 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex flex-col ${
                  message.sender === 'user' ? 'items-end' : 'items-start'
                }`}
              >
                <div
                  className={`rounded-lg p-3 max-w-[80%] ${
                    message.sender === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  <div className="whitespace-pre-wrap">{message.content}</div>
                  
                  {/* Show story type selector if requested */}
                  {message.showStoryTypeSelector && (
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      {storyTypeOptions.map(type => (
                        <Button
                          key={type.id}
                          variant="outline"
                          className="flex items-center justify-start gap-2 h-auto py-2"
                          onClick={() => handleStoryTypeSelect(type.id)}
                        >
                          <div className="shrink-0">{type.icon}</div>
                          <div className="flex flex-col items-start text-left">
                            <span className="font-medium">{type.name}</span>
                            {type.wordCount && (
                              <span className="text-xs opacity-70">{type.wordCount}</span>
                            )}
                          </div>
                        </Button>
                      ))}
                    </div>
                  )}
                  
                  {/* Show suggestions if available */}
                  {message.sender === 'ai' && message.suggestions && message.suggestions.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {message.suggestions.map((suggestion, i) => (
                        <Badge
                          key={i}
                          variant="secondary"
                          className="cursor-pointer hover:bg-secondary/80 transition-colors p-1.5"
                          onClick={() => {
                            setInputText(suggestion);
                            // Auto-submit after a brief delay
                            setTimeout(() => {
                              handleSendMessage();
                            }, 500);
                          }}
                        >
                          {suggestion}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                
                <div className="text-xs text-muted-foreground mt-1 px-2">
                  {message.sender === 'user' ? 'You' : 'AI'} · {message.timestamp.toLocaleTimeString()}
                </div>
              </div>
            ))}
            </CardContent>
          </ScrollArea>
          
          <div className="p-4 border-t flex flex-col gap-2">
            {currentAudioUrl && (
              <div className="w-full mb-2">
                <AudioPlayer 
                  audioUrl={currentAudioUrl} 
                  onPlayStateChange={(isPlaying) => setIsSpeaking(isPlaying)}
                />
              </div>
            )}
            
            <div className="flex gap-2 items-center">
              <Textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={isListening ? 'Listening...' : 'Type your message...'}
                className="resize-none flex-1"
                disabled={isProcessing}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
              />
              <Button
                onClick={handleSendMessage}
                disabled={isProcessing || inputText.trim() === ''}
              >
                {isProcessing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
            
            {/* Controls for voice interaction */}
            <div className="flex gap-2 mt-2 justify-center">
              {/* Button to replay the last AI message */}
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => {
                  const lastAiMessage = [...messages].reverse().find(msg => msg.sender === 'ai');
                  if (lastAiMessage) {
                    speakMessage(lastAiMessage.content);
                  }
                }}
                disabled={isSpeaking}
              >
                <Volume2 className="h-4 w-4 mr-2" />
                Replay Last Message
              </Button>
              
              {/* Button to toggle speech recognition */}
              <Button 
                variant={isListening ? "default" : "outline"}
                className="flex-1"
                onClick={toggleVoiceRecognition}
              >
                {isListening ? (
                  <>
                    <MicOff className="h-4 w-4 mr-2" />
                    Disable Speech Recognition
                  </>
                ) : (
                  <>
                    <Mic className="h-4 w-4 mr-2" />
                    Enable Speech Recognition
                  </>
                )}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};