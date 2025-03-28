import React, { useState, useRef, useEffect } from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { countWords } from '@/lib/utils';
import { useEditor } from '@/contexts/EditorContext';
import useSpeechSynthesis from '@/hooks/useSpeechSynthesis';
import {
  Bold,
  Italic,
  Underline,
  Heading,
  List,
  ListOrdered,
  Quote,
  Mic,
  Volume2,
  ChevronLeft,
  ChevronRight,
  Save,
  Clock,
  Settings,
  Info
} from 'lucide-react';

export interface Chapter {
  id: number;
  title: string;
  content: string;
  order: number;
  wordCount: number;
}

interface StoryEditorProps {
  chapter: Chapter;
  chapters: Chapter[];
  onContentChange: (content: string) => void;
  onTitleChange: (title: string) => void;
  onPreviousChapter: () => void;
  onNextChapter: () => void;
  onVoiceInputStart: () => void;
  className?: string;
}

const StoryEditor: React.FC<StoryEditorProps> = ({
  chapter,
  chapters,
  onContentChange,
  onTitleChange,
  onPreviousChapter,
  onNextChapter,
  onVoiceInputStart,
  className
}) => {
  const [isEditMode, setIsEditMode] = useState(true);
  const contentRef = useRef<HTMLDivElement>(null);
  const { speak, cancel, speaking } = useSpeechSynthesis();
  const { 
    lastSavedAt, 
    isSaving, 
    autoSaveEnabled, 
    setAutoSaveEnabled, 
    autoSaveInterval, 
    setAutoSaveInterval,
    pendingChanges,
    manualSave 
  } = useEditor();
  
  // Handle formatting buttons
  const handleFormat = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    if (contentRef.current) {
      onContentChange(contentRef.current.innerHTML);
    }
  };
  
  // Handle manual save
  const handleManualSave = () => {
    if (contentRef.current) {
      const currentContent = contentRef.current.innerHTML;
      const wordCount = countWords(currentContent);
      manualSave(chapter.id, currentContent, wordCount);
    }
  };
  
  // Handle chapter selection
  const handleChapterSelect = (chapterId: string) => {
    // This would be handled by the parent component navigation logic
    const selectedChapter = chapters.find(c => c.id === parseInt(chapterId));
    if (selectedChapter) {
      // Navigate to the selected chapter
    }
  };
  
  // Handle text-to-speech
  const handleReadAloud = () => {
    if (speaking) {
      cancel();
    } else if (contentRef.current) {
      const text = contentRef.current.innerText;
      speak(text);
    }
  };

  // Handle content changes
  const handleContentChange = () => {
    if (contentRef.current) {
      onContentChange(contentRef.current.innerHTML);
    }
  };

  return (
    <div className={`flex-1 overflow-y-auto editor-container ${className}`}>
      {/* Chapter Navigation */}
      <div className="bg-white p-4 border-b border-neutral-200 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={onPreviousChapter}
            className="p-1.5 text-neutral-500 hover:bg-neutral-100 rounded"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          
          <Select
            value={chapter.id.toString()}
            onValueChange={handleChapterSelect}
          >
            <SelectTrigger className="bg-white border border-neutral-300 rounded px-2 py-1 h-8 text-sm w-56">
              <SelectValue placeholder="Select chapter" />
            </SelectTrigger>
            <SelectContent>
              {chapters.map(c => (
                <SelectItem key={c.id} value={c.id.toString()}>
                  Chapter {c.order}: {c.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button 
            variant="ghost" 
            size="icon"
            onClick={onNextChapter}
            className="p-1.5 text-neutral-500 hover:bg-neutral-100 rounded"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
        
        <div className="flex items-center space-x-2">
          <div className="text-sm text-neutral-500">
            <span>{chapter.wordCount}</span> words
          </div>
          
          <div className="flex items-center border-l border-neutral-200 pl-2 ml-2">
            <Button 
              variant={isEditMode ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setIsEditMode(true)}
              className={isEditMode 
                ? "px-2 py-1 text-sm rounded bg-primary-50 text-primary-600" 
                : "px-2 py-1 text-sm rounded text-neutral-600 hover:bg-neutral-100"
              }
            >
              <Bold className="h-4 w-4 mr-1" />
              Edit
            </Button>
            <Button 
              variant={!isEditMode ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setIsEditMode(false)}
              className={!isEditMode 
                ? "px-2 py-1 text-sm rounded bg-primary-50 text-primary-600" 
                : "px-2 py-1 text-sm rounded text-neutral-600 hover:bg-neutral-100"
              }
            >
              <Heading className="h-4 w-4 mr-1" />
              Read
            </Button>
          </div>
        </div>
      </div>
      
      {/* Formatting Toolbar (only visible in edit mode) */}
      {isEditMode && (
        <>
          <div className="bg-white px-4 py-2 border-b border-neutral-200 flex items-center justify-between">
            <div className="flex items-center space-x-1">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => handleFormat('bold')} 
                className="p-1.5 text-neutral-700 hover:bg-neutral-100 rounded"
              >
                <Bold className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => handleFormat('italic')} 
                className="p-1.5 text-neutral-700 hover:bg-neutral-100 rounded"
              >
                <Italic className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => handleFormat('underline')} 
                className="p-1.5 text-neutral-700 hover:bg-neutral-100 rounded"
              >
                <Underline className="h-4 w-4" />
              </Button>
              <div className="h-4 border-l border-neutral-300 mx-1"></div>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => handleFormat('formatBlock', '<h2>')} 
                className="p-1.5 text-neutral-700 hover:bg-neutral-100 rounded"
              >
                <Heading className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => handleFormat('insertUnorderedList')} 
                className="p-1.5 text-neutral-700 hover:bg-neutral-100 rounded"
              >
                <List className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => handleFormat('insertOrderedList')} 
                className="p-1.5 text-neutral-700 hover:bg-neutral-100 rounded"
              >
                <ListOrdered className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => handleFormat('formatBlock', '<blockquote>')} 
                className="p-1.5 text-neutral-700 hover:bg-neutral-100 rounded"
              >
                <Quote className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Voice Controls */}
            <div className="flex items-center space-x-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={onVoiceInputStart}
                className="px-3 py-1.5 bg-white border border-neutral-300 rounded-full text-sm flex items-center shadow-sm hover:bg-neutral-50"
              >
                <Mic className="h-4 w-4 mr-2 text-neutral-600" />
                <span>Voice Input</span>
              </Button>
              
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleReadAloud}
                className={`px-3 py-1.5 bg-white border border-neutral-300 rounded-full text-sm flex items-center shadow-sm hover:bg-neutral-50 ${speaking ? "text-primary-600" : ""}`}
              >
                <Volume2 className="h-4 w-4 mr-2 text-neutral-600" />
                <span>{speaking ? "Stop" : "Read Aloud"}</span>
              </Button>
            </div>
          </div>
          
          {/* Auto-save Status and Controls */}
          <div className="bg-white px-4 py-1 border-b border-neutral-200 flex items-center justify-between text-xs text-neutral-500">
            <div className="flex items-center space-x-4">
              {/* Auto-save Status */}
              <div className="flex items-center space-x-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center cursor-help">
                        <Clock className="h-3.5 w-3.5 mr-1 text-neutral-400" />
                        <span>
                          {isSaving ? (
                            "Saving..."
                          ) : lastSavedAt ? (
                            `Last saved ${format(new Date(lastSavedAt), 'h:mm a')}`
                          ) : (
                            "Not saved yet"
                          )}
                        </span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p>The document is {autoSaveEnabled ? "automatically" : "not automatically"} saved as you type</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>

              {/* Pending Changes Indicator */}
              {pendingChanges && !isSaving && (
                <div className="text-amber-600 flex items-center">
                  <Info className="h-3.5 w-3.5 mr-1" />
                  <span>Unsaved changes</span>
                </div>
              )}
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Auto-save Settings */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-7 text-xs text-neutral-500">
                    <Settings className="h-3.5 w-3.5 mr-1.5" />
                    <span>Auto-save Settings</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-4" side="bottom">
                  <div className="space-y-4">
                    <h4 className="font-medium text-sm">Auto-save Configuration</h4>
                    
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="auto-save-toggle" className="text-sm font-medium">
                          Auto-save
                        </Label>
                        <p className="text-xs text-neutral-500">Automatically save changes as you type</p>
                      </div>
                      <Switch
                        id="auto-save-toggle"
                        checked={autoSaveEnabled}
                        onCheckedChange={setAutoSaveEnabled}
                      />
                    </div>
                    
                    {autoSaveEnabled && (
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <Label htmlFor="auto-save-interval" className="text-sm">
                            Auto-save interval
                          </Label>
                          <span className="text-xs text-neutral-500">
                            {autoSaveInterval / 1000} seconds
                          </span>
                        </div>
                        <Slider
                          id="auto-save-interval"
                          value={[autoSaveInterval / 1000]}
                          min={5}
                          max={120}
                          step={5}
                          onValueChange={([value]) => setAutoSaveInterval(value * 1000)}
                        />
                        <p className="text-xs text-neutral-500 mt-1.5">
                          Choose how frequently changes should be auto-saved
                        </p>
                      </div>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
              
              {/* Manual Save Button */}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleManualSave}
                disabled={isSaving || !pendingChanges}
                className="h-7 text-xs bg-white border border-neutral-300 text-neutral-700 hover:bg-neutral-50"
              >
                <Save className="h-3.5 w-3.5 mr-1.5" />
                <span>{isSaving ? "Saving..." : "Save Now"}</span>
              </Button>
            </div>
          </div>
        </>
      )}
      
      {/* Chapter Title */}
      <div className="px-8 pt-8 pb-4 max-w-4xl mx-auto">
        <input 
          type="text" 
          value={chapter.title}
          onChange={(e) => onTitleChange(e.target.value)}
          className="w-full text-3xl font-bold text-neutral-800 border-none bg-transparent font-serif focus:outline-none focus:ring-0"
          placeholder="Chapter title..."
          disabled={!isEditMode}
        />
      </div>
      
      {/* Writing Area */}
      <div className="px-8 pb-24 max-w-4xl mx-auto">
        <div 
          ref={contentRef}
          contentEditable={isEditMode}
          className={`writing-area w-full text-neutral-800 font-serif leading-relaxed focus:outline-none ${!isEditMode ? 'reading-mode' : ''}`}
          dangerouslySetInnerHTML={{ __html: chapter.content }}
          onInput={handleContentChange}
          onBlur={handleContentChange}
        />
      </div>
    </div>
  );
};

export default StoryEditor;
