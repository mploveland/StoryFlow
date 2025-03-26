import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useLocation } from 'wouter';
import { Mic, Sparkles, BookOpen } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface NewStoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateStory: (storyData: { 
    title: string; 
    genre?: string; 
    theme?: string; 
    setting?: string; 
  }) => void;
  isPending: boolean;
}

const NewStoryModal: React.FC<NewStoryModalProps> = ({
  isOpen,
  onClose,
  onCreateStory,
  isPending
}) => {
  const [, navigate] = useLocation();
  const [title, setTitle] = useState('');
  
  const redirectToVoiceMode = () => {
    onClose();
    navigate('/voice-story');
  };
  
  const handleQuickStart = () => {
    // Create a basic story with a generic title
    if (!title.trim()) {
      setTitle('My Untitled Story');
    }
    
    onCreateStory({
      title: title.trim() || 'My Untitled Story',
    });
  };

  // Reset form when modal is opened/closed
  useEffect(() => {
    if (!isOpen) {
      setTitle('');
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary-500" />
            <span>Get Started with StoryFlow</span>
          </DialogTitle>
        </DialogHeader>

        <div className="my-6 flex flex-col gap-6">
          <Card className="shadow-md hover:shadow-lg transition-shadow cursor-pointer border-2 border-primary-200" onClick={redirectToVoiceMode}>
            <CardContent className="p-6 flex flex-col items-center text-center">
              <div className="bg-primary-100 rounded-full p-3 mb-4">
                <Mic className="h-8 w-8 text-primary-600" />
              </div>
              <h3 className="text-xl font-bold mb-2 text-primary-700">Voice-Guided Experience</h3>
              <p className="text-neutral-600 mb-3">
                Create your story naturally through conversation with our AI guide. No forms, no structure - just talk and let your ideas flow.
              </p>
              <Badge className="bg-primary-600">Recommended</Badge>
            </CardContent>
          </Card>
          
          <div className="text-center">
            <p className="text-neutral-500 mb-4">—OR—</p>
            <div className="space-y-3">
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Quick story title (optional)"
                className="mb-3"
              />
              <Button 
                onClick={handleQuickStart} 
                disabled={isPending}
                className="w-full"
              >
                {isPending ? 'Creating...' : 'Create Quick Story'}
              </Button>
              <p className="text-xs text-neutral-500 mt-2">
                Creates a blank story you can develop later.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="flex justify-between items-center">
          <p className="text-xs text-neutral-500">
            Voice-guided creation is the recommended experience.
          </p>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default NewStoryModal;
