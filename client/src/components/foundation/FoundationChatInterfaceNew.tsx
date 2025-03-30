import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Foundation } from '@shared/schema';
import { Mic, Send, Pause } from 'lucide-react';
import useSpeechRecognition from '@/hooks/useSpeechRecognition';
import { useTTS } from '@/hooks/useTTS';
import { AudioPlayer } from '@/components/ui/audio-player';
import { updateApiKey } from '@/lib/settings';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface FoundationChatInterfaceProps {
  // Foundation details
  foundation?: Foundation;
  
  // Direct properties
  title?: string;
  description?: string;
  foundationId?: number;
  
  // Message handler
  messageHandler?: (message: string, threadId?: string) => Promise<{
    content: string;
    threadId?: string;
  }>;
  
  // Thread state
  initialThreadId?: string;
}

const FoundationChatInterfaceNew: React.FC<FoundationChatInterfaceProps> = ({
  foundation,
  title,
  description,
  foundationId,
  messageHandler,
  initialThreadId
}) => {
  // State for the chat
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [threadId, setThreadId] = useState<string | undefined>(initialThreadId ?? foundation?.threadId);
  const [persistenceError, setPersistenceError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(true);
  
  // Refs for managing the chat
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageContainerRef = useRef<HTMLDivElement>(null);
  const lastSpokenMessageRef = useRef<string | null>(null);
  const pendingSaveQueue = useRef<Array<{
    foundationId: number;
    role: 'user' | 'assistant';
    content: string;
  }>>([]);
  const processSaveQueueRef = useRef<NodeJS.Timeout | null>(null);
  const initialLoadComplete = useRef<boolean>(false);
  const requestIdRef = useRef<string>('');
  
  // Speech recognition
  const {
    transcript,
    isListening,
    supported: browserSupportsSpeechRecognition,
    start: startListening,
    stop: stopListening,
    clear: resetTranscript
  } = useSpeechRecognition();
  
  // Text-to-speech
  const {
    speak,
    stop: stopSpeaking,
    isPlaying,
    voices,
    selectedVoice,
    changeVoice,
    currentAudioUrl,
    playbackSpeed,
    changePlaybackSpeed,
    apiKeyError,
    clearApiKeyError
  } = useTTS();
  
  // Update input value from transcript
  useEffect(() => {
    if (transcript) {
      setInputValue(prevValue => {
        return prevValue ? `${prevValue} ${transcript}` : transcript;
      });
    }
  }, [transcript]);
  
  // Auto-scroll to the bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isProcessing]);
  
  // Load saved messages when foundation changes
  useEffect(() => {
    const effectiveFoundationId = foundationId || foundation?.id;
    
    // Skip if we don't have a foundation ID or message handler
    if (!effectiveFoundationId || !messageHandler) {
      console.log('No foundation ID or message handler. Skipping message load.');
      return;
    }
    
    // Skip if we've already loaded for this foundation
    if (initialLoadComplete.current) {
      console.log(`Initial load already completed for foundation ${effectiveFoundationId}`);
      return;
    }
    
    // Mark as loaded
    initialLoadComplete.current = true;
    console.log(`Loading messages for foundation ${effectiveFoundationId}`);
    
    // Set thread ID from foundation if available
    if (foundation?.threadId) {
      console.log(`Setting thread ID to ${foundation.threadId}`);
      setThreadId(foundation.threadId);
    }
    
    // Load messages
    const isNewFoundation = !foundation?.threadId;
    loadFoundationMessages(effectiveFoundationId, isNewFoundation);
  }, [foundation, foundationId, messageHandler]);
  
  // Load messages from the server
  const loadFoundationMessages = async (id: number, isNewFoundation: boolean) => {
    try {
      console.log(`Loading messages for foundation ${id}, isNewFoundation: ${isNewFoundation}`);
      setIsLoadingMessages(true);
      
      // Set a unique request ID to prevent race conditions
      const newRequestId = Date.now().toString();
      requestIdRef.current = newRequestId;
      
      // Skip loading for new foundations
      if (isNewFoundation) {
        console.log('New foundation - setting welcome message');
        
        // Show welcome message for new foundations
        const welcomeMessage = {
          role: 'assistant' as const,
          content: 'Welcome to Foundation Builder! What type of genre would you like to explore for your story world?'
        };
        
        setMessages([welcomeMessage]);
        lastSpokenMessageRef.current = welcomeMessage.content;
        
        // Save welcome message if foundation ID is available
        if (id) {
          saveMessage(id, 'assistant', welcomeMessage.content);
        }
        
        setIsLoadingMessages(false);
        return;
      }
      
      // Show loading indicator
      setMessages([{
        role: 'assistant',
        content: 'Loading your previous conversation...'
      }]);
      lastSpokenMessageRef.current = 'Loading your previous conversation...';
      
      // Fetch messages from the server
      const response = await fetch(`/api/foundations/${id}/messages`);
      
      // Check if this is still the most recent request
      if (requestIdRef.current !== newRequestId) {
        console.log('Abandoned message loading due to newer request');
        return;
      }
      
      if (!response.ok) {
        throw new Error(`Failed to load messages: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Check if this is still the most recent request
      if (requestIdRef.current !== newRequestId) {
        console.log('Abandoned message processing due to newer request');
        return;
      }
      
      if (Array.isArray(data) && data.length > 0) {
        console.log(`Loaded ${data.length} messages`);
        
        // Convert messages to the right format
        const formattedMessages = data.map(msg => ({
          role: msg.role as 'user' | 'assistant',
          content: String(msg.content)
        }));
        
        // Set the last message as already spoken to prevent TTS
        if (formattedMessages.length > 0) {
          const lastMessage = formattedMessages[formattedMessages.length - 1];
          lastSpokenMessageRef.current = lastMessage.content;
        }
        
        // Update state
        setMessages(formattedMessages);
        
        // Fetch suggestions for the last message pair
        const lastUserIndex = formattedMessages.map(m => m.role).lastIndexOf('user');
        const lastAssistantIndex = formattedMessages.map(m => m.role).lastIndexOf('assistant');
        
        if (lastUserIndex >= 0 && lastAssistantIndex > lastUserIndex) {
          fetchSuggestions(
            formattedMessages[lastUserIndex].content,
            formattedMessages[lastAssistantIndex].content
          );
        }
      } else {
        console.log('No messages found');
        setMessages([]);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
      setPersistenceError(`Failed to load conversation: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setMessages([]);
    } finally {
      setIsLoadingMessages(false);
    }
  };
  
  // Save message to the database
  const saveMessage = async (id: number, role: 'user' | 'assistant', content: string) => {
    try {
      console.log(`Saving ${role} message to foundation ${id}`);
      
      const response = await fetch(`/api/foundations/${id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, content })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to save message: ${response.status}`);
      }
      
      console.log('Message saved successfully');
      return true;
    } catch (error) {
      console.error('Error saving message:', error);
      
      // Add to pending queue for retry
      pendingSaveQueue.current.push({ foundationId: id, role, content });
      
      // Start the retry process if not already running
      if (!processSaveQueueRef.current) {
        processSaveQueueRef.current = setInterval(() => {
          retryPendingMessages();
        }, 5000);
      }
      
      setPersistenceError(`Message saving failed. Will retry automatically.`);
      return false;
    }
  };
  
  // Retry sending pending messages
  const retryPendingMessages = async () => {
    if (pendingSaveQueue.current.length === 0) {
      // Clear the interval if no more pending messages
      if (processSaveQueueRef.current) {
        clearInterval(processSaveQueueRef.current);
        processSaveQueueRef.current = null;
      }
      setPersistenceError(null);
      return;
    }
    
    // Try to save the oldest message
    const oldestMessage = pendingSaveQueue.current[0];
    
    try {
      const success = await saveMessage(
        oldestMessage.foundationId,
        oldestMessage.role,
        oldestMessage.content
      );
      
      if (success) {
        // Remove from queue if successful
        pendingSaveQueue.current.shift();
        
        // Update error message
        if (pendingSaveQueue.current.length > 0) {
          setPersistenceError(`Still retrying to save ${pendingSaveQueue.current.length} messages...`);
        } else {
          setPersistenceError(null);
        }
      }
    } catch (error) {
      console.error('Error in retry:', error);
    }
  };
  
  // Fetch suggestions based on conversation
  const fetchSuggestions = async (userMessage: string, assistantReply: string) => {
    try {
      const response = await fetch('/api/ai/chat-suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userMessage,
          assistantReply,
          foundationId: foundation?.id
        })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch suggestions: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.suggestions && Array.isArray(data.suggestions)) {
        console.log(`Received ${data.suggestions.length} suggestions`);
        setSuggestions(data.suggestions);
        setShowSuggestions(true);
        return data.suggestions;
      }
      
      return [];
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      return [];
    }
  };
  
  // Handle form submission
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    // Skip if already processing or empty message
    if (isProcessing || !inputValue.trim() || !messageHandler) return;
    
    // Get the effective foundation ID
    const effectiveFoundationId = foundationId || foundation?.id;
    
    // Add user message to chat
    const userMessage = { role: 'user' as const, content: inputValue };
    setMessages(prev => [...prev, userMessage]);
    
    // Save user message if foundation ID is available
    if (effectiveFoundationId) {
      saveMessage(effectiveFoundationId, 'user', userMessage.content);
    }
    
    // Clear input and start processing
    setInputValue('');
    resetTranscript();
    setIsProcessing(true);
    setShowSuggestions(false);
    
    try {
      // Send message to AI
      const response = await messageHandler(userMessage.content, threadId);
      
      // Add AI response to chat
      const assistantMessage = {
        role: 'assistant' as const,
        content: response.content
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      
      // Save thread ID if provided
      if (response.threadId) {
        console.log(`Updating thread ID: ${threadId} -> ${response.threadId}`);
        setThreadId(response.threadId);
      }
      
      // Save assistant message
      if (effectiveFoundationId) {
        saveMessage(effectiveFoundationId, 'assistant', assistantMessage.content);
      }
      
      // Mark as already spoken to prevent duplication
      lastSpokenMessageRef.current = assistantMessage.content;
      
      // Fetch suggestions
      fetchSuggestions(userMessage.content, assistantMessage.content);
    } catch (error) {
      console.error('Error processing message:', error);
      
      // Add error message
      const errorMessage = {
        role: 'assistant' as const,
        content: 'Sorry, I had trouble processing your request. Please try again.'
      };
      
      setMessages(prev => [...prev, errorMessage]);
      
      // Mark as already spoken
      lastSpokenMessageRef.current = errorMessage.content;
      
      // Save error message
      if (effectiveFoundationId) {
        saveMessage(effectiveFoundationId, 'assistant', errorMessage.content);
      }
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Speak assistant messages
  useEffect(() => {
    // Skip if still loading or no messages
    if (isLoadingMessages || messages.length === 0) return;
    
    const lastMessage = messages[messages.length - 1];
    
    // Only speak if:
    // 1. It's an assistant message
    // 2. We haven't spoken this message before
    // 3. We're not loading messages
    if (lastMessage.role === 'assistant' && 
        lastMessage.content !== lastSpokenMessageRef.current) {
      
      console.log('Speaking new assistant message');
      lastSpokenMessageRef.current = lastMessage.content;
      
      // Add a small delay to ensure the UI has updated
      setTimeout(() => {
        speak(lastMessage.content);
      }, 100);
    }
  }, [messages, speak, isLoadingMessages]);
  
  // Handle suggestion click
  const handleSuggestionClick = (suggestion: string) => {
    setInputValue(suggestion);
    setTimeout(() => handleSubmit(), 100);
  };
  
  // Toggle speech recognition
  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      resetTranscript();
      startListening();
    }
  };
  
  // Clean up intervals on unmount
  useEffect(() => {
    return () => {
      if (processSaveQueueRef.current) {
        clearInterval(processSaveQueueRef.current);
        processSaveQueueRef.current = null;
      }
      stopSpeaking();
    };
  }, [stopSpeaking]);
  
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
          playbackSpeed={playbackSpeed}
          onPlaybackSpeedChange={changePlaybackSpeed}
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
      
      {/* API key error message display */}
      {apiKeyError && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-3">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">API Key Error - Voice Generation</h3>
              <div className="mt-1 text-sm text-red-700">
                <p>{apiKeyError.message}</p>
                <p className="mt-1">Provider: {apiKeyError.provider === 'elevenlabs' ? 'ElevenLabs' : 'OpenAI'}</p>
                <div className="mt-2 flex gap-2">
                  <button 
                    onClick={clearApiKeyError}
                    className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-800 rounded-md text-xs font-medium transition-colors"
                  >
                    Dismiss
                  </button>
                  <button 
                    onClick={() => {
                      const apiKey = prompt(`Enter your ${apiKeyError.provider === 'elevenlabs' ? 'ElevenLabs' : 'OpenAI'} API key:`);
                      if (apiKey) {
                        updateApiKey(apiKeyError.provider, apiKey)
                          .then(() => {
                            clearApiKeyError();
                            window.location.reload();
                          })
                          .catch(error => {
                            console.error('Error updating API key:', error);
                          });
                      }
                    }}
                    className="px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-800 rounded-md text-xs font-medium transition-colors"
                  >
                    Update API Key
                  </button>
                </div>
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
      
      {/* Suggestions display */}
      {showSuggestions && suggestions.length > 0 && (
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
      )}
      
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

export default FoundationChatInterfaceNew;