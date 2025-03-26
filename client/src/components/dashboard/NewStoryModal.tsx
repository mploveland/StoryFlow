import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { BookOpen } from 'lucide-react';

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
  const [title, setTitle] = useState('');
  const [genre, setGenre] = useState('');
  const [theme, setTheme] = useState('');
  const [setting, setSetting] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreateStory({
      title: title.trim(),
      genre: genre.trim() || undefined,
      theme: theme.trim() || undefined,
      setting: setting.trim() || undefined
    });
  };

  const resetForm = () => {
    setTitle('');
    setGenre('');
    setTheme('');
    setSetting('');
  };

  // Reset form when modal is opened/closed
  React.useEffect(() => {
    if (!isOpen) {
      resetForm();
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary-500" />
            <span>Create New Story</span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="title">Story Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter a title for your story"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="genre">Genre</Label>
              <Input
                id="genre"
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
                placeholder="e.g., Fantasy, Mystery, Science Fiction"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="theme">Theme</Label>
              <Input
                id="theme"
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                placeholder="e.g., Redemption, Coming of age, Loss"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="setting">Setting</Label>
              <Textarea
                id="setting"
                value={setting}
                onChange={(e) => setSetting(e.target.value)}
                placeholder="Describe the world where your story takes place"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button variant="outline" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={!title.trim() || isPending}
            >
              {isPending ? 'Creating...' : 'Create Story'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default NewStoryModal;
