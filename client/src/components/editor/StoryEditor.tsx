import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  ChevronRight
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
  
  // Count words in content
  const countWords = (text: string): number => {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  };
  
  // Handle formatting buttons
  const handleFormat = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    if (contentRef.current) {
      onContentChange(contentRef.current.innerHTML);
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
