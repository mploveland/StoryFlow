import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { X, Upload, UserCircle, Check } from 'lucide-react';

interface CharacterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (character: {
    name: string;
    role?: string;
    traits: string[];
    description: string;
    secrets?: string;
    color: string;
  }) => void;
  initialCharacter?: {
    name: string;
    role?: string;
    traits: string[];
    description: string;
    secrets?: string;
    color: string;
  };
}

const DEFAULT_COLORS = [
  '#3B82F6', // blue
  '#EF4444', // red
  '#10B981', // green
  '#8B5CF6', // purple
  '#F59E0B', // amber
  '#EC4899', // pink
  '#6366F1', // indigo
  '#14B8A6', // teal
];

const CharacterModal: React.FC<CharacterModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialCharacter
}) => {
  const [name, setName] = useState(initialCharacter?.name || '');
  const [role, setRole] = useState(initialCharacter?.role || 'Supporting Character');
  const [traits, setTraits] = useState<string[]>(initialCharacter?.traits || []);
  const [traitInput, setTraitInput] = useState('');
  const [description, setDescription] = useState(initialCharacter?.description || '');
  const [secrets, setSecrets] = useState(initialCharacter?.secrets || '');
  const [color, setColor] = useState(initialCharacter?.color || DEFAULT_COLORS[0]);

  const handleAddTrait = () => {
    if (traitInput.trim() && !traits.includes(traitInput.trim())) {
      setTraits([...traits, traitInput.trim()]);
      setTraitInput('');
    }
  };

  const handleRemoveTrait = (trait: string) => {
    setTraits(traits.filter(t => t !== trait));
  };

  const handleSubmit = () => {
    if (!name.trim() || !description.trim()) return;
    
    onSave({
      name: name.trim(),
      role: role,
      traits,
      description: description.trim(),
      secrets: secrets.trim(),
      color
    });
    
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && traitInput) {
      e.preventDefault();
      handleAddTrait();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-neutral-800">
            {initialCharacter ? 'Edit Character' : 'Create New Character'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
          <div>
            <div className="mb-4">
              <Label htmlFor="char-name" className="block text-sm font-medium text-neutral-700 mb-1">
                Character Name
              </Label>
              <Input 
                id="char-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full"
              />
            </div>
            
            <div className="mb-4">
              <Label htmlFor="char-role" className="block text-sm font-medium text-neutral-700 mb-1">
                Role in Story
              </Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Protagonist">Protagonist</SelectItem>
                  <SelectItem value="Antagonist">Antagonist</SelectItem>
                  <SelectItem value="Supporting Character">Supporting Character</SelectItem>
                  <SelectItem value="Mentor">Mentor</SelectItem>
                  <SelectItem value="Love Interest">Love Interest</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="mb-4">
              <Label htmlFor="char-traits" className="block text-sm font-medium text-neutral-700 mb-1">
                Personality Traits
              </Label>
              <div className="flex flex-wrap gap-2 mb-2">
                {traits.map((trait, index) => (
                  <span 
                    key={index}
                    className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs flex items-center"
                  >
                    {trait} 
                    <button 
                      className="ml-1 text-blue-500 hover:text-blue-700"
                      onClick={() => handleRemoveTrait(trait)}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex">
                <Input
                  id="char-traits"
                  value={traitInput}
                  onChange={(e) => setTraitInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Add trait..."
                  className="flex-1"
                />
                <Button 
                  variant="outline" 
                  onClick={handleAddTrait}
                  disabled={!traitInput.trim()}
                  className="ml-2"
                >
                  <Check className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <div>
              <Label htmlFor="char-desc" className="block text-sm font-medium text-neutral-700 mb-1">
                Character Description
              </Label>
              <Textarea
                id="char-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your character..."
                className="w-full h-24"
              />
            </div>
          </div>
          
          <div>
            <div className="mb-4">
              <Label className="block text-sm font-medium text-neutral-700 mb-1">
                AI Character Persona
              </Label>
              <div className="bg-neutral-50 p-3 rounded-md border border-neutral-200">
                <p className="text-sm text-neutral-600 mb-2">This character will become an AI persona that you can interact with:</p>
                <ul className="text-xs text-neutral-600 space-y-1">
                  <li className="flex items-start">
                    <Check className="h-3 w-3 text-green-500 mr-2 mt-0.5" />
                    <span>Chat with your character for insights</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="h-3 w-3 text-green-500 mr-2 mt-0.5" />
                    <span>Ask how they would respond in scenes</span>
                  </li>
                  <li className="flex items-start">
                    <Check className="h-3 w-3 text-green-500 mr-2 mt-0.5" />
                    <span>Write from their perspective</span>
                  </li>
                </ul>
              </div>
            </div>
            
            <div className="mb-4">
              <Label className="block text-sm font-medium text-neutral-700 mb-1">
                Character Color
              </Label>
              <div className="flex flex-wrap gap-2">
                {DEFAULT_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`w-8 h-8 rounded-full ${color === c ? 'ring-2 ring-offset-2 ring-neutral-400' : ''}`}
                    style={{ backgroundColor: c }}
                    onClick={() => setColor(c)}
                    aria-label={`Select color ${c}`}
                  />
                ))}
              </div>
            </div>
            
            <div className="mb-4">
              <Label className="block text-sm font-medium text-neutral-700 mb-1">
                Character Avatar
              </Label>
              <div className="border-2 border-dashed border-neutral-300 rounded-md p-4 text-center">
                <div className="w-20 h-20 mx-auto bg-neutral-200 rounded-full flex items-center justify-center mb-2 overflow-hidden">
                  <UserCircle className="h-12 w-12 text-neutral-400" />
                </div>
                <Button variant="outline" size="sm" className="px-3 py-1.5 text-sm">
                  <Upload className="h-3 w-3 mr-2" />
                  Upload Image
                </Button>
                <p className="text-xs text-neutral-500 mt-2">or drag and drop</p>
              </div>
            </div>
            
            <div>
              <Label htmlFor="char-secrets" className="block text-sm font-medium text-neutral-700 mb-1">
                Character Secrets & Motivations
              </Label>
              <Textarea
                id="char-secrets"
                value={secrets}
                onChange={(e) => setSecrets(e.target.value)}
                placeholder="What drives this character? What are they hiding?"
                className="w-full h-24"
              />
            </div>
          </div>
        </div>
        
        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!name.trim() || !description.trim()}>
            {initialCharacter ? 'Update Character' : 'Create Character'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CharacterModal;
