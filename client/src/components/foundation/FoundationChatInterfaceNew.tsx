import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Foundation } from '@shared/schema';
import { Mic, Send, Pause, Volume2, VolumeX, Square } from 'lucide-react';
import useSpeechRecognition from '@/hooks/useSpeechRecognition';
import { useTTS } from '@/hooks/useTTS';
import { AudioPlayer } from '@/components/ui/audio-player';
import { generateSpeechCached } from '@/lib/tts';
import { useSettings } from '@/contexts/SettingsContext';

// Define message interface
interface Message {
  role: 'user' | 'assistant';
  content: string;
  hasBeenPlayed?: boolean;  // Track if message has been played before
  processingAudio?: boolean; // Track if we're currently generating audio for this message
}

// Define component props
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

// Define the ref interface
export interface FoundationChatInterfaceRef {
  setCurrentStage: (stage: string) => void;
}

// Extend the Window interface to allow storing audio elements
declare global {
  interface Window {
    [key: string]: any;
    pendingGenreTransition?: {
      mainGenre: string;
      genreSummary: string;
      suggestedNames: string[];
    };
  }
}

// Create the component with forwardRef
const FoundationChatInterfaceNew = forwardRef<FoundationChatInterfaceRef, FoundationChatInterfaceProps>((props, ref) => {
  const { foundation, title, description, foundationId, messageHandler, initialThreadId } = props;
  const { toast } = useToast();
  
  // State for the chat
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [threadId, setThreadId] = useState<string | undefined>(initialThreadId ?? foundation?.threadId ?? undefined);
  const [persistenceError, setPersistenceError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [currentStage, setCurrentStage] = useState<string>(foundation?.currentStage ?? 'genre');  // Use foundation stage or default to genre
  const [currentPlayingMessageId, setCurrentPlayingMessageId] = useState<number | null>(null);
  
  // Refs for managing the chat
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageContainerRef = useRef<HTMLDivElement>(null);
  const lastSpokenMessageRef = useRef<string>('');
  const pendingSaveQueue = useRef<Array<{
    foundationId: number;
    role: 'user' | 'assistant';
    content: string;
  }>>([]);
  const processSaveQueueRef = useRef<NodeJS.Timeout | null>(null);
  const initialLoadComplete = useRef<boolean>(false);
  const requestIdRef = useRef<string>('');
  
  // Expose methods to parent via ref
  useImperativeHandle(ref, () => ({
    setCurrentStage: (stage: string) => {
      console.log(`Setting current stage to: ${stage}`);
      setCurrentStage(stage);
    }
  }));
  
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
  
  // Auto-scroll to the bottom when messages or suggestions change
  useEffect(() => {
    if (messagesEndRef.current) {
      // Use a small timeout to ensure DOM has fully updated with suggestions
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [messages, isProcessing, suggestions]);
  
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
          content: 'Welcome to Foundation Builder the starting point for your story creation journey! In this interview, we\'ll build the foundation for a living story world that will evolve as you create characters and narratives within it. We\'ll start by exploring genre elements to establish the tone and themes that will bring your world to life. What type of genre would you like to explore for your story world?'
        };
        
        setMessages([welcomeMessage]);
        lastSpokenMessageRef.current = welcomeMessage.content;
        
        // Save welcome message if foundation ID is available
        if (id) {
          saveMessage(id, 'assistant', welcomeMessage.content);
          
          // Get initial suggestions for the welcome message
          console.log('Fetching initial suggestions for welcome message');
          fetchSuggestions('', welcomeMessage.content);
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
        
        // Update state without re-saving the messages to the database
        // This is important to prevent duplicating messages when loading an existing foundation
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
      // First check if the user is responding to name suggestions
      if (window.pendingGenreTransition && isRespondingToNameSuggestions(userMessage.content)) {
        // Handle name selection first
        console.log('Detected response to name suggestions', userMessage.content);
        const processed = await processNameSelection(userMessage.content);
        if (processed) {
          console.log('Name selection processed successfully');
          return; // Skip the regular message handling flow
        }
      }
      
      // Regular message handling flow
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
      
      // Check if this is a genre summary that should trigger a transition
      if (isGenreSummaryComplete(assistantMessage.content)) {
        console.log('Detected completed genre summary');
        await processGenreSummary(assistantMessage.content);
      } else {
        // Only fetch suggestions if not transitioning
        fetchSuggestions(userMessage.content, assistantMessage.content);
      }
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
  // Get settings from context
  const { autoPlayMessages } = useSettings();
  
  useEffect(() => {
    // Skip if still loading, no messages, or auto-play is disabled
    if (isLoadingMessages || messages.length === 0 || !autoPlayMessages) return;
    
    // Get the last message
    const lastMessage = messages[messages.length - 1];
    
    // Only speak if:
    // 1. It's an assistant message
    // 2. We haven't spoken this message before (using a reference to avoid re-renders)
    // 3. We're not loading messages
    if (lastMessage.role === 'assistant' && 
        lastMessage.content !== lastSpokenMessageRef.current &&
        !isProcessing) {
      
      console.log('Speaking new assistant message');
      console.log('Auto-play is enabled:', autoPlayMessages);
      console.log('Last spoken message:', lastSpokenMessageRef.current ? lastSpokenMessageRef.current.substring(0, 50) : 'none');
      console.log('Current message:', lastMessage.content.substring(0, 50));
      
      // Update our reference immediately to prevent duplicate speech attempts
      lastSpokenMessageRef.current = lastMessage.content;
      
      // Add a small delay to ensure the UI has updated
      setTimeout(async () => {
        console.log('Starting independent TTS for new assistant message:', lastMessage.content.substring(0, 100));
        
        // Stop any currently playing audio first
        stopSpeaking();
        
        try {
          // Use a longer timeout to ensure everything is completely stopped
          await new Promise(resolve => setTimeout(resolve, 300));
          
          // Get the current voice settings but process independently
          const url = await generateSpeechCached(
            lastMessage.content,
            selectedVoice?.id || 'nova',
            selectedVoice?.provider || 'openai'
          );
          
          // Create a completely independent audio element not connected to shared state
          const autoplayAudio = new Audio();
          
          // Configure audio properties
          autoplayAudio.volume = 1.0;
          autoplayAudio.playbackRate = playbackSpeed;
          autoplayAudio.preload = 'auto';
          
          // Set up logging events
          autoplayAudio.onplay = () => console.log('Auto-play: Started');
          autoplayAudio.onended = () => console.log('Auto-play: Ended');
          autoplayAudio.onerror = (e) => console.error('Auto-play: Error', e);
          
          // Set source and play
          autoplayAudio.src = url;
          await autoplayAudio.play();
          console.log('Auto-play started successfully');
        } catch (error) {
          console.error('Error in auto-play speech generation:', error);
          
          // Fallback to the standard speak method if the independent approach fails
          try {
            await speak(lastMessage.content);
            console.log('Fallback speech generation completed successfully');
          } catch (fallbackError) {
            console.error('Fallback speech generation also failed:', fallbackError);
          }
        }
      }, 300); // Delay to ensure UI is updated
    }
  }, [messages, speak, stopSpeaking, isLoadingMessages, isProcessing, selectedVoice, playbackSpeed, autoPlayMessages]);
  
  // Process genre summary for transition to environment stage
  const processGenreSummary = async (genreSummary: string) => {
    try {
      console.log('Processing genre summary for stage transition');
      const effectiveFoundationId = foundationId || foundation?.id;
      
      if (!effectiveFoundationId) {
        console.error('No foundation ID available for genre transition');
        return;
      }
      
      // First try to extract JSON content from the response
      let mainGenre = 'Unknown';
      let structuredData = null;
      
      // Try to parse any JSON block in the content
      try {
        const jsonMatch = genreSummary.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const jsonString = jsonMatch[0];
          structuredData = JSON.parse(jsonString);
          console.log('Found structured JSON data in genre summary:', structuredData);
          
          // If we have valid JSON with mainGenre or main_genre, use it directly
          if (structuredData && (structuredData.mainGenre || structuredData.main_genre)) {
            mainGenre = structuredData.mainGenre || structuredData.main_genre;
            console.log('Using main genre from structured data:', mainGenre);
          }
        }
      } catch (jsonError) {
        console.log('No valid JSON found in response, falling back to regex extraction');
      }
      
      // If JSON parsing failed, fallback to regex extraction
      if (mainGenre === 'Unknown') {
        console.log('Extracting main genre using regex patterns');
        const genreMatch = genreSummary.match(/Genre:\s*([^\n\.]+)/i);
        if (genreMatch && genreMatch[1]) {
          mainGenre = genreMatch[1].trim();
        }
      }
      
      console.log('Final main genre for transition:', mainGenre);
      
      // Generate name suggestions based on the genre summary
      const nameResponse = await fetch(`/api/foundations/${effectiveFoundationId}/name-suggestions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          genreSummary,
          mainGenre
        })
      });
      
      if (!nameResponse.ok) {
        console.error('Failed to generate name suggestions:', nameResponse.status);
        return;
      }
      
      const nameData = await nameResponse.json();
      const suggestedNames = nameData.suggestedNames || [];
      
      console.log('Generated name suggestions:', suggestedNames);
      
      if (suggestedNames.length === 0) {
        // If no name suggestions were generated, skip to environment stage directly
        console.log('No name suggestions available - transitioning directly');
        triggerEnvironmentStage(mainGenre, genreSummary, []);
        return;
      }
      
      // Add message with name suggestions
      const nameMessage = {
        role: 'assistant' as const,
        content: `Based on the ${mainGenre} genre, I've generated some possible names for your story foundation. Would you like to rename it to any of these?\n\n${suggestedNames.map((name: string, index: number) => `${index + 1}. ${name}`).join('\n')}\n\nOr you can keep the current name "${foundation?.name}". What would you prefer?`
      };
      
      setMessages(prev => [...prev, nameMessage]);
      lastSpokenMessageRef.current = nameMessage.content;
      
      // Save assistant message
      if (effectiveFoundationId) {
        saveMessage(effectiveFoundationId, 'assistant', nameMessage.content);
      }
      
      // Store the genre info for later use
      window.pendingGenreTransition = {
        mainGenre,
        genreSummary,
        suggestedNames
      };
    } catch (error) {
      console.error('Error processing genre summary:', error);
    }
  };
  
  // Process user response to name suggestions and transition to environment stage
  const processNameSelection = async (userInput: string) => {
    try {
      if (!window.pendingGenreTransition) {
        console.error('No pending genre transition data available');
        return false;
      }
      
      const { mainGenre, genreSummary, suggestedNames } = window.pendingGenreTransition;
      const effectiveFoundationId = foundationId || foundation?.id;
      
      if (!effectiveFoundationId) {
        console.error('No foundation ID available for name selection');
        return false;
      }
      
      // Try to determine if the user selected a name
      let selectedName = '';
      
      // Check for numeric selection (e.g., "1", "number 2")
      const numberMatch = userInput.match(/(\d+)|number\s+(\d+)|option\s+(\d+)/i);
      if (numberMatch) {
        const selection = parseInt(numberMatch[1] || numberMatch[2] || numberMatch[3], 10);
        if (selection >= 1 && selection <= suggestedNames.length) {
          selectedName = suggestedNames[selection - 1];
        }
      } 
      // Check for name mention (e.g., "I like Tales of Magic")
      else {
        for (const name of suggestedNames) {
          if (userInput.toLowerCase().includes(name.toLowerCase())) {
            selectedName = name;
            break;
          }
        }
      }
      
      // If a name was selected, update the foundation name
      if (selectedName) {
        console.log('User selected name:', selectedName);
        
        try {
          const renameResponse = await fetch(`/api/foundations/${effectiveFoundationId}/rename`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: selectedName })
          });
          
          if (renameResponse.ok) {
            console.log('Foundation renamed successfully');
            
            // Add confirmation message
            const confirmMessage = {
              role: 'assistant' as const,
              content: `Great choice! I've renamed your foundation to "${selectedName}".`
            };
            
            setMessages(prev => [...prev, confirmMessage]);
            lastSpokenMessageRef.current = confirmMessage.content;
            
            // Save assistant message
            if (effectiveFoundationId) {
              saveMessage(effectiveFoundationId, 'assistant', confirmMessage.content);
            }
          } else {
            console.error('Failed to rename foundation:', renameResponse.status);
          }
        } catch (error) {
          console.error('Error renaming foundation:', error);
        }
      } else {
        console.log('User declined to rename foundation or selection unclear');
      }
      
      // Trigger transition to environment stage
      triggerEnvironmentStage(mainGenre, genreSummary, suggestedNames);
      
      // Clear pending transition data
      delete window.pendingGenreTransition;
      
      return true;
    } catch (error) {
      console.error('Error processing name selection:', error);
      return false;
    }
  };
  
  // Trigger the transition to environment stage
  const triggerEnvironmentStage = async (mainGenre: string, genreSummary: string, suggestedNames: string[]) => {
    try {
      console.log('Transitioning to environment stage');
      const effectiveFoundationId = foundationId || foundation?.id;
      
      if (!effectiveFoundationId) {
        console.error('No foundation ID available for environment stage transition');
        return;
      }
      
      // Try to extract structured JSON data from the genre summary if available
      let structuredGenreData = null;
      try {
        const jsonMatch = genreSummary.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const jsonString = jsonMatch[0];
          structuredGenreData = JSON.parse(jsonString);
          console.log('Found structured JSON data for genre-to-environment transition:', structuredGenreData);
        }
      } catch (jsonError) {
        console.log('No valid JSON found in genre summary for transition', jsonError);
      }
      
      // Call the API to perform the genre-to-environment transition
      const transitionResponse = await fetch(`/api/foundations/${effectiveFoundationId}/genre-to-environment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          genreSummary,
          mainGenre,
          suggestedNames,
          genreDetails: structuredGenreData || {
            // If no structured data, provide basic information
            mainGenre,
            description: genreSummary
          }
        })
      });
      
      if (!transitionResponse.ok) {
        console.error('Failed to transition to environment stage:', transitionResponse.status);
        return;
      }
      
      const transitionData = await transitionResponse.json();
      console.log('Transition data:', transitionData);
      
      // Add the environment introduction message
      const envIntroMessage = {
        role: 'assistant' as const,
        content: transitionData.environmentIntroMessage || 'You are now ready to transition to the Environments Stage of the Foundation creation process.'
      };
      
      setMessages(prev => [...prev, envIntroMessage]);
      lastSpokenMessageRef.current = envIntroMessage.content;
      
      // Save assistant message
      if (effectiveFoundationId) {
        saveMessage(effectiveFoundationId, 'assistant', envIntroMessage.content);
      }
      
      // Fetch suggestions for the environment stage introduction
      fetchSuggestions('', envIntroMessage.content);
      
      // Update the current stage
      setCurrentStage('environment');
    } catch (error) {
      console.error('Error transitioning to environment stage:', error);
    }
  };
  
  // Check if a message is a genre summary that should trigger transition
  const isGenreSummaryComplete = (content: string): boolean => {
    // First, check for structured JSON data which is the most reliable indicator
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const jsonString = jsonMatch[0];
        const parsedData = JSON.parse(jsonString);
        
        // If we have valid JSON with mainGenre or main_genre field, consider it a complete genre summary
        if (parsedData && (parsedData.mainGenre || parsedData.main_genre)) {
          const genreName = parsedData.mainGenre || parsedData.main_genre;
          console.log(`Found structured JSON with genre field (${genreName}) - triggering transition`);
          return currentStage === 'genre';
        }
      }
    } catch (error) {
      console.log('No valid JSON found, using text-based detection');
    }
    
    // Fallback to text-based heuristics if JSON not found
    const hasGenre = content.includes('Genre:') || content.includes('Main Genre:');
    const hasDescription = content.length > 500; // Assuming a good summary is reasonably detailed
    
    // Look for specific transition indicators in the message
    const transitionIndicators = [
      'genre summary',
      'genre profile is complete',
      'genre foundation is complete',
      'foundation genre',
      'ready to move to the next stage',
      'ready to move to environments',
      'ready for the environment stage'
    ];
    
    const hasTransitionIndicator = transitionIndicators.some(indicator => 
      content.toLowerCase().includes(indicator.toLowerCase())
    );
    
    return currentStage === 'genre' && hasGenre && hasDescription && hasTransitionIndicator;
  };
  
  // Check if a message is responding to name suggestions
  const isRespondingToNameSuggestions = (userContent: string): boolean => {
    if (!window.pendingGenreTransition) return false;
    
    const { suggestedNames } = window.pendingGenreTransition;
    
    // Check for common response patterns to name suggestions
    const selectionIndicators = [
      /I (like|choose|prefer|want|pick) (option|number|choice)?\s*\d+/i,
      /option\s*\d+/i,
      /number\s*\d+/i,
      /^\d+$/,
      /the first one/i,
      /the second one/i,
      /the third one/i,
      /the \w+ option/i,
      /use that name/i,
      /rename (it|the foundation)/i,
      /sounds good/i,
      /(keep|current) name/i,
      /don't rename/i,
      /don't change/i,
      /stay with/i
    ];
    
    const isSelectionResponse = selectionIndicators.some(pattern => 
      pattern.test(userContent)
    );
    
    const namesMentioned = suggestedNames.some((name: string) => 
      userContent.toLowerCase().includes(name.toLowerCase())
    );
    
    return isSelectionResponse || namesMentioned;
  };
  
  // Handle suggestion click
  const handleSuggestionClick = (suggestion: string) => {
    setInputValue(suggestion);
    setTimeout(() => handleSubmit(), 100);
  };
  
  // Effect to update input when transcript changes
  useEffect(() => {
    if (transcript) {
      setInputValue(transcript);
    }
  }, [transcript]);
  
  // Toggle speech recognition
  const toggleListening = () => {
    if (isListening) {
      stopListening();
      // Keep the final transcript in the input field
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
  
  // Helper function to get assistant name based on stage
  const getAssistantName = (stage: string) => {
    switch (stage.toLowerCase()) {
      case 'genre':
        return 'Genre Creator';
      case 'environment':
        return 'Environment Builder';
      case 'world':
        return 'World Builder';
      case 'character':
        return 'Character Creator';
      default:
        return 'Foundation Assistant';
    }
  };

  return (
    <div className="flex flex-col h-[70vh]">
      {/* Stage indicator */}
      <div className="flex justify-between items-center mb-2 px-1">
        <span className="text-sm font-medium text-neutral-500">Foundation Builder</span>
        <div className="flex items-center">
          <span className="text-xs px-2 py-1 bg-primary-100 text-primary-800 rounded-full capitalize">
            {currentStage} Stage • {getAssistantName(currentStage)}
          </span>
        </div>
      </div>
      <div 
        ref={messageContainerRef}
        className="flex-1 overflow-y-auto mb-4 p-4 bg-neutral-50 rounded-lg border"
      >
        {/* Messages */}
        {messages.map((message, index) => (
          <div key={index} className={`mb-4 ${message.role === 'assistant' ? 'pr-8' : 'pl-8'}`}>
            <div 
              className={`p-3 rounded-lg ${
                message.role === 'assistant' 
                  ? 'bg-primary-50 text-primary-900 border border-primary-200' 
                  : 'bg-neutral-100 text-neutral-900 border border-neutral-200 ml-auto'
              }`}
            >
              {message.content}
              {message.role === 'assistant' && (
                <div className="mt-2 flex justify-end">
                  <button
                    onClick={async () => {
                      const index = messages.indexOf(message);
                      const audioRef = window[`audio_${index}`] as HTMLAudioElement;
                      
                      // If already playing this message, stop it
                      if (currentPlayingMessageId === index && audioRef) {
                        audioRef.pause();
                        audioRef.currentTime = 0;
                        setCurrentPlayingMessageId(null);
                        return;
                      }
                      
                      // First, completely stop any current audio playback
                      if (currentPlayingMessageId !== null) {
                        const currentAudio = window[`audio_${currentPlayingMessageId}`] as HTMLAudioElement;
                        if (currentAudio) {
                          currentAudio.pause();
                          currentAudio.currentTime = 0;
                        }
                        stopSpeaking();
                      }
                      
                      try {
                        // Show loading state
                        setCurrentPlayingMessageId(index);
                        
                        // If message has been played before, we should have the audio cached already
                        let isFirstPlay = !message.hasBeenPlayed;
                        
                        // Add loading indicator for first play
                        if (isFirstPlay) {
                          // Mark button as processing
                          setMessages(prev => 
                            prev.map((m, i) => 
                              i === index ? { 
                                ...m, 
                                processingAudio: true 
                              } : m
                            )
                          );
                        }
                        
                        // Get the current voice settings but process independently
                        const url = await generateSpeechCached(
                          message.content,
                          selectedVoice?.id || 'nova',
                          selectedVoice?.provider || 'openai'
                        );
                        
                        // Create a completely independent audio element not connected to any shared state
                        const independentAudio = new Audio();
                        
                        // Store reference in window for stop functionality
                        window[`audio_${index}`] = independentAudio;
                        
                        // Configure audio properties
                        independentAudio.volume = 1.0;
                        independentAudio.playbackRate = playbackSpeed;
                        independentAudio.preload = 'auto';
                        
                        // Set up logging events
                        independentAudio.onloadstart = () => console.log('Message playback: Load started');
                        independentAudio.oncanplay = () => {
                          console.log('Message playback: Can play');
                          
                          // Remove processing state
                          if (isFirstPlay) {
                            setMessages(prev => 
                              prev.map((m, i) => 
                                i === index ? { 
                                  ...m, 
                                  processingAudio: false 
                                } : m
                              )
                            );
                          }
                        };
                        independentAudio.onplay = () => console.log('Message playback: Started');
                        independentAudio.onended = () => {
                          console.log('Message playback: Ended');
                          setCurrentPlayingMessageId(null);
                          
                          // Mark this message as having been played
                          if (!message.hasBeenPlayed) {
                            setMessages(prev => 
                              prev.map((m, i) => 
                                i === index ? { ...m, hasBeenPlayed: true } : m
                              )
                            );
                          }
                        };
                        independentAudio.onerror = (e) => {
                          console.error('Message playback: Error', e);
                          setCurrentPlayingMessageId(null);
                          
                          // Remove processing state
                          if (isFirstPlay) {
                            setMessages(prev => 
                              prev.map((m, i) => 
                                i === index ? { 
                                  ...m, 
                                  processingAudio: false 
                                } : m
                              )
                            );
                          }
                        };
                        
                        // Assign the source last to avoid race conditions
                        independentAudio.src = url;
                        await independentAudio.play();
                      } catch (error) {
                        console.error('Error playing message audio:', error);
                        setCurrentPlayingMessageId(null);
                        
                        // Remove processing state
                        setMessages(prev => 
                          prev.map((m, i) => 
                            i === index ? { 
                              ...m, 
                              processingAudio: false 
                            } : m
                          )
                        );
                      }
                    }}
                    className={`text-xs flex items-center gap-1.5 px-2 py-1 rounded transition-colors
                      ${currentPlayingMessageId === messages.indexOf(message)
                        ? message.processingAudio
                          ? 'bg-amber-100 hover:bg-amber-200 text-amber-700' 
                          : 'bg-red-100 hover:bg-red-200 text-red-700'
                        : message.hasBeenPlayed 
                          ? 'bg-purple-100 hover:bg-purple-200 text-purple-700'
                          : 'bg-primary-100 hover:bg-primary-200 text-primary-700'
                      }`}
                    disabled={message.processingAudio}
                  >
                    {currentPlayingMessageId === messages.indexOf(message) ? (
                      message.processingAudio ? (
                        <>
                          <div className="animate-spin h-3 w-3 border-2 border-amber-700 border-t-transparent rounded-full mr-1"></div>
                          Generating audio...
                        </>
                      ) : (
                        <>
                          <Square size={14} className="animate-pulse" />
                          Stop playback
                        </>
                      )
                    ) : (
                      <>
                        <Volume2 size={14} />
                        {message.hasBeenPlayed ? 'Re-play message' : 'Play message'}
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
        
        {/* Loading indicator */}
        {isProcessing && (
          <div className="mb-4 pr-8">
            <div className="p-4 rounded-lg bg-primary-50 text-primary-900 border border-primary-200">
              <div className="flex flex-col">
                <div className="flex items-center space-x-3 mb-2">
                  <div className="flex items-center space-x-1">
                    <div className="animate-pulse h-2 w-2 bg-primary-500 rounded-full"></div>
                    <div className="animate-pulse h-2 w-2 bg-primary-500 rounded-full" style={{ animationDelay: '0.2s' }}></div>
                    <div className="animate-pulse h-2 w-2 bg-primary-500 rounded-full" style={{ animationDelay: '0.4s' }}></div>
                  </div>
                  <div className="flex items-center">
                    <span className="text-sm font-medium">Thinking</span>
                    <span className="thinking-dot">.</span>
                    <span className="thinking-dot">.</span>
                    <span className="thinking-dot">.</span>
                  </div>
                </div>
                <div className="w-full bg-primary-100 rounded-full h-2.5">
                  <div className="bg-primary-600 h-2.5 rounded-full animate-progress"></div>
                </div>
                <p className="text-xs mt-2 text-primary-700">Generating a thoughtful response for you</p>
              </div>
            </div>
          </div>
        )}
        
        {/* Error message */}
        {persistenceError && (
          <div className="mb-4 mx-auto max-w-md">
            <div className="p-2 rounded-lg bg-red-50 text-red-800 border border-red-200 text-xs">
              {persistenceError}
            </div>
          </div>
        )}
        
        {/* API key error */}
        {apiKeyError && (
          <div className="mb-4 mx-auto max-w-md">
            <div className="p-3 rounded-lg bg-yellow-50 text-yellow-800 border border-yellow-200">
              <h4 className="font-medium">Text-to-Speech API Key Error</h4>
              <p className="text-sm mt-1">{apiKeyError.message}</p>
              <div className="mt-2 flex gap-2">
                <button 
                  onClick={clearApiKeyError}
                  className="text-xs px-2 py-1 bg-yellow-100 hover:bg-yellow-200 rounded"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Bottom marker for auto-scroll */}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Input area */}
      <div>
        {/* Message suggestions */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => handleSuggestionClick(suggestion)}
                className="text-xs px-3 py-1.5 bg-primary-50 hover:bg-primary-100 text-primary-700 rounded-full border border-primary-200"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}
        
        {/* Audio player */}
        <div className="mb-4">
          {currentAudioUrl ? (
            <AudioPlayer 
              audioUrl={currentAudioUrl} 
              autoPlay={true}
              onPlayStateChange={(playing) => {
                if (!playing) stopSpeaking();
              }}
              playbackSpeed={playbackSpeed}
              onPlaybackSpeedChange={changePlaybackSpeed}
            />
          ) : null}
        </div>
        
        {/* Input form */}
        <form onSubmit={handleSubmit} className="flex items-start space-x-2">
          <div className="relative flex-1">
            <Textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Type your message..."
              className="min-h-[80px] resize-none pr-12"
              disabled={isProcessing || !messageHandler}
            />
            {browserSupportsSpeechRecognition && (
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={toggleListening}
                className="absolute bottom-2 right-2"
                disabled={isProcessing || !messageHandler}
              >
                {isListening ? (
                  <Pause className="h-4 w-4 text-red-500" />
                ) : (
                  <Mic className={`h-4 w-4 ${isListening ? 'text-red-500' : ''}`} />
                )}
              </Button>
            )}
          </div>
          <Button 
            type="submit" 
            disabled={!inputValue.trim() || isProcessing || !messageHandler}
            className="h-10 w-10 p-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
});

// Add display name for debugging purposes
FoundationChatInterfaceNew.displayName = 'FoundationChatInterfaceNew';

export default FoundationChatInterfaceNew;