import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Foundation } from '@shared/schema';
import { Mic, Send, Pause, Volume2 } from 'lucide-react';
import useSpeechRecognition from '@/hooks/useSpeechRecognition';
import { useTTS } from '@/hooks/useTTS';
import { AudioPlayer } from '@/components/ui/audio-player';
import { ApiKeyModal } from '@/components/shared/ApiKeyModal';
import { updateApiKey } from '@/lib/settings';

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
  const [showSuggestions, setShowSuggestions] = useState(true);
  
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const { toast } = useToast();
  
  // Debug log for threadId state
  useEffect(() => {
    console.log(`FoundationChatInterface - threadId initialized/changed: ${threadId || 'undefined'}`);
  }, [threadId]);

  const [persistenceError, setPersistenceError] = useState<string | null>(null);
  // State for API key modal
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [apiKeyModalProvider, setApiKeyModalProvider] = useState<'elevenlabs' | 'openai'>('elevenlabs');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageContainerRef = useRef<HTMLDivElement>(null);
  const pendingSaveQueue = useRef<{role: 'user' | 'assistant', content: string, foundationId: number}[]>([]);
  const lastSpokenMessageRef = useRef<string | null>(null);
  
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
  const { 
    speak, 
    isPlaying, 
    currentAudioUrl, 
    stop, 
    playbackSpeed, 
    changePlaybackSpeed,
    apiKeyError,
    clearApiKeyError
  } = useTTS({
    defaultPlaybackSpeed: 1.0
  });
  
  // Handle API key errors
  useEffect(() => {
    if (apiKeyError) {
      console.error('TTS API key error:', apiKeyError);
      
      // Set provider for the modal directly from error object
      setApiKeyModalProvider(apiKeyError.provider);
      
      // Show the error toast
      toast({
        title: "Text-to-Speech Error",
        description: (
          <div className="flex flex-col space-y-2">
            <p>{apiKeyError.message}</p>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => setShowApiKeyModal(true)}
            >
              Update API Key
            </Button>
          </div>
        ),
        variant: "destructive",
        duration: 10000 // 10 seconds
      });
    }
  }, [apiKeyError, toast]);
  
  // Function to handle API key updates
  const handleApiKeyUpdate = async (apiKey: string): Promise<boolean> => {
    try {
      // Use the settings API to update the key
      const response = await fetch('/api/settings/api-key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          provider: apiKeyModalProvider,
          apiKey: apiKey
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to update API key: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        // Clear the API key error
        clearApiKeyError();
        
        // Show success toast
        toast({
          title: "API Key Updated",
          description: `${apiKeyModalProvider === 'elevenlabs' ? 'ElevenLabs' : 'OpenAI'} API key has been updated successfully.`,
          variant: "default"
        });
        
        // Close the modal
        setShowApiKeyModal(false);
        return true;
      } else {
        throw new Error(data.message || 'Failed to update API key');
      }
    } catch (error) {
      console.error('Error updating API key:', error);
      
      // Show error toast
      toast({
        title: "API Key Update Failed",
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive"
      });
      
      return false;
    }
  };
  

  
  // Get effective message handler (prefer sendMessage if provided)
  const messageHandler = sendMessage || onSendMessage;
  
  // Unified function to fetch suggestions from the AI assistant
  const fetchSuggestions = useCallback(async (userMessage: string, assistantReply: string) => {
    console.log(`Fetching suggestions for conversation: User: "${userMessage.substring(0, 30)}..." -> AI: "${assistantReply.substring(0, 30)}..."`);
    
    try {
      const response = await fetch('/api/ai/chat-suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userMessage: userMessage,
          assistantReply: assistantReply
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Error response from suggestions API: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.suggestions && Array.isArray(data.suggestions) && data.suggestions.length > 0) {
        console.log('Using AI-generated suggestions:', data.suggestions);
        setSuggestions(data.suggestions);
        setShowSuggestions(true);
        return data.suggestions;
      } else {
        console.warn('No valid suggestions returned from AI assistant');
        // Don't hide existing suggestions
        return [];
      }
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      // Don't hide existing suggestions
      return [];
    }
  }, []);
  
  // Load saved messages from the server
  const loadMessages = async (foundationId: number, isNewFoundation: boolean = false): Promise<boolean> => {
    try {
      console.log(`[FoundationChatInterface] Loading messages for foundation ID: ${foundationId}, isNewFoundation: ${isNewFoundation}`);
      setPersistenceError(null);
      setIsLoadingMessages(true);
      
      // Don't show a loading message for new foundations as they won't have any messages
      if (!isNewFoundation) {
        // Show loading message for existing foundations
        setMessages([{
          role: 'assistant',
          content: 'Loading your previous conversation...'
        }]);
        
        // Mark as already spoken
        lastSpokenMessageRef.current = 'Loading your previous conversation...';
      }
      
      const apiUrl = `/api/foundations/${foundationId}/messages`;
      console.log(`[FoundationChatInterface] Fetching from: ${apiUrl}`);
      
      // Add a delay to ensure server has time to process and return messages
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        console.error(`[FoundationChatInterface] API error loading messages: ${response.status} ${response.statusText}`);
        throw new Error(`Failed to load messages: ${response.status} ${response.statusText}`);
      }
      
      let data;
      try {
        data = await response.json();
        
        if (!Array.isArray(data)) {
          console.error(`[FoundationChatInterface] Expected array of messages but got:`, data);
          throw new Error('Invalid response format: Expected array of messages');
        }
        
        console.log(`[FoundationChatInterface] Loaded ${data.length} messages from server:`, 
          data.length > 0 ? `First: ${data[0]?.role}/${data[0]?.content?.substring(0, 30)}...` : 'No messages found');
        
        // Log the full array of messages for debugging
        console.log('Full messages array:', JSON.stringify(data));
      } catch (parseError) {
        console.error(`[FoundationChatInterface] Error parsing messages response:`, parseError);
        throw new Error(`Failed to parse messages: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
      }
      
      if (data.length > 0) {
        // Add a small delay so the loading message is visible (better UX)
        await new Promise(resolve => setTimeout(resolve, 300));
        
        try {
          // Validate and sanitize the data to ensure it has the expected format
          const validMessages = data
            .map((msg: any, index: number) => {
              // Check that message has required fields
              if (!msg) {
                console.warn(`[FoundationChatInterface] Message at index ${index} is null or undefined, skipping`);
                return null;
              }
              
              if (!msg.role || (msg.role !== 'user' && msg.role !== 'assistant')) {
                console.warn(`[FoundationChatInterface] Message at index ${index} has invalid role: ${msg.role}, defaulting to 'assistant'`);
                msg.role = 'assistant';
              }
              
              if (!msg.content) {
                console.warn(`[FoundationChatInterface] Message at index ${index} has empty content, providing default`);
                msg.content = msg.role === 'user' ? 'User message (content missing)' : 'Assistant response (content missing)';
              }
              
              return {
                role: msg.role as 'user' | 'assistant',
                content: String(msg.content) // Ensure content is a string
              };
            })
            .filter((msg): msg is Message => msg !== null); // Filter out nulls and ensure type safety
          
          console.log(`[FoundationChatInterface] Setting ${validMessages.length} formatted messages`);
          
          // Only update the messages state if we have valid messages
          if (validMessages.length > 0) {
            setMessages(validMessages);
            
            // Store the most recent assistant message to prevent duplicate TTS
            const messagesReversed = [...data].reverse();
            const lastAssistantMessage = messagesReversed.find(msg => msg.role === 'assistant');
            
            // Mark the last assistant message as already spoken
            if (lastAssistantMessage) {
              lastSpokenMessageRef.current = lastAssistantMessage.content;
              console.log(`[FoundationChatInterface] Marked last assistant message as already spoken to prevent duplicate audio`);
            }
            
            const lastUserMessage = messagesReversed.find(msg => msg.role === 'user');
            
            if (lastAssistantMessage) {
              // Use our unified function to fetch suggestions
              console.log('[FoundationChatInterface] Fetching suggestions for loaded messages...');
              fetchSuggestions(
                lastUserMessage?.content || 'Hello',
                lastAssistantMessage.content
              ).catch(error => {
                console.error('[FoundationChatInterface] Failed to fetch suggestions for loaded messages:', error);
              });
            }
            
            return true;
          } else {
            console.warn('[FoundationChatInterface] No valid messages after filtering');
            setMessages([]);
            return false;
          }
        } catch (formatError) {
          console.error('[FoundationChatInterface] Error formatting messages:', formatError);
          // If formatting fails, use the raw data directly with minimal formatting
          const backupMessages: Message[] = data
            .filter((msg: any) => msg && (typeof msg.content === 'string' || typeof msg.content === 'number'))
            .map((msg: any) => ({
              role: (msg.role === 'user' || msg.role === 'assistant') ? msg.role : 'assistant',
              content: String(msg.content)
            }));
          
          console.log(`[FoundationChatInterface] Using ${backupMessages.length} backup formatted messages`);
          
          if (backupMessages.length > 0) {
            setMessages(backupMessages);
            
            // Mark the last assistant message as already spoken to prevent duplicates
            const lastAssistantMessage = [...backupMessages].reverse().find(msg => msg.role === 'assistant');
            if (lastAssistantMessage) {
              lastSpokenMessageRef.current = lastAssistantMessage.content;
              console.log(`[FoundationChatInterface] Marked last backup assistant message as already spoken to prevent duplicate audio`);
            }
            
            return true;
          } else {
            setMessages([]);
            return false;
          }
        }
      } else {
        console.log('[FoundationChatInterface] No messages found, clearing loading message');
        // Clear the loading message if no messages were found
        setMessages([]);
        return false;
      }
    } catch (error) {
      console.error("[FoundationChatInterface] Error loading messages:", error);
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
    console.log(`[FoundationChatInterface] Saving ${role} message to foundation ${foundationId}, length: ${content.length} chars`);
    return saveMessageWithRetry(foundationId, role, content);
  };
  
  // Load initial messages based on props
  useEffect(() => {
    const messageHandler = sendMessage || onSendMessage;
    if (!messageHandler) {
      console.log('[FoundationChatInterface] No message handler available, skipping message loading');
      return;
    }
    
    if (foundation) {
      console.log(`[FoundationChatInterface] Foundation loaded with ID: ${foundation.id}, name: ${foundation.name}, threadId: ${foundation.threadId || 'undefined'}`);
      setIsLoadingMessages(true);
      
      // If we have a threadId, update it
      if (foundation.threadId) {
        console.log(`[FoundationChatInterface] Setting threadId from foundation to: ${foundation.threadId}`);
        setThreadId(foundation.threadId);
      }
      
      // Check if this is a new foundation (new foundations won't have a threadId)
      const isNewFoundation = !foundation.threadId;
      
      // Try to load existing messages for this foundation
      loadMessages(foundation.id, isNewFoundation).then(hasMessages => {
        console.log(`[FoundationChatInterface] loadMessages for foundation ${foundation.id} returned hasMessages: ${hasMessages}`);
        
        // If no existing messages but we have a threadId, something might be wrong
        // We should have messages if there's a threadId
        if (!hasMessages && foundation.threadId) {
          console.warn(`[FoundationChatInterface] Foundation ${foundation.id} has threadId ${foundation.threadId} but no messages, possible sync issue`);
          // We'll still show the welcome message but note this discrepancy
        }
        
        // If no existing messages, show the welcome message
        if (!hasMessages) {
          console.log(`[FoundationChatInterface] No messages found for foundation ${foundation.id}, displaying welcome message`);
          
          // Important: Clear the last spoken message ref to avoid duplicate audio issues
          lastSpokenMessageRef.current = null;
          
          // Set welcome message for foundation with stages explanation
          // IMPORTANT: This exact phrasing triggers the genre suggestions in the StoryFlow_ChatResponseSuggestions assistant
          const welcomeMessage = {
            role: 'assistant' as const,
            content: `Welcome to Foundation Builder the starting point for your story creation journey! In this interview, we'll build the foundation for a living story world that will evolve as you create characters and narratives within it. We'll start by exploring genre elements to establish the tone and themes that will bring your world to life. What type of genre would you like to explore for your story world?`
          };
          
          console.log(`[FoundationChatInterface] Setting welcome message for new foundation ${foundation.id}`);
          setMessages([welcomeMessage]);
          
          // Save welcome message to the database for persistence
          if (foundation.id) {
            console.log(`[FoundationChatInterface] Saving welcome message to database for foundation ${foundation.id}`);
            // Mark as already spoken to prevent duplicates
            lastSpokenMessageRef.current = welcomeMessage.content;
            saveMessage(foundation.id, 'assistant', welcomeMessage.content)
              .then(success => {
                console.log(`[FoundationChatInterface] Welcome message saved for foundation ${foundation.id}: ${success ? 'success' : 'failed'}`);
              });
          }
          
          // Get initial foundation suggestions using the unified function - use empty string for better trigger detection
          console.log('[FoundationChatInterface] Fetching suggestions for the welcome message with genre selection trigger...');
          fetchSuggestions(
            '', // Initial message - empty for proper trigger detection
            welcomeMessage.content
          ).catch(error => {
            console.error('[FoundationChatInterface] Failed to fetch suggestions for welcome message:', error);
          });
        }
      })
      .catch(error => {
        console.error(`[FoundationChatInterface] Error during initial message loading for foundation ${foundation.id}:`, error);
        // Always show something even if message loading fails
        const errorMessage = {
          role: 'assistant' as const,
          content: 'Welcome back to this foundation. (There was an issue loading previous messages.)'
        };
        setMessages([errorMessage]);
        
        // Mark this as already spoken to prevent duplicate audio
        lastSpokenMessageRef.current = errorMessage.content;
        
        setIsLoadingMessages(false);
      });
    } else if (title && initialMessages && initialMessages.length > 0) {
      console.log(`[FoundationChatInterface] Using ${initialMessages.length} initialMessages from props`);
      
      // If we have initial messages, use those instead of a welcome message
      // Convert the initialMessages format to our internal format
      const convertedMessages = initialMessages.map(msg => ({
        role: msg.sender === 'ai' ? 'assistant' as const : 'user' as const,
        content: msg.content
      }));
      
      console.log(`[FoundationChatInterface] Setting ${convertedMessages.length} converted messages from initialMessages`);
      setMessages(convertedMessages);
      
      // Mark the last assistant message as already spoken to prevent duplicate audio
      const lastAssistantMessage = [...convertedMessages].reverse().find(msg => msg.role === 'assistant');
      if (lastAssistantMessage) {
        lastSpokenMessageRef.current = lastAssistantMessage.content;
        console.log(`[FoundationChatInterface] Marked last initialMessages assistant message as already spoken to prevent duplicate audio`);
      }
      
      // If initialMessages exist but we still want suggestions, use the last message
      const lastMessage = initialMessages[initialMessages.length - 1];
      if (lastMessage.sender === 'ai') {
        // Use our unified function to fetch suggestions
        console.log('[FoundationChatInterface] Fetching suggestions for initialMessages...');
        
        fetchSuggestions(
          initialMessages.length > 1 
            ? initialMessages[initialMessages.length - 2].content 
            : 'Hello',
          lastMessage.content
        ).catch(error => {
          console.error('[FoundationChatInterface] Failed to fetch suggestions for initialMessages:', error);
        });
      }
    } else {
      console.log('[FoundationChatInterface] No foundation or initialMessages provided');
    }
  }, [foundation, initialMessages, title, fetchSuggestions, sendMessage, onSendMessage]);
  
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
      
      // If we're updating the threadId from a foundation with a non-null threadId,
      // log this as we may need to load messages
      if (foundation.threadId) {
        console.log(`FoundationChatInterface - Foundation has existing threadId: ${foundation.threadId}`);
      }
    }
  }, [foundation?.threadId, threadId]);
  
  // Auto-scroll to the latest message
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);
  
  // Track if we should play audio for a message
  const [shouldPlayAudio, setShouldPlayAudio] = useState(false);
  const isInitialLoadRef = useRef(true);
  
  // Only enable TTS after component has fully loaded
  useEffect(() => {
    // Wait for a short delay after loading completes
    if (!isLoadingMessages && isInitialLoadRef.current) {
      isInitialLoadRef.current = false;
      // Set a delay before enabling audio to avoid playing initial load messages
      setTimeout(() => {
        console.log('Audio playback enabled after initial load');
        setShouldPlayAudio(true);
      }, 1000);
    }
  }, [isLoadingMessages]);
  
  // TTS for assistant messages - only triggered by new messages after initial load
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    
    // Only speak if:
    // 1. Audio should be played (not initial load)
    // 2. It's an assistant message
    // 3. We haven't spoken this exact message before
    if (shouldPlayAudio && 
        lastMessage && 
        lastMessage.role === 'assistant' && 
        lastMessage.content !== lastSpokenMessageRef.current) {
      
      console.log('Speaking new assistant message');
      lastSpokenMessageRef.current = lastMessage.content;
      speak(lastMessage.content);
    }
  }, [messages, speak, shouldPlayAudio]);
  
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
    
    // Hide suggestions while processing
    setShowSuggestions(false);
    
    try {
      // Send message to AI using the appropriate handler
      const response = await messageHandler(userMessage.content, threadId);
      
      // Add AI response to chat
      const assistantMessage = { 
        role: 'assistant' as const, 
        content: response.content 
      };
      
      // Update the messages array with the new assistant message
      setMessages(prev => [...prev, assistantMessage]);
      
      // Mark this message as already spoken to prevent duplicates
      lastSpokenMessageRef.current = assistantMessage.content;
      
      // Save assistant message to database if we have a foundation ID
      if (foundation?.id) {
        saveMessage(foundation.id, 'assistant', assistantMessage.content);
      }
      
      // Save thread ID if provided
      if (response.threadId) {
        console.log(`FoundationChatInterface - Updating threadId: ${threadId || 'undefined'} -> ${response.threadId}`);
        setThreadId(response.threadId);
      }
      
      // Get intelligent suggestions using our unified function
      console.log('Fetching suggestions after sending message...');
      fetchSuggestions(
        userMessage.content,
        response.content
      ).catch(error => {
        console.error('Failed to fetch suggestions after sending message:', error);
      });
    } catch (error) {
      console.error('Error processing message:', error);
      // Add error message
      const errorMessage = { 
        role: 'assistant' as const, 
        content: 'Sorry, I had trouble processing your request. Please try again.' 
      };
      setMessages(prev => [...prev, errorMessage]);
      
      // Mark this error message as already spoken to prevent duplicates
      lastSpokenMessageRef.current = errorMessage.content;
      
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
                  <a 
                    href={apiKeyError.provider === 'elevenlabs' 
                      ? "https://elevenlabs.io/app/account" 
                      : "https://platform.openai.com/account/api-keys"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-800 rounded-md text-xs font-medium transition-colors"
                  >
                    Get {apiKeyError.provider === 'elevenlabs' ? 'ElevenLabs' : 'OpenAI'} API Key
                  </a>
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
      
      {/* Normal suggestions display with showSuggestions check restored */}
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

export default FoundationChatInterface;