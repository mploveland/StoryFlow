import React from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

const Home: React.FC = () => {
  const [, navigate] = useLocation();
  const { user, login } = useAuth();

  React.useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleGetStarted = async () => {
    // For demo purposes, login as demo user
    await login('demo', 'password');
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero section */}
      <header className="bg-white border-b border-neutral-200">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center">
            <span className="text-primary-600 text-2xl font-bold">StoryFlow</span>
          </div>
          <div>
            <Button onClick={handleGetStarted}>Get Started</Button>
          </div>
        </div>
      </header>

      <main className="flex-grow">
        <section className="py-16 md:py-24 bg-gradient-to-b from-white to-neutral-50">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-neutral-900 mb-6">
              Create Stories With <span className="text-primary-600">AI</span> As Your Co-Author
            </h1>
            <p className="text-lg md:text-xl text-neutral-600 max-w-3xl mx-auto mb-8">
              StoryFlow helps you write better stories with AI-powered suggestions, character personas, 
              voice input, and collaborative tools.
            </p>
            <Button size="lg" onClick={handleGetStarted} className="text-lg px-8 py-6">
              Start Writing Now
            </Button>
          </div>
        </section>

        <section className="py-16 bg-white">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-12">Key Features</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              <FeatureCard 
                icon="🎙️"
                title="Voice Input & Output"
                description="Dictate your story and hear it read back like an audiobook."
              />
              <FeatureCard 
                icon="👤"
                title="AI Character Personas"
                description="Create detailed characters and chat with them to develop your story."
              />
              <FeatureCard 
                icon="✍️"
                title="Co-Writing with AI"
                description="Get suggestions, scene ideas, and help with writer's block."
              />
              <FeatureCard 
                icon="🔄"
                title="Version History"
                description="Track changes and revisions with easy version control."
              />
              <FeatureCard 
                icon="👥"
                title="Collaboration Tools"
                description="Work with co-authors in real-time or asynchronously."
              />
              <FeatureCard 
                icon="📊"
                title="Writing Analytics"
                description="Track progress, set goals, and get feedback on your writing."
              />
            </div>
          </div>
        </section>

        <section className="py-16 bg-neutral-50">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold mb-8">Ready to Transform Your Writing?</h2>
            <Button size="lg" onClick={handleGetStarted} className="text-lg px-8 py-6">
              Start Your Story Now
            </Button>
          </div>
        </section>
      </main>

      <footer className="bg-neutral-800 text-neutral-300 py-8">
        <div className="container mx-auto px-4 text-center">
          <p>&copy; {new Date().getFullYear()} StoryFlow. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

interface FeatureCardProps {
  icon: string;
  title: string;
  description: string;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ icon, title, description }) => {
  return (
    <div className="bg-white border border-neutral-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="text-4xl mb-4">{icon}</div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-neutral-600">{description}</p>
    </div>
  );
};

export default Home;
