import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Send, Mic, MicOff, Volume2, VolumeX, BookOpen, Save } from 'lucide-react';
import { WorldData } from '../world/WorldDesigner';
import { CharacterData } from '../character/CharacterBuilder';
import { useToast } from '@/hooks/use-toast';
import { fetchInteractiveStoryResponse, StoryMessage as APIStoryMessage } from '@/lib/openai';

interface StoryExperienceProps {
  world: WorldData;
  characters: CharacterData[];
  onSaveStory: () => void;
}

export interface StoryMessage {
  id: string;
  sender: 'user' | 'story' | 'character';
  characterId?: number;
  content: string;
  choices?: string[];
  timestamp: Date;
}

const StoryExperience: React.FC<StoryExperienceProps> = ({ 
  world, 
  characters, 
  onSaveStory 
}) => {
  const { toast } = useToast();
  const [messages, setMessages] = useState<StoryMessage[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentChoices, setCurrentChoices] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Start with an introductory message
  useEffect(() => {
    const introMessage: StoryMessage = {
      id: '1',
      sender: 'story',
      content: `Welcome to the world of ${world.name}. ${world.description} Your adventure begins now...`,
      timestamp: new Date()
    };
    
    setMessages([introMessage]);
    
    // Simulate the first story event after a short delay
    const timer = setTimeout(() => {
      const startingMessage: StoryMessage = {
        id: '2',
        sender: 'story',
        content: generateStoryContent(),
        choices: [
          "Explore the nearby village",
          "Seek out the mysterious tower in the distance",
          "Look for signs of other travelers"
        ],
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, startingMessage]);
      setCurrentChoices(startingMessage.choices || []);
    }, 2000);
    
    return () => clearTimeout(timer);
  }, []);
  
  // Scroll to bottom whenever messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // Generate a story content based on world data
  const generateStoryContent = () => {
    // In a real app, this would call the OpenAI API
    // For now, return a simple templated content
    const settings = [
      `The ${world.setting} spreads out before you, filled with both wonder and danger.`,
      `You find yourself in a region known as ${world.regions?.[0] || 'an unnamed place'}, where ${world.keyConflicts?.[0] || 'conflicts brew'}.`,
      `Tales speak of ${world.importantFigures?.[0] || 'important figures'} who could either help or hinder your journey.`
    ];
    
    return settings[Math.floor(Math.random() * settings.length)];
  };
  
  // Handle user choice selection
  const handleChoiceSelect = async (choice: string) => {
    // Add user choice as a message
    const userMessage: StoryMessage = {
      id: Date.now().toString(),
      sender: 'user',
      content: choice,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setCurrentChoices([]);
    setIsLoading(true);
    
    try {
      // Format characters for the API
      const formattedCharacters = characters.map(char => ({
        name: char.name,
        role: char.role || "Character",
        personality: char.personality || []
      }));
      
      // Format message history for the API
      const messageHistory = messages.map(msg => ({
        sender: msg.sender,
        content: msg.content
      }));
      
      // Add current user message to history
      messageHistory.push({
        sender: 'user',
        content: choice
      });
      
      // Get AI response
      const response = await fetchInteractiveStoryResponse(
        `${world.name}: ${world.description}`, 
        formattedCharacters,
        messageHistory,
        choice
      );
      
      // Create new message from AI response
      const storyResponse: StoryMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'story',
        content: response.content,
        choices: response.choices,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, storyResponse]);
      setCurrentChoices(response.choices || []);
      setIsLoading(false);
      
    } catch (error) {
      console.error("Error getting story response:", error);
      
      // Fallback if AI fails
      const fallbackMessage: StoryMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'story',
        content: "The story continues, though the narrator seems momentarily distracted...",
        choices: ["Continue the journey", "Ask for more details", "Change course"],
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, fallbackMessage]);
      setCurrentChoices(fallbackMessage.choices || []);
      setIsLoading(false);
      
      toast({
        title: "Story Generation Issue",
        description: "There was a problem with the AI storyteller. The journey continues with limited options.",
        variant: "destructive"
      });
    }
  };
  
  // Generate character response based on personality
  const generateCharacterResponse = (userChoice: string) => {
    const character = characters[Math.floor(Math.random() * characters.length)];
    
    const responses = [
      `I'd be careful if I were you. These lands can be treacherous.`,
      `An interesting choice. I've seen many travelers make similar decisions.`,
      `Perhaps we can help each other on this journey.`,
      `Do you really think that's wise? Well, it's your adventure after all.`
    ];
    
    return responses[Math.floor(Math.random() * responses.length)];
  };
  
  // Generate response to user choice
  const generateResponseToChoice = (choice: string) => {
    const responses: {[key: string]: string} = {
      "Explore the nearby village": "As you approach the village, you notice smoke rising from thatched roofs. The settlement appears peaceful, but something feels amiss.",
      "Seek out the mysterious tower in the distance": "The tower grows larger as you approach. Its ancient stones are covered in strange symbols that seem to shift when you're not looking directly at them.",
      "Look for signs of other travelers": "You find footprints leading off the main path. They appear recent, and there are signs of a struggle nearby."
    };
    
    return responses[choice] || 
      "You proceed with your chosen action, uncertain of what awaits ahead.";
  };
  
  // Generate story progression based on previous choice
  const generateStoryProgression = (previousChoice: string) => {
    const progressions: {[key: string]: string} = {
      "Explore the nearby village": "As you walk through the village, locals eye you with suspicion. An elderly person approaches, leaning heavily on a gnarled staff.",
      "Seek out the mysterious tower in the distance": "The massive door of the tower is ajar, revealing darkness within. A cool breeze carries whispers from inside.",
      "Look for signs of other travelers": "Following the trail, you discover an abandoned camp. Personal belongings are scattered around, as if the owners left in a hurry."
    };
    
    return progressions[previousChoice] || 
      "Your journey continues, with new challenges and opportunities arising before you.";
  };
  
  // Generate new choices based on previous choice
  const generateNewChoices = (previousChoice: string): string[] => {
    const choiceOptions: {[key: string]: string[]} = {
      "Explore the nearby village": [
        "Speak with the approaching elder",
        "Look for the village leader",
        "Continue through the village cautiously"
      ],
      "Seek out the mysterious tower in the distance": [
        "Enter the tower",
        "Examine the symbols on the walls",
        "Look for another entrance"
      ],
      "Look for signs of other travelers": [
        "Search the abandoned camp",
        "Follow the trail further",
        "Call out to see if anyone responds"
      ]
    };
    
    return choiceOptions[previousChoice] || [
      "Continue your journey",
      "Rest and consider your options",
      "Look for resources or allies"
    ];
  };
  
  // Handle text input submission
  const handleSubmitText = async () => {
    if (!userInput.trim()) return;
    
    const userMessage: StoryMessage = {
      id: Date.now().toString(),
      sender: 'user',
      content: userInput,
      timestamp: new Date()
    };
    
    const userInputCopy = userInput; // Copy the input before clearing
    setMessages(prev => [...prev, userMessage]);
    setUserInput('');
    setIsLoading(true);
    
    try {
      // Format characters for the API
      const formattedCharacters = characters.map(char => ({
        name: char.name,
        role: char.role || "Character",
        personality: char.personality || []
      }));
      
      // Format message history for the API
      const messageHistory = messages.map(msg => ({
        sender: msg.sender,
        content: msg.content
      }));
      
      // Add current user message to history
      messageHistory.push({
        sender: 'user',
        content: userInputCopy
      });
      
      // Get AI response
      const response = await fetchInteractiveStoryResponse(
        `${world.name}: ${world.description}`, 
        formattedCharacters,
        messageHistory,
        userInputCopy
      );
      
      // Create new message from AI response
      const storyResponse: StoryMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'story',
        content: response.content,
        choices: response.choices,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, storyResponse]);
      setCurrentChoices(response.choices || []);
      setIsLoading(false);
      
    } catch (error) {
      console.error("Error getting story response:", error);
      
      // Fallback if AI fails
      const fallbackMessage: StoryMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'story',
        content: `The narrator acknowledges your words: "${userInputCopy}" The story adapts to your input...`,
        choices: ["Continue the journey", "Ask for more details", "Change course"],
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, fallbackMessage]);
      setCurrentChoices(fallbackMessage.choices || []);
      setIsLoading(false);
      
      toast({
        title: "Story Generation Issue",
        description: "There was a problem with the AI storyteller. The journey continues with limited options.",
        variant: "destructive"
      });
    }
  };
  
  // Toggle voice recording
  const toggleRecording = () => {
    // In a real app, this would use the Web Speech API or similar
    setIsRecording(!isRecording);
    
    if (!isRecording) {
      toast({
        title: "Voice Recording",
        description: "Voice recording started. Speak clearly...",
      });
      
      // Simulate recording end after a few seconds
      setTimeout(() => {
        setIsRecording(false);
        const transcribedText = "I want to know more about this world";
        setUserInput(transcribedText);
        
        toast({
          title: "Voice Recognized",
          description: `Recognized: "${transcribedText}"`,
        });
      }, 3000);
    } else {
      toast({
        title: "Voice Recording Stopped",
        description: "Recording has been canceled.",
      });
    }
  };
  
  // Toggle text-to-speech
  const toggleSpeaking = () => {
    // In a real app, this would use the Web Speech API
    setIsSpeaking(!isSpeaking);
    
    if (!isSpeaking) {
      // Get the last story or character message
      const lastMessage = [...messages]
        .reverse()
        .find(m => m.sender === 'story' || m.sender === 'character');
      
      if (lastMessage) {
        toast({
          title: "Text-to-Speech Active",
          description: "Reading the latest story passage...",
        });
        
        // Simulate speech duration
        setTimeout(() => {
          setIsSpeaking(false);
          toast({
            title: "Reading Complete",
            description: "Finished reading the passage.",
          });
        }, 4000);
      }
    } else {
      toast({
        title: "Text-to-Speech Stopped",
        description: "Reading has been stopped.",
      });
    }
  };
  
  // Simple Chat Bubble Component
  const ChatBubble = ({ message }: { message: StoryMessage }) => {
    const character = message.characterId !== undefined
      ? characters.find(c => c.id === message.characterId)
      : undefined;
      
    if (message.sender === 'user') {
      return (
        <div className="flex justify-end mb-4">
          <div className="bg-primary-100 text-primary-800 rounded-lg py-2 px-4 max-w-[80%]">
            <p>{message.content}</p>
          </div>
        </div>
      );
    }
    
    if (message.sender === 'character' && character) {
      return (
        <div className="flex mb-4">
          <div className="bg-secondary-100 border-l-4 border-secondary-500 rounded-lg py-2 px-4 max-w-[80%]">
            <div className="font-medium text-secondary-800 mb-1">{character.name}</div>
            <p>{message.content}</p>
          </div>
        </div>
      );
    }
    
    return (
      <div className="flex mb-4">
        <div className="bg-neutral-100 rounded-lg py-2 px-4 max-w-[80%]">
          <p>{message.content}</p>
          
          {message.choices && message.choices.length > 0 && (
            <div className="mt-2 text-sm text-neutral-600">
              <div>What will you do?</div>
            </div>
          )}
        </div>
      </div>
    );
  };
  
  // Story Choices Component
  const StoryChoices = ({ 
    choices, 
    onSelect, 
    disabled 
  }: { 
    choices: string[]; 
    onSelect: (choice: string) => void;
    disabled: boolean;
  }) => {
    return (
      <div className="border-t p-3 space-y-2 bg-neutral-50">
        <p className="text-sm font-medium text-neutral-700 mb-2">Choose your next action:</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {choices.map((choice, index) => (
            <Button
              key={index}
              variant="outline"
              className="justify-start h-auto py-3 text-left"
              onClick={() => onSelect(choice)}
              disabled={disabled}
            >
              {choice}
            </Button>
          ))}
        </div>
      </div>
    );
  };
  
  return (
    <div className="h-full flex flex-col">
      <ScrollArea className="flex-grow p-4">
        <div className="space-y-4">
          {messages.map((message) => (
            <ChatBubble 
              key={message.id} 
              message={message}
            />
          ))}
          
          {isLoading && (
            <Card className="w-fit max-w-[80%] mx-auto">
              <CardContent className="p-3">
                <div className="flex space-x-2 items-center">
                  <div className="h-2 w-2 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="h-2 w-2 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  <div className="h-2 w-2 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: '600ms' }}></div>
                </div>
              </CardContent>
            </Card>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>
      
      {currentChoices.length > 0 && (
        <StoryChoices 
          choices={currentChoices} 
          onSelect={handleChoiceSelect}
          disabled={isLoading}
        />
      )}
      
      <div className="border-t p-4 bg-background/80 backdrop-blur-sm">
        <div className="flex gap-2 items-end">
          <div className="flex-grow">
            {currentChoices.length === 0 && (
              <Textarea
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder="Type your response or question..."
                className="min-h-[60px] resize-none"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmitText();
                  }
                }}
                disabled={isLoading}
              />
            )}
            {currentChoices.length > 0 && (
              <p className="text-sm text-neutral-500 py-3">
                Choose one of the options above or type your own response
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              size="icon"
              variant="outline"
              onClick={toggleRecording}
              className={isRecording ? "bg-red-100 text-red-500" : ""}
            >
              {isRecording ? <MicOff /> : <Mic />}
            </Button>
            <Button
              size="icon"
              variant="outline"
              onClick={toggleSpeaking}
              className={isSpeaking ? "bg-blue-100 text-blue-500" : ""}
            >
              {isSpeaking ? <VolumeX /> : <Volume2 />}
            </Button>
            <Button
              onClick={handleSubmitText}
              disabled={!userInput.trim() || isLoading}
            >
              <Send className="h-4 w-4 mr-2" />
              Send
            </Button>
          </div>
        </div>
        
        <div className="flex justify-between mt-3">
          <Button variant="ghost" size="sm" onClick={onSaveStory}>
            <Save className="h-4 w-4 mr-2" />
            Save Story
          </Button>
          <Button variant="ghost" size="sm">
            <BookOpen className="h-4 w-4 mr-2" />
            Story Summary
          </Button>
        </div>
      </div>
    </div>
  );
};

export default StoryExperience;