import React, { createContext, useContext, useState } from 'react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface EditorContextType {
  editorContent: string;
  setEditorContent: (content: string) => void;
  saveVersion: (chapterId: number, content: string, wordCount: number, type: 'auto' | 'manual' | 'ai-assisted') => Promise<void>;
}

const EditorContext = createContext<EditorContextType | undefined>(undefined);

export function useEditor() {
  const context = useContext(EditorContext);
  if (context === undefined) {
    throw new Error('useEditor must be used within an EditorProvider');
  }
  return context;
}

export const EditorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [editorContent, setEditorContent] = useState('');
  const { toast } = useToast();

  // Save a version of the chapter content
  const saveVersion = async (
    chapterId: number, 
    content: string, 
    wordCount: number, 
    type: 'auto' | 'manual' | 'ai-assisted'
  ) => {
    try {
      await apiRequest('POST', '/api/versions', {
        chapterId,
        content,
        wordCount,
        type
      });
      
      if (type === 'manual') {
        toast({
          title: 'Version saved',
          description: 'A new version of this chapter has been saved.',
        });
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
    }
  };

  const value = {
    editorContent,
    setEditorContent,
    saveVersion
  };

  return <EditorContext.Provider value={value}>{children}</EditorContext.Provider>;
};
