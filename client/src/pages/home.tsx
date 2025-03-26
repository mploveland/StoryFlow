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
    navigate('/voice-story');
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
              Experience <span className="text-primary-600">Voice-Driven</span> AI Storytelling
            </h1>
            <p className="text-lg md:text-xl text-neutral-600 max-w-3xl mx-auto mb-8">
              StoryFlow creates immersive stories through natural conversation. Just talk to our AI,
              share your interests, and co-create a world of adventure through voice and chat.
            </p>
            <Button size="lg" onClick={handleGetStarted} className="text-lg px-8 py-6">
              Begin Your Adventure
            </Button>
          </div>
        </section>

        <section className="py-16 bg-white">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-12">Key Features</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              <FeatureCard 
                icon="🌍"
                title="World Designer"
                description="Create immersive worlds with AI-generated historical contexts, geography, and culture."
              />
              <FeatureCard 
                icon="👤"
                title="Character Builder"
                description="Generate detailed character profiles with psychological depth and meaningful backgrounds."
              />
              <FeatureCard 
                icon="🎭"
                title="Interactive Storytelling"
                description="Guide the narrative through choices that shape how your adventure unfolds."
              />
              <FeatureCard 
                icon="🎙️"
                title="Voice & Chat Interface"
                description="Experience stories through natural conversation with AI characters and storytellers."
              />
              <FeatureCard 
                icon="👥"
                title="Multi-User Adventures"
                description="Share story sessions with friends for collaborative decision-making."
              />
              <FeatureCard 
                icon="📱"
                title="Multi-Format Export"
                description="Save your adventures as text, audio files, or visual summaries to revisit later."
              />
            </div>
          </div>
        </section>

        <section className="py-16 bg-neutral-50">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold mb-8">Ready to Embark on an AI-Crafted Adventure?</h2>
            <Button size="lg" onClick={handleGetStarted} className="text-lg px-8 py-6">
              Create Your World Now
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
