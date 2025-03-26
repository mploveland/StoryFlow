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
import { AuthProvider } from "@/contexts/AuthContext";
import { EditorProvider } from "@/contexts/EditorContext";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/create-story" component={StoryCreation} />
      <Route path="/voice-story" component={VoiceStoryCreation} />
      <Route path="/story/:storyId" component={StoryEditor} />
      <Route path="/story/:storyId/chapter/:chapterId" component={StoryEditor} />
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
