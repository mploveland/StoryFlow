import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Foundation } from '@shared/schema';
import { Mic, Send, Pause, Volume2 } from 'lucide-react';
import useSpeechRecognition from '@/hooks/useSpeechRecognition';
import { useTTS } from '@/hooks/useTTS';
import { AudioPlayer } from '@/components/ui/audio-player';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface FoundationChatInterfaceProps {
  // Foundation details (required in foundation-details.tsx)
  foundation?: Foundation;
  // Direct properties (used in world-details.tsx)
  title?: string;
  description?: string;
  foundationId?: number;
  threadId?: string;
  
  // Messaging functionality
  sendMessage?: (message: string, threadId?: string) => Promise<{
    content: string;
    suggestions?: string[];
    threadId?: string;
  }>;
  onSendMessage?: (message: string, threadId?: string) => Promise<{
    content: any;
    threadId: any;
    suggestions: string[];
  }>;
  
  initialThreadId?: string;
  
  // Initial messages (for world-details.tsx)
  initialMessages?: Array<{
    id: string;
    content: string;
    sender: 'ai' | 'user';
    timestamp: Date;
    suggestions?: string[];
  }>;
}

const FoundationChatInterface: React.FC<FoundationChatInterfaceProps> = ({
  // Foundation props
  foundation,
  // Direct props
  title,
  description,
  foundationId,
  threadId: propThreadId, 
  // Message handlers
  sendMessage,
  onSendMessage,
  // Initial data
  initialThreadId,
  initialMessages,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [threadId, setThreadId] = useState<string | undefined>(initialThreadId || propThreadId);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageContainerRef = useRef<HTMLDivElement>(null);
  
  // Voice input
  const {
    isListening,
    transcript,
    start: startListening,
    stop: stopListening,
    clear: resetTranscript,
    supported: browserSupportsSpeechRecognition
  } = useSpeechRecognition();
  
  // Text-to-speech
  const { speak, isPlaying, currentAudioUrl, stop } = useTTS();
  
  // Get effective message handler (prefer sendMessage if provided)
  const messageHandler = sendMessage || onSendMessage;
  
  // Load saved messages from the server
  const loadMessages = async (foundationId: number) => {
    try {
      const response = await fetch(`/api/foundations/${foundationId}/messages`);
      if (response.ok) {
        const data = await response.json();
        if (data.length > 0) {
          setMessages(data.map((msg: any) => ({
            role: msg.role as 'user' | 'assistant',
            content: msg.content
          })));
          
          // Set suggestions based on the last assistant message
          const lastAssistantMessage = [...data].reverse().find(msg => msg.role === 'assistant');
          if (lastAssistantMessage) {
            // Here we're using default suggestions since saved messages don't have suggestions
            // In a future enhancement, we could store suggestions with messages
            setSuggestions([
              "Tell me more",
              "Can you explain that differently?",
              "Let's continue with the next topic",
              "I'd like to add more details"
            ]);
          }
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error("Error loading messages:", error);
      return false;
    }
  };
  
  // Save message to the server
  const saveMessage = async (foundationId: number, role: 'user' | 'assistant', content: string) => {
    try {
      await fetch(`/api/foundations/${foundationId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ role, content })
      });
    } catch (error) {
      console.error("Error saving message:", error);
    }
  };
  
  useEffect(() => {
    // Handle initial messages from props (for world-details.tsx)
    if (initialMessages && initialMessages.length > 0) {
      // Convert format from world-details.tsx to our internal format
      const convertedMessages = initialMessages.map(msg => ({
        role: msg.sender === 'ai' ? 'assistant' as const : 'user' as const,
        content: msg.content
      }));
      
      setMessages(convertedMessages);
      
      // Set initial suggestions if available in the first message
      const firstAiMessage = initialMessages.find(msg => msg.sender === 'ai');
      if (firstAiMessage?.suggestions) {
        setSuggestions(firstAiMessage.suggestions);
      }
      return;
    }
    
    // Handle foundation chat interface
    if (foundation && foundation.id) {
      // Try to load existing messages for this foundation
      loadMessages(foundation.id)
        .then(hasMessages => {
          // If we already have messages, we're done
          if (hasMessages) {
            return;
          }
          
          // If no existing messages, create a welcome message
          // First check if characters exist for this foundation
          return fetch(`/api/foundations/${foundation.id}/characters`)
            .then(response => response.ok ? response.json() : [])
            .catch(error => {
              console.error("Error fetching characters:", error);
              return []; // Return empty array on error
            })
            .then(charactersList => {
              // Generate welcome message based on foundation progress
              let welcomeMessageContent = '';
              let initialSuggestions: string[] = [];
              
              // Check what information is already available in the foundation
              const hasGenre = foundation.genre && foundation.genre !== 'Undecided';
              const hasWorld = foundation.description && foundation.description?.length > 20; // Basic check for meaningful description
              
              if (!hasGenre && !hasWorld) {
                // Brand new foundation - standard welcome
                welcomeMessageContent = `Welcome to StoryFlow! I'll help you build your new foundation, "${foundation.name}".

We'll go through these stages together:
1. Genre - what type of story you want to create
2. World - the setting and environment for your stories
3. Characters - the people who inhabit your world
4. Influences - inspirations and references for your creation
5. Details - additional aspects to make your world unique

Let's start with the genre. What kind of genre interests you? Feel free to give me just 1-2 words like "fantasy" or "sci-fi".`;

                // Initial suggestions for foundation - simple 1-2 word genres with "Surprise me!" option
                initialSuggestions = [
                  "Fantasy",
                  "Sci-fi",
                  "Mystery",
                  "Historical fiction",
                  "Romance",
                  "Surprise me!"
                ];
              } else {
                // Welcome back message with foundation progress summary
                welcomeMessageContent = `Welcome back to "${foundation.name}"! Here's what we have so far:\n\n`;
                
                // Add genre information if available
                if (hasGenre) {
                  welcomeMessageContent += `• Genre: ${foundation.genre}\n`;
                } else {
                  welcomeMessageContent += `• Genre: Not decided yet\n`;
                }
                
                // Add world information if available
                if (hasWorld && foundation.description) {
                  const desc = foundation.description;
                  welcomeMessageContent += `• World: ${desc.substring(0, 100)}${desc.length > 100 ? '...' : ''}\n`;
                } else {
                  welcomeMessageContent += `• World: Not developed yet\n`;
                }
                
                // Add character information if available
                if (charactersList && charactersList.length > 0) {
                  welcomeMessageContent += `• Characters: ${charactersList.length} character${charactersList.length === 1 ? '' : 's'} created\n`;
                  // List first 2 character names if available
                  if (charactersList.length > 0) {
                    const characterNames = charactersList.slice(0, 2).map((char: any) => char.name).join(', ');
                    welcomeMessageContent += `  Including: ${characterNames}${charactersList.length > 2 ? ', and more...' : ''}\n`;
                  }
                } else {
                  welcomeMessageContent += `• Characters: None created yet\n`;
                }
                
                // Add next steps
                welcomeMessageContent += `\nWould you like to continue where we left off?`;
                
                // Suggestions based on foundation progress
                if (!hasGenre) {
                  initialSuggestions = [
                    "Yes, let's decide on a genre",
                    "Tell me more about genres",
                    "I'd like to explore different genre options",
                    "Surprise me with a genre suggestion"
                  ];
                } else if (!hasWorld) {
                  initialSuggestions = [
                    "Yes, let's develop the world",
                    "Tell me more about world-building",
                    "How can we expand on the genre?",
                    "What kind of world fits this genre?"
                  ];
                } else if (charactersList.length === 0) {
                  initialSuggestions = [
                    "Let's create some characters",
                    "Tell me more about character creation",
                    "What kind of characters would fit this world?",
                    "Suggest a character for this world"
                  ];
                } else {
                  initialSuggestions = [
                    "Let's develop the existing characters further",
                    "Let's create another character",
                    "How can we add depth to this world?",
                    "What influences could shape this world?"
                  ];
                }
              }
              
              // Set the welcome message
              const welcomeMessage = {
                role: 'assistant' as const,
                content: welcomeMessageContent
              };
              
              setMessages([welcomeMessage]);
              
              // Save welcome message to the database for persistence
              saveMessage(foundation.id, 'assistant', welcomeMessage.content);
              
              // Set initial suggestions
              setSuggestions(initialSuggestions);
            });
        })
        .catch(error => {
          console.error("Error loading messages:", error);
        });
      
      return;
    }
    
    // Handle world details view
    if (title) {
      // Set welcome message for world details
      const welcomeMessage = {
        role: 'assistant' as const,
        content: `Welcome to ${title}! How can I help you develop this world?`
      };
      setMessages([welcomeMessage]);
      
      // Default suggestions for world details
      setSuggestions([
        "Tell me more about this world",
        "How can I develop the culture?",
        "What kind of geography exists here?",
        "How should I approach conflicts in this world?",
      ]);
    }
  }, [foundation, initialMessages, title, loadMessages, saveMessage]);
  
  // Update input value with transcript when speech recognition is active
  useEffect(() => {
    if (transcript) {
      setInputValue(transcript);
    }
  }, [transcript]);
  
  // Auto-scroll to the latest message
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);
  
  // TTS for assistant messages
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage && lastMessage.role === 'assistant') {
      speak(lastMessage.content);
    }
  }, [messages, speak]);
  
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    // Don't submit if already processing or empty message
    if (isProcessing || !inputValue.trim() || !messageHandler) return;
    
    // Add user message to chat
    const userMessage = { role: 'user' as const, content: inputValue };
    setMessages(prev => [...prev, userMessage]);
    
    // Save user message to database if we have a foundation ID
    if (foundation && foundation.id) {
      saveMessage(foundation.id, 'user', userMessage.content);
    }
    
    // Clear input and start processing
    setInputValue('');
    resetTranscript();
    setIsProcessing(true);
    
    try {
      // Send message to AI using the appropriate handler
      if (!messageHandler) return;
      const response = await messageHandler(userMessage.content, threadId);
      
      // Add AI response to chat
      const assistantMessage = { 
        role: 'assistant' as const, 
        content: response.content 
      };
      setMessages(prev => [...prev, assistantMessage]);
      
      // Save assistant message to database if we have a foundation ID
      if (foundation && foundation.id) {
        saveMessage(foundation.id, 'assistant', assistantMessage.content);
      }
      
      // Save thread ID if provided
      if (response.threadId) {
        setThreadId(response.threadId);
      }
      
      // Update suggestions if provided
      if (response.suggestions) {
        setSuggestions(response.suggestions);
      }
    } catch (error) {
      console.error('Error processing message:', error);
      // Add error message
      const errorMessage = { 
        role: 'assistant' as const, 
        content: 'Sorry, I had trouble processing your request. Please try again.' 
      };
      setMessages(prev => [...prev, errorMessage]);
      
      // Also save error message to database
      if (foundation && foundation.id) {
        saveMessage(foundation.id, 'assistant', errorMessage.content);
      }
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleSuggestionClick = (suggestion: string) => {
    setInputValue(suggestion);
    // Automatically submit the suggestion after a brief delay
    // This makes the interaction more fluid for users
    setTimeout(() => handleSubmit(), 100);
  };
  
  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      resetTranscript();
      startListening();
    }
  };
  
  return (
    <div className="flex flex-col h-[70vh]">
      <div 
        ref={messageContainerRef}
        className="flex-1 overflow-y-auto mb-4 p-4 bg-neutral-50 rounded-lg border border-neutral-200"
      >
        {messages.map((message, index) => (
          <div 
            key={index} 
            className={`mb-4 ${message.role === 'user' ? 'text-right' : 'text-left'}`}
          >
            <div 
              className={`inline-block max-w-[80%] rounded-lg py-2 px-3 ${
                message.role === 'user' 
                  ? 'bg-primary-100 text-primary-900' 
                  : 'bg-white border border-neutral-200 shadow-sm'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
            </div>
          </div>
        ))}
        
        {/* Loading indicator while waiting for assistant response */}
        {isProcessing && (
          <div className="mb-4 text-left">
            <div className="inline-block max-w-[80%] rounded-lg py-2 px-3 bg-white border border-neutral-200 shadow-sm">
              <div className="flex items-center space-x-2">
                <div className="flex space-x-1">
                  <div className="h-2 w-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="h-2 w-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  <div className="h-2 w-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '600ms' }}></div>
                </div>
                <span className="text-sm text-neutral-500">Thinking...</span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      {currentAudioUrl && (
        <AudioPlayer 
          audioUrl={currentAudioUrl}
          className="mb-4"
        />
      )}
      
      <div className="mt-2 mb-4">
        <h4 className="text-sm font-medium mb-2 text-neutral-600">Suggestions:</h4>
        <div className="flex flex-wrap gap-2">
          {suggestions.map((suggestion, index) => (
            <Button 
              key={index} 
              variant="outline" 
              size="sm" 
              onClick={() => handleSuggestionClick(suggestion)}
              className="text-xs"
            >
              {suggestion}
            </Button>
          ))}
        </div>
      </div>
      
      <form onSubmit={handleSubmit} className="flex items-end gap-2">
        <div className="flex-1 relative">
          <Textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Type your message..."
            className="min-h-[80px] resize-none"
            disabled={isProcessing}
          />
          {isListening && (
            <div className="absolute bottom-2 left-2 text-xs text-red-500 animate-pulse">
              Listening...
            </div>
          )}
        </div>
        
        {browserSupportsSpeechRecognition && (
          <Button 
            type="button" 
            variant={isListening ? "destructive" : "outline"}
            onClick={toggleListening}
            className="h-10 w-10 p-0"
            disabled={isProcessing}
          >
            {isListening ? <Pause className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </Button>
        )}
        
        <Button 
          type="submit" 
          disabled={!inputValue.trim() || isProcessing || !messageHandler}
          className="h-10 w-10 p-0"
        >
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
};

export default FoundationChatInterface;