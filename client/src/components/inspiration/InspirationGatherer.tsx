import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BookOpen, FileText, Upload, RefreshCw, Trash2, Plus, X, SearchIcon, BookIcon, UserIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export interface InspirationData {
  authors: string[];
  bookTitles: string[];
  genres: string[];
  thematicElements: string[];
  uploadedEbooks: File[];
  researchNotes: string;
}

interface InspirationGathererProps {
  onInspirationComplete: (data: InspirationData) => void;
}

const InspirationGatherer: React.FC<InspirationGathererProps> = ({ onInspirationComplete }) => {
  const { toast } = useToast();
  const [inspirationData, setInspirationData] = useState<InspirationData>({
    authors: [],
    bookTitles: [],
    genres: [],
    thematicElements: [],
    uploadedEbooks: [],
    researchNotes: '',
  });
  
  const [authorInput, setAuthorInput] = useState('');
  const [bookInput, setBookInput] = useState('');
  const [genreInput, setGenreInput] = useState('');
  const [themeInput, setThemeInput] = useState('');
  const [activeTab, setActiveTab] = useState('manual');
  const [isResearching, setIsResearching] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Add an author to the list
  const addAuthor = () => {
    if (authorInput.trim() === '') return;
    if (inspirationData.authors.includes(authorInput.trim())) {
      toast({
        title: "Already Added",
        description: `"${authorInput}" is already in your inspiration list.`,
      });
      return;
    }
    setInspirationData({
      ...inspirationData,
      authors: [...inspirationData.authors, authorInput.trim()],
    });
    setAuthorInput('');
  };

  // Add a book title to the list
  const addBook = () => {
    if (bookInput.trim() === '') return;
    if (inspirationData.bookTitles.includes(bookInput.trim())) {
      toast({
        title: "Already Added",
        description: `"${bookInput}" is already in your inspiration list.`,
      });
      return;
    }
    setInspirationData({
      ...inspirationData,
      bookTitles: [...inspirationData.bookTitles, bookInput.trim()],
    });
    setBookInput('');
  };

  // Add a genre to the list
  const addGenre = () => {
    if (genreInput.trim() === '') return;
    if (inspirationData.genres.includes(genreInput.trim())) {
      toast({
        title: "Already Added",
        description: `"${genreInput}" is already in your inspiration list.`,
      });
      return;
    }
    setInspirationData({
      ...inspirationData,
      genres: [...inspirationData.genres, genreInput.trim()],
    });
    setGenreInput('');
  };

  // Add a thematic element to the list
  const addTheme = () => {
    if (themeInput.trim() === '') return;
    if (inspirationData.thematicElements.includes(themeInput.trim())) {
      toast({
        title: "Already Added",
        description: `"${themeInput}" is already in your inspiration list.`,
      });
      return;
    }
    setInspirationData({
      ...inspirationData,
      thematicElements: [...inspirationData.thematicElements, themeInput.trim()],
    });
    setThemeInput('');
  };

  // Remove an item from any array in the inspiration data
  const removeItem = (type: keyof InspirationData, index: number) => {
    if (Array.isArray(inspirationData[type])) {
      const newArray = [...(inspirationData[type] as any[])];
      newArray.splice(index, 1);
      setInspirationData({
        ...inspirationData,
        [type]: newArray,
      });
    }
  };

  // Handle ebook upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    // Filter for ebook formats (epub, mobi, pdf)
    const validFiles = Array.from(files).filter(file => 
      file.name.endsWith('.epub') || 
      file.name.endsWith('.mobi') || 
      file.name.endsWith('.pdf') ||
      file.name.endsWith('.txt')
    );

    if (validFiles.length !== files.length) {
      toast({
        title: "Invalid File Format",
        description: "Only ebook formats (epub, mobi, pdf) and text files are accepted.",
        variant: "destructive",
      });
    }

    if (validFiles.length > 0) {
      setIsUploading(true);
      
      // Simulate upload process
      setTimeout(() => {
        setInspirationData({
          ...inspirationData,
          uploadedEbooks: [...inspirationData.uploadedEbooks, ...validFiles],
        });
        setIsUploading(false);
        toast({
          title: "Upload Complete",
          description: `Successfully uploaded ${validFiles.length} file(s).`,
        });
      }, 1500);
    }
  };

  // Remove an uploaded ebook
  const removeEbook = (index: number) => {
    const newEbooks = [...inspirationData.uploadedEbooks];
    newEbooks.splice(index, 1);
    setInspirationData({
      ...inspirationData,
      uploadedEbooks: newEbooks,
    });
  };

  // Simulate research process
  const conductResearch = () => {
    if (
      inspirationData.authors.length === 0 &&
      inspirationData.bookTitles.length === 0 &&
      inspirationData.genres.length === 0 &&
      inspirationData.thematicElements.length === 0 &&
      inspirationData.uploadedEbooks.length === 0
    ) {
      toast({
        title: "No Inspiration Sources",
        description: "Please add at least one author, book, genre, theme, or upload an ebook first.",
        variant: "destructive",
      });
      return;
    }

    setIsResearching(true);
    
    // Simulate AI research process
    setTimeout(() => {
      // In a real implementation, this would call the OpenAI API
      const researchedNotes = `Based on your inspirations (${inspirationData.authors.join(', ')}, ${inspirationData.bookTitles.join(', ')}, ${inspirationData.genres.join(', ')}), we've gathered the following insights:\n\n`;
      
      const authorNotes = inspirationData.authors.length > 0 
        ? `AUTHORS:\n${inspirationData.authors.map(author => `- ${author}: Known for vivid descriptions, complex characters, and intricate plots that explore themes of identity and belonging.\n`).join('')}\n`
        : '';
        
      const bookNotes = inspirationData.bookTitles.length > 0
        ? `BOOKS:\n${inspirationData.bookTitles.map(book => `- ${book}: A compelling narrative set in a richly detailed world with complex social structures and magical/technological systems.\n`).join('')}\n`
        : '';
        
      const genreNotes = inspirationData.genres.length > 0
        ? `GENRES:\n${inspirationData.genres.map(genre => `- ${genre}: Characterized by specific tropes, pacing, and thematic elements that resonate with readers seeking this type of story.\n`).join('')}\n`
        : '';
        
      const themeNotes = inspirationData.thematicElements.length > 0
        ? `THEMES:\n${inspirationData.thematicElements.map(theme => `- ${theme}: A central motif that can be explored through character arcs, world-building, and plot developments.\n`).join('')}\n`
        : '';
        
      const ebookNotes = inspirationData.uploadedEbooks.length > 0
        ? `UPLOADED CONTENT:\n${inspirationData.uploadedEbooks.map(ebook => `- ${ebook.name}: Analysis complete. Key elements extracted for world-building, character development, and narrative style.\n`).join('')}\n`
        : '';
      
      const combinedNotes = researchedNotes + authorNotes + bookNotes + genreNotes + themeNotes + ebookNotes;
      
      setInspirationData({
        ...inspirationData,
        researchNotes: combinedNotes,
      });
      
      setIsResearching(false);
      
      toast({
        title: "Research Complete",
        description: "We've gathered insights based on your inspirations to help craft your story.",
      });
    }, 3000);
  };

  // Complete the inspiration gathering phase
  const completeInspiration = () => {
    if (
      inspirationData.authors.length === 0 &&
      inspirationData.bookTitles.length === 0 &&
      inspirationData.genres.length === 0 &&
      inspirationData.thematicElements.length === 0 &&
      inspirationData.uploadedEbooks.length === 0
    ) {
      toast({
        title: "No Inspiration Sources",
        description: "Please add at least one author, book, genre, theme, or upload an ebook first.",
        variant: "destructive",
      });
      return;
    }

    if (inspirationData.researchNotes === '') {
      toast({
        title: "Research Required",
        description: "Please conduct research on your inspiration sources first.",
        variant: "destructive",
      });
      return;
    }

    onInspirationComplete(inspirationData);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto px-4">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-primary mb-2">Find Your Inspiration</h1>
        <p className="text-muted-foreground">
          Start by collecting inspirations from your favorite authors, books, and genres.
          Our AI will analyze these to help craft your unique story world.
        </p>
      </div>

      <Tabs defaultValue="manual" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-2 mb-4">
          <TabsTrigger value="manual">
            <FileText className="h-4 w-4 mr-2" />
            Manual Input
          </TabsTrigger>
          <TabsTrigger value="upload">
            <Upload className="h-4 w-4 mr-2" />
            Upload Content
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="manual" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <UserIcon className="h-5 w-5 mr-2 text-primary" />
                  Authors
                </CardTitle>
                <CardDescription>
                  Add authors whose writing style inspires you
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex mb-2">
                  <Input 
                    placeholder="Enter author name" 
                    value={authorInput}
                    onChange={(e) => setAuthorInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addAuthor();
                      }
                    }}
                  />
                  <Button 
                    variant="outline" 
                    size="icon" 
                    className="ml-2" 
                    onClick={addAuthor}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {inspirationData.authors.map((author, index) => (
                    <Badge 
                      key={index} 
                      variant="secondary"
                      className="flex items-center gap-1 px-3 py-1"
                    >
                      {author}
                      <X 
                        className="h-3 w-3 cursor-pointer" 
                        onClick={() => removeItem('authors', index)}
                      />
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BookIcon className="h-5 w-5 mr-2 text-primary" />
                  Books
                </CardTitle>
                <CardDescription>
                  Add books with elements you'd like to incorporate
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex mb-2">
                  <Input 
                    placeholder="Enter book title" 
                    value={bookInput}
                    onChange={(e) => setBookInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addBook();
                      }
                    }}
                  />
                  <Button 
                    variant="outline" 
                    size="icon" 
                    className="ml-2" 
                    onClick={addBook}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {inspirationData.bookTitles.map((book, index) => (
                    <Badge 
                      key={index} 
                      variant="secondary"
                      className="flex items-center gap-1 px-3 py-1"
                    >
                      {book}
                      <X 
                        className="h-3 w-3 cursor-pointer" 
                        onClick={() => removeItem('bookTitles', index)}
                      />
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BookOpen className="h-5 w-5 mr-2 text-primary" />
                  Genres
                </CardTitle>
                <CardDescription>
                  Select genres that match your story's style
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex mb-2">
                  <Input 
                    placeholder="Enter genre" 
                    value={genreInput}
                    onChange={(e) => setGenreInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addGenre();
                      }
                    }}
                  />
                  <Button 
                    variant="outline" 
                    size="icon" 
                    className="ml-2" 
                    onClick={addGenre}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {inspirationData.genres.map((genre, index) => (
                    <Badge 
                      key={index} 
                      variant="secondary"
                      className="flex items-center gap-1 px-3 py-1"
                    >
                      {genre}
                      <X 
                        className="h-3 w-3 cursor-pointer" 
                        onClick={() => removeItem('genres', index)}
                      />
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <SearchIcon className="h-5 w-5 mr-2 text-primary" />
                  Thematic Elements
                </CardTitle>
                <CardDescription>
                  Add specific themes you'd like to explore
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex mb-2">
                  <Input 
                    placeholder="Enter theme (e.g., 'redemption')" 
                    value={themeInput}
                    onChange={(e) => setThemeInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addTheme();
                      }
                    }}
                  />
                  <Button 
                    variant="outline" 
                    size="icon" 
                    className="ml-2" 
                    onClick={addTheme}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {inspirationData.thematicElements.map((theme, index) => (
                    <Badge 
                      key={index} 
                      variant="secondary"
                      className="flex items-center gap-1 px-3 py-1"
                    >
                      {theme}
                      <X 
                        className="h-3 w-3 cursor-pointer" 
                        onClick={() => removeItem('thematicElements', index)}
                      />
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="upload" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Upload Ebooks for Inspiration</CardTitle>
              <CardDescription>
                Upload ebooks (epub, mobi, pdf) or text files to extract world-building, characters, and thematic elements
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border-2 border-dashed rounded-lg p-6 text-center">
                <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="mb-2 text-sm text-muted-foreground">
                  Drag and drop your files here or click to browse
                </p>
                <input
                  type="file"
                  id="ebook-upload"
                  multiple
                  className="hidden"
                  onChange={handleFileUpload}
                  accept=".epub,.mobi,.pdf,.txt"
                />
                <Button 
                  variant="outline" 
                  onClick={() => document.getElementById('ebook-upload')?.click()}
                  disabled={isUploading}
                >
                  {isUploading ? 'Uploading...' : 'Select Files'}
                </Button>
              </div>
              
              {inspirationData.uploadedEbooks.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-sm font-medium mb-2">Uploaded Files</h3>
                  <div className="space-y-2">
                    {inspirationData.uploadedEbooks.map((file, index) => (
                      <div key={index} className="flex justify-between items-center p-2 border rounded">
                        <span className="text-sm">{file.name}</span>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => removeEbook(index)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <RefreshCw className="h-5 w-5 mr-2 text-primary" />
            Research & Analysis
          </CardTitle>
          <CardDescription>
            Our AI will analyze your inspiration sources to extract valuable insights
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            className="w-full mb-4" 
            onClick={conductResearch}
            disabled={isResearching}
          >
            {isResearching ? 'Researching...' : 'Conduct Research'}
          </Button>
          
          <Textarea 
            value={inspirationData.researchNotes} 
            onChange={(e) => setInspirationData({...inspirationData, researchNotes: e.target.value})}
            placeholder="Research results will appear here..."
            className="min-h-[200px]"
            readOnly={true}
          />
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button 
          size="lg" 
          onClick={completeInspiration}
          disabled={isResearching || isUploading}
        >
          Continue to World Building
        </Button>
      </div>
    </div>
  );
};

export default InspirationGatherer;