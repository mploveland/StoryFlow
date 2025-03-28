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
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [threadId, setThreadId] = useState<string | undefined>(initialThreadId || propThreadId);
  
  // Debug log for threadId state
  useEffect(() => {
    console.log(`FoundationChatInterface - threadId initialized/changed: ${threadId || 'undefined'}`);
  }, [threadId]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [persistenceError, setPersistenceError] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageContainerRef = useRef<HTMLDivElement>(null);
  const pendingSaveQueue = useRef<{role: 'user' | 'assistant', content: string, foundationId: number}[]>([]);
  
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
      setPersistenceError(null);
      setIsLoadingMessages(true);
      
      // Show loading message
      setMessages([{
        role: 'assistant',
        content: 'Loading your previous conversation...'
      }]);
      
      const response = await fetch(`/api/foundations/${foundationId}/messages`);
      
      if (!response.ok) {
        throw new Error(`Failed to load messages: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.length > 0) {
        // Add a small delay so the loading message is visible (better UX)
        await new Promise(resolve => setTimeout(resolve, 300));
        
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
      } else {
        // Clear the loading message if no messages were found
        setMessages([]);
        return false;
      }
    } catch (error) {
      console.error("Error loading messages:", error);
      setPersistenceError(`Failed to load conversation history: ${error instanceof Error ? error.message : String(error)}`);
      // Clear the loading message on error
      setMessages([]);
      return false;
    } finally {
      setIsLoadingMessages(false);
    }
  };
  
  // Process any pending messages in the save queue
  const processSaveQueue = useRef<NodeJS.Timeout | null>(null);
  
  // Function to retry saving a message with exponential backoff
  const saveMessageWithRetry = async (
    foundationId: number, 
    role: 'user' | 'assistant', 
    content: string, 
    retryCount = 0, 
    maxRetries = 3,
    baseDelay = 1000
  ) => {
    try {
      const response = await fetch(`/api/foundations/${foundationId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ role, content })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to save message: ${response.status} ${response.statusText}`);
      }
      
      // Clear error message on successful save
      setPersistenceError(null);
      
      return true;
    } catch (error) {
      console.error(`Error saving message (attempt ${retryCount + 1}):`, error);
      
      // If we haven't exceeded max retries, try again with exponential backoff
      if (retryCount < maxRetries) {
        const delay = baseDelay * Math.pow(2, retryCount);
        console.log(`Retrying in ${delay}ms...`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        return saveMessageWithRetry(foundationId, role, content, retryCount + 1, maxRetries, baseDelay);
      } else {
        // Add to pending queue for later retry
        pendingSaveQueue.current.push({ foundationId, role, content });
        
        // Set an error message for the user
        setPersistenceError("Some messages couldn't be saved. The app will keep trying to save them.");
        
        // Start a background process to retry pending messages if not already running
        if (!processSaveQueue.current) {
          processSaveQueue.current = setInterval(() => {
            if (pendingSaveQueue.current.length > 0) {
              // Try to save the oldest message
              const oldestMessage = pendingSaveQueue.current[0];
              saveMessageWithRetry(
                oldestMessage.foundationId, 
                oldestMessage.role, 
                oldestMessage.content
              ).then(success => {
                if (success) {
                  // Remove from queue if successful
                  pendingSaveQueue.current.shift();
                  
                  // If queue is empty, clear the interval and error message
                  if (pendingSaveQueue.current.length === 0) {
                    if (processSaveQueue.current) {
                      clearInterval(processSaveQueue.current);
                      processSaveQueue.current = null;
                    }
                    setPersistenceError(null);
                  }
                }
              });
            }
          }, 5000); // Try every 5 seconds
        }
        
        return false;
      }
    }
  };
  
  // Save message to the server with retry mechanism
  const saveMessage = async (foundationId: number, role: 'user' | 'assistant', content: string) => {
    return saveMessageWithRetry(foundationId, role, content);
  };
  
  useEffect(() => {
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
    } else if (foundation && foundation.id) {
      // Try to load existing messages for this foundation
      loadMessages(foundation.id).then(hasMessages => {
        // If no existing messages, show the welcome message
        if (!hasMessages) {
          // Set welcome message for foundation with stages explanation
          const welcomeMessage = {
            role: 'assistant' as const,
            content: `Welcome to StoryFlow! I'll help you build your new foundation, "${foundation.name}". 

We'll go through these stages together:
1. Genre - what type of story you want to create
2. World - the setting and environment for your stories
3. Characters - the people who inhabit your world
4. Influences - inspirations and references for your creation
5. Details - additional aspects to make your world unique

Let's start with the genre. What kind of genre interests you? Feel free to give me just 1-2 words like "fantasy" or "sci-fi".`
          };
          setMessages([welcomeMessage]);
          
          // Save welcome message to the database for persistence
          if (foundation.id) {
            saveMessage(foundation.id, 'assistant', welcomeMessage.content);
          }
          
          // Initial suggestions for foundation - simple 1-2 word genres with "Surprise me!" option
          setSuggestions([
            "Fantasy",
            "Sci-fi",
            "Mystery",
            "Historical fiction",
            "Romance",
            "Surprise me!"
          ]);
        }
      });
    } else if (title) {
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
  }, [foundation, initialMessages, title]);
  
  // Update input value with transcript when speech recognition is active
  useEffect(() => {
    if (transcript) {
      setInputValue(transcript);
    }
  }, [transcript]);
  
  // Update threadId when foundation prop changes
  useEffect(() => {
    if (foundation?.threadId && foundation.threadId !== threadId) {
      console.log(`FoundationChatInterface - Updating threadId from foundation prop: ${threadId || 'undefined'} -> ${foundation.threadId}`);
      setThreadId(foundation.threadId);
    }
  }, [foundation?.threadId, threadId]);
  
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
  
  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (processSaveQueue.current) {
        clearInterval(processSaveQueue.current);
        processSaveQueue.current = null;
      }
    };
  }, []);
  
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    // Don't submit if already processing or empty message
    if (isProcessing || !inputValue.trim() || !messageHandler) return;
    
    // Add user message to chat
    const userMessage = { role: 'user' as const, content: inputValue };
    setMessages(prev => [...prev, userMessage]);
    
    // Save user message to database if we have a foundation ID
    if (foundation?.id) {
      saveMessage(foundation.id, 'user', userMessage.content);
    }
    
    // Clear input and start processing
    setInputValue('');
    resetTranscript();
    setIsProcessing(true);
    
    try {
      // Send message to AI using the appropriate handler
      const response = await messageHandler(userMessage.content, threadId);
      
      // Add AI response to chat
      const assistantMessage = { 
        role: 'assistant' as const, 
        content: response.content 
      };
      setMessages(prev => [...prev, assistantMessage]);
      
      // Save assistant message to database if we have a foundation ID
      if (foundation?.id) {
        saveMessage(foundation.id, 'assistant', assistantMessage.content);
      }
      
      // Save thread ID if provided
      if (response.threadId) {
        console.log(`FoundationChatInterface - Updating threadId: ${threadId || 'undefined'} -> ${response.threadId}`);
        setThreadId(response.threadId);
      }
      
      // Get intelligent suggestions using our new API endpoint
      try {
        // Use the new chat suggestions endpoint which uses OpenAI Assistant
        const suggestionsResponse = await fetch('/api/ai/chat-suggestions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userMessage: userMessage.content,
            assistantReply: response.content
          }),
        });
        
        if (suggestionsResponse.ok) {
          const data = await suggestionsResponse.json();
          if (data.suggestions && Array.isArray(data.suggestions) && data.suggestions.length > 0) {
            console.log('Using AI-generated chat suggestions:', data.suggestions);
            setSuggestions(data.suggestions);
          } else if (response.suggestions) {
            // Fallback to provided suggestions if AI ones failed
            console.log('Falling back to provided suggestions:', response.suggestions);
            setSuggestions(response.suggestions);
          }
        } else {
          // If API call fails, use the provided suggestions
          if (response.suggestions) {
            console.log('Using provided suggestions due to API error:', response.suggestions);
            setSuggestions(response.suggestions);
          }
        }
      } catch (suggestionError) {
        console.error('Error fetching intelligent suggestions:', suggestionError);
        // Fallback to provided suggestions on error
        if (response.suggestions) {
          setSuggestions(response.suggestions);
        }
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
      if (foundation?.id) {
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
      
      {/* Persistence error message display */}
      {persistenceError && (
        <div className="bg-amber-50 border border-amber-200 rounded-md p-3 mb-3">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-amber-800">Persistence Warning</h3>
              <div className="mt-1 text-sm text-amber-700">
                <p>{persistenceError}</p>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Loading messages indicator */}
      {isLoadingMessages && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-3">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">Loading your conversation</h3>
              <div className="mt-1 text-sm text-blue-700">
                <p>Please wait while we retrieve your previous messages...</p>
              </div>
            </div>
          </div>
        </div>
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