import React from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Save, 
  UserEdit, 
  Wand2, 
  ChevronLeft, 
  ChevronRight 
} from 'lucide-react';
import { format } from 'date-fns';

export interface Version {
  id: number;
  content: string;
  wordCount: number;
  type: 'auto' | 'manual' | 'ai-assisted';
  createdAt: Date;
}

interface VersionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  versions: Version[];
  onRestoreVersion: (versionId: number) => void;
  onCompareVersion: (versionId: number) => void;
}

const VersionHistoryModal: React.FC<VersionHistoryModalProps> = ({
  isOpen,
  onClose,
  versions,
  onRestoreVersion,
  onCompareVersion
}) => {
  const getVersionIcon = (type: Version['type']) => {
    switch (type) {
      case 'auto':
        return <Save className="h-6 w-6 text-primary-600" />;
      case 'manual':
        return <UserEdit className="h-6 w-6 text-blue-600" />;
      case 'ai-assisted':
        return <Wand2 className="h-6 w-6 text-purple-600" />;
      default:
        return <Save className="h-6 w-6 text-primary-600" />;
    }
  };

  const getVersionTitle = (type: Version['type']) => {
    switch (type) {
      case 'auto':
        return 'Auto-saved version';
      case 'manual':
        return 'Manual save by you';
      case 'ai-assisted':
        return 'AI-assisted edits';
      default:
        return 'Saved version';
    }
  };

  const getVersionColor = (type: Version['type']) => {
    switch (type) {
      case 'auto':
        return 'bg-primary-100';
      case 'manual':
        return 'bg-blue-100';
      case 'ai-assisted':
        return 'bg-purple-100';
      default:
        return 'bg-neutral-100';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="p-4 border-b border-neutral-200">
          <DialogTitle className="text-xl font-semibold text-neutral-800">Version History</DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto">
          {versions.length === 0 ? (
            <div className="text-center p-10 text-neutral-500">
              <p>No version history available yet</p>
            </div>
          ) : (
            <div className="relative pl-8 border-l-2 border-neutral-200 p-4">
              {versions.map((version) => (
                <div key={version.id} className="mb-6 relative">
                  <div className={`absolute -left-[25px] w-12 h-12 ${getVersionColor(version.type)} rounded-full flex items-center justify-center border-4 border-white`}>
                    {getVersionIcon(version.type)}
                  </div>
                  <div className="pt-1">
                    <div className="flex justify-between items-center mb-1">
                      <h4 className="font-medium text-neutral-800">{getVersionTitle(version.type)}</h4>
                      <span className="text-sm text-neutral-500">
                        {format(new Date(version.createdAt), 'PPp')}
                      </span>
                    </div>
                    <div className="text-sm text-neutral-600 mb-2">{version.wordCount} words</div>
                    <div className="bg-neutral-50 p-3 rounded-md border border-neutral-200 text-sm text-neutral-700 max-h-28 overflow-y-auto">
                      <p dangerouslySetInnerHTML={{ __html: version.content.substring(0, 250) + '...' }} />
                    </div>
                    <div className="mt-3 flex space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => onRestoreVersion(version.id)}
                        className="px-3 py-1 text-xs text-primary-600 bg-primary-50 hover:bg-primary-100 rounded-md"
                      >
                        Restore this version
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => onCompareVersion(version.id)}
                        className="px-3 py-1 text-xs text-neutral-600 hover:bg-neutral-100 rounded-md"
                      >
                        Compare to current
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {versions.length > 0 && (
          <div className="border-t border-neutral-200 p-3 flex justify-between">
            <Button variant="outline" size="sm" disabled>
              <ChevronLeft className="h-4 w-4 mr-2" />
              Newer
            </Button>
            <Button variant="outline" size="sm" disabled>
              Older
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default VersionHistoryModal;
