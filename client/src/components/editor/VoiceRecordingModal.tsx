import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import useSpeechRecognition from '@/hooks/useSpeechRecognition';
import { Mic, Pause, Check, X } from 'lucide-react';

interface VoiceRecordingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTranscriptComplete: (transcript: string) => void;
}

const VoiceRecordingModal: React.FC<VoiceRecordingModalProps> = ({
  isOpen,
  onClose,
  onTranscriptComplete
}) => {
  const [currentTranscript, setCurrentTranscript] = useState('');
  const {
    transcript,
    isListening,
    start,
    stop,
    supported,
    error
  } = useSpeechRecognition({
    onResult: (result) => setCurrentTranscript(result),
    continuous: true
  });

  // Start listening when modal opens
  useEffect(() => {
    if (isOpen && supported) {
      start();
    }
    return () => {
      if (isListening) {
        stop();
      }
    };
  }, [isOpen, start, stop, isListening, supported]);

  // Handle recognition errors
  useEffect(() => {
    if (error) {
      console.error('Speech recognition error:', error);
    }
  }, [error]);

  const handleCancel = () => {
    stop();
    onClose();
  };

  const handleComplete = () => {
    stop();
    onTranscriptComplete(currentTranscript);
    onClose();
  };

  const toggleRecording = () => {
    if (isListening) {
      stop();
    } else {
      start();
    }
  };

  if (!supported) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent>
          <DialogTitle>Speech Recognition Not Supported</DialogTitle>
          <p className="text-neutral-600">
            Your browser does not support speech recognition. Try using a different browser like Chrome.
          </p>
          <Button onClick={onClose} className="mt-4">Close</Button>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <div className="text-center mb-6">
          <div className={`w-16 h-16 rounded-full bg-red-100 mx-auto flex items-center justify-center ${isListening ? 'recording-pulse' : ''}`}>
            <Mic className={`h-6 w-6 ${isListening ? 'text-red-500' : 'text-neutral-400'}`} />
          </div>
          <h3 className="text-xl font-semibold mt-4 text-neutral-800">
            {isListening ? 'Recording...' : 'Paused'}
          </h3>
          <p className="text-neutral-600 mt-1">
            {isListening ? 'Speak clearly into your microphone' : 'Recording paused'}
          </p>
        </div>
        
        <div className="space-y-2">
          <div className="bg-neutral-100 rounded-lg p-3 text-sm text-neutral-700 max-h-40 overflow-y-auto">
            <p>{currentTranscript || "Start speaking..."}</p>
          </div>
        </div>
        
        <div className="flex items-center justify-between mt-6">
          <Button variant="outline" onClick={handleCancel} className="flex items-center">
            <X className="mr-2 h-4 w-4" />
            Cancel
          </Button>
          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              size="icon"
              onClick={toggleRecording}
              className={`p-3 rounded-full ${isListening ? 'bg-neutral-200 hover:bg-neutral-300' : 'bg-green-100 hover:bg-green-200'}`}
            >
              {isListening ? <Pause className="h-4 w-4 text-neutral-700" /> : <Mic className="h-4 w-4 text-green-700" />}
            </Button>
            <Button
              onClick={handleComplete}
              className="p-3 bg-primary-600 rounded-full hover:bg-primary-700"
            >
              <Check className="h-4 w-4 text-white" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VoiceRecordingModal;
