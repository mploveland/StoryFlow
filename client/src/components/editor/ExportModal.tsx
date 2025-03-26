import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DownloadIcon, FileText, FileJson, FilePdf, Book } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  story: any;
  chapters: any[];
}

const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  story,
  chapters
}) => {
  const { toast } = useToast();
  const [format, setFormat] = useState('docx');
  const [isExporting, setIsExporting] = useState(false);
  const [includeMetadata, setIncludeMetadata] = useState(true);
  const [includeVersions, setIncludeVersions] = useState(false);
  const [selectedChapters, setSelectedChapters] = useState<number[]>([]);

  // Reset selected chapters when chapters change
  React.useEffect(() => {
    if (chapters.length > 0) {
      setSelectedChapters(chapters.map(chapter => chapter.id));
    }
  }, [chapters]);

  const handleSelectAllChapters = (checked: boolean) => {
    if (checked) {
      setSelectedChapters(chapters.map(chapter => chapter.id));
    } else {
      setSelectedChapters([]);
    }
  };

  const handleChapterToggle = (chapterId: number, checked: boolean) => {
    if (checked) {
      setSelectedChapters(prev => [...prev, chapterId]);
    } else {
      setSelectedChapters(prev => prev.filter(id => id !== chapterId));
    }
  };

  const getFormatIcon = () => {
    switch (format) {
      case 'docx':
        return <FileText className="h-5 w-5 text-blue-500" />;
      case 'pdf':
        return <FilePdf className="h-5 w-5 text-red-500" />;
      case 'epub':
        return <Book className="h-5 w-5 text-green-500" />;
      case 'json':
        return <FileJson className="h-5 w-5 text-yellow-500" />;
      default:
        return <FileText className="h-5 w-5" />;
    }
  };

  const handleExport = () => {
    if (selectedChapters.length === 0) {
      toast({
        title: 'No chapters selected',
        description: 'Please select at least one chapter to export.',
        variant: 'destructive',
      });
      return;
    }

    setIsExporting(true);
    
    // Simulate export process
    setTimeout(() => {
      setIsExporting(false);
      toast({
        title: 'Export complete',
        description: `Your story has been exported as ${format.toUpperCase()}.`,
      });
      onClose();
    }, 1500);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DownloadIcon className="h-5 w-5 text-primary-500" />
            <span>Export Story</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Export Format</Label>
            <Select value={format} onValueChange={setFormat}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="docx">Word Document (.docx)</SelectItem>
                <SelectItem value="pdf">PDF Document (.pdf)</SelectItem>
                <SelectItem value="epub">E-Book (.epub)</SelectItem>
                <SelectItem value="json">JSON Data (.json)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Export Options</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="metadata" 
                  checked={includeMetadata} 
                  onCheckedChange={(checked) => setIncludeMetadata(checked as boolean)}
                />
                <Label htmlFor="metadata" className="cursor-pointer">Include story metadata (title, genre, etc.)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="versions" 
                  checked={includeVersions} 
                  onCheckedChange={(checked) => setIncludeVersions(checked as boolean)}
                />
                <Label htmlFor="versions" className="cursor-pointer">Include version history</Label>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Chapters to Export</Label>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="select-all" 
                  checked={selectedChapters.length === chapters.length}
                  onCheckedChange={handleSelectAllChapters}
                />
                <Label htmlFor="select-all" className="text-sm cursor-pointer">Select All</Label>
              </div>
            </div>
            <div className="max-h-40 overflow-y-auto space-y-2 border rounded-md p-2">
              {chapters.length === 0 ? (
                <p className="text-sm text-neutral-500 text-center py-2">No chapters available</p>
              ) : (
                chapters.map(chapter => (
                  <div key={chapter.id} className="flex items-center space-x-2">
                    <Checkbox 
                      id={`chapter-${chapter.id}`} 
                      checked={selectedChapters.includes(chapter.id)}
                      onCheckedChange={(checked) => handleChapterToggle(chapter.id, checked as boolean)}
                    />
                    <Label htmlFor={`chapter-${chapter.id}`} className="cursor-pointer">
                      {chapter.order}. {chapter.title}
                    </Label>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="mt-6">
          <div className="flex items-center mr-auto gap-2">
            {getFormatIcon()}
            <span className="text-sm text-neutral-600">
              {format.toUpperCase()} format
            </span>
          </div>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleExport} 
            disabled={isExporting || selectedChapters.length === 0}
          >
            {isExporting ? 'Exporting...' : 'Export'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ExportModal;
