import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Save, 
  UserPen, 
  Wand2, 
  ChevronLeft, 
  ChevronRight, 
  Clock,
  Search,
  ArrowLeftRight,
  XCircle
} from 'lucide-react';
import { format, differenceInMinutes, differenceInHours, differenceInDays } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Toggle } from "@/components/ui/toggle";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";

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

interface DiffResult {
  added: string[];
  removed: string[];
  unchanged: string[];
}

const VersionHistoryModal: React.FC<VersionHistoryModalProps> = ({
  isOpen,
  onClose,
  versions,
  onRestoreVersion,
  onCompareVersion
}) => {
  const [activeTab, setActiveTab] = useState<string>("timeline");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [selectedVersion, setSelectedVersion] = useState<Version | null>(null);
  const [currentVersion, setCurrentVersion] = useState<Version | null>(null);
  const [isComparing, setIsComparing] = useState<boolean>(false);
  const [diffResult, setDiffResult] = useState<DiffResult | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [timelineZoom, setTimelineZoom] = useState<number>(1);
  const [showAllVersions, setShowAllVersions] = useState<boolean>(true);

  // Sort versions by date (newest first)
  const sortedVersions = useMemo(() => {
    return [...versions].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [versions]);

  // Get most recent version as current
  useEffect(() => {
    if (sortedVersions.length > 0 && !currentVersion) {
      setCurrentVersion(sortedVersions[0]);
    }
  }, [sortedVersions, currentVersion]);

  // Filter versions based on search and type filters
  const filteredVersions = useMemo(() => {
    let filtered = sortedVersions;
    
    // Filter by search term if present
    if (searchTerm.trim() !== "") {
      filtered = filtered.filter(v => 
        v.content.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Filter by type if not showing all
    if (!showAllVersions) {
      filtered = filtered.filter(v => v.type === 'manual');
    }
    
    return filtered;
  }, [sortedVersions, searchTerm, showAllVersions]);

  // Pagination
  const ITEMS_PER_PAGE = 5;
  const totalPages = Math.ceil(filteredVersions.length / ITEMS_PER_PAGE);
  const paginatedVersions = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredVersions.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredVersions, currentPage]);
  
  const handlePrevPage = () => {
    setCurrentPage(prev => Math.max(prev - 1, 1));
  };
  
  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(prev + 1, totalPages));
  };

  // Simple diff algorithm to compare version content
  const computeDiff = (oldContent: string, newContent: string): DiffResult => {
    // Split content into paragraphs for comparison
    const oldParagraphs = oldContent.split('</p>').map(p => p.replace(/<p>/g, '').trim()).filter(Boolean);
    const newParagraphs = newContent.split('</p>').map(p => p.replace(/<p>/g, '').trim()).filter(Boolean);
    
    const added = newParagraphs.filter(p => !oldParagraphs.includes(p));
    const removed = oldParagraphs.filter(p => !newParagraphs.includes(p));
    const unchanged = newParagraphs.filter(p => oldParagraphs.includes(p));
    
    return { added, removed, unchanged };
  };

  // Handle compare action
  const handleCompare = () => {
    if (selectedVersion && currentVersion) {
      const diff = computeDiff(selectedVersion.content, currentVersion.content);
      setDiffResult(diff);
      setIsComparing(true);
    }
  };

  // Reset comparison
  const handleCloseCompare = () => {
    setIsComparing(false);
    setDiffResult(null);
  };

  // Helper functions for UI
  const getVersionIcon = (type: Version['type']) => {
    switch (type) {
      case 'auto':
        return <Save className="h-6 w-6 text-primary-600" />;
      case 'manual':
        return <UserPen className="h-6 w-6 text-blue-600" />;
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
  
  // Get a human-readable time difference
  const getTimeDiff = (date: Date): string => {
    const now = new Date();
    const minutes = differenceInMinutes(now, new Date(date));
    const hours = differenceInHours(now, new Date(date));
    const days = differenceInDays(now, new Date(date));
    
    if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
    if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    return `${days} day${days !== 1 ? 's' : ''} ago`;
  };
  
  // Calculate a percentage for timeline visualization
  const calculateTimelinePosition = (date: Date, allDates: Date[]): number => {
    if (allDates.length <= 1) return 50;
    
    // Sort dates from oldest to newest
    const sortedDates = allDates.map(d => new Date(d).getTime()).sort((a, b) => a - b);
    const oldest = sortedDates[0];
    const newest = sortedDates[sortedDates.length - 1];
    const range = newest - oldest;
    
    // Prevent division by zero
    if (range === 0) return 50;
    
    const dateTime = new Date(date).getTime();
    const percentage = ((dateTime - oldest) / range) * 100;
    
    return percentage;
  };
  
  // Generate version timeline data
  const timelineData = useMemo(() => {
    const allDates = versions.map(v => v.createdAt);
    return versions.map(version => ({
      ...version,
      position: calculateTimelinePosition(version.createdAt, allDates)
    }));
  }, [versions]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="p-4 border-b border-neutral-200">
          <DialogTitle className="text-xl font-semibold text-neutral-800">Version History</DialogTitle>
        </DialogHeader>
        
        {isComparing ? (
          // Comparison View
          <div className="flex-1 overflow-hidden flex flex-col">
            <div className="p-4 bg-neutral-50 border-b flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <ArrowLeftRight className="h-5 w-5 text-primary-600" />
                <h3 className="font-medium">Comparing Versions</h3>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleCloseCompare}
                className="text-neutral-600"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Close Comparison
              </Button>
            </div>
            
            <div className="grid grid-cols-2 gap-4 p-4 flex-1 overflow-auto">
              <div className="bg-white rounded-md border shadow-sm p-4">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-semibold text-neutral-700">Previous Version</h4>
                  <span className="text-sm text-neutral-500">
                    {selectedVersion && format(new Date(selectedVersion.createdAt), 'MMM d, h:mm a')}
                  </span>
                </div>
                <div className="text-sm text-neutral-600 overflow-auto max-h-[500px]">
                  {diffResult?.removed.map((text, i) => (
                    <p key={i} className="bg-red-50 p-2 mb-2 border-l-2 border-red-400 rounded">
                      {text}
                    </p>
                  ))}
                  {diffResult?.unchanged.map((text, i) => (
                    <p key={`unchanged-previous-${i}`} className="p-2 mb-2">
                      {text}
                    </p>
                  ))}
                </div>
              </div>
              
              <div className="bg-white rounded-md border shadow-sm p-4">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-semibold text-neutral-700">Current Version</h4>
                  <span className="text-sm text-neutral-500">
                    {currentVersion && format(new Date(currentVersion.createdAt), 'MMM d, h:mm a')}
                  </span>
                </div>
                <div className="text-sm text-neutral-600 overflow-auto max-h-[500px]">
                  {diffResult?.added.map((text, i) => (
                    <p key={i} className="bg-green-50 p-2 mb-2 border-l-2 border-green-400 rounded">
                      {text}
                    </p>
                  ))}
                  {diffResult?.unchanged.map((text, i) => (
                    <p key={`unchanged-current-${i}`} className="p-2 mb-2">
                      {text}
                    </p>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="p-4 border-t">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  if (selectedVersion) {
                    onRestoreVersion(selectedVersion.id);
                    handleCloseCompare();
                  }
                }}
                className="px-3 py-1 text-primary-600 hover:bg-primary-50"
              >
                Restore Previous Version
              </Button>
            </div>
          </div>
        ) : (
          // Regular Version History View
          <div className="flex-1 overflow-hidden flex flex-col">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
              <div className="px-4 pt-2 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <TabsList>
                  <TabsTrigger value="timeline" className="flex items-center">
                    <Clock className="h-4 w-4 mr-2" /> Timeline
                  </TabsTrigger>
                  <TabsTrigger value="list" className="flex items-center">
                    <Save className="h-4 w-4 mr-2" /> List View
                  </TabsTrigger>
                </TabsList>
                
                <div className="flex items-center gap-2 pb-2 sm:pb-0">
                  <div className="relative w-full sm:w-40">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-neutral-400" />
                    <Input
                      placeholder="Search versions..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8 h-9 text-sm"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="show-all"
                      checked={showAllVersions}
                      onCheckedChange={setShowAllVersions}
                    />
                    <Label htmlFor="show-all" className="text-xs">Show Auto-saves</Label>
                  </div>
                </div>
              </div>
              
              <TabsContent value="timeline" className="flex-1 overflow-hidden flex flex-col p-0 mt-0">
                <div className="p-4">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-neutral-700 font-medium">Visual Timeline</h3>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-neutral-500">Zoom:</span>
                      <Slider
                        value={[timelineZoom]}
                        onValueChange={([value]) => setTimelineZoom(value)}
                        min={0.5}
                        max={2}
                        step={0.1}
                        className="w-24"
                      />
                    </div>
                  </div>
                  
                  {/* Timeline visualization */}
                  <div className="bg-neutral-50 rounded-lg border p-4 overflow-x-auto">
                    <div 
                      className="relative h-16 min-w-full" 
                      style={{ 
                        width: `${100 * timelineZoom}%`,
                        minWidth: "100%" 
                      }}
                    >
                      <div className="absolute top-0 left-0 right-0 h-0.5 bg-neutral-200 top-8"></div>
                      {timelineData.map((version, index) => (
                        <div
                          key={version.id}
                          className={`absolute cursor-pointer transform -translate-x-1/2`}
                          style={{ 
                            left: `${version.position}%`, 
                            top: index % 2 === 0 ? 0 : "50%" 
                          }}
                          onClick={() => setSelectedVersion(version)}
                        >
                          <div 
                            className={`
                              ${getVersionColor(version.type)} 
                              rounded-full w-8 h-8 flex items-center justify-center border-2 
                              ${selectedVersion?.id === version.id ? 'border-primary-600 ring-2 ring-primary-200' : 'border-white'}
                              shadow-sm transition-all hover:scale-110
                            `}
                          >
                            {getVersionIcon(version.type)}
                          </div>
                          <div className="absolute transform -translate-x-1/2 left-1/2 text-xs text-neutral-600 whitespace-nowrap mt-1 font-medium">
                            {format(new Date(version.createdAt), 'h:mm a')}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4">
                  {selectedVersion ? (
                    <div className="bg-white rounded-lg border shadow-sm p-4">
                      <div className="flex justify-between items-center mb-3">
                        <div className="flex items-center space-x-2">
                          <div className={`w-8 h-8 ${getVersionColor(selectedVersion.type)} rounded-full flex items-center justify-center`}>
                            {getVersionIcon(selectedVersion.type)}
                          </div>
                          <h3 className="font-medium">{getVersionTitle(selectedVersion.type)}</h3>
                        </div>
                        <span className="text-sm text-neutral-500">{getTimeDiff(selectedVersion.createdAt)}</span>
                      </div>
                      
                      <div className="text-sm text-neutral-600 mb-3">{selectedVersion.wordCount} words</div>
                      
                      <div className="bg-neutral-50 p-3 rounded-md border border-neutral-200 text-sm text-neutral-700 max-h-48 overflow-y-auto mb-4">
                        <div dangerouslySetInnerHTML={{ __html: selectedVersion.content }} />
                      </div>
                      
                      <div className="flex space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => onRestoreVersion(selectedVersion.id)}
                          className="px-3 py-1 text-primary-600 bg-primary-50 hover:bg-primary-100"
                        >
                          Restore this version
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={handleCompare}
                          className="px-3 py-1 text-neutral-600 hover:bg-neutral-100"
                        >
                          Compare to current
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center p-10 text-neutral-500 bg-neutral-50 rounded-lg border">
                      <p>Select a version from the timeline to view details</p>
                    </div>
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="list" className="flex-1 overflow-hidden flex flex-col p-0 mt-0">
                <div className="flex-1 overflow-y-auto">
                  {filteredVersions.length === 0 ? (
                    <div className="text-center p-10 text-neutral-500">
                      <p>No version history available</p>
                    </div>
                  ) : (
                    <div className="relative pl-8 border-l-2 border-neutral-200 p-4">
                      {paginatedVersions.map((version) => (
                        <div 
                          key={version.id} 
                          className={`
                            mb-6 relative p-3 rounded-lg
                            ${selectedVersion?.id === version.id ? 'bg-neutral-50 border border-neutral-200' : ''}
                          `}
                          onClick={() => setSelectedVersion(version)}
                        >
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
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onRestoreVersion(version.id);
                                }}
                                className="px-3 py-1 text-xs text-primary-600 bg-primary-50 hover:bg-primary-100 rounded-md"
                              >
                                Restore this version
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedVersion(version);
                                  handleCompare();
                                }}
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
                
                {filteredVersions.length > ITEMS_PER_PAGE && (
                  <div className="border-t border-neutral-200 p-3 flex justify-between">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handlePrevPage}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4 mr-2" />
                      Newer
                    </Button>
                    <span className="text-sm text-neutral-600">{`Page ${currentPage} of ${totalPages}`}</span>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleNextPage}
                      disabled={currentPage === totalPages}
                    >
                      Older
                      <ChevronRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default VersionHistoryModal;
