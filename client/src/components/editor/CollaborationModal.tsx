import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Copy, Share2, Users, UserPlus, Mail } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CollaborationModalProps {
  isOpen: boolean;
  onClose: () => void;
  storyId: number;
}

const CollaborationModal: React.FC<CollaborationModalProps> = ({
  isOpen,
  onClose,
  storyId
}) => {
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('editor');
  const [inviteStatus, setInviteStatus] = useState<'idle' | 'sending' | 'sent'>('idle');

  const shareUrl = `${window.location.origin}/story/${storyId}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    toast({
      title: 'Link copied',
      description: 'The sharing link has been copied to your clipboard.',
    });
  };

  const handleSendInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    
    setInviteStatus('sending');
    // Simulate sending invitation
    setTimeout(() => {
      setInviteStatus('sent');
      toast({
        title: 'Invitation sent',
        description: `An invitation has been sent to ${email}.`,
      });
      setEmail('');
      setRole('editor');
      setTimeout(() => setInviteStatus('idle'), 2000);
    }, 1000);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary-500" />
            <span>Collaborate on Story</span>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="invite">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="invite">Invite Collaborators</TabsTrigger>
            <TabsTrigger value="share">Share Link</TabsTrigger>
          </TabsList>
          
          <TabsContent value="invite" className="space-y-4 py-4">
            <form onSubmit={handleSendInvite}>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <div className="flex gap-2">
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Collaborator's email"
                      required
                    />
                    <Button 
                      type="submit" 
                      disabled={!email || inviteStatus !== 'idle'}
                    >
                      {inviteStatus === 'idle' && <Mail className="h-4 w-4 mr-2" />}
                      {inviteStatus === 'idle' && 'Invite'}
                      {inviteStatus === 'sending' && 'Sending...'}
                      {inviteStatus === 'sent' && 'Sent!'}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Collaboration Role</Label>
                  <RadioGroup value={role} onValueChange={setRole}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="editor" id="editor" />
                      <Label htmlFor="editor" className="cursor-pointer">Editor (can edit and comment)</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="viewer" id="viewer" />
                      <Label htmlFor="viewer" className="cursor-pointer">Viewer (can only comment)</Label>
                    </div>
                  </RadioGroup>
                </div>
              </div>
            </form>

            <div className="mt-6 pt-6 border-t border-neutral-200">
              <h3 className="text-sm font-medium mb-2">Current Collaborators</h3>
              <div className="text-center py-6 text-neutral-500 text-sm">
                <p>No collaborators yet</p>
                <p className="mt-1">Invite someone to collaborate on this story</p>
                <UserPlus className="mx-auto mt-2 h-6 w-6 text-neutral-400" />
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="share" className="space-y-4 py-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Shareable Link</Label>
                <div className="flex gap-2">
                  <Input
                    value={shareUrl}
                    readOnly
                    className="bg-neutral-50"
                  />
                  <Button 
                    variant="outline" 
                    onClick={handleCopyLink}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="mt-6 space-y-2">
                <Label>Share Options</Label>
                <RadioGroup defaultValue="private">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="private" id="private" />
                    <Label htmlFor="private" className="cursor-pointer">Private - Only collaborators can access</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="link" id="link" disabled />
                    <Label htmlFor="link" className="cursor-pointer text-neutral-500">Anyone with the link (Coming soon)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="public" id="public" disabled />
                    <Label htmlFor="public" className="cursor-pointer text-neutral-500">Public - Anyone can find (Coming soon)</Label>
                  </div>
                </RadioGroup>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-neutral-200 text-center">
              <Share2 className="mx-auto h-8 w-8 text-primary-400 mb-2" />
              <p className="text-sm text-neutral-600">
                Share your story with collaborators to get feedback and suggestions
              </p>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-4">
          <Button onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CollaborationModal;
