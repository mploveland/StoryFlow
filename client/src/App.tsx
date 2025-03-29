import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Dashboard from "@/pages/dashboard";
import StoryEditor from "@/pages/story-editor";
import StoryCreation from "@/pages/story-creation";
import VoiceStoryCreation from "@/pages/voice-story-creation";
// Import Foundation component pages
import FoundationDetails from "@/pages/foundation-details";
import WorldDetails from "@/pages/world-details";
import GenreDetails from "@/pages/genre-details";
import CharacterDetails from "@/pages/character-details";
import { AuthProvider } from "@/contexts/AuthContext";
import { EditorProvider } from "@/contexts/EditorContext";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/dashboard" component={Dashboard} />
      {/* Foundation-centric pages */}
      <Route path="/foundation-details" component={FoundationDetails} />
      <Route path="/foundation/:id" component={FoundationDetails} />
      <Route path="/world-details" component={WorldDetails} />
      <Route path="/world-details/:id" component={WorldDetails} />
      <Route path="/genre-details" component={GenreDetails} />
      <Route path="/genre-details/:id" component={GenreDetails} />
      <Route path="/character-details" component={CharacterDetails} />
      <Route path="/character-details/:id" component={CharacterDetails} />
      {/* Story creation and editing */}
      <Route path="/create-story" component={VoiceStoryCreation} />
      <Route path="/voice-story" component={VoiceStoryCreation} />
      <Route path="/voice-story-creation" component={VoiceStoryCreation} />
      {/* Keep the structured form component available but not as default */}
      <Route path="/structured-story" component={StoryCreation} />
      <Route path="/story/:storyId" component={StoryEditor} />
      <Route path="/story/:storyId/chapter/:chapterId" component={StoryEditor} />
      {/* Legacy routes - keep for backward compatibility */}
      <Route path="/world/:id" component={WorldDetails} />
      <Route path="/character/:id" component={CharacterDetails} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <EditorProvider>
          <Router />
          <Toaster />
        </EditorProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
