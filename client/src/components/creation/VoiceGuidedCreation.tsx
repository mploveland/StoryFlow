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
  BookText, BookOpen, Scroll, Gamepad 
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { fetchInteractiveStoryResponse, fetchGenreDetails, GenreCreationInput, GenreDetails } from '@/lib/openai';
import { CharacterData } from '../character/CharacterBuilder';
import { WorldData } from '../world/WorldDesigner';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { useTTS } from '@/hooks/useTTS';
import { AudioPlayer } from '@/components/ui/audio-player';

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

const VoiceGuidedCreation: React.FC<VoiceGuidedCreationProps> = ({
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
      // Combine message history for context
      const context = messages
        .slice(-8) // Only last 8 messages for context
        .map(msg => `${msg.sender === 'user' ? 'User' : 'AI'}: ${msg.content}`)
        .join('\n');
      
      // Current state data
      const currentState = {
        currentStage,
        interviewStage,
        inspirations,
        partialWorld,
        partialCharacters
      };
      
      // Determine the next interview stage based on current stage and user input
      let nextStage = determineNextStage(currentStage, inputText);
      setInterviewStage(nextStage);
      
      // Prepare AI response variables
      let responseContent = '';
      let extractedGenreDetails: GenreDetails | null = null;
      
      // Handle conversation based on the current stage
      if (currentStage === 'genre' && !genreConversation.isComplete) {
        try {
          console.log('Genre stage active, handling with Genre Creator assistant');
          
          // Add the user's message to the genre conversation history
          const updatedGenreConversation = {
            ...genreConversation,
            messages: [
              ...genreConversation.messages,
              { role: 'user' as const, content: inputText }
            ]
          };
          
          setGenreConversation(updatedGenreConversation);
          
          // Prepare input for the genre creation assistant
          let genreInput: GenreCreationInput;
          
          if (updatedGenreConversation.messages.length <= 1) {
            // First message to the assistant - include context
            genreInput = {
              userInterests: inputText,
              themes: inspirations.filter(item => !item.toLowerCase().includes('by') && !item.toLowerCase().includes('author')),
              inspirations: inspirations.filter(item => item.toLowerCase().includes('by') || item.toLowerCase().includes('author')),
              additionalInfo: context
            };
          } else {
            // Continuing conversation - just pass the message history
            const conversationHistory = updatedGenreConversation.messages
              .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
              .join('\n\n');
              
            genreInput = {
              userInterests: inputText,
              additionalInfo: conversationHistory
            };
          }
          
          // Detect if this might be our final genre message
          const seemsComplete = 
            inputText.toLowerCase().includes('sounds good') || 
            inputText.toLowerCase().includes('that works') || 
            inputText.toLowerCase().includes('i like that') ||
            inputText.toLowerCase().includes('move on') ||
            inputText.toLowerCase().includes('next stage') ||
            inputText.toLowerCase().includes('world') && 
            (inputText.toLowerCase().includes('build') || inputText.toLowerCase().includes('create'));
          
          // Call the Genre Creator assistant
          console.log('Calling Genre Creator assistant with:', genreInput);
          const genreDetails = await fetchGenreDetails(genreInput);
          console.log('Genre Creator assistant response:', genreDetails);
          
          // Add the assistant's response to the conversation
          const finalGenreConversation = {
            ...updatedGenreConversation,
            messages: [
              ...updatedGenreConversation.messages,
              { role: 'assistant' as const, content: genreDetails.description }
            ]
          };
          
          // If this seems like the final message in this stage, mark complete and save details
          if (seemsComplete) {
            finalGenreConversation.isComplete = true;
            finalGenreConversation.summary = genreDetails;
            
            // Update the world data with genre details
            setPartialWorld(prev => ({
              ...prev,
              name: prev.name || `${genreDetails.name} World`,
              genre: genreDetails.name,
              setting: genreDetails.commonSettings[0] || prev.setting,
              description: genreDetails.description,
              regions: genreDetails.commonSettings,
              culturalSetting: genreDetails.worldbuildingElements.join(', ')
            }));
            
            // This is the final message from the genre assistant, create a transitional response
            responseContent = `Perfect! Based on our conversation, I've developed a ${genreDetails.name} genre for your story. 
            
${genreDetails.description}

This genre typically features:
• Themes: ${genreDetails.themes.join(', ')}
• Common tropes: ${genreDetails.tropes.join(', ')}
• Typical settings: ${genreDetails.commonSettings.join(', ')}
• Key character types: ${genreDetails.typicalCharacters.join(', ')}

Now, let's move on to building your world! What kind of setting would you like for your ${genreDetails.name} story?`;

            // Set the stage to world for the next message
            nextStage = 'world';
          } else {
            // This is a continuation of the genre stage conversation
            responseContent = `${genreDetails.description}`;
          }
          
          setGenreConversation(finalGenreConversation);
          
        } catch (error) {
          console.error('Error using Genre Creator assistant:', error);
          // Fall back to regular interactive story response
          responseContent = 'I had some trouble with the Genre Creator. Let me try a different approach. What kind of genre interests you?';
        }
      }
      
      // Handle world building stage
      if (currentStage === 'world' && !worldConversation.isComplete && genreConversation.isComplete) {
        try {
          console.log('World stage active, handling with World Creator assistant');
          
          // Add the user's message to the world conversation history
          const updatedWorldConversation = {
            ...worldConversation,
            messages: [
              ...worldConversation.messages,
              { role: 'user' as const, content: inputText }
            ]
          };
          
          setWorldConversation(updatedWorldConversation);
          
          // Prepare context for the world creation
          let worldContextStr = '';
          
          if (updatedWorldConversation.messages.length <= 1) {
            // First message to the world assistant - include genre summary
            const genreSummary = genreConversation.summary;
            worldContextStr = `
              You are now helping the user create a world for their ${genreSummary?.name} story.
              Here's what we know about this genre:
              - Description: ${genreSummary?.description}
              - Themes: ${genreSummary?.themes.join(', ')}
              - Common settings: ${genreSummary?.commonSettings.join(', ')}
              - Typical characters: ${genreSummary?.typicalCharacters.join(', ')}
              - Worldbuilding elements: ${genreSummary?.worldbuildingElements.join(', ')}
              
              The user's first input about the world they want to create is: "${inputText}"
              
              Guide them through creating a detailed and cohesive world for their story. Ask about geography, cultures, history, 
              magic/technology systems, conflicts, and other important world elements.
            `;
          } else {
            // Continuing conversation - include previous messages
            const conversationHistory = updatedWorldConversation.messages
              .map(msg => `${msg.role === 'user' ? 'User' : 'AI'}: ${msg.content}`)
              .join('\n\n');
              
            worldContextStr = `
              Continue helping the user create their story world.
              Previous conversation:
              ${conversationHistory}
              
              Make sure to guide them through important world-building aspects like geography, cultures, 
              magic/technology, conflicts, and other key elements. If they've covered enough details, you 
              can suggest moving on to character creation.
            `;
          }
          
          // Detect if this might be our final world building message
          const seemsComplete = 
            inputText.toLowerCase().includes('sounds good') || 
            inputText.toLowerCase().includes('that works') || 
            inputText.toLowerCase().includes('i like that') ||
            inputText.toLowerCase().includes('move on') ||
            inputText.toLowerCase().includes('next stage') ||
            inputText.toLowerCase().includes('character') && 
            (inputText.toLowerCase().includes('create') || inputText.toLowerCase().includes('add'));
          
          // Create message history for the regular interactive story response
          const charactersList = partialCharacters.filter(char => char.name).map(char => ({
            id: char.id || 0,
            name: char.name || 'Unknown',
            description: char.background || '',
            traits: char.personality || [],
            role: char.role
          }));
          
          const messageHistoryFormatted = messages.slice(-8).map(msg => ({
            sender: msg.sender === 'user' ? 'user' : 'story',
            content: msg.content
          }));
          
          // Call the interactive story response for now (will replace with World Creator assistant later)
          const response = await fetchInteractiveStoryResponse(
            worldContextStr,
            charactersList,
            messageHistoryFormatted,
            inputText
          );
          
          // Add the assistant's response to the conversation
          const finalWorldConversation = {
            ...updatedWorldConversation,
            messages: [
              ...updatedWorldConversation.messages,
              { role: 'assistant' as const, content: response.content }
            ]
          };
          
          // Extract world data from response if possible
          const extractedWorldData = extractWorldDataFromResponse(response.content);
          if (extractedWorldData && Object.keys(extractedWorldData).length > 0) {
            setPartialWorld(prev => ({...prev, ...extractedWorldData}));
          }
          
          // If this seems like the final message in this stage, mark complete and save details
          if (seemsComplete) {
            finalWorldConversation.isComplete = true;
            finalWorldConversation.summary = partialWorld;
            
            // Create a transitional response summarizing the world
            responseContent = `Perfect! I've captured the details of your world:
            
Name: ${partialWorld.name || "Your fascinating world"}
Genre: ${partialWorld.genre || "Custom genre"}
Setting: ${partialWorld.setting || "A unique setting"}
${partialWorld.regions && partialWorld.regions.length > 0 ? `Regions: ${partialWorld.regions.join(', ')}` : ''}
${partialWorld.keyConflicts && partialWorld.keyConflicts.length > 0 ? `Key Conflicts: ${partialWorld.keyConflicts.join(', ')}` : ''}
${partialWorld.description ? `\nDescription: ${partialWorld.description}` : ''}

Now, let's move on to creating characters for your world! What kind of protagonist would you like to see in this story?`;

            // Set the stage to characters for the next message
            nextStage = 'characters';
          } else {
            // This is a continuation of the world stage conversation
            responseContent = response.content;
          }
          
          setWorldConversation(finalWorldConversation);
          
        } catch (error) {
          console.error('Error in World Creator stage:', error);
          responseContent = 'I had some trouble with the World Creator. Let\'s try a different approach. Tell me more about the world you envision for your story.';
        }
      }
      
      // If we didn't get a response from any specialized assistant,
      // use the regular interactive story response
      if (!responseContent) {
        try {
          const worldContextStr = `
            Currently in the ${currentStage} stage of the interview process. 
            Currently gathered inspirations: ${inspirations.join(', ')}. 
            Current world building progress: ${JSON.stringify(partialWorld)}. 
            Current character progress: ${JSON.stringify(partialCharacters)}. 
            Moving to the ${nextStage} stage after this response.
            If you identify specific inspirations, world elements, or character traits in the user's input, extract them.
            Guide the conversation naturally towards building a complete story world following the interview flow:
            genre → world → characters → influences → details → ready
          `;
          
          const charactersList = partialCharacters.filter(char => char.name).map(char => ({
            id: char.id || 0,
            name: char.name || 'Unknown',
            description: char.background || '',
            traits: char.personality || [],
            role: char.role
          }));
          
          const messageHistoryFormatted = messages.slice(-8).map(msg => ({
            sender: msg.sender === 'user' ? 'user' : 'story',
            content: msg.content
          }));
          
          const response = await fetchInteractiveStoryResponse(
            worldContextStr,
            charactersList,
            messageHistoryFormatted,
            inputText
          );
          
          responseContent = response.content;
        } catch (error) {
          console.error('Error with fallback interactive story response:', error);
          responseContent = 'I encountered a problem with our conversation. Let\'s try again. What would you like to discuss about your story?';
        }
      }
      
      // Process the response to extract structured data
      const extractedInspirations = extractInspirations(inputText);
      if (extractedInspirations.length > 0) {
        setInspirations(prev => [...prev, ...extractedInspirations]);
      }
      
      // Extract world-building elements if they appear in the conversation
      const extractedWorldData = extractWorldData(inputText);
      if (extractedWorldData && Object.keys(extractedWorldData).length > 0) {
        setPartialWorld(prev => ({...prev, ...extractedWorldData}));
      }
      
      // Extract character elements if they appear in the conversation
      const extractedCharacterData = extractCharacterData(inputText);
      if (extractedCharacterData && Object.keys(extractedCharacterData).length > 0) {
        setPartialCharacters(prev => {
          // If we have a name, try to update an existing character
          if (extractedCharacterData.name) {
            const existingIndex = prev.findIndex(c => c.name === extractedCharacterData.name);
            if (existingIndex >= 0) {
              const updated = [...prev];
              updated[existingIndex] = {...updated[existingIndex], ...extractedCharacterData};
              return updated;
            }
          }
          
          // Otherwise add as a new character
          return [...prev, extractedCharacterData];
        });
      }
      
      // Generate suggestions based on the current conversation
      const suggestions = generateSuggestions(inputText, currentState);
      
      // Create AI response message
      const aiMessage: Message = {
        id: Date.now().toString(),
        content: responseContent,
        sender: 'ai',
        timestamp: new Date(),
        interviewStage: nextStage, // Set the next interview stage
        inspiration: extractedInspirations.length > 0 ? extractedInspirations : undefined,
        suggestions: suggestions,
        worldData: extractedWorldData && Object.keys(extractedWorldData).length > 0 ? extractedWorldData : undefined,
        characterData: extractedCharacterData && Object.keys(extractedCharacterData).length > 0 ? extractedCharacterData : undefined
      };
      
      setMessages(prev => [...prev, aiMessage]);
      
      // Speak the AI's response if voice is enabled
      if (voiceEnabled) {
        speakMessage(aiMessage.content);
      }
      
      // Check if we have enough information to create a world or character
      checkCreationProgress();
      
    } catch (error) {
      console.error('Error getting AI response:', error);
      toast({
        title: "Communication Error",
        description: "I couldn't process your message. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Speak a message using speech synthesis
  const speakMessage = (text: string) => {
    if (!voiceEnabled) {
      console.log("Voice is disabled, not speaking text");
      return;
    }
    
    // Don't try to speak empty text
    if (!text || text.trim() === '') {
      console.warn("Cannot speak empty text");
      return;
    }
    
    console.log(`Speaking message (${text.length} chars): "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`);
    console.log("Current voice:", selectedVoice?.name || "None selected");
    
    // Cancel any ongoing speech
    if (isPlaying) {
      console.log("Stopping previous speech");
      stopSpeaking();
    }
    
    // If we don't have a selected voice yet, try to find one
    if (!selectedVoice && voices.length > 0) {
      console.log("No voice selected, using first available voice");
      // Always prefer OpenAI voices
      const voice = voices.find(v => v.provider === 'openai' && v.id === 'alloy') || 
                   voices.find(v => v.provider === 'openai') || 
                   voices[0];
      changeVoice(voice.id, voice.provider);
      console.log(`Selected voice: ${voice.name} (${voice.provider})`);
    }
    
    setIsSpeaking(true);
    
    // Start speaking immediately, no delay needed
    speak(text)
      .then(() => {
        console.log("Speech completed successfully");
        setIsSpeaking(false);
        
        // Auto-restart speech recognition if needed
        if (voiceEnabled && !isListening) {
          console.log("Auto-restarting speech recognition after speaking");
          setTimeout(() => startRecognition(), 500);
        }
      })
      .catch((error) => {
        console.error("Error in speech synthesis:", error);
        setIsSpeaking(false);
        
        // Try again with a different OpenAI voice if this fails
        if (selectedVoice?.provider === 'openai') {
          const alternateVoice = voices.find(v => 
            v.provider === 'openai' && v.id !== selectedVoice.id
          );
          
          if (alternateVoice) {
            console.log(`Retrying with alternate voice: ${alternateVoice.name}`);
            changeVoice(alternateVoice.id, 'openai');
            setTimeout(() => speakMessage(text), 500);
            return;
          }
        }
        
        toast({
          title: 'Text-to-Speech Issue',
          description: 'There was a problem speaking that message. I\'ll continue in text mode.',
          variant: 'default'
        });
      });
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
    if (isPlaying && !voiceEnabled) {
      stopSpeaking();
    }
  };
  
  // Extract potential inspirations from user input
  const extractInspirations = (text: string): string[] => {
    // This is a simple extraction example - in a real app, this would use more sophisticated NLP
    const extracted: string[] = [];
    
    // Look for book titles (words in quotes)
    const bookTitleMatch = text.match(/"([^"]+)"/g);
    if (bookTitleMatch) {
      bookTitleMatch.forEach(match => {
        extracted.push(match.replace(/"/g, '').trim());
      });
    }
    
    // Look for authors (prefixed with "by" or "author")
    const authorMatch = text.match(/(?:by|author|writer)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g);
    if (authorMatch) {
      authorMatch.forEach(match => {
        extracted.push(match.trim());
      });
    }
    
    // Look for genres (simple list of common genres)
    const genres = ['fantasy', 'sci-fi', 'science fiction', 'mystery', 'romance', 'horror', 'thriller', 'adventure', 'historical fiction', 'dystopian'];
    genres.forEach(genre => {
      if (text.toLowerCase().includes(genre)) {
        extracted.push(genre);
      }
    });
    
    return extracted;
  };
  
  // Extract world-building elements from user input
  const extractWorldData = (text: string): Partial<WorldData> | null => {
    // Very basic extraction - in a real app, this would use more sophisticated NLP or AI
    const worldData: Partial<WorldData> = {};
    
    // Extract world name if it follows a pattern like "world called X" or "world named X"
    const worldNameMatch = text.match(/world (?:called|named) ([\w\s]+)/i);
    if (worldNameMatch && worldNameMatch[1]) {
      worldData.name = worldNameMatch[1].trim();
    }
    
    // Extract setting if mentioned
    const settingMatch = text.match(/(?:set in|takes place in|setting is) ([\w\s,]+)/i);
    if (settingMatch && settingMatch[1]) {
      worldData.setting = settingMatch[1].trim();
    }
    
    // Extract genre if mentioned
    const genreMatch = text.match(/(?:genre is|in the genre of) ([\w\s-]+)/i);
    if (genreMatch && genreMatch[1]) {
      worldData.genre = genreMatch[1].trim();
    }
    
    return Object.keys(worldData).length > 0 ? worldData : null;
  };
  
  // Extract world-building elements from AI response
  const extractWorldDataFromResponse = (text: string): Partial<WorldData> | null => {
    // This function attempts to extract structured world data from the AI's response
    const worldData: Partial<WorldData> = {};
    
    // Try to extract a world name
    const worldNameMatch = text.match(/(?:world called|world named|world of|setting called|setting named) ([\w\s'-]+)/i);
    if (worldNameMatch && worldNameMatch[1]) {
      worldData.name = worldNameMatch[1].trim();
    }
    
    // Try to extract the setting type
    const settingMatch = text.match(/(?:set in|takes place in|a (?:medieval|futuristic|modern|fantasy|sci-fi|dystopian|utopian|post-apocalyptic|ancient|prehistoric|historical|contemporary)) ([\w\s,-]+)/i);
    if (settingMatch && settingMatch[1]) {
      worldData.setting = settingMatch[1].trim();
    }
    
    // Try to extract regions if mentioned
    const regionMatch = text.match(/(?:regions include|areas like|regions like|regions such as|places like) ([\w\s,'-]+)/i);
    if (regionMatch && regionMatch[1]) {
      worldData.regions = regionMatch[1].split(',').map(region => region.trim());
    }
    
    // Try to extract conflicts
    const conflictMatch = text.match(/(?:conflict between|struggles|war between|tension between|conflict with) ([\w\s,'-]+)/i);
    if (conflictMatch && conflictMatch[1]) {
      worldData.keyConflicts = conflictMatch[1].split(',').map(conflict => conflict.trim());
    }
    
    // Try to extract cultural elements
    const cultureMatch = text.match(/(?:culture is|cultural elements include|society is|civilization is) ([\w\s,'-]+)/i);
    if (cultureMatch && cultureMatch[1]) {
      worldData.culturalSetting = cultureMatch[1].trim();
    }
    
    // Try to extract technology level
    const techMatch = text.match(/(?:technology level is|tech level is|technological development is) ([\w\s,'-]+)/i);
    if (techMatch && techMatch[1]) {
      worldData.technology = techMatch[1].trim();
    }
    
    // Try to extract magic system
    const magicMatch = text.match(/(?:magic system|magical elements|supernatural powers) ([\w\s,'-]+)/i);
    if (magicMatch && magicMatch[1]) {
      worldData.magicSystem = magicMatch[1].trim();
    }
    
    return Object.keys(worldData).length > 0 ? worldData : null;
  };
  
  // Extract character elements from user input
  const extractCharacterData = (text: string): Partial<CharacterData> | null => {
    // Basic extraction - in a real app, this would use more sophisticated NLP or AI
    const characterData: Partial<CharacterData> = {};
    
    // Extract character name if it follows a pattern like "character named X" or "character called X"
    const characterNameMatch = text.match(/character (?:called|named) ([\w\s]+)/i);
    if (characterNameMatch && characterNameMatch[1]) {
      characterData.name = characterNameMatch[1].trim();
    }
    
    // Extract role if mentioned
    const roleMatch = text.match(/(?:who is|role is|a) ([\w\s]+?) (?:who|that|and)/i);
    if (roleMatch && roleMatch[1]) {
      characterData.role = roleMatch[1].trim();
    }
    
    // Extract personality traits (simple comma-separated list)
    const personalityMatch = text.match(/personality:? ([\w\s,]+)/i);
    if (personalityMatch && personalityMatch[1]) {
      characterData.personality = personalityMatch[1].split(',').map(trait => trait.trim());
    }
    
    return Object.keys(characterData).length > 0 ? characterData : null;
  };
  
  const determineNextStage = (
    currentStage: 'genre' | 'world' | 'characters' | 'influences' | 'details' | 'ready',
    userInput: string
  ): 'genre' | 'world' | 'characters' | 'influences' | 'details' | 'ready' => {
    // If we're at the final stage, stay there
    if (currentStage === 'ready') {
      return 'ready';
    }
    
    // Look for explicit mentions of wanting to move to a specific stage
    if (userInput.toLowerCase().includes('world') && 
        (userInput.toLowerCase().includes('create') || userInput.toLowerCase().includes('build'))) {
      return 'world';
    }
    
    if (userInput.toLowerCase().includes('character') && 
        (userInput.toLowerCase().includes('create') || userInput.toLowerCase().includes('add'))) {
      return 'characters';
    }
    
    // Sequential advancement through stages
    switch (currentStage) {
      case 'genre':
        return 'world';
      case 'world':
        return 'characters';
      case 'characters':
        return 'influences';
      case 'influences':
        return 'details';
      case 'details':
        return 'ready';
      default:
        return currentStage; // Stay at the current stage if there's no clear indicator
    }
  };
  
  const generateSuggestions = (
    userInput: string, 
    state: { 
      currentStage: string; 
      inspirations: string[]; 
      partialWorld: Partial<WorldData>; 
      partialCharacters: Partial<CharacterData>[];
    }
  ): string[] => {
    // Generate contextual suggestions based on current state and user input
    const suggestions: string[] = [];
    const { currentStage, inspirations, partialWorld, partialCharacters } = state;
    
    // If user seems stuck or isn't providing much, offer help
    if (userInput.length < 20) {
      suggestions.push("I need some help getting started");
      suggestions.push("Can you give me some suggestions?");
    }
    
    // Stage-specific suggestions
    switch (currentStage) {
      case 'genre':
        suggestions.push("I'm interested in fantasy with magical elements");
        suggestions.push("I'd like to explore a science fiction setting");
        suggestions.push("I enjoy mystery stories with unexpected twists");
        break;
        
      case 'world':
        if (!partialWorld.name) {
          suggestions.push("Let's create a world with floating islands");
          suggestions.push("I imagine a post-apocalyptic setting");
        } else {
          suggestions.push(`Tell me more about the geography of ${partialWorld.name}`);
          suggestions.push(`What kind of magic system exists in ${partialWorld.name}?`);
        }
        break;
        
      case 'characters':
        if (partialCharacters.length === 0) {
          suggestions.push("I want to create a protagonist who's a reluctant hero");
          suggestions.push("Let's add a character who's hiding a dark secret");
        } else {
          const character = partialCharacters[0];
          suggestions.push(`Tell me more about ${character.name}'s background`);
          suggestions.push(`What are ${character.name}'s main goals and motivations?`);
        }
        break;
        
      case 'influences':
        suggestions.push("I'm inspired by the writing style of Stephen King");
        suggestions.push("I like the world-building in Lord of the Rings");
        suggestions.push("I want something with the mood of Blade Runner");
        break;
        
      case 'details':
        suggestions.push("I want to focus on themes of redemption");
        suggestions.push("The story should have a bittersweet ending");
        suggestions.push("Let's add a plot twist involving betrayal");
        break;
        
      case 'ready':
        suggestions.push("I'm ready to start my story");
        suggestions.push("Can we review what we've created so far?");
        suggestions.push("Let's begin with the first chapter");
        break;
    }
    
    // Add AI creation option to every stage
    suggestions.push("Create the rest for me with AI");
    
    return suggestions;
  };
  
  const checkCreationProgress = () => {
    // Check if we have enough information to move to the next stage
    if (interviewStage === 'ready') {
      // Check if we have completed a world
      const isWorldComplete = 
        partialWorld.name && 
        partialWorld.genre && 
        partialWorld.setting && 
        ((partialWorld.regions && partialWorld.regions.length > 0) || partialWorld.description);
      
      // Check if we have completed characters
      const hasCompletedCharacters = 
        partialCharacters.length > 0 && 
        partialCharacters.every(char => 
          char.name && 
          char.role && 
          ((char.personality && char.personality.length > 0) || char.background)
        );
      
      if (isWorldComplete && hasCompletedCharacters) {
        // We have enough to start the story
        const completeWorld: WorldData = {
          id: 1,
          name: partialWorld.name!,
          genre: partialWorld.genre || 'Fantasy',
          setting: partialWorld.setting || 'Unknown',
          timeframe: partialWorld.timeframe || 'Present day',
          regions: partialWorld.regions || ['Various'],
          keyConflicts: partialWorld.keyConflicts || ['To be determined'],
          importantFigures: partialWorld.importantFigures || ['Various characters'],
          culturalSetting: partialWorld.culturalSetting || 'Mixed',
          technology: partialWorld.technology || 'Standard for setting',
          magicSystem: partialWorld.magicSystem,
          politicalSystem: partialWorld.politicalSystem || 'Various',
          description: partialWorld.description || 'A fascinating world waiting to be explored.',
          complexity: partialWorld.complexity || 3
        };
        
        const completeCharacters = partialCharacters.map(char => ({
          id: char.id || 1,
          name: char.name!,
          role: char.role || 'Unknown',
          background: char.background || 'Mysterious origins.',
          personality: char.personality || ['Interesting', 'Complex'],
          goals: char.goals || ['Seeking purpose'],
          fears: char.fears || ['Uncertainty'],
          relationships: char.relationships || ['To be developed'],
          skills: char.skills || ['Various abilities'],
          appearance: char.appearance || 'Distinctive look',
          voice: char.voice || 'Unique voice',
          depth: char.depth || 3
        }));
        
        // Either pass this to the parent component or render the experience directly
        onStoryReady(completeWorld, completeCharacters);
      }
    }
  };
  
  // Handle direct selection of a story type
  const handleStoryTypeSelect = (type: StoryType) => {
    setStoryType(type);
    
    // Reflect this in the conversation
    const userMessage: Message = {
      id: Date.now().toString(),
      content: `I'd like to create a ${type.replace('_', ' ')}`,
      sender: 'user',
      timestamp: new Date(),
      interviewStage: interviewStage
    };
    
    const aiResponse: Message = {
      id: (Date.now() + 1).toString(),
      content: `Great choice! A ${type.replace('_', ' ')} is perfect. Let's continue building your world and characters.`,
      sender: 'ai',
      timestamp: new Date(),
      interviewStage: interviewStage
    };
    
    setMessages(prev => [...prev, userMessage, aiResponse]);
    
    // Speak the response if voice is enabled
    if (voiceEnabled) {
      speakMessage(aiResponse.content);
    }
  };
  
  // Handle AI generation of the entire story
  const handleAICreate = () => {
    setIsProcessing(true);
    
    // Create a default world if we don't have one yet
    const worldForAI = partialWorld.name ? partialWorld : {
      name: "Mystara",
      genre: "Fantasy",
      setting: "Medieval kingdom with magical elements",
      timeframe: "Ancient era",
      regions: ["Forest of Whispers", "Crystalline Mountains", "Coastal Cities"],
      keyConflicts: ["Rising darkness", "Power struggle", "Ancient prophecy"],
      importantFigures: ["The Seer", "Queen Elara", "Dark Lord Vormyx"],
      culturalSetting: "Diverse cultures with magic-based social hierarchy",
      technology: "Medieval with magical innovations",
      magicSystem: "Elemental magic drawn from nature",
      politicalSystem: "Monarchy with magical council advisors",
      description: "A world where magic flows through all living things, creating both harmony and conflict.",
      complexity: 4
    };
    
    // Create default characters if we don't have any yet
    const charactersForAI = partialCharacters.length > 0 ? partialCharacters : [
      {
        name: "Lyra Moonshadow",
        role: "Reluctant hero",
        background: "Orphaned at a young age, Lyra discovered her magical abilities while surviving in the Forest of Whispers.",
        personality: ["Determined", "Compassionate", "Cautious"],
        goals: ["Discover her true heritage", "Master her unique magic", "Protect those she cares about"],
        fears: ["Losing control of her powers", "Being alone", "The darkness that calls to her"],
        relationships: ["Mentor relationship with The Seer", "Rivalry with Queen's son", "Bond with forest creatures"],
        skills: ["Nature magic", "Survival", "Animal communication"],
        appearance: "Silver-haired young woman with violet eyes that glow when using magic",
        voice: "Soft but confident, with a slight accent from the forest regions",
        depth: 4
      },
      {
        name: "Thorn Blackwood",
        role: "Mysterious ally/potential love interest",
        background: "Former assassin for the royal court who fled after discovering a dark conspiracy",
        personality: ["Reserved", "Strategic", "Protective"],
        goals: ["Redemption", "Expose the conspiracy", "Find peace"],
        fears: ["His past catching up to him", "Betrayal", "Caring too deeply"],
        relationships: ["Complicated history with Queen Elara", "Reluctant respect for Lyra", "Enemy of Dark Lord"],
        skills: ["Shadow magic", "Combat expertise", "Information gathering"],
        appearance: "Tall with dark features and a scar across his right eye, always dressed in dark clothing",
        voice: "Deep and measured, speaks rarely but meaningfully",
        depth: 3
      }
    ];
    
    // Complete world and character data
    const completeWorld: WorldData = {
      id: 1,
      name: worldForAI.name!,
      genre: worldForAI.genre || 'Fantasy',
      setting: worldForAI.setting || 'Magical realm',
      timeframe: worldForAI.timeframe || 'Ancient era',
      regions: worldForAI.regions || ['Various regions'],
      keyConflicts: worldForAI.keyConflicts || ['Power struggle'],
      importantFigures: worldForAI.importantFigures || ['Key characters'],
      culturalSetting: worldForAI.culturalSetting || 'Diverse cultures',
      technology: worldForAI.technology || 'Varies by region',
      magicSystem: worldForAI.magicSystem || 'Elemental magic',
      politicalSystem: worldForAI.politicalSystem || 'Various systems',
      description: worldForAI.description || 'A rich and detailed world full of possibility.',
      complexity: worldForAI.complexity || 4
    };
    
    const completeCharacters = charactersForAI.map(char => ({
      id: char.id || Math.floor(Math.random() * 1000),
      name: char.name!,
      role: char.role || 'Important character',
      background: char.background || 'Rich and complex history.',
      personality: char.personality || ['Multifaceted', 'Intriguing'],
      goals: char.goals || ['Personal objectives'],
      fears: char.fears || ['Internal struggles'],
      relationships: char.relationships || ['Complex connections'],
      skills: char.skills || ['Unique abilities'],
      appearance: char.appearance || 'Distinctive appearance',
      voice: char.voice || 'Characteristic voice',
      depth: char.depth || 4
    }));
    
    // Add a message indicating AI is creating the world
    const creationMessage: Message = {
      id: Date.now().toString(),
      content: "I'll create a complete world and set of characters for your story. Just a moment while I prepare everything...",
      sender: 'ai',
      timestamp: new Date(),
      interviewStage: 'ready'
    };
    
    setMessages(prev => [...prev, creationMessage]);
    
    // Speak the message if voice is enabled
    if (voiceEnabled) {
      speakMessage(creationMessage.content);
    }
    
    // Simulate a brief delay to make it feel like AI is working
    setTimeout(() => {
      setIsProcessing(false);
      
      // Call the completion callback
      onStoryReady(completeWorld, completeCharacters);
      
      // Add a completion message
      const completionMessage: Message = {
        id: Date.now().toString(),
        content: `Your ${storyType.replace('_', ' ')} is ready! I've created the world of ${completeWorld.name} and characters including ${completeCharacters.map(c => c.name).join(', ')}. Let's start exploring your story!`,
        sender: 'ai',
        timestamp: new Date(),
        interviewStage: 'ready'
      };
      
      setMessages(prev => [...prev, completionMessage]);
      
      // Speak the completion message if voice is enabled
      if (voiceEnabled) {
        speakMessage(completionMessage.content);
      }
    }, 3000);
  };
  
  // UI for the voice-guided creation experience
  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto p-4 gap-4">
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
                  
                  {/* Show extracted world/character data if available */}
                  {message.worldData && Object.keys(message.worldData).length > 0 && (
                    <div className="mt-2 text-sm">
                      <div className="font-semibold">World Details:</div>
                      <ul className="list-disc list-inside">
                        {Object.entries(message.worldData).map(([key, value]) => (
                          <li key={key}>
                            {key}: {Array.isArray(value) ? value.join(', ') : value}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {message.characterData && Object.keys(message.characterData).length > 0 && (
                    <div className="mt-2 text-sm">
                      <div className="font-semibold">Character Details:</div>
                      <ul className="list-disc list-inside">
                        {Object.entries(message.characterData).map(([key, value]) => (
                          <li key={key}>
                            {key}: {Array.isArray(value) ? value.join(', ') : value}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {/* Show inspirations if available */}
                  {message.inspiration && message.inspiration.length > 0 && (
                    <div className="mt-2">
                      <span className="text-xs font-medium">Inspirations:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {message.inspiration.map((item, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {item}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Suggestions from AI */}
                {message.sender === 'ai' && message.suggestions && message.suggestions.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1 max-w-[90%]">
                    {message.suggestions.map((suggestion, idx) => (
                      <Button
                        key={idx}
                        variant="ghost"
                        size="sm"
                        className="h-auto py-1 px-2 text-xs rounded-full bg-muted/50"
                        onClick={() => {
                          setInputText(suggestion);
                          // If it's an AI creation suggestion, handle it directly
                          if (suggestion === "Create the rest for me with AI") {
                            handleAICreate();
                          }
                        }}
                      >
                        {suggestion}
                      </Button>
                    ))}
                  </div>
                )}
                
                <span className="text-xs text-muted-foreground mt-1">
                  {message.sender === 'user' ? 'You' : 'AI'} · {new Date(message.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))}
            
            {isProcessing && (
              <div className="flex items-center space-x-2">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span className="text-sm">Thinking...</span>
              </div>
            )}
          </CardContent>
        </ScrollArea>
      </Card>
      
      {/* Input area with voice input indicator */}
      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={handleAICreate}
            className="flex items-center gap-1"
          >
            <Wand2 className="h-4 w-4" />
            <span>AI Create For Me</span>
          </Button>
          
          <Button 
            variant="default"
            disabled={interviewStage !== 'ready'}
            onClick={() => checkCreationProgress()}
            className="flex items-center gap-1"
          >
            <ArrowRight className="h-4 w-4" />
            <span>Continue</span>
          </Button>
        </div>
        
        <div className="relative">
          <Textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={isListening ? "Listening... (speak or type)" : "Type your message..."}
            className={`w-full pr-10 ${isListening ? 'border-red-400 dark:border-red-600' : ''}`}
            rows={3}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
          />
          <div className="absolute right-3 bottom-3 flex gap-2">
            {isListening && (
              <div className="flex items-center justify-center h-6 w-6">
                <div className="relative h-4 w-4">
                  <div className="absolute top-0 left-0 h-4 w-4 rounded-full bg-red-500 animate-ping opacity-75"></div>
                  <div className="absolute top-0 left-0 h-4 w-4 rounded-full bg-red-500"></div>
                </div>
              </div>
            )}
            <Button 
              size="icon" 
              variant="ghost" 
              onClick={handleSendMessage}
              disabled={inputText.trim() === '' || isProcessing}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* Voice status indicator */}
        {isListening && (
          <div className="text-xs text-muted-foreground animate-pulse">
            Listening... {transcript ? `"${transcript}"` : ''}
          </div>
        )}
        {isSpeaking && (
          <div className="text-xs text-muted-foreground animate-pulse">
            Speaking...
          </div>
        )}
        
        {/* Current TTS audio (fallback if useTTS hook integration fails) */}
        {currentAudioUrl && (
          <div className="mt-2">
            <AudioPlayer audioUrl={currentAudioUrl} autoPlay={true} onPlayStateChange={(isPlaying) => {
              if (!isPlaying) {
                setIsSpeaking(false);
              }
            }} />
          </div>
        )}
      </div>
    </div>
  );
};

export default VoiceGuidedCreation;