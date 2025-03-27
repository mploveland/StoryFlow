import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BookOpen, Palette, Users, Sparkles, Map, Flame } from "lucide-react";
import { GenreDetails } from '@/lib/openai';
import { WorldData } from '../world/WorldDesigner';
import { CharacterData } from '../character/CharacterBuilder';

interface StageSidebarProps {
  stages: {
    genre: {
      isComplete: boolean;
      details?: GenreDetails;
    };
    world: {
      isComplete: boolean;
      details?: Partial<WorldData>;
    };
    characters: {
      isComplete: boolean;
      details?: Partial<CharacterData>[] | CharacterData[];
    };
    influences: {
      isComplete: boolean;
      items?: string[];
    };
    details: {
      isComplete: boolean;
    };
  };
  onStageSelect: (stage: 'genre' | 'world' | 'characters' | 'influences' | 'details' | 'ready') => void;
  currentStage: 'genre' | 'world' | 'characters' | 'influences' | 'details' | 'ready';
}

export function StageSidebar({ stages, onStageSelect, currentStage }: StageSidebarProps) {
  return (
    <div className="w-64 border-r border-border bg-card h-[calc(100vh-4rem)] flex flex-col">
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold">Story Creation</h2>
        <p className="text-sm text-muted-foreground">Progress through each stage</p>
      </div>
      
      <ScrollArea className="flex-1 px-2">
        <div className="space-y-3 py-3">
          {/* Genre Stage Card */}
          <StageCard 
            icon={<BookOpen className="h-5 w-5" />}
            title="Genre"
            description={stages.genre?.details?.name || "Define your story's genre"}
            isComplete={stages.genre?.isComplete || false}
            isActive={currentStage === 'genre'}
            onClick={() => onStageSelect('genre')}
            details={stages.genre?.details ? [
              `Name: ${stages.genre.details.name}`,
              `Themes: ${stages.genre.details.themes?.slice(0, 2).join(', ')}...`,
            ] : []}
          />
          
          {/* World Stage Card */}
          <StageCard 
            icon={<Map className="h-5 w-5" />}
            title="World"
            description={stages.world?.details?.name || "Build your story world"}
            isComplete={stages.world?.isComplete || false}
            isActive={currentStage === 'world'}
            onClick={() => onStageSelect('world')}
            details={stages.world?.details?.name ? [
              `Name: ${stages.world.details.name}`,
              `Setting: ${stages.world.details.setting || 'Various'}`,
              stages.world.details.regions ? `Regions: ${stages.world.details.regions.slice(0, 2).join(', ')}...` : '',
            ].filter(Boolean) : []}
          />
          
          {/* Characters Stage Card */}
          <StageCard 
            icon={<Users className="h-5 w-5" />}
            title="Characters"
            description={`${stages.characters?.details?.length || 0} character(s) created`}
            isComplete={stages.characters?.isComplete || false}
            isActive={currentStage === 'characters'}
            onClick={() => onStageSelect('characters')}
            details={stages.characters?.details?.length ? 
              stages.characters.details.slice(0, 2).map(char => 
                `${char.name || 'Unnamed'} (${char.role || 'Unknown role'})`
              ) : []}
          />
          
          {/* Influences Stage Card */}
          <StageCard 
            icon={<Sparkles className="h-5 w-5" />}
            title="Influences"
            description="Story inspirations & references"
            isComplete={stages.influences?.isComplete || false}
            isActive={currentStage === 'influences'}
            onClick={() => onStageSelect('influences')}
            details={stages.influences?.items?.length ? 
              stages.influences.items.slice(0, 3).map(item => `• ${item}`) : []}
          />
          
          {/* Final Details Stage Card */}
          <StageCard 
            icon={<Flame className="h-5 w-5" />}
            title="Details"
            description="Final story elements"
            isComplete={stages.details?.isComplete || false}
            isActive={currentStage === 'details'}
            onClick={() => onStageSelect('details')}
            details={[]}
          />
        </div>
      </ScrollArea>
      
      <div className="p-4 border-t">
        <Button 
          variant="default" 
          className="w-full"
          disabled={!isReadyToStart(stages)}
          onClick={() => onStageSelect('ready' as any)}
        >
          Begin Story Experience
        </Button>
      </div>
    </div>
  );
}

interface StageCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  isComplete: boolean;
  isActive: boolean;
  onClick: () => void;
  details: string[];
}

function StageCard({ icon, title, description, isComplete, isActive, onClick, details }: StageCardProps) {
  return (
    <Card 
      className={`
        transition-all hover:border-primary cursor-pointer
        ${isActive ? 'border-primary bg-primary/5' : ''}
        ${isComplete ? 'border-primary/50' : ''}
      `}
      onClick={onClick}
    >
      <CardHeader className="p-4 pb-2 flex flex-row items-center space-y-0 gap-3">
        <div className={`
          rounded-full p-2 
          ${isComplete ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}
        `}>
          {icon}
        </div>
        <div>
          <CardTitle className="text-sm flex items-center gap-2">
            {title}
            {isComplete && (
              <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                Complete
              </span>
            )}
          </CardTitle>
          <CardDescription className="text-xs">{description}</CardDescription>
        </div>
      </CardHeader>
      
      {details.length > 0 && (
        <CardContent className="p-4 pt-0">
          <div className="text-xs text-muted-foreground">
            {details.map((detail, idx) => (
              <div key={idx} className="line-clamp-1">{detail}</div>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

function isReadyToStart(stages: StageSidebarProps['stages']) {
  return stages.genre?.isComplete && 
         stages.world?.isComplete && 
         stages.characters?.isComplete;
}