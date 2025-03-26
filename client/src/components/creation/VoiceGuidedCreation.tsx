import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Mic, MicOff, Send, RefreshCw, VolumeX, Volume2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { fetchInteractiveStoryResponse } from '@/lib/openai';
import { CharacterData } from '../character/CharacterBuilder';
import { WorldData } from '../world/WorldDesigner';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { useSpeechSynthesis } from '@/hooks/useSpeechSynthesis';

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
  
  // Speech recognition setup
  const { transcript, listening, startListening, stopListening } = useSpeechRecognition({
    onResult: (text) => setInputText(text),
    onEnd: () => {
      // Auto-send message when user stops speaking after a brief pause
      if (inputText.trim().length > 10) {
        setTimeout(() => handleSendMessage(), 1000);
      }
    },
    continuous: true
  });
  
  // Speech synthesis setup
  const { speak, speaking, cancel, voices, changeVoice } = useSpeechSynthesis({
    onEnd: () => setIsSpeaking(false)
  });
  
  // Initialize with a welcoming AI message
  useEffect(() => {
    const initialMessage: Message = {
      id: Date.now().toString(),
      content: "Welcome to StoryFlow! I'll help you create an amazing interactive story through our conversation. Let's start by talking about your ideas or interests. What kind of stories do you enjoy, or what themes would you like to explore?",
      sender: 'ai',
      timestamp: new Date(),
      suggestions: [
        "I love fantasy stories with magic and adventure",
        "I'm interested in sci-fi exploring future technology",
        "I enjoy mysteries and detective stories",
        "I'd like a story about personal growth and discovery"
      ]
    };
    
    setMessages([initialMessage]);
    
    // Use a more natural-sounding voice if available
    if (voices.length > 0) {
      const preferredVoice = voices.find(v => 
        v.name.includes('Samantha') || 
        v.name.includes('Google') || 
        v.name.toLowerCase().includes('female')
      );
      if (preferredVoice) {
        changeVoice(preferredVoice);
      }
    }
    
    // Auto-speak the welcome message
    if (voiceEnabled) {
      setTimeout(() => {
        speakMessage(initialMessage.content);
      }, 500);
    }
  }, []);
  
  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);
  
  // Handle sending a user message
  const handleSendMessage = async () => {
    if (inputText.trim() === '' || isProcessing) return;
    
    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputText,
      sender: 'user',
      timestamp: new Date()
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
        inspirations,
        partialWorld,
        partialCharacters
      };
      
      // Call the AI for a response
      const response = await fetchInteractiveStoryResponse({
        messages: [
          { sender: "system", content: `You are a creative writing assistant helping the user build a story interactively. Currently gathered inspirations: ${inspirations.join(', ')}. Current world building progress: ${JSON.stringify(partialWorld)}. Current character progress: ${JSON.stringify(partialCharacters)}. If you identify specific inspirations, world elements, or character traits in the user's input, extract them. Guide the conversation naturally towards building a complete story world.` },
          { sender: "context", content: context },
          { sender: "user", content: inputText }
        ]
      });
      
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
    if (!voiceEnabled) return;
    
    // Cancel any ongoing speech
    if (speaking) {
      cancel();
    }
    
    setIsSpeaking(true);
    speak(text);
  };
  
  // Toggle voice recognition on/off
  const toggleVoiceRecognition = () => {
    if (listening) {
      stopListening();
    } else {
      startListening();
    }
  };
  
  // Toggle voice output on/off
  const toggleVoiceOutput = () => {
    setVoiceEnabled(!voiceEnabled);
    if (speaking && !voiceEnabled) {
      cancel();
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
  
  // Generate contextual suggestions based on the conversation state
  const generateSuggestions = (
    userInput: string, 
    state: {inspirations: string[], partialWorld: Partial<WorldData>, partialCharacters: Partial<CharacterData>[]}
  ): string[] => {
    const suggestions: string[] = [];
    
    // Suggestions based on current progress
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
    
    // If we have enough information, suggest moving forward
    if (state.partialWorld.name && state.partialCharacters.length > 0) {
      suggestions.push("I think we have enough to start creating your story!");
    }
    
    return suggestions.length > 0 ? suggestions : [
      "Tell me more about your ideas",
      "Would you like to focus on the characters or the world next?",
      "What themes would you like to explore in this story?"
    ];
  };
  
  // Check if we have enough information to create a world or character
  const checkCreationProgress = () => {
    // Check if we have enough world data
    if (partialWorld.name && partialWorld.genre && partialWorld.setting && !partialWorld.complexity) {
      // We have enough basic info to create a world
      const completeWorld: WorldData = {
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
      });
    }
    
    // Check if we have enough character data
    for (const char of partialCharacters) {
      if (char.name && char.personality && char.personality.length >= 2 && !char.depth) {
        // We have enough basic info to create a character
        const completeCharacter: CharacterData = {
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
                  
                  {/* Show suggestions if available */}
                  {message.sender === 'ai' && message.suggestions && message.suggestions.length > 0 && (
                    <div className="mt-3 pt-2 border-t border-t-muted-foreground/20">
                      <p className="text-xs font-semibold mb-1">You might say:</p>
                      <div className="flex flex-wrap gap-1">
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
              className={listening ? "bg-red-100 text-red-600 border-red-300" : ""}
              onClick={toggleVoiceRecognition}
              title={listening ? "Stop listening" : "Start voice input"}
            >
              {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>
            
            <Button
              onClick={handleSendMessage}
              disabled={inputText.trim() === '' || isProcessing}
              title="Send message"
            >
              {isProcessing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
          
          {listening && (
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