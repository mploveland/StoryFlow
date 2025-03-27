import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAI } from '@/hooks/useAI';
import { Character } from '@/lib/openai';
import { Lightbulb, MessageSquare, Sparkles, Send, Mic } from 'lucide-react';
import useSpeechRecognition from '@/hooks/useSpeechRecognition';

interface AIAssistantProps {
  storyContext: string;
  chapterContent: string;
  characters: Character[];
  onInsertSuggestion: (text: string) => void;
  onAddCharacter: () => void;
  className?: string;
}

const AIAssistant: React.FC<AIAssistantProps> = ({
  storyContext,
  chapterContent,
  characters,
  onInsertSuggestion,
  onAddCharacter,
  className
}) => {
  const [activeTab, setActiveTab] = useState('suggestions');
  const [aiModel, setAiModel] = useState('gpt-4o');
  const [promptInput, setPromptInput] = useState('');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { getSuggestions, getCharacterResponse, loading, error } = useAI();
  
  const [suggestions, setSuggestions] = useState<{
    plotSuggestions: { content: string }[];
    characterInteractions: { content: string }[];
    styleSuggestions: { title: string; description: string }[];
  }>({
    plotSuggestions: [],
    characterInteractions: [],
    styleSuggestions: []
  });
  
  const [characterResponses, setCharacterResponses] = useState<Record<number, string>>({});
  const promptRef = useRef<HTMLTextAreaElement>(null);

  const {
    transcript,
    isListening,
    start,
    stop,
    supported
  } = useSpeechRecognition({
    onResult: (result) => setPromptInput(result),
  });

  // Load suggestions
  const loadSuggestions = async () => {
    if (!storyContext || !chapterContent) return;
    
    try {
      const result = await getSuggestions(storyContext, chapterContent, characters);
      setSuggestions(result);
    } catch (error) {
      console.error("Failed to load suggestions:", error);
    }
  };

  // Handle character interaction
  const handleCharacterInteraction = async (character: Character) => {
    if (!character || !character.description) return;
    
    try {
      const prompt = promptInput || "How do you feel about the current situation?";
      const response = await getCharacterResponse(
        character.description,
        character.traits || [],
        prompt
      );
      
      setCharacterResponses(prev => ({
        ...prev,
        [character.id!]: response
      }));
      
      // Clear the prompt after getting a response
      setPromptInput('');
    } catch (error) {
      console.error("Failed to get character response:", error);
    }
  };

  // Handle sending AI prompt
  const handleSendPrompt = async () => {
    if (!promptInput.trim()) return;
    
    // Handle different types of prompts based on active tab
    if (activeTab === 'characters' && characters.length > 0) {
      // For now, just interact with the first character
      await handleCharacterInteraction(characters[0]);
    } else {
      // Generic prompt handling could be added here
      console.log("Sending prompt:", promptInput);
      setPromptInput('');
    }
  };

  // Toggle voice input for prompt
  const toggleVoiceInput = () => {
    if (isListening) {
      stop();
    } else {
      setPromptInput('');
      start();
    }
  };

  // Load suggestions on first render
  React.useEffect(() => {
    if (activeTab === 'suggestions' && suggestions.plotSuggestions.length === 0) {
      loadSuggestions();
    }
  }, [activeTab]);

  return (
    <div className={`w-full lg:w-80 xl:w-96 bg-white border-t lg:border-t-0 lg:border-l border-neutral-200 flex flex-col ${isCollapsed ? 'h-14' : 'h-full'} lg:h-auto ${className}`}>
      <div className="p-4 border-b border-neutral-200 flex items-center justify-between">
        <h3 className="font-medium text-neutral-800">AI Assistant</h3>
        
        <div className="flex items-center space-x-2">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 text-neutral-500 hover:bg-neutral-100 rounded lg:hidden"
          >
            {isCollapsed ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-chevron-up"><path d="m18 15-6-6-6 6"/></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-chevron-down"><path d="m6 9 6 6 6-6"/></svg>
            )}
          </Button>
          <Select
            value={aiModel}
            onValueChange={setAiModel}
          >
            <SelectTrigger className="text-sm border border-neutral-300 rounded px-2 py-1 h-8 bg-white w-24">
              <SelectValue placeholder="Select model" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="gpt-4o">GPT-4o</SelectItem>
              <SelectItem value="claude">Claude</SelectItem>
              <SelectItem value="gemini">Gemini</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {!isCollapsed && (
        <>
          <Tabs defaultValue="suggestions" value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <div className="bg-neutral-50 border-b border-neutral-200">
              <TabsList className="bg-transparent h-auto p-0">
                <TabsTrigger 
                  value="suggestions" 
                  className="py-2 px-4 text-sm font-medium data-[state=active]:text-primary-600 data-[state=active]:border-b-2 data-[state=active]:border-primary-500 data-[state=inactive]:text-neutral-600 data-[state=inactive]:hover:text-neutral-800 rounded-none h-auto"
                >
                  Suggestions
                </TabsTrigger>
                <TabsTrigger 
                  value="characters" 
                  className="py-2 px-4 text-sm font-medium data-[state=active]:text-primary-600 data-[state=active]:border-b-2 data-[state=active]:border-primary-500 data-[state=inactive]:text-neutral-600 data-[state=inactive]:hover:text-neutral-800 rounded-none h-auto"
                >
                  Characters
                </TabsTrigger>
                <TabsTrigger 
                  value="research" 
                  className="py-2 px-4 text-sm font-medium data-[state=active]:text-primary-600 data-[state=active]:border-b-2 data-[state=active]:border-primary-500 data-[state=inactive]:text-neutral-600 data-[state=inactive]:hover:text-neutral-800 rounded-none h-auto"
                >
                  Research
                </TabsTrigger>
              </TabsList>
            </div>
            
            <TabsContent value="suggestions" className="flex-1 overflow-y-auto p-4 space-y-4 m-0">
              {loading ? (
                <div className="text-center p-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto"></div>
                  <p className="mt-2 text-sm text-neutral-600">Loading suggestions...</p>
                </div>
              ) : (
                <>
                  {/* Plot Suggestions */}
                  <div className="bg-white rounded-lg border border-neutral-200 p-3 shadow-sm">
                    <h4 className="text-sm font-medium text-neutral-700 mb-2 flex items-center">
                      <Lightbulb className="h-4 w-4 text-yellow-500 mr-2" />
                      Plot Suggestions
                    </h4>
                    <ul className="text-sm space-y-2">
                      {suggestions.plotSuggestions.map((suggestion, index) => (
                        <li 
                          key={index}
                          className="p-2 hover:bg-neutral-50 rounded cursor-pointer"
                          onClick={() => onInsertSuggestion(suggestion.content)}
                        >
                          {suggestion.content}
                        </li>
                      ))}
                      {suggestions.plotSuggestions.length === 0 && (
                        <li className="p-2 text-neutral-500 italic">No plot suggestions available</li>
                      )}
                    </ul>
                  </div>
                  
                  {/* Character Interactions */}
                  <div className="bg-white rounded-lg border border-neutral-200 p-3 shadow-sm">
                    <h4 className="text-sm font-medium text-neutral-700 mb-2 flex items-center">
                      <MessageSquare className="h-4 w-4 text-blue-500 mr-2" />
                      Character Interactions
                    </h4>
                    <div className="text-sm mb-3">
                      <p className="text-neutral-600">Ask characters how they would respond:</p>
                    </div>
                    
                    <div className="characters-list space-y-2 max-h-48 overflow-y-auto pr-1">
                      {characters.map((character) => (
                        <div 
                          key={character.id}
                          className="flex items-start p-2 hover:bg-neutral-50 rounded cursor-pointer"
                          onClick={() => handleCharacterInteraction(character)}
                        >
                          <div 
                            className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mr-2 border" 
                            style={{ 
                              backgroundColor: `${character.color}20`, 
                              borderColor: `${character.color}40`
                            }}
                          >
                            <span className="text-xs font-medium" style={{ color: character.color }}>
                              {character.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)}
                            </span>
                          </div>
                          <div>
                            <span className="font-medium text-neutral-700 block">{character.name}</span>
                            <span className="text-xs text-neutral-500">
                              {character.traits?.slice(0, 3).join(', ')}
                            </span>
                          </div>
                        </div>
                      ))}
                      
                      {characters.length === 0 && (
                        <div className="text-center p-4 text-neutral-500">
                          <p>No characters created yet</p>
                        </div>
                      )}
                    </div>
                    
                    <Button 
                      variant="link" 
                      size="sm" 
                      onClick={onAddCharacter}
                      className="mt-3 text-xs text-primary-600 hover:text-primary-700 flex items-center"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-plus h-3 w-3 mr-1"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
                      <span>Create new character</span>
                    </Button>
                  </div>
                  
                  {/* Style Suggestions */}
                  <div className="bg-white rounded-lg border border-neutral-200 p-3 shadow-sm">
                    <h4 className="text-sm font-medium text-neutral-700 mb-2 flex items-center">
                      <Sparkles className="h-4 w-4 text-purple-500 mr-2" />
                      Style Suggestions
                    </h4>
                    <div className="text-sm space-y-2">
                      {suggestions.styleSuggestions.map((suggestion, index) => (
                        <div 
                          key={index}
                          className="p-2 hover:bg-neutral-50 rounded cursor-pointer"
                          onClick={() => onInsertSuggestion(suggestion.description)}
                        >
                          <p className="text-neutral-700">{suggestion.title}</p>
                          <p className="text-xs text-neutral-500 mt-1">{suggestion.description}</p>
                        </div>
                      ))}
                      {suggestions.styleSuggestions.length === 0 && (
                        <div className="p-2 text-neutral-500 italic">No style suggestions available</div>
                      )}
                    </div>
                  </div>
                </>
              )}
              
              {/* Error state */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                  <p className="font-medium">Error loading suggestions</p>
                  <p className="mt-1">{error}</p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={loadSuggestions}
                    className="mt-2 text-xs"
                  >
                    Try again
                  </Button>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="characters" className="flex-1 overflow-y-auto p-4 space-y-4 m-0">
              {characters.length === 0 ? (
                <div className="text-center p-8">
                  <div className="w-16 h-16 rounded-full bg-neutral-100 mx-auto flex items-center justify-center mb-4">
                    <MessageSquare className="h-8 w-8 text-neutral-400" />
                  </div>
                  <h3 className="text-lg font-medium text-neutral-800 mb-2">No Characters Yet</h3>
                  <p className="text-neutral-600 mb-4">Create characters to interact with them using AI</p>
                  <Button onClick={onAddCharacter}>Create Character</Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {characters.map(character => (
                    <div key={character.id} className="bg-white rounded-lg border border-neutral-200 p-4 shadow-sm">
                      <div className="flex items-center mb-3">
                        <div 
                          className="w-10 h-10 rounded-full flex items-center justify-center mr-3" 
                          style={{ 
                            backgroundColor: `${character.color}20`, 
                            borderColor: `${character.color}40`
                          }}
                        >
                          <span className="text-sm font-medium" style={{ color: character.color }}>
                            {character.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)}
                          </span>
                        </div>
                        <div>
                          <h4 className="font-medium text-neutral-800">{character.name}</h4>
                          <p className="text-xs text-neutral-500">{character.role || 'Character'}</p>
                        </div>
                      </div>
                      
                      {characterResponses[character.id!] && (
                        <div className="bg-neutral-50 p-3 rounded-md text-sm mb-3 italic">
                          "{characterResponses[character.id!]}"
                        </div>
                      )}
                      
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleCharacterInteraction(character)}
                        className="w-full text-sm justify-center"
                      >
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Ask {character.name.split(' ')[0]}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="research" className="flex-1 overflow-y-auto p-4 m-0">
              <div className="text-center p-8">
                <div className="w-16 h-16 rounded-full bg-neutral-100 mx-auto flex items-center justify-center mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-book-open h-8 w-8 text-neutral-400"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
                </div>
                <h3 className="text-lg font-medium text-neutral-800 mb-2">Research Assistant</h3>
                <p className="text-neutral-600 mb-2">Ask questions about any topic to enhance your story</p>
                <p className="text-xs text-neutral-500">Coming soon in future update</p>
              </div>
            </TabsContent>
          </Tabs>
          
          {/* AI Prompt Input */}
          <div className="p-3 border-t border-neutral-200 bg-white">
            <div className="relative">
              <Textarea
                ref={promptRef}
                placeholder="Ask the AI for help with your story..."
                className="w-full border border-neutral-300 rounded-lg pl-3 pr-10 py-2 text-sm min-h-12 focus:border-primary-300 focus:ring focus:ring-primary-100 focus:ring-opacity-50"
                value={promptInput}
                onChange={(e) => setPromptInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendPrompt();
                  }
                }}
              />
              
              <div className="absolute right-0 bottom-0 p-2 flex items-center space-x-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleVoiceInput}
                  className={`p-1 ${isListening ? 'text-primary-500' : 'text-neutral-400 hover:text-neutral-600'}`}
                  disabled={!supported}
                >
                  <Mic className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleSendPrompt}
                  disabled={!promptInput.trim()}
                  className="p-1 text-primary-500 hover:text-primary-600"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AIAssistant;
