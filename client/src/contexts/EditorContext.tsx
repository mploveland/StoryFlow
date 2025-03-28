import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { debounce, countWords } from '@/lib/utils';

interface EditorContextType {
  editorContent: string;
  setEditorContent: (content: string) => void;
  saveVersion: (chapterId: number, content: string, wordCount: number, type: 'auto' | 'manual' | 'ai-assisted') => Promise<void>;
  lastSavedAt: Date | null;
  isSaving: boolean;
  autoSaveEnabled: boolean;
  setAutoSaveEnabled: (enabled: boolean) => void;
  autoSaveInterval: number;
  setAutoSaveInterval: (interval: number) => void;
  manualSave: (chapterId: number, content: string, wordCount: number) => Promise<void>;
  pendingChanges: boolean;
}

const EditorContext = createContext<EditorContextType | undefined>(undefined);

export function useEditor() {
  const context = useContext(EditorContext);
  if (context === undefined) {
    throw new Error('useEditor must be used within an EditorProvider');
  }
  return context;
}

// Default auto-save interval in milliseconds
const DEFAULT_AUTO_SAVE_INTERVAL = 30000; // 30 seconds

export const EditorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [editorContent, setEditorContent] = useState('');
  const [lastSavedContent, setLastSavedContent] = useState('');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [autoSaveInterval, setAutoSaveInterval] = useState(DEFAULT_AUTO_SAVE_INTERVAL);
  const [pendingChanges, setPendingChanges] = useState(false);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const activeChapterIdRef = useRef<number | null>(null);
  const { toast } = useToast();

  // Compare current content with last saved content to determine if there are pending changes
  useEffect(() => {
    setPendingChanges(editorContent !== lastSavedContent && editorContent.trim() !== '');
  }, [editorContent, lastSavedContent]);

  // Clear auto-save timer when component unmounts
  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, []);

  // Set up auto-save timer when settings change
  useEffect(() => {
    setupAutoSaveTimer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSaveEnabled, autoSaveInterval, editorContent]);

  // Setup auto-save timer
  const setupAutoSaveTimer = useCallback(() => {
    // Clear any existing timer
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }

    // Only set up timer if auto-save is enabled and we have an active chapter
    if (autoSaveEnabled && activeChapterIdRef.current && pendingChanges) {
      autoSaveTimerRef.current = setTimeout(() => {
        // Only save if there are actual changes
        if (pendingChanges) {
          const chapterId = activeChapterIdRef.current;
          if (chapterId) {
            const wordCount = countWords(editorContent);
            saveVersion(chapterId, editorContent, wordCount, 'auto');
          }
        }
      }, autoSaveInterval);
    }
  }, [autoSaveEnabled, autoSaveInterval, editorContent, pendingChanges]);

  // Using the countWords utility function from utils.ts

  // Save a version of the chapter content
  const saveVersion = async (
    chapterId: number, 
    content: string, 
    wordCount: number, 
    type: 'auto' | 'manual' | 'ai-assisted'
  ) => {
    // Update the active chapter ID reference
    activeChapterIdRef.current = chapterId;
    
    // Don't save if the content is empty or hasn't changed (except for manual saves)
    if ((content.trim() === '' || content === lastSavedContent) && type !== 'manual') {
      return;
    }

    setIsSaving(true);
    
    try {
      await apiRequest('POST', '/api/versions', {
        chapterId,
        content,
        wordCount,
        type
      });
      
      // Update last saved info
      setLastSavedContent(content);
      setLastSavedAt(new Date());
      setPendingChanges(false);
      
      if (type === 'manual') {
        toast({
          title: 'Version saved',
          description: 'A new version of this chapter has been saved.',
        });
      } else if (type === 'auto') {
        // Optional: show a subtle indicator for auto-save
        console.log('Auto-saved at', new Date().toLocaleTimeString());
      }
    } catch (error: any) {
      console.error('Failed to save version:', error);
      if (type === 'manual') {
        toast({
          title: 'Failed to save version',
          description: error.message || 'An error occurred while saving the version.',
          variant: 'destructive',
        });
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Manual save function
  const manualSave = async (chapterId: number, content: string, wordCount: number) => {
    await saveVersion(chapterId, content, wordCount, 'manual');
  };

  const value = {
    editorContent,
    setEditorContent,
    saveVersion,
    lastSavedAt,
    isSaving,
    autoSaveEnabled,
    setAutoSaveEnabled,
    autoSaveInterval,
    setAutoSaveInterval,
    manualSave,
    pendingChanges
  };

  return <EditorContext.Provider value={value}>{children}</EditorContext.Provider>;
};
