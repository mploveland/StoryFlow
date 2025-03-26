import React from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DownloadIcon,
  HistoryIcon,
  SettingsIcon,
  UsersIcon,
  MenuIcon
} from 'lucide-react';

interface TopNavigationProps {
  onToggleSidebar: () => void;
  onOpenVersionHistory: () => void;
  onOpenCollaborate: () => void;
  user?: {
    displayName?: string;
    username: string;
  };
}

const TopNavigation: React.FC<TopNavigationProps> = ({
  onToggleSidebar,
  onOpenVersionHistory,
  onOpenCollaborate,
  user
}) => {
  const userName = user?.displayName || user?.username || 'User';
  const userInitials = userName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);

  return (
    <header className="bg-white border-b border-neutral-200 px-4 py-2 flex items-center justify-between sticky top-0 z-10">
      <div className="flex items-center space-x-2">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onToggleSidebar}
          className="md:hidden text-neutral-500 hover:text-primary-500"
        >
          <MenuIcon className="h-5 w-5" />
        </Button>
        <div className="flex items-center">
          <span className="text-primary-600 text-xl font-bold">StoryFlow</span>
        </div>
      </div>
      
      <div className="flex items-center space-x-1">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onOpenVersionHistory}
          className="py-1 px-3 text-sm text-neutral-600 hover:bg-neutral-100 rounded-md flex items-center"
        >
          <HistoryIcon className="h-4 w-4 mr-2" />
          <span className="hidden sm:inline">Version History</span>
        </Button>
        
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onOpenCollaborate}
          className="py-1 px-3 text-sm text-neutral-600 hover:bg-neutral-100 rounded-md flex items-center"
        >
          <UsersIcon className="h-4 w-4 mr-2" />
          <span className="hidden sm:inline">Collaborate</span>
        </Button>
        
        <Button 
          variant="ghost" 
          size="sm" 
          className="py-1 px-3 text-sm text-neutral-600 hover:bg-neutral-100 rounded-md flex items-center"
        >
          <DownloadIcon className="h-4 w-4 mr-2" />
          <span className="hidden sm:inline">Export</span>
        </Button>
        
        <Button 
          variant="ghost" 
          size="icon"
          className="p-2 text-neutral-600 hover:bg-neutral-100 rounded-full"
        >
          <SettingsIcon className="h-5 w-5" />
        </Button>
        
        <div className="ml-2 relative">
          <Avatar className="h-8 w-8 bg-primary-600">
            <AvatarFallback>{userInitials}</AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  );
};

export default TopNavigation;
