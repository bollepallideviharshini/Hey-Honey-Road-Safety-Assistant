import { useState, useEffect, useRef, useCallback } from 'react';
import { classifySpeech, type ClassificationResult } from '../services/aiClassifier';

interface UseSpeechRecognitionOptions {
  onCommandDetected: (result: ClassificationResult) => void;
}

export function useSpeechRecognition({ onCommandDetected }: UseSpeechRecognitionOptions) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const shouldListenRef = useRef(false);

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError('Speech Recognition is not supported in this browser. Please use Google Chrome, Microsoft Edge, or Apple Safari.');
      return;
    }

    const rec = new SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'en-US';

    rec.onstart = () => {
      setIsListening(true);
      setError(null);
    };

    rec.onresult = (event: any) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      const activeText = finalTranscript || interimTranscript;
      setTranscript(activeText);

      if (activeText.trim()) {
        const classification = classifySpeech(activeText);
        
        // If trigger detected and it matched a specific hazard type
        if (classification.isTriggered && classification.hazardType) {
          onCommandDetected(classification);
          
          // Clear current transcript and restart to prevent double triggering
          setTranscript('');
          rec.abort(); 
        }
      }
    };

    rec.onerror = (event: any) => {
      console.warn('Speech recognition warning/error:', event.error);
      if (event.error === 'not-allowed') {
        setError('Microphone Permission Denied. Please enable microphone access.');
        setIsListening(false);
        shouldListenRef.current = false;
      } else if (event.error === 'network') {
        setError('Network error: Speech Recognition requires internet access.');
      } else if (event.error === 'no-speech') {
        // Common and benign timeout, can ignore
      } else {
        setError(`Speech error: ${event.error}`);
      }
    };

    rec.onend = () => {
      setIsListening(false);
      // Auto-restart if we should still be listening (unless permission was denied)
      if (shouldListenRef.current) {
        try {
          rec.start();
        } catch (err) {
          console.warn('Failed to auto-restart speech recognition:', err);
        }
      }
    };

    recognitionRef.current = rec;

    return () => {
      if (recognitionRef.current) {
        shouldListenRef.current = false;
        recognitionRef.current.abort();
      }
    };
  }, [onCommandDetected]);

  const startListening = useCallback(() => {
    shouldListenRef.current = true;
    setError(null);
    setTranscript('');
    try {
      if (recognitionRef.current) {
        recognitionRef.current.start();
      }
    } catch (err) {
      console.warn('Speech recognition failed to start or already running:', err);
    }
  }, []);

  const stopListening = useCallback(() => {
    shouldListenRef.current = false;
    setIsListening(false);
    try {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    } catch (err) {
      console.warn('Speech recognition failed to stop:', err);
    }
  }, []);

  const hasSupport = !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

  return {
    isListening,
    transcript,
    error,
    startListening,
    stopListening,
    hasSupport,
  };
}
