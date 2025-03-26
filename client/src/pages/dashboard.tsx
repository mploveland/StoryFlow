import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/contexts/AuthContext';
import NewStoryModal from '@/components/dashboard/NewStoryModal';
import { BookOpen, Plus, Search } from 'lucide-react';
import { Story } from '@shared/schema';

const Dashboard: React.FC = () => {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isNewStoryModalOpen, setIsNewStoryModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    // Redirect to home if not logged in
    if (!user) {
      navigate('/');
    }
  }, [user, navigate]);

  // Query stories
  const { data: stories = [], isLoading, error, refetch } = useQuery({
    queryKey: [`/api/stories?userId=${user?.id}`],
    enabled: !!user,
  });

  // Create story mutation
  const createStoryMutation = useMutation({
    mutationFn: async (storyData: { title: string; genre?: string; theme?: string; setting?: string }) => {
      const response = await apiRequest('POST', '/api/stories', {
        ...storyData,
        userId: user?.id,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Story created successfully',
        description: 'Your new story has been created.',
      });
      refetch();
      setIsNewStoryModalOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to create story',
        description: error.message || 'An error occurred while creating your story.',
        variant: 'destructive',
      });
    },
  });

  const handleCreateStory = (storyData: { title: string; genre?: string; theme?: string; setting?: string }) => {
    createStoryMutation.mutate(storyData);
  };

  const handleOpenStory = (storyId: number) => {
    navigate(`/story/${storyId}`);
  };

  // Filter stories based on search query
  const filteredStories = searchQuery
    ? stories.filter((story: Story) =>
        story.title.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : stories;

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="bg-white border-b border-neutral-200 py-4">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <h1 className="text-primary-600 text-2xl font-bold">StoryFlow</h1>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-neutral-600">
              Welcome, {user?.displayName || user?.username || 'Writer'}
            </span>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-neutral-800">My Stories</h2>
          <Button onClick={() => setIsNewStoryModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Story
          </Button>
        </div>

        <div className="relative max-w-md mb-8">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400 h-4 w-4" />
          <Input
            type="text"
            placeholder="Search stories..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="bg-white shadow-sm h-48 animate-pulse">
                <CardContent className="p-6">
                  <div className="h-6 bg-neutral-200 rounded w-3/4 mb-4"></div>
                  <div className="h-4 bg-neutral-200 rounded w-1/2 mb-2"></div>
                  <div className="h-4 bg-neutral-200 rounded w-1/3 mb-2"></div>
                  <div className="h-4 bg-neutral-200 rounded w-2/3 mb-2"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : error ? (
          <div className="text-center p-8 bg-white rounded-lg shadow">
            <p className="text-neutral-600 mb-4">Failed to load your stories.</p>
            <Button onClick={() => refetch()}>Try Again</Button>
          </div>
        ) : filteredStories.length === 0 ? (
          <div className="text-center p-12 bg-white rounded-lg shadow-sm border border-neutral-200">
            {searchQuery ? (
              <>
                <p className="text-neutral-600 mb-4">No stories found matching "{searchQuery}"</p>
                <Button variant="outline" onClick={() => setSearchQuery('')}>
                  Clear Search
                </Button>
              </>
            ) : (
              <>
                <h3 className="text-xl font-bold text-neutral-800 mb-4">You don't have any stories yet</h3>
                <p className="text-neutral-600 mb-6">
                  Create your first story to get started with StoryFlow.
                </p>
                <Button onClick={() => setIsNewStoryModalOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Story
                </Button>
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredStories.map((story: Story) => (
              <Card 
                key={story.id} 
                className="bg-white shadow-sm hover:shadow transition-shadow cursor-pointer"
                onClick={() => handleOpenStory(story.id)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-neutral-800 mb-2">{story.title}</h3>
                      {story.genre && (
                        <p className="text-sm text-neutral-500 mb-1">Genre: {story.genre}</p>
                      )}
                      {story.updatedAt && (
                        <p className="text-sm text-neutral-500">
                          Last updated: {new Date(story.updatedAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <BookOpen className="h-5 w-5 text-primary-500" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <NewStoryModal
        isOpen={isNewStoryModalOpen}
        onClose={() => setIsNewStoryModalOpen(false)}
        onCreateStory={handleCreateStory}
        isPending={createStoryMutation.isPending}
      />
    </div>
  );
};

export default Dashboard;
