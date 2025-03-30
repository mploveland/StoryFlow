import React, { useState } from 'react';
import { VoiceOption } from '@/lib/tts';
import { useTTS } from '@/hooks/useTTS';
import useSpeechRecognition from '@/hooks/useSpeechRecognition';
import { updateApiKey } from '@/lib/settings';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Volume2, Mic, Save, RotateCcw, RefreshCw } from 'lucide-react';
import { AudioPlayer } from '@/components/ui/audio-player';

// Create a test sound function
function playTestSound() {
  console.log("Playing test sound");
  
  // Create oscillator for simple beep
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) {
      console.error("AudioContext not supported");
      return;
    }
    
    const audioContext = new AudioContext();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.type = 'sine';
    oscillator.frequency.value = 440; // 440 Hz = A4 note
    gainNode.gain.value = 0.5; // Half volume
    
    oscillator.start();
    
    // Stop after 1 second
    setTimeout(() => {
      oscillator.stop();
      audioContext.close();
    }, 1000);
    
    console.log("Test sound started");
  } catch (error) {
    console.error("Error playing test sound:", error);
  }
}

const Settings = () => {
  const { toast } = useToast();
  
  // Text-to-speech state and hooks
  const {
    speak,
    stop: stopSpeaking,
    isPlaying,
    voices,
    voicesLoading,
    selectedVoice,
    changeVoice,
    currentAudioUrl,
    playbackSpeed,
    changePlaybackSpeed,
    apiKeyError,
    clearApiKeyError
  } = useTTS();
  
  // Speech recognition hooks
  const {
    transcript,
    isListening,
    supported: browserSupportsSpeechRecognition,
    start: startListening,
    stop: stopListening,
    clear: resetTranscript
  } = useSpeechRecognition();
  
  // API key state
  const [openAIKey, setOpenAIKey] = useState('');
  const [elevenLabsKey, setElevenLabsKey] = useState('');
  const [isSavingKey, setIsSavingKey] = useState(false);
  
  // TTS test message
  const [testMessage, setTestMessage] = useState("This is a test of the text-to-speech system. The quick brown fox jumps over the lazy dog.");
  
  // STT test state
  const [transcriptResult, setTranscriptResult] = useState('');
  
  // Audio settings
  const [preferOpenAI, setPreferOpenAI] = useState(true);
  const [autoPlay, setAutoPlay] = useState(true);
  
  // Save API key handler
  const saveApiKey = async (provider: 'openai' | 'elevenlabs', key: string) => {
    if (!key || key.trim().length < 10) {
      toast({
        title: 'Invalid API Key',
        description: 'Please enter a valid API key',
        variant: 'destructive'
      });
      return;
    }
    
    setIsSavingKey(true);
    try {
      await updateApiKey(provider, key);
      toast({
        title: 'API Key Updated',
        description: `Your ${provider === 'openai' ? 'OpenAI' : 'ElevenLabs'} API key has been updated successfully.`,
      });
      
      // Clear form
      if (provider === 'openai') setOpenAIKey('');
      else setElevenLabsKey('');
    } catch (error) {
      toast({
        title: 'Error Updating API Key',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive'
      });
    } finally {
      setIsSavingKey(false);
    }
  };
  
  // Test speech recognition
  const handleSpeechRecognitionTest = () => {
    if (isListening) {
      stopListening();
      setTranscriptResult(transcript);
      resetTranscript();
    } else {
      resetTranscript();
      setTranscriptResult('');
      startListening();
    }
  };
  
  // Group voices by provider
  const openaiVoices = voices.filter(voice => voice.provider === 'openai');
  const elevenLabsVoices = voices.filter(voice => voice.provider === 'elevenlabs');
  
  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Settings</h1>
        <p className="text-neutral-600">Configure your StoryFlow application settings</p>
      </div>
      
      <Tabs defaultValue="audio" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="audio">Audio & Voice</TabsTrigger>
          <TabsTrigger value="api-keys">API Keys</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
        </TabsList>
        
        {/* Audio & Voice Settings */}
        <TabsContent value="audio" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Text-to-Speech Settings</CardTitle>
              <CardDescription>Configure how the application reads text aloud</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Provider preference */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="prefer-openai">Prefer OpenAI voices</Label>
                  <Switch 
                    id="prefer-openai" 
                    checked={preferOpenAI} 
                    onCheckedChange={setPreferOpenAI} 
                  />
                </div>
                <p className="text-sm text-neutral-500">
                  {preferOpenAI 
                    ? "OpenAI voices will be used by default when available" 
                    : "ElevenLabs voices will be used by default when available"}
                </p>
              </div>
              
              <Separator />
              
              {/* Auto-play setting */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="auto-play">Auto-play assistant messages</Label>
                  <Switch 
                    id="auto-play" 
                    checked={autoPlay} 
                    onCheckedChange={setAutoPlay} 
                  />
                </div>
                <p className="text-sm text-neutral-500">
                  When enabled, the assistant's messages will be read aloud automatically
                </p>
              </div>
              
              <Separator />
              
              {/* Voice selection */}
              <div className="space-y-4">
                <Label>Voice Selection</Label>
                
                <div className="space-y-6">
                  {/* OpenAI voices */}
                  <div>
                    <h4 className="text-sm font-medium mb-2">OpenAI Voices</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {openaiVoices.map(voice => (
                        <div 
                          key={`${voice.provider}-${voice.id}`}
                          className={`p-3 border rounded-md cursor-pointer hover:bg-primary-50 ${
                            selectedVoice?.id === voice.id && selectedVoice?.provider === voice.provider
                              ? 'bg-primary-100 border-primary-300'
                              : 'bg-white'
                          }`}
                          onClick={() => changeVoice(voice.id, voice.provider)}
                        >
                          <div className="font-medium">{voice.name}</div>
                          <div className="text-xs text-neutral-500 mt-1">{voice.description}</div>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="mt-2 h-8 w-8 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              changeVoice(voice.id, voice.provider);
                              speak("This is a sample of my voice.");
                            }}
                          >
                            <Volume2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* ElevenLabs voices */}
                  <div>
                    <h4 className="text-sm font-medium mb-2">ElevenLabs Voices</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {elevenLabsVoices.map(voice => (
                        <div 
                          key={`${voice.provider}-${voice.id}`}
                          className={`p-3 border rounded-md cursor-pointer hover:bg-primary-50 ${
                            selectedVoice?.id === voice.id && selectedVoice?.provider === voice.provider
                              ? 'bg-primary-100 border-primary-300'
                              : 'bg-white'
                          }`}
                          onClick={() => changeVoice(voice.id, voice.provider)}
                        >
                          <div className="font-medium">{voice.name}</div>
                          <div className="text-xs text-neutral-500 mt-1">{voice.description}</div>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="mt-2 h-8 w-8 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              changeVoice(voice.id, voice.provider);
                              speak("This is a sample of my voice.");
                            }}
                          >
                            <Volume2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              
              <Separator />
              
              {/* Playback Speed */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="playback-speed">Playback Speed: {playbackSpeed}x</Label>
                  <div className="w-1/2">
                    <Slider
                      id="playback-speed"
                      min={0.5}
                      max={2}
                      step={0.1}
                      value={[playbackSpeed]}
                      onValueChange={([value]) => changePlaybackSpeed(value)}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
              {/* Audio Player (when playing) */}
              {currentAudioUrl && (
                <div className="w-full">
                  <AudioPlayer 
                    audioUrl={currentAudioUrl} 
                    autoPlay={isPlaying}
                    onPlayStateChange={(playing) => {
                      if (!playing) stopSpeaking();
                    }}
                    playbackSpeed={playbackSpeed}
                    onPlaybackSpeedChange={changePlaybackSpeed}
                  />
                </div>
              )}
              
              {/* Test Features */}
              <div className="w-full space-y-3">
                <Label>Test Text-to-Speech</Label>
                <div className="flex space-x-2">
                  <Input 
                    value={testMessage} 
                    onChange={(e) => setTestMessage(e.target.value)} 
                    placeholder="Enter text to test TTS..."
                    className="flex-1"
                  />
                  <Button onClick={() => speak(testMessage)} type="button">
                    <Volume2 className="h-4 w-4 mr-2" /> Play
                  </Button>
                </div>
                
                <div className="flex space-x-2">
                  <Button onClick={playTestSound} variant="outline" type="button">
                    Test Basic Audio
                  </Button>
                </div>
              </div>
            </CardFooter>
          </Card>
          
          {/* Speech Recognition Settings */}
          {browserSupportsSpeechRecognition && (
            <Card>
              <CardHeader>
                <CardTitle>Speech Recognition Settings</CardTitle>
                <CardDescription>Configure how the application understands your voice</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <Label>Test Speech Recognition</Label>
                  <div className="flex items-center space-x-2">
                    <Button 
                      onClick={handleSpeechRecognitionTest} 
                      variant={isListening ? "destructive" : "default"}
                    >
                      {isListening ? (
                        <>
                          <RotateCcw className="h-4 w-4 mr-2 animate-spin" /> Stop Listening
                        </>
                      ) : (
                        <>
                          <Mic className="h-4 w-4 mr-2" /> Start Listening
                        </>
                      )}
                    </Button>
                    {isListening && <span className="text-sm text-green-600">Listening...</span>}
                  </div>
                  
                  {/* Transcript display */}
                  <div className="mt-4">
                    <Label>Current transcript:</Label>
                    <div className="p-3 bg-neutral-50 rounded border mt-1 min-h-[60px]">
                      {transcript || <span className="text-neutral-400">Speak to see text here...</span>}
                    </div>
                  </div>
                  
                  {/* Final result */}
                  {transcriptResult && (
                    <div className="mt-4">
                      <Label>Captured result:</Label>
                      <div className="p-3 bg-neutral-50 rounded border mt-1">
                        {transcriptResult}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        {/* API Keys Settings */}
        <TabsContent value="api-keys" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>API Keys</CardTitle>
              <CardDescription>Set up your API keys for external services</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* OpenAI API Key */}
              <div className="space-y-3">
                <Label htmlFor="openai-api-key">OpenAI API Key</Label>
                <div className="flex space-x-2">
                  <Input 
                    id="openai-api-key"
                    type="password" 
                    value={openAIKey} 
                    onChange={(e) => setOpenAIKey(e.target.value)} 
                    placeholder="sk-..." 
                    className="flex-1"
                  />
                  <Button 
                    onClick={() => saveApiKey('openai', openAIKey)}
                    disabled={isSavingKey || !openAIKey.trim()} 
                    type="button"
                  >
                    {isSavingKey ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                    {isSavingKey ? '' : 'Save'}
                  </Button>
                </div>
                <p className="text-sm text-neutral-500">
                  Used for AI-generated responses, text-to-speech, and image generation.
                  <a 
                    href="https://platform.openai.com/api-keys" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="ml-1 text-primary-600 hover:underline"
                  >
                    Get your API key
                  </a>
                </p>
              </div>
              
              <Separator />
              
              {/* ElevenLabs API Key */}
              <div className="space-y-3">
                <Label htmlFor="elevenlabs-api-key">ElevenLabs API Key</Label>
                <div className="flex space-x-2">
                  <Input 
                    id="elevenlabs-api-key"
                    type="password" 
                    value={elevenLabsKey} 
                    onChange={(e) => setElevenLabsKey(e.target.value)} 
                    placeholder="Enter your ElevenLabs API key" 
                    className="flex-1"
                  />
                  <Button 
                    onClick={() => saveApiKey('elevenlabs', elevenLabsKey)}
                    disabled={isSavingKey || !elevenLabsKey.trim()} 
                    type="button"
                  >
                    {isSavingKey ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                    {isSavingKey ? '' : 'Save'}
                  </Button>
                </div>
                <p className="text-sm text-neutral-500">
                  Used for high-quality text-to-speech voices.
                  <a 
                    href="https://elevenlabs.io/speech-synthesis" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="ml-1 text-primary-600 hover:underline"
                  >
                    Get your API key
                  </a>
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Appearance Settings */}
        <TabsContent value="appearance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
              <CardDescription>Customize how StoryFlow looks</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <Label htmlFor="theme">Theme</Label>
                <Select defaultValue="light">
                  <SelectTrigger>
                    <SelectValue placeholder="Select a theme" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-neutral-500">
                  Choose your preferred theme for the application
                </p>
              </div>
              
              <Separator />
              
              <div className="space-y-3">
                <Label htmlFor="font-size">Font Size</Label>
                <Select defaultValue="medium">
                  <SelectTrigger>
                    <SelectValue placeholder="Select a font size" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="small">Small</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="large">Large</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-neutral-500">
                  Adjust the text size throughout the application
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;