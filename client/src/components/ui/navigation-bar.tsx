import React from 'react';
import { Link, useLocation } from 'wouter';
import { 
  Home, 
  Book, 
  Settings, 
  PanelLeft, 
  BookText, 
  Mic,
  User,
  LogOut
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

const NavigationBar = () => {
  const [location] = useLocation();
  
  return (
    <nav className="bg-white border-b px-6 py-3 flex justify-between items-center">
      <div className="flex items-center space-x-2">
        <span className="font-bold text-xl text-primary-700">StoryFlow</span>
      </div>
      
      <div className="hidden sm:flex space-x-1">
        <Link href="/dashboard">
          <Button
            variant={location === '/dashboard' ? 'default' : 'ghost'}
            size="sm"
            className="flex items-center gap-2"
          >
            <Home className="h-4 w-4" />
            <span>Dashboard</span>
          </Button>
        </Link>
        
        <Link href="/settings">
          <Button
            variant={location === '/settings' ? 'default' : 'ghost'}
            size="sm"
            className="flex items-center gap-2"
          >
            <Settings className="h-4 w-4" />
            <span>Settings</span>
          </Button>
        </Link>
      </div>
      
      {/* Mobile navigation */}
      <div className="sm:hidden">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <User className="h-4 w-4" />
              <span className="ml-2">Menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <Link href="/dashboard">
              <DropdownMenuItem className="cursor-pointer">
                <Home className="h-4 w-4 mr-2" />
                <span>Dashboard</span>
              </DropdownMenuItem>
            </Link>
            
            <DropdownMenuSeparator />
            
            <Link href="/settings">
              <DropdownMenuItem className="cursor-pointer">
                <Settings className="h-4 w-4 mr-2" />
                <span>Settings</span>
              </DropdownMenuItem>
            </Link>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  );
};

export default NavigationBar;