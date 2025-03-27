import React, { useState, useEffect, useRef } from 'react';
import { useLocation, Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Mic, MicOff, Send, RefreshCw, VolumeX, Volume2, Map, User, Sparkles, Wand2, ArrowRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { fetchInteractiveStoryResponse } from '@/lib/openai';
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
  const scrollRef = useRef<HTMLDivElement>(null);
  const autoSubmitTimerRef = useRef<NodeJS.Timeout | null>(null);
  
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
      
      // Call the AI for a response with interview context
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
        content: response.content,
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
    const authorMatch = text.match(/(?:by|author|writer)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/g);
    if (authorMatch) {
      authorMatch.forEach(match => {
        const author = match.replace(/(?:by|author|writer)\s+/i, '').trim();
        extracted.push(author);
      });
    }
    
    // Look for genres
    const genres = ['fantasy', 'sci-fi', 'science fiction', 'mystery', 'romance', 'horror', 'thriller', 'adventure', 'historical fiction'];
    genres.forEach(genre => {
      if (text.toLowerCase().includes(genre)) {
        extracted.push(genre);
      }
    });
    
    return extracted;
  };
  
  // Extract world-building elements from user input
  const extractWorldData = (text: string): Partial<WorldData> | null => {
    // This would be more sophisticated in a real app
    const worldData: Partial<WorldData> = {};
    
    // Check for a world name (look for "world called" or "named")
    const worldNameMatch = text.match(/(?:world|setting|place|realm)(?:\s+called|\s+named)?\s+"?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)"?/i);
    if (worldNameMatch && worldNameMatch[1]) {
      worldData.name = worldNameMatch[1].trim();
    }
    
    // Try to identify setting
    if (text.toLowerCase().includes('medieval') || text.toLowerCase().includes('fantasy')) {
      worldData.setting = 'Medieval fantasy realm';
    } else if (text.toLowerCase().includes('future') || text.toLowerCase().includes('space') || text.toLowerCase().includes('sci-fi')) {
      worldData.setting = 'Futuristic space-faring civilization';
    } else if (text.toLowerCase().includes('modern')) {
      worldData.setting = 'Contemporary urban setting';
    }
    
    // Try to identify genre
    if (text.toLowerCase().includes('magic')) {
      worldData.genre = 'Fantasy';
    } else if (text.toLowerCase().includes('technology') || text.toLowerCase().includes('future')) {
      worldData.genre = 'Science Fiction';
    } else if (text.toLowerCase().includes('mystery') || text.toLowerCase().includes('detective')) {
      worldData.genre = 'Mystery';
    }
    
    return Object.keys(worldData).length > 0 ? worldData : null;
  };
  
  // Extract character elements from user input
  const extractCharacterData = (text: string): Partial<CharacterData> | null => {
    // This would be more sophisticated in a real app
    const characterData: Partial<CharacterData> = {};
    
    // Check for a character name
    const characterNameMatch = text.match(/(?:character|protagonist|hero|person)(?:\s+called|\s+named)?\s+"?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)"?/i);
    if (characterNameMatch && characterNameMatch[1]) {
      characterData.name = characterNameMatch[1].trim();
    }
    
    // Look for personality traits
    const personalityTraits = ['brave', 'shy', 'intelligent', 'strong', 'clever', 'mysterious', 'caring', 'ambitious'];
    const foundTraits: string[] = [];
    
    personalityTraits.forEach(trait => {
      if (text.toLowerCase().includes(trait)) {
        foundTraits.push(trait);
      }
    });
    
    if (foundTraits.length > 0) {
      characterData.personality = foundTraits;
    }
    
    return Object.keys(characterData).length > 0 ? characterData : null;
  };
  
  // Determine the next interview stage based on current stage and user input
  const determineNextStage = (
    currentStage: 'genre' | 'world' | 'characters' | 'influences' | 'details' | 'ready',
    userInput: string
  ): 'genre' | 'world' | 'characters' | 'influences' | 'details' | 'ready' => {
    // Progress through the interview stages: genre → world → characters → influences → details → ready
    switch(currentStage) {
      case 'genre':
        // After getting genre preferences, move to world building
        return 'world';
      
      case 'world':
        // After basic world building, move to characters
        if (partialWorld.name && partialWorld.setting) {
          return 'characters';
        }
        // Stay in world stage if we don't have enough world details
        return 'world';
        
      case 'characters':
        // After basic character creation, move to influences/basic plot
        if (partialCharacters.length > 0 && partialCharacters.some(char => char.name)) {
          return 'influences';
        }
        // Stay in character stage if we don't have enough character details
        return 'characters';
        
      case 'influences':
        // After discussing influences, move to details
        return 'details';
        
      case 'details':
        // After gathering details, if we have enough, move to ready
        if (partialWorld.name && partialCharacters.length > 0 && partialCharacters.some(char => char.name)) {
          return 'ready';
        }
        // Stay in details stage if we don't have enough
        return 'details';
        
      case 'ready':
        // Once ready, stay ready
        return 'ready';
        
      default:
        return 'genre';
    }
  };
  
  // Generate contextual suggestions based on the conversation state and interview stage
  const generateSuggestions = (
    userInput: string, 
    state: {currentStage?: 'genre' | 'world' | 'characters' | 'influences' | 'details' | 'ready', interviewStage?: 'genre' | 'world' | 'characters' | 'influences' | 'details' | 'ready', inspirations: string[], partialWorld: Partial<WorldData>, partialCharacters: Partial<CharacterData>[]}
  ): string[] => {
    const suggestions: string[] = [];
    const currentStage = state.currentStage || state.interviewStage || 'genre';
    
    // Provide stage-specific suggestions
    switch(currentStage) {
      case 'genre':
        suggestions.push("I love fantasy stories with magic and adventure");
        suggestions.push("I'm interested in sci-fi exploring future technology");
        suggestions.push("I enjoy mysteries and detective stories");
        suggestions.push("I'd like a story about personal growth and discovery");
        break;
        
      case 'influences':
        suggestions.push("My favorite author is J.R.R. Tolkien");
        suggestions.push("I really enjoyed the Harry Potter series");
        suggestions.push("I like the writing style of Stephen King");
        suggestions.push("I'm a fan of classic literature like Jane Austen");
        break;
        
      case 'world':
        if (!state.partialWorld.name) {
          suggestions.push("A medieval fantasy realm with magic");
          suggestions.push("A futuristic world with advanced technology");
          suggestions.push("A contemporary setting with supernatural elements");
          suggestions.push("An alternate history world");
        } else {
          suggestions.push(`Tell me more about the history of ${state.partialWorld.name}`);
          suggestions.push(`What kind of magic or technology exists in ${state.partialWorld.name}?`);
          suggestions.push(`What are the major locations in ${state.partialWorld.name}?`);
        }
        break;
        
      case 'characters':
        if (state.partialCharacters.length === 0) {
          suggestions.push("The main character is a young adventurer seeking their destiny");
          suggestions.push("I'd like a character who's a wise mentor with a mysterious past");
          suggestions.push("A reluctant hero who has to step up to save others");
          suggestions.push("A character with unique abilities they're still learning to control");
        } else {
          const mainChar = state.partialCharacters[0];
          suggestions.push(`Tell me more about ${mainChar.name || 'the main character'}'s background`);
          suggestions.push(`What motivates ${mainChar.name || 'the protagonist'}?`);
          suggestions.push("I'd like to add another character to the story");
        }
        break;
        
      case 'details':
        suggestions.push("I'd like the story to focus on themes of redemption");
        suggestions.push("The story should have plenty of action and adventure");
        suggestions.push("I want a mystery that slowly unravels throughout the story");
        suggestions.push("Let's add some romance or relationship development");
        break;
        
      case 'ready':
        suggestions.push("I think we have enough to start the story now");
        suggestions.push("Let's see how these characters interact in this world");
        suggestions.push("I'm ready to begin the adventure");
        suggestions.push("Can we add one final detail before starting?");
        break;
        
      default:
        // Generic suggestions if no stage matches
        if (state.inspirations.length === 0) {
          suggestions.push("Tell me about your favorite book or author");
          suggestions.push("What genre of stories do you enjoy most?");
        }
        
        if (Object.keys(state.partialWorld).length === 0) {
          suggestions.push("Describe the world where your story takes place");
          suggestions.push("Would you prefer a fantasy, sci-fi, or realistic setting?");
        } else if (!state.partialWorld.name) {
          suggestions.push(`What should we name this ${state.partialWorld.genre || ''} world?`);
        }
        
        if (state.partialCharacters.length === 0) {
          suggestions.push("Tell me about the main character of your story");
          suggestions.push("Who would be an interesting protagonist for this adventure?");
        } else if (state.partialCharacters.length === 1) {
          suggestions.push("Would you like to add another character to the story?");
        }
    }
    
    // If we have enough information, always suggest moving forward
    if (state.partialWorld.name && state.partialCharacters.length > 0 && currentStage !== 'ready') {
      suggestions.push("I think we have enough to start creating your story!");
    }
    
    return suggestions.length > 0 ? suggestions : [
      "Tell me more about your ideas",
      "Would you like to focus on the characters or the world next?",
      "What themes would you like to explore in this story?"
    ];
  };
  
  // Check if we have enough information to create a world or character
  // Access location for navigation
  const [, setLocation] = useLocation();
  
  const checkCreationProgress = () => {
    // Check if we have enough world data
    if (partialWorld.name && partialWorld.genre && partialWorld.setting && !partialWorld.complexity) {
      // We have enough basic info to create a world
      const completeWorld: WorldData = {
        id: Date.now(), // Generate a simple ID for the world
        name: partialWorld.name,
        genre: partialWorld.genre,
        setting: partialWorld.setting,
        timeframe: partialWorld.timeframe || 'Present day',
        regions: partialWorld.regions || ['Central region', 'Northern territories', 'Eastern realm'],
        keyConflicts: partialWorld.keyConflicts || ['Power struggle', 'Resource scarcity', 'Ideological differences'],
        importantFigures: partialWorld.importantFigures || ['Ruling council', 'Resistance leader', 'Spiritual guide'],
        culturalSetting: partialWorld.culturalSetting || 'Diverse cultures with varying traditions and beliefs',
        technology: partialWorld.technology || 'Mixed levels of technological advancement',
        magicSystem: partialWorld.magicSystem || 'No prevalent magic',
        politicalSystem: partialWorld.politicalSystem || 'Complex political landscape with competing factions',
        description: partialWorld.description || `${partialWorld.name} is a ${partialWorld.genre.toLowerCase()} world set in a ${partialWorld.setting.toLowerCase()}.`,
        complexity: 3
      };
      
      onWorldCreated(completeWorld);
      
      toast({
        title: "World Created",
        description: `The world of ${completeWorld.name} is ready for your story!`,
        action: (
          <Link href={`/world/${completeWorld.id}`}>
            <Button variant="ghost" size="sm" className="gap-1">
              <Map size={16} />
              View World
            </Button>
          </Link>
        ),
      });
    }
    
    // Check if we have enough character data
    for (const char of partialCharacters) {
      if (char.name && char.personality && char.personality.length >= 2 && !char.depth) {
        // We have enough basic info to create a character
        const completeCharacter: CharacterData = {
          id: Date.now() + Math.floor(Math.random() * 1000), // Generate a simple ID for the character
          name: char.name,
          role: char.role || 'Protagonist',
          background: char.background || `${char.name} has a mysterious past that shapes their current actions and decisions.`,
          personality: char.personality,
          goals: char.goals || ['To overcome personal challenges', 'To make a difference in the world'],
          fears: char.fears || ['Failure', 'Loss of loved ones'],
          relationships: char.relationships || [],
          skills: char.skills || ['Adaptability', 'Resourcefulness'],
          appearance: char.appearance || `${char.name} has a distinctive and memorable appearance.`,
          voice: char.voice || 'Speaks with confidence and authenticity',
          depth: 3
        };
        
        onCharacterCreated(completeCharacter);
        
        toast({
          title: "Character Created",
          description: `${completeCharacter.name} has been added to your story!`,
          action: (
            <Link href={`/character/${completeCharacter.id}`}>
              <Button variant="ghost" size="sm" className="gap-1">
                <User size={16} />
                View Character
              </Button>
            </Link>
          ),
        });
        
        // Remove this character from the partials
        setPartialCharacters(prev => prev.filter(c => c.name !== char.name));
      }
    }
    
    // Check if we have enough to start the story
    const hasWorld = Object.keys(partialWorld).length >= 3;
    const hasCharacters = partialCharacters.length >= 1;
    
    if (hasWorld && hasCharacters) {
      // Offer to start the story
      toast({
        title: "Ready to Begin",
        description: "We have enough information to start your story!",
        action: (
          <Button 
            onClick={() => startStory()}
            variant="outline"
            size="sm"
          >
            Begin Story
          </Button>
        ),
      });
    }
  };
  
  // Start the interactive story experience
  const startStory = () => {
    // Create a complete world if we don't have one yet
    if (!partialWorld.complexity) {
      const completeWorld: WorldData = {
        id: Date.now(), // Generate a simple ID for the world
        name: partialWorld.name || "Mysterious Realm",
        genre: partialWorld.genre || "Fantasy",
        setting: partialWorld.setting || "Magical landscape with diverse regions",
        timeframe: partialWorld.timeframe || "Timeless era",
        regions: partialWorld.regions || ['Central kingdom', 'Mysterious forest', 'Mountain stronghold'],
        keyConflicts: partialWorld.keyConflicts || ['Ancient prophecy', 'Power struggle', 'External threat'],
        importantFigures: partialWorld.importantFigures || ['Wise ruler', 'Mysterious stranger', 'Ancient guardian'],
        culturalSetting: partialWorld.culturalSetting || 'Rich tapestry of cultures and traditions',
        technology: partialWorld.technology || 'Mix of ancient techniques and magical innovations',
        magicSystem: partialWorld.magicSystem || 'Subtle magic that follows consistent rules',
        politicalSystem: partialWorld.politicalSystem || 'Kingdom with outlying independent regions',
        description: partialWorld.description || `A world where adventure awaits around every corner.`,
        complexity: 3
      };
      
      onWorldCreated(completeWorld);
      
      // Also add a toast with a link to the world details
      toast({
        title: "World Created",
        description: `The world of ${completeWorld.name} is ready for your story!`,
        action: (
          <Link href={`/world/${completeWorld.id}`}>
            <Button variant="ghost" size="sm" className="gap-1">
              <Map size={16} />
              View World
            </Button>
          </Link>
        ),
      });
    }
    
    // Create complete characters for any partial ones
    const completeCharacters: CharacterData[] = partialCharacters.map((char, index) => {
      if (char.depth) return char as CharacterData;
      
      return {
        id: Date.now() + index,
        name: char.name || "Unnamed Hero",
        role: char.role || (index === 0 ? 'Protagonist' : 'Supporting Character'),
        background: char.background || `A character with a mysterious past.`,
        personality: char.personality || ['Determined', 'Resourceful'],
        goals: char.goals || ['To overcome challenges', 'To discover truth'],
        fears: char.fears || ['Failure', 'Loss'],
        relationships: char.relationships || [],
        skills: char.skills || ['Adaptability', 'Quick thinking'],
        appearance: char.appearance || `Distinctive and memorable appearance.`,
        voice: char.voice || 'Authentic and engaging',
        depth: 3
      };
    });
    
    // If we somehow don't have any characters, create a default one
    if (completeCharacters.length === 0) {
      const defaultCharacter: CharacterData = {
        id: Date.now(),
        name: "The Protagonist",
        role: "Hero",
        background: "A character ready for adventure.",
        personality: ['Brave', 'Curious'],
        goals: ['To explore the world', 'To overcome challenges'],
        fears: ['Unknown', 'Failure'],
        relationships: [],
        skills: ['Adaptability', 'Resourcefulness'],
        appearance: "Has a distinctive look that matches their personality.",
        voice: "Speaks with conviction and authenticity",
        depth: 3
      };
      completeCharacters.push(defaultCharacter);
    }
    
    // Process all characters
    completeCharacters.forEach(char => {
      if (!char.id) {
        char.id = Date.now() + Math.floor(Math.random() * 1000);
      }
      onCharacterCreated(char);
    });
    
    // Signal that we're ready to start the story
    onStoryReady(partialWorld as WorldData, completeCharacters);
  };
  
  // Use a suggestion as input
  const useSuggestion = (suggestion: string) => {
    setInputText(suggestion);
    // Wait a moment then send
    setTimeout(() => handleSendMessage(), 100);
  };
  
  return (
    <div className="flex flex-col h-[80vh] max-w-4xl mx-auto">
      {/* Hidden audio player to handle audio playback properly in all browsers */}
      <div className="sr-only" aria-hidden="true">
        <AudioPlayer
          audioUrl={currentAudioUrl}
          autoPlay={true}
          onPlayStateChange={(isPlayingAudio) => {
            console.log("Audio player playback state changed:", isPlayingAudio);
            setIsSpeaking(isPlayingAudio);
          }}
        />
      </div>
      
      <div className="text-center mb-4">
        <h1 className="text-2xl font-bold text-primary">Talk to StoryFlow</h1>
        <p className="text-muted-foreground">
          Let's create your story through conversation. I'll guide you step by step.
        </p>
      </div>
      
      <Card className="flex-grow flex flex-col overflow-hidden">
        <ScrollArea ref={scrollRef} className="flex-grow p-4">
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] p-3 rounded-lg ${
                    message.sender === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  {/* Add audio indicator while speaking */}
                  {message.sender === 'ai' && isSpeaking && messages[messages.length - 1].id === message.id && (
                    <div className="flex items-center mb-1 text-xs text-muted-foreground">
                      <Volume2 className="w-3 h-3 mr-1 animate-pulse" />
                      <span>Speaking...</span>
                    </div>
                  )}
                  <p className="whitespace-pre-wrap">{message.content}</p>
                  
                  {/* Show extracted inspirations if any */}
                  {message.inspiration && message.inspiration.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs font-semibold mb-1">Inspirations identified:</p>
                      <div className="flex flex-wrap gap-1">
                        {message.inspiration.map((insp, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {insp}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Show world data if extracted */}
                  {message.worldData && Object.keys(message.worldData).length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs font-semibold mb-1">World elements:</p>
                      <div className="space-y-1">
                        {Object.entries(message.worldData).map(([key, value]) => (
                          <p key={key} className="text-xs">
                            <span className="font-medium">{key}:</span> {value}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Show character data if extracted */}
                  {message.characterData && Object.keys(message.characterData).length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs font-semibold mb-1">Character elements:</p>
                      <div className="space-y-1">
                        {Object.entries(message.characterData).map(([key, value]) => (
                          <p key={key} className="text-xs">
                            <span className="font-medium">{key}:</span> {Array.isArray(value) ? value.join(', ') : value}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Show suggestions and AI generation options */}
                  {message.sender === 'ai' && message.suggestions && message.suggestions.length > 0 && (
                    <div className="mt-3 pt-2 border-t border-t-muted-foreground/20">
                      <div className="flex justify-between items-center mb-2">
                        <p className="text-xs font-semibold">Need ideas? Try these:</p>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-xs h-7 gap-1"
                          onClick={() => useSuggestion(`Can you suggest more ideas for the ${message.interviewStage} stage?`)}
                        >
                          <Sparkles className="h-3 w-3" />
                          More Ideas
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-1 mb-2">
                        {message.suggestions.map((suggestion, i) => (
                          <Badge 
                            key={i} 
                            variant="secondary" 
                            className="text-xs cursor-pointer hover:bg-secondary/80"
                            onClick={() => useSuggestion(suggestion)}
                          >
                            {suggestion}
                          </Badge>
                        ))}
                      </div>
                      <div className="flex gap-2 mt-3">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="gap-1 text-xs"
                          onClick={() => {
                            const prompt = message.interviewStage === 'world' 
                              ? "Please create a detailed world for my story" 
                              : message.interviewStage === 'characters'
                              ? "Please create an interesting main character for me"
                              : `Please help me with the ${message.interviewStage} stage, I need AI-generated ideas`;
                            
                            useSuggestion(prompt);
                          }}
                        >
                          <Wand2 className="h-3 w-3" />
                          AI Create For Me
                        </Button>
                        {message.interviewStage !== 'ready' && (
                          <Button 
                            variant="secondary" 
                            size="sm"
                            className="gap-1 text-xs"
                            onClick={() => {
                              const nextStagePrompt = message.interviewStage === 'details' 
                                ? "I think we have enough to start the story now" 
                                : "Let's move to the next stage";
                              
                              useSuggestion(nextStagePrompt);
                            }}
                          >
                            <ArrowRight className="h-3 w-3" />
                            Continue
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                  
                  <div className="text-xs opacity-70 mt-1 text-right">
                    {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}
            
            {isProcessing && (
              <div className="flex justify-start">
                <div className="bg-muted p-3 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse delay-150"></div>
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse delay-300"></div>
                    <span className="text-sm">Thinking...</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
        
        <CardContent className="pt-4 border-t">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={toggleVoiceOutput}
              title={voiceEnabled ? "Mute AI voice" : "Enable AI voice"}
            >
              {voiceEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </Button>
            
            <Textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Type your message or use voice input..."
              className="resize-none"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
            />
            
            <Button
              variant="outline"
              size="icon"
              className={isListening ? "bg-red-100 text-red-600 border-red-300" : ""}
              onClick={toggleVoiceRecognition}
              title={isListening ? "Stop listening" : "Start voice input"}
            >
              {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>
            
            <Button
              onClick={handleSendMessage}
              disabled={inputText.trim() === '' || isProcessing}
              title="Send message"
            >
              {isProcessing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
          
          {isListening && (
            <div className="mt-2 text-sm text-center">
              <span className="inline-flex items-center">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse mr-2"></span>
                Listening... {transcript && `"${transcript}"`}
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default VoiceGuidedCreation;