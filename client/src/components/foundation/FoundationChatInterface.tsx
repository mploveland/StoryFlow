import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Send, RefreshCw, Volume2, VolumeX, Mic, MicOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { useTTS } from '@/hooks/useTTS';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { AudioPlayer } from '@/components/ui/audio-player';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  suggestions?: string[];
}

export interface ChatInterfaceProps {
  title: string;
  description?: string;
  foundationId: number;
  threadId?: string;
  onSendMessage: (message: string, threadId?: string) => Promise<{
    content: string;
    suggestions?: string[];
    threadId?: string;
  }>;
  initialMessages?: Message[];
  onComplete?: (threadId: string, summary: any) => void;
}

const FoundationChatInterface: React.FC<ChatInterfaceProps> = ({
  title,
  description,
  foundationId,
  threadId: initialThreadId,
  onSendMessage,
  initialMessages = [],
  onComplete
}) => {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [threadId, setThreadId] = useState<string | undefined>(initialThreadId);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  
  // Voice features
  const { 
    speak: speakMessage, 
    isPlaying: isSpeaking, 
    currentAudioUrl
  } = useTTS();
  
  const { 
    isListening, 
    transcript: finalTranscript,
    start: startListening, 
    stop: stopListening
  } = useSpeechRecognition();
  
  const toggleVoiceRecognition = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };
  
  // Automatically scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages]);
  
  // Handle voice recognition results
  useEffect(() => {
    if (finalTranscript) {
      const cleanText = finalTranscript.trim();
      if (cleanText.length > 0) {
        console.log("Auto-submitting voice input:", cleanText);
        setInputText(cleanText);
        // Auto-submit after a brief delay
        setTimeout(() => {
          handleSendMessage();
        }, 500);
      }
    }
  }, [finalTranscript]);
  
  const handleSendMessage = async () => {
    if (inputText.trim() === '' || isProcessing) return;
    
    // Add user message to chat
    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputText,
      sender: 'user',
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsProcessing(true);
    
    // Add AI "thinking" message
    const thinkingMessage: Message = {
      id: 'thinking-' + Date.now().toString(),
      content: `Processing your input about: "${inputText.substring(0, 30)}..."`,
      sender: 'ai',
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, thinkingMessage]);
    
    try {
      // Process the message
      const response = await onSendMessage(inputText, threadId);
      
      // Remove the thinking message
      setMessages(prev => prev.filter(m => m.id !== thinkingMessage.id));
      
      // Update threadId if provided in response
      if (response.threadId) {
        setThreadId(response.threadId);
      }
      
      // Add real AI response
      const aiMessage: Message = {
        id: Date.now().toString(),
        content: response.content,
        sender: 'ai',
        timestamp: new Date(),
        suggestions: response.suggestions
      };
      
      setMessages(prev => [...prev, aiMessage]);
      
      // Automatically read the message if not too long
      if (response.content.length < 500) {
        speakMessage(response.content);
      }
      
    } catch (error) {
      console.error('Error processing message:', error);
      
      // Remove the thinking message
      setMessages(prev => prev.filter(m => m.id !== thinkingMessage.id));
      
      // Add error message
      const errorMessage: Message = {
        id: Date.now().toString(),
        content: 'Sorry, I had trouble processing that. Could you try again?',
        sender: 'ai',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessage]);
      
      toast({
        title: 'Error',
        description: 'Failed to process your message. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
    }
  };
  
  return (
    <Card className="w-full h-full flex flex-col">
      <CardContent className="p-0 flex-grow flex flex-col h-full">
        <div className="p-4 border-b">
          <h3 className="text-lg font-semibold">{title}</h3>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
        
        <ScrollArea className="flex-grow px-4 py-4" ref={scrollRef}>
          <div className="space-y-4">
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
          </div>
        </ScrollArea>
        
        <div className="p-4 border-t flex flex-col gap-2">
          {currentAudioUrl && (
            <div className="w-full mb-2">
              <AudioPlayer 
                audioUrl={currentAudioUrl} 
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
                  Stop Listening
                </>
              ) : (
                <>
                  <Mic className="h-4 w-4 mr-2" />
                  Start Listening
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default FoundationChatInterface;