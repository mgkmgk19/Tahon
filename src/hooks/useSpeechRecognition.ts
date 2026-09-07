import { useState, useEffect, useRef, useCallback } from 'react';

export interface UseSpeechRecognitionOptions {
  lang?: string;
  continuous?: boolean;
  interimResults?: boolean;
  onResult?: (transcript: string, isFinal: boolean) => void;
  onError?: (errorMessage: string) => void;
}

export interface UseSpeechRecognitionReturn {
  isListening: boolean;
  isSupported: boolean;
  transcript: string;
  interimTranscript: string;
  error: string | null;
  startListening: (customOptions?: Partial<UseSpeechRecognitionOptions>) => void;
  stopListening: () => void;
  toggleListening: (customOptions?: Partial<UseSpeechRecognitionOptions>) => void;
  resetTranscript: () => void;
}

/**
 * Play a tiny pleasant synth sound using Web Audio API for feedback
 * Fully offline, no assets needed
 */
export const playAudioBeep = (type: 'start' | 'stop' | 'error') => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;
    if (type === 'start') {
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.12);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.start(now);
      osc.stop(now + 0.13);
    } else if (type === 'stop') {
      osc.frequency.setValueAtTime(700, now);
      osc.frequency.exponentialRampToValueAtTime(350, now + 0.1);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.11);
    } else {
      osc.frequency.setValueAtTime(250, now);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.21);
    }
  } catch (e) {
    // Ignore audio context autoplay restrictions
  }
};

export const useSpeechRecognition = (defaultOptions: UseSpeechRecognitionOptions = {}): UseSpeechRecognitionReturn => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const optionsRef = useRef<UseSpeechRecognitionOptions>(defaultOptions);
  optionsRef.current = defaultOptions;

  const isSupported = typeof window !== 'undefined' && Boolean((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

  // Stop listening helper
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // Ignore already stopped
      }
    }
    setIsListening(false);
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
    setError(null);
  }, []);

  const startListening = useCallback((customOptions?: Partial<UseSpeechRecognitionOptions>) => {
    if (!isSupported) {
      const msg = 'متصفحك لا يدعم التعرف الصوتي المباشر (Web Speech API). يُنصح باستخدام Google Chrome أو Microsoft Edge أو Safari.';
      setError(msg);
      optionsRef.current.onError?.(msg);
      return;
    }

    // Stop current if any
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (e) {
        // Ignore
      }
    }

    const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognitionClass();
    recognitionRef.current = recognition;

    const mergedOptions: UseSpeechRecognitionOptions = {
      ...optionsRef.current,
      ...customOptions,
    };

    recognition.lang = mergedOptions.lang || 'ar-SA';
    recognition.continuous = mergedOptions.continuous ?? false;
    recognition.interimResults = mergedOptions.interimResults ?? true;
    recognition.maxAlternatives = 1;

    setError(null);
    setInterimTranscript('');

    recognition.onstart = () => {
      setIsListening(true);
      playAudioBeep('start');
    };

    recognition.onresult = (event: any) => {
      let finalStr = '';
      let interimStr = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const item = event.results[i];
        const text = item[0]?.transcript || '';
        if (item.isFinal) {
          finalStr += text;
        } else {
          interimStr += text;
        }
      }

      if (interimStr) {
        setInterimTranscript(interimStr);
        mergedOptions.onResult?.(interimStr, false);
      }

      if (finalStr) {
        const cleanFinal = finalStr.trim();
        setTranscript(cleanFinal);
        setInterimTranscript('');
        mergedOptions.onResult?.(cleanFinal, true);
      }
    };

    recognition.onerror = (event: any) => {
      const err = event.error;

      // When user stops or cancels, 'aborted' is fired normally and should not show an error
      if (err === 'aborted') {
        setIsListening(false);
        return;
      }

      let message = 'حدث خطأ أثناء التعرف على الصوت';

      if (err === 'not-allowed' || err === 'service-not-allowed') {
        message = 'تم رفض الإذن للميكروفون. يرجى السماح بالوصول للميكروفون في المتصفح.';
      } else if (err === 'no-speech') {
        message = 'لم يتم التقاط أي صوت، يرجى التحدث بوضوح في الميكروفون.';
      } else if (err === 'network') {
        message = 'تعذر الاتصال بخدمة الصوت (قد يتطلب المتصفح اتصالاً بالإنترنت لتشغيل نموذج الصوت).';
      } else if (err === 'audio-capture') {
        message = 'لم يتم العثور على ميكروفون موصول في جهازك.';
      }

      setError(message);
      setIsListening(false);
      playAudioBeep('error');
      mergedOptions.onError?.(message);
    };

    recognition.onend = () => {
      setIsListening(false);
      setInterimTranscript('');
      playAudioBeep('stop');
    };

    try {
      recognition.start();
    } catch (err: any) {
      setError(err.message || 'فشل بدء التعرف الصوتي');
      setIsListening(false);
    }
  }, [isSupported]);

  const toggleListening = useCallback((customOptions?: Partial<UseSpeechRecognitionOptions>) => {
    if (isListening) {
      stopListening();
    } else {
      startListening(customOptions);
    }
  }, [isListening, startListening, stopListening]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {
          // Ignore
        }
      }
    };
  }, []);

  return {
    isListening,
    isSupported,
    transcript,
    interimTranscript,
    error,
    startListening,
    stopListening,
    toggleListening,
    resetTranscript,
  };
};
