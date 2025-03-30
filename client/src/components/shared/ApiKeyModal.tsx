import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  provider: 'elevenlabs' | 'openai';
  onSaveApiKey: (apiKey: string) => Promise<boolean>; // Return success (true) or failure (false)
}

export function ApiKeyModal({ isOpen, onClose, provider, onSaveApiKey }: ApiKeyModalProps) {
  const [apiKey, setApiKey] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setApiKey('');
      setError(null);
    }
  }, [isOpen]);
  
  const handleSave = async () => {
    if (!apiKey.trim()) {
      setError('Please enter a valid API key');
      return;
    }
    
    setIsSaving(true);
    setError(null);
    
    try {
      const success = await onSaveApiKey(apiKey);
      
      if (success) {
        onClose();
      } else {
        setError('Failed to validate API key. Please check if it is correct.');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred saving the API key');
    } finally {
      setIsSaving(false);
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {provider === 'elevenlabs' ? 'ElevenLabs' : 'OpenAI'} API Key Required
          </DialogTitle>
          <DialogDescription>
            Please enter your {provider === 'elevenlabs' ? 'ElevenLabs' : 'OpenAI'} API key to 
            enable voice generation functionality.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="api-key">API Key</Label>
            <Input
              id="api-key"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={provider === 'elevenlabs' ? 'Enter your ElevenLabs API key' : 'Enter your OpenAI API key (sk-...)'}
              className="col-span-3"
            />
            {error && (
              <p className="text-sm text-red-500 mt-1">{error}</p>
            )}
          </div>
          
          <div>
            <p className="text-xs text-muted-foreground">
              {provider === 'elevenlabs' ? (
                <>
                  You can find your ElevenLabs API key in your ElevenLabs account 
                  settings. <a 
                    href="https://elevenlabs.io/app/account" 
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline"
                  >
                    Go to ElevenLabs Account
                  </a>
                </>
              ) : (
                <>
                  You can find your OpenAI API key in your OpenAI account dashboard. 
                  <a 
                    href="https://platform.openai.com/account/api-keys" 
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline"
                  >
                    Go to OpenAI Dashboard
                  </a>
                </>
              )}
            </p>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save API Key'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ApiKeyModal;