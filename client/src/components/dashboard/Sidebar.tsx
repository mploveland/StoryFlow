import React, { useState } from 'react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  BookOpenIcon,
  BookIcon,
  PlusIcon,
  SearchIcon,
  MoreVerticalIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Story {
  id: number;
  title: string;
  isActive?: boolean;
}

export interface Chapter {
  id: number;
  title: string;
  order: number;
  isActive?: boolean;
}

export interface Character {
  id: number;
  name: string;
  color: string;
}

interface SidebarProps {
  stories: Story[];
  chapters: Chapter[];
  characters: Character[];
  currentStory?: Story;
  onAddStory: () => void;
  onAddChapter: () => void;
  onAddCharacter: () => void;
  onSelectChapter: (chapterId: number) => void;
  onSelectCharacter: (characterId: number) => void;
  className?: string;
}

const Sidebar: React.FC<SidebarProps> = ({
  stories,
  chapters,
  characters,
  currentStory,
  onAddStory,
  onAddChapter,
  onAddCharacter,
  onSelectChapter,
  onSelectCharacter,
  className
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredStories = stories.filter(story => 
    story && story.title ? story.title.toLowerCase().includes(searchQuery.toLowerCase()) : false
  );

  return (
    <aside className={cn(
      "bg-white w-64 border-r border-neutral-200 flex-shrink-0 h-full overflow-y-auto transition-all",
      className
    )}>
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-neutral-800">My Stories</h2>
          <Button
            variant="ghost" 
            size="icon"
            onClick={onAddStory}
            className="p-1 text-neutral-500 hover:text-primary-500 rounded-full"
          >
            <PlusIcon className="h-5 w-5" />
          </Button>
        </div>
        
        <div className="relative mb-4">
          <SearchIcon className="absolute left-3 top-2.5 h-4 w-4 text-neutral-400" />
          <Input
            type="text"
            placeholder="Search stories..."
            className="pl-8 pr-4 py-2 w-full bg-neutral-100 rounded-md text-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        {/* Stories List */}
        <div className="space-y-1 mb-6">
          {filteredStories.map(story => (
            <Link href={`/story/${story.id}`} key={story.id}>
              <a className={cn(
                "px-2 py-1.5 rounded-md flex items-center",
                story.isActive 
                  ? "bg-primary-50 text-primary-700" 
                  : "hover:bg-neutral-100 cursor-pointer text-neutral-600"
              )}>
                {story.isActive ? (
                  <BookOpenIcon className="h-4 w-4 mr-2" />
                ) : (
                  <BookIcon className="h-4 w-4 mr-2" />
                )}
                <span className={story.isActive ? "font-medium" : ""}>{story.title || "Untitled Story"}</span>
              </a>
            </Link>
          ))}
        </div>
        
        {currentStory && (
          <div className="border-t border-neutral-200 pt-4">
            <h3 className="font-medium text-neutral-700 mb-2">Current Story</h3>
            
            {/* Chapters List */}
            <div className="space-y-1 pl-2">
              <div className="text-sm font-medium text-primary-600 mb-1">Chapters</div>
              
              {chapters.map(chapter => (
                <div 
                  key={chapter.id}
                  className={cn(
                    "group px-2 py-1 rounded-md flex items-center justify-between",
                    chapter.isActive 
                      ? "bg-primary-50" 
                      : "hover:bg-neutral-100 cursor-pointer"
                  )}
                  onClick={() => onSelectChapter(chapter.id)}
                >
                  <span className={cn(
                    "text-sm",
                    chapter.isActive 
                      ? "font-medium text-primary-700" 
                      : "text-neutral-700"
                  )}>
                    {chapter.order || '?'}. {chapter.title || 'Untitled Chapter'}
                  </span>
                  <div className="opacity-0 group-hover:opacity-100">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="p-1 text-xs text-neutral-400 hover:text-neutral-600"
                    >
                      <MoreVerticalIcon className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
              
              <Button 
                variant="link" 
                size="sm" 
                onClick={onAddChapter}
                className="mt-2 text-sm text-primary-600 hover:text-primary-700 flex items-center"
              >
                <PlusIcon className="h-3 w-3 mr-1" />
                <span>Add new chapter</span>
              </Button>
            </div>
            
            <div className="mt-4">
              <div className="text-sm font-medium text-primary-600 mb-1">Characters</div>
              
              {/* Characters List */}
              <div className="space-y-1 pl-2">
                {characters.map(character => (
                  <div 
                    key={character.id}
                    className="group px-2 py-1 rounded-md hover:bg-neutral-100 cursor-pointer flex items-center text-sm text-neutral-700"
                    onClick={() => onSelectCharacter(character.id)}
                  >
                    <div 
                      className="w-4 h-4 rounded-full mr-2" 
                      style={{ backgroundColor: character.color || '#cccccc' }}
                    />
                    <span>{character.name || 'Unnamed Character'}</span>
                  </div>
                ))}
                
                <Button 
                  variant="link" 
                  size="sm" 
                  onClick={onAddCharacter}
                  className="mt-1 text-sm text-primary-600 hover:text-primary-700 flex items-center"
                >
                  <PlusIcon className="h-3 w-3 mr-1" />
                  <span>Add character</span>
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
