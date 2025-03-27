import React, { useState, useEffect } from 'react';
import { useRoute, useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

import TopNavigation from '@/components/dashboard/TopNavigation';
import Sidebar from '@/components/dashboard/Sidebar';
import StoryEditor from '@/components/editor/StoryEditor';
import AIAssistant from '@/components/editor/AIAssistant';
import VoiceRecordingModal from '@/components/editor/VoiceRecordingModal';
import CharacterModal from '@/components/editor/CharacterModal';
import VersionHistoryModal from '@/components/editor/VersionHistoryModal';
import NewChapterModal from '@/components/dashboard/NewChapterModal';
import CollaborationModal from '@/components/editor/CollaborationModal';
import ExportModal from '@/components/editor/ExportModal';

import { useEditor } from '@/contexts/EditorContext';
import { useAuth } from '@/contexts/AuthContext';
import { countWords } from '@/lib/utils/text';

import type { Story, Chapter, Character, Version } from '@shared/schema';

const StoryEditorPage: React.FC = () => {
  const [, params] = useRoute('/story/:storyId');
  const [, chapterParams] = useRoute('/story/:storyId/chapter/:chapterId');
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const { 
    editorContent, 
    setEditorContent, 
    saveVersion 
  } = useEditor();

  // Modal states
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [isCharacterModalOpen, setIsCharacterModalOpen] = useState(false);
  const [isVersionHistoryOpen, setIsVersionHistoryOpen] = useState(false);
  const [isNewChapterModalOpen, setIsNewChapterModalOpen] = useState(false);
  const [isCollaborationModalOpen, setIsCollaborationModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  
  // Get story ID from URL params
  const storyId = params?.storyId ? parseInt(params.storyId) : 
                 chapterParams?.storyId ? parseInt(chapterParams.storyId) : 0;
  
  // Get chapter ID from URL params or default to first chapter
  const chapterId = chapterParams?.chapterId ? parseInt(chapterParams.chapterId) : null;

  // Fetch story data
  const { data: story = {}, isLoading: isStoryLoading } = useQuery<Story>({
    queryKey: [`/api/stories/${storyId}`],
    enabled: !!storyId,
  });

  // Fetch chapters for the story
  const { data: chapters = [], isLoading: isChaptersLoading } = useQuery<Chapter[]>({
    queryKey: [`/api/stories/${storyId}/chapters`],
    enabled: !!storyId,
  });

  // Fetch characters for the story
  const { data: characters = [], isLoading: isCharactersLoading } = useQuery<Character[]>({
    queryKey: [`/api/stories/${storyId}/characters`],
    enabled: !!storyId,
  });

  // Determine active chapter
  const [activeChapter, setActiveChapter] = useState<Chapter | null>(null);

  useEffect(() => {
    if (!isChaptersLoading && chapters.length > 0) {
      if (chapterId) {
        const chapter = chapters.find((c: Chapter) => c.id === chapterId);
        if (chapter) {
          setActiveChapter(chapter);
        } else {
          // If chapter ID not found, use first chapter
          setActiveChapter(chapters[0]);
          navigate(`/story/${storyId}/chapter/${chapters[0].id}`);
        }
      } else {
        // If no chapter ID in URL, use first chapter
        setActiveChapter(chapters[0]);
        navigate(`/story/${storyId}/chapter/${chapters[0].id}`);
      }
    }
  }, [isChaptersLoading, chapters, chapterId, storyId, navigate]);

  // Set editor content when active chapter changes
  useEffect(() => {
    if (activeChapter && activeChapter.content) {
      setEditorContent(activeChapter.content);
    }
  }, [activeChapter, setEditorContent]);

  // Update chapter content mutation
  const updateChapterMutation = useMutation({
    mutationFn: async ({ id, content, title, wordCount }: Partial<Chapter> & { id: number }) => {
      const response = await apiRequest('PUT', `/api/chapters/${id}`, {
        content,
        title,
        wordCount
      });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [`/api/stories/${storyId}/chapters`] });
      toast({
        title: 'Chapter saved',
        description: 'Your chapter has been successfully saved.',
      });
      // Create a version record
      if (activeChapter && editorContent) {
        saveVersion(activeChapter.id, editorContent, countWords(editorContent), 'auto');
      }
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to save chapter',
        description: error.message || 'An error occurred while saving your chapter.',
        variant: 'destructive',
      });
    },
  });

  // Create chapter mutation
  const createChapterMutation = useMutation({
    mutationFn: async (chapterData: { title: string, order: number }) => {
      const response = await apiRequest('POST', '/api/chapters', {
        ...chapterData,
        storyId,
        content: '<p>Start writing your chapter here...</p>',
        wordCount: 5
      });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [`/api/stories/${storyId}/chapters`] });
      setIsNewChapterModalOpen(false);
      navigate(`/story/${storyId}/chapter/${data.id}`);
      toast({
        title: 'Chapter created',
        description: 'Your new chapter has been created.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to create chapter',
        description: error.message || 'An error occurred while creating your chapter.',
        variant: 'destructive',
      });
    },
  });

  // Create character mutation
  const createCharacterMutation = useMutation({
    mutationFn: async (characterData: { 
      name: string; 
      role?: string; 
      traits: string[];
      description: string;
      secrets?: string;
      color: string;
    }) => {
      const response = await apiRequest('POST', '/api/characters', {
        ...characterData,
        storyId
      });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [`/api/stories/${storyId}/characters`] });
      setIsCharacterModalOpen(false);
      toast({
        title: 'Character created',
        description: 'Your new character has been created.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to create character',
        description: error.message || 'An error occurred while creating your character.',
        variant: 'destructive',
      });
    },
  });

  // Fetch versions for the active chapter
  const { data: versions = [] } = useQuery<Version[]>({
    queryKey: [`/api/chapters/${activeChapter?.id}/versions`],
    enabled: !!activeChapter?.id,
  });

  // Restore version mutation
  const restoreVersionMutation = useMutation({
    mutationFn: async (versionId: number) => {
      const version = versions.find((v: Version) => v.id === versionId);
      if (!version || !activeChapter) throw new Error('Version not found');
      
      const response = await apiRequest('PUT', `/api/chapters/${activeChapter.id}`, {
        content: version.content,
        wordCount: version.wordCount
      });
      return response.json();
    },
    onSuccess: (data) => {
      if (data && data.content) {
        setEditorContent(data.content);
        setActiveChapter(prev => prev ? { ...prev, content: data.content, wordCount: data.wordCount } : null);
      }
      setIsVersionHistoryOpen(false);
      queryClient.invalidateQueries({ queryKey: [`/api/stories/${storyId}/chapters`] });
      toast({
        title: 'Version restored',
        description: 'The selected version has been restored.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to restore version',
        description: error.message || 'An error occurred while restoring the version.',
        variant: 'destructive',
      });
    },
  });

  // Handle content changes
  const handleContentChange = (content: string) => {
    setEditorContent(content);
    if (activeChapter) {
      const wordCount = countWords(content);
      // Auto-save after a short delay
      const timeoutId = setTimeout(() => {
        updateChapterMutation.mutate({
          id: activeChapter.id,
          content,
          wordCount
        });
      }, 2000);
      
      return () => clearTimeout(timeoutId);
    }
  };

  // Handle title changes
  const handleTitleChange = (title: string) => {
    if (activeChapter) {
      updateChapterMutation.mutate({
        id: activeChapter.id,
        title
      });
    }
  };

  // Handle chapter navigation
  const handlePreviousChapter = () => {
    if (activeChapter && chapters.length > 0) {
      const currentIndex = chapters.findIndex((c: Chapter) => c.id === activeChapter.id);
      if (currentIndex > 0) {
        const previousChapter = chapters[currentIndex - 1];
        navigate(`/story/${storyId}/chapter/${previousChapter.id}`);
      }
    }
  };

  const handleNextChapter = () => {
    if (activeChapter && chapters.length > 0) {
      const currentIndex = chapters.findIndex((c: Chapter) => c.id === activeChapter.id);
      if (currentIndex < chapters.length - 1) {
        const nextChapter = chapters[currentIndex + 1];
        navigate(`/story/${storyId}/chapter/${nextChapter.id}`);
      }
    }
  };

  // Handle voice input
  const handleVoiceInputComplete = (transcript: string) => {
    if (activeChapter) {
      const newContent = `${editorContent}<p>${transcript}</p>`;
      setEditorContent(newContent);
      handleContentChange(newContent);
    }
  };

  // Handle adding AI suggestion to content
  const handleInsertSuggestion = (text: string) => {
    if (activeChapter) {
      const newContent = `${editorContent}<p>${text}</p>`;
      setEditorContent(newContent);
      handleContentChange(newContent);
      toast({
        title: 'Suggestion added',
        description: 'The AI suggestion has been added to your chapter.',
      });
    }
  };

  // Handle character selection
  const handleSelectCharacter = (characterId: number) => {
    const character = characters.find((c: Character) => c.id === characterId);
    if (character) {
      // Could implement character-specific actions here
      toast({
        title: `Selected ${character.name}`,
        description: 'You can now interact with this character in the AI panel.',
      });
    }
  };

  // Handle chapter selection
  const handleSelectChapter = (chapterId: number) => {
    navigate(`/story/${storyId}/chapter/${chapterId}`);
  };

  // Create a new chapter
  const handleCreateChapter = (title: string) => {
    const newOrder = chapters.length > 0 
      ? Math.max(...chapters.map((c: Chapter) => c.order)) + 1
      : 1;
    
    createChapterMutation.mutate({
      title,
      order: newOrder
    });
  };

  // Create a new character
  const handleCreateCharacter = (characterData: {
    name: string;
    role?: string;
    traits: string[];
    description: string;
    secrets?: string;
    color: string;
  }) => {
    createCharacterMutation.mutate(characterData);
  };

  // Restore a version
  const handleRestoreVersion = (versionId: number) => {
    restoreVersionMutation.mutate(versionId);
  };

  // Compare a version to current content
  const handleCompareVersion = (versionId: number) => {
    // Could implement version comparison functionality
    toast({
      title: 'Compare feature',
      description: 'Version comparison feature coming soon.',
    });
  };

  if (isStoryLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-neutral-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-neutral-600">Loading your story...</p>
        </div>
      </div>
    );
  }

  if (!story) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-neutral-50">
        <div className="text-center max-w-md p-8 bg-white rounded-lg shadow-sm border border-neutral-200">
          <h2 className="text-xl font-bold text-neutral-800 mb-4">Story Not Found</h2>
          <p className="text-neutral-600 mb-6">The story you're looking for could not be found.</p>
          <button 
            className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700"
            onClick={() => navigate('/dashboard')}
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Prepare story and chapter for sidebar display
  const storiesForSidebar = [
    { id: story.id, title: story.title, isActive: true }
  ];

  const chaptersForSidebar = chapters.map((chapter: Chapter) => ({
    id: chapter.id,
    title: chapter.title,
    order: chapter.order,
    isActive: activeChapter ? chapter.id === activeChapter.id : false
  }));

  return (
    <div className="flex flex-col h-screen">
      <TopNavigation 
        onToggleSidebar={() => setIsSidebarVisible(!isSidebarVisible)}
        onOpenVersionHistory={() => setIsVersionHistoryOpen(true)}
        onOpenCollaborate={() => setIsCollaborationModalOpen(true)}
        user={user}
      />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar 
          stories={storiesForSidebar}
          chapters={chaptersForSidebar}
          characters={characters}
          currentStory={story}
          onAddStory={() => navigate('/dashboard')}
          onAddChapter={() => setIsNewChapterModalOpen(true)}
          onAddCharacter={() => setIsCharacterModalOpen(true)}
          onSelectChapter={handleSelectChapter}
          onSelectCharacter={handleSelectCharacter}
          className={isSidebarVisible ? '' : 'hidden'}
        />

        <main className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {activeChapter ? (
            <>
              <StoryEditor 
                chapter={activeChapter}
                chapters={chapters}
                onContentChange={handleContentChange}
                onTitleChange={handleTitleChange}
                onPreviousChapter={handlePreviousChapter}
                onNextChapter={handleNextChapter}
                onVoiceInputStart={() => setIsVoiceModalOpen(true)}
              />
              
              <AIAssistant
                storyContext={`${story.title}${story.genre ? ` - Genre: ${story.genre}` : ''}${story.theme ? ` - Theme: ${story.theme}` : ''}${story.setting ? ` - Setting: ${story.setting}` : ''}`}
                chapterContent={editorContent}
                characters={characters}
                onInsertSuggestion={handleInsertSuggestion}
                onAddCharacter={() => setIsCharacterModalOpen(true)}
              />
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-neutral-50">
              <div className="text-center">
                {chapters.length === 0 ? (
                  <>
                    <h2 className="text-xl font-bold text-neutral-800 mb-4">No Chapters Yet</h2>
                    <p className="text-neutral-600 mb-6">Create your first chapter to start writing.</p>
                    <button 
                      className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700"
                      onClick={() => setIsNewChapterModalOpen(true)}
                    >
                      Create First Chapter
                    </button>
                  </>
                ) : (
                  <>
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
                    <p className="text-neutral-600">Loading chapter...</p>
                  </>
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Modals */}
      <VoiceRecordingModal 
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        onTranscriptComplete={handleVoiceInputComplete}
      />

      <CharacterModal 
        isOpen={isCharacterModalOpen}
        onClose={() => setIsCharacterModalOpen(false)}
        onSave={handleCreateCharacter}
      />

      <VersionHistoryModal 
        isOpen={isVersionHistoryOpen}
        onClose={() => setIsVersionHistoryOpen(false)}
        versions={versions}
        onRestoreVersion={handleRestoreVersion}
        onCompareVersion={handleCompareVersion}
      />

      <NewChapterModal 
        isOpen={isNewChapterModalOpen}
        onClose={() => setIsNewChapterModalOpen(false)}
        onCreateChapter={handleCreateChapter}
        isPending={createChapterMutation.isPending}
      />

      <CollaborationModal 
        isOpen={isCollaborationModalOpen}
        onClose={() => setIsCollaborationModalOpen(false)}
        storyId={storyId}
      />

      <ExportModal 
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        story={story}
        chapters={chapters}
      />
    </div>
  );
};

export default StoryEditorPage;
