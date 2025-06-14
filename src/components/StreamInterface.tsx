
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mic, MicOff, Volume2, VolumeX, MessageCircle, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";

// Properly declare the SpeechRecognition interface
interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
  onstart: () => void;
  onend: () => void;
}

// Extend Window interface for speech recognition
declare global {
  interface Window {
    SpeechRecognition: {
      new (): SpeechRecognition;
    };
    webkitSpeechRecognition: {
      new (): SpeechRecognition;
    };
  }
}

interface StreamInterfaceProps {
  isOpen: boolean;
  onClose: () => void;
  knowledgeContext?: string;
}

const StreamInterface = ({ isOpen, onClose, knowledgeContext }: StreamInterfaceProps) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentMessage, setCurrentMessage] = useState("");
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  
  const { toast } = useToast();
  const isMobile = useIsMobile();

  useEffect(() => {
    if (isOpen) {
      initializeStream();
    } else {
      cleanup();
    }

    return () => cleanup();
  }, [isOpen]);

  const initializeStream = async () => {
    try {
      setConnectionStatus('connecting');
      
      // Initialize Speech Recognition
      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognitionConstructor = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognitionRef.current = new SpeechRecognitionConstructor();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = 'pt-BR';

        recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
          let finalTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
            }
          }
          
          if (finalTranscript.trim()) {
            sendMessage(finalTranscript.trim());
          }
        };

        recognitionRef.current.onerror = (event: SpeechRecognitionErrorEvent) => {
          console.error('Speech recognition error:', event.error);
          setIsListening(false);
          toast({
            title: "Erro no reconhecimento de voz",
            description: "Verifique as permissões do microfone",
            variant: "destructive",
          });
        };
      } else {
        throw new Error('Speech recognition não suportado neste navegador');
      }

      setIsConnected(true);
      setConnectionStatus('connected');
      toast({
        title: "MAGUS Online",
        description: "Conexão estabelecida! Você pode começar a falar.",
      });

    } catch (error) {
      console.error('Error initializing stream:', error);
      setConnectionStatus('disconnected');
      toast({
        title: "Erro de Inicialização",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const sendMessage = async (message: string) => {
    try {
      console.log('Sending message via HTTP:', message);
      setIsSpeaking(true);
      setCurrentMessage('');

      // Call Google API via Supabase function
      const { data, error } = await supabase.functions.invoke('chat-google', {
        body: {
          messages: [{ role: 'user', content: message }],
          knowledgeContext: knowledgeContext || ''
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      setCurrentMessage(data.message);
      
      if (data.message) {
        await speakTextWithGoogleTTS(data.message);
      }

    } catch (error) {
      console.error('Error sending message:', error);
      setIsSpeaking(false);
      toast({
        title: "Erro",
        description: error.message || "Erro ao processar mensagem",
        variant: "destructive",
      });
    }
  };

  const speakTextWithGoogleTTS = async (text: string) => {
    try {
      // Stop any current audio
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
      }

      // Call Google Text-to-Speech via Supabase function
      const { data, error } = await supabase.functions.invoke('text-to-speech-google', {
        body: {
          text: text,
          voice: 'pt-BR-Standard-A', // Brazilian Portuguese voice
          languageCode: 'pt-BR'
        }
      });

      if (error) {
        console.error('TTS Error:', error);
        // Fallback to browser speech synthesis
        fallbackToWebSpeech(text);
        return;
      }

      if (data.audioContent) {
        // Convert base64 to audio and play
        const audioBlob = base64ToBlob(data.audioContent, 'audio/mp3');
        const audioUrl = URL.createObjectURL(audioBlob);
        
        const audio = new Audio(audioUrl);
        currentAudioRef.current = audio;
        
        audio.onended = () => {
          setIsSpeaking(false);
          URL.revokeObjectURL(audioUrl);
          currentAudioRef.current = null;
        };
        
        audio.onerror = () => {
          console.error('Audio playback error');
          setIsSpeaking(false);
          URL.revokeObjectURL(audioUrl);
          currentAudioRef.current = null;
          // Fallback to browser speech synthesis
          fallbackToWebSpeech(text);
        };
        
        await audio.play();
      } else {
        fallbackToWebSpeech(text);
      }

    } catch (error) {
      console.error('Error with Google TTS:', error);
      fallbackToWebSpeech(text);
    }
  };

  const fallbackToWebSpeech = (text: string) => {
    if (window.speechSynthesis) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'pt-BR';
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.onend = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
    } else {
      setIsSpeaking(false);
    }
  };

  const base64ToBlob = (base64: string, contentType: string) => {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: contentType });
  };

  const toggleListening = async () => {
    if (!recognitionRef.current) {
      toast({
        title: "Erro",
        description: "Reconhecimento de voz não disponível",
        variant: "destructive",
      });
      return;
    }

    try {
      if (isListening) {
        recognitionRef.current.stop();
        setIsListening(false);
      } else {
        recognitionRef.current.start();
        setIsListening(true);
      }
    } catch (error) {
      console.error('Error toggling speech recognition:', error);
      setIsListening(false);
      toast({
        title: "Erro no microfone",
        description: "Verifique as permissões do microfone",
        variant: "destructive",
      });
    }
  };

  const stopSpeaking = () => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  };

  const cleanup = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsConnected(false);
    setIsListening(false);
    setIsSpeaking(false);
    setConnectionStatus('disconnected');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className={`bg-zinc-900 border-zinc-800 ${isMobile ? 'w-full h-full' : 'w-full max-w-md'}`}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-umind-gray flex items-center space-x-2">
            <MessageCircle className="w-5 h-5" />
            <span>MAGUS Stream</span>
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Badge 
              variant={connectionStatus === 'connected' ? 'default' : 'secondary'}
              className={connectionStatus === 'connected' ? 'bg-green-600' : 'bg-gray-600'}
            >
              {connectionStatus === 'connected' ? 'Online' : 
               connectionStatus === 'connecting' ? 'Conectando...' : 'Offline'}
            </Badge>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Status Indicators */}
          <div className="flex justify-center space-x-4">
            <div className={`flex items-center space-x-2 p-2 rounded-lg ${isListening ? 'bg-blue-600/20' : 'bg-zinc-800'}`}>
              <Mic className={`w-4 h-4 ${isListening ? 'text-blue-400' : 'text-umind-gray/60'}`} />
              <span className={`text-sm ${isListening ? 'text-blue-400' : 'text-umind-gray/60'}`}>
                Escutando
              </span>
            </div>
            
            <div className={`flex items-center space-x-2 p-2 rounded-lg ${isSpeaking ? 'bg-green-600/20' : 'bg-zinc-800'}`}>
              <Volume2 className={`w-4 h-4 ${isSpeaking ? 'text-green-400' : 'text-umind-gray/60'}`} />
              <span className={`text-sm ${isSpeaking ? 'text-green-400' : 'text-umind-gray/60'}`}>
                Falando
              </span>
            </div>
          </div>

          {/* Current Message */}
          {currentMessage && (
            <div className="bg-zinc-800 rounded-lg p-4 min-h-[100px]">
              <p className="text-umind-gray text-sm leading-relaxed">
                {currentMessage}
              </p>
            </div>
          )}

          {/* Controls */}
          <div className="flex justify-center space-x-4">
            <Button
              onClick={toggleListening}
              disabled={!isConnected}
              className={`
                ${isListening 
                  ? 'bg-red-600 hover:bg-red-700' 
                  : 'bg-blue-600 hover:bg-blue-700'
                }
                ${isMobile ? 'h-14 w-14' : 'h-12 w-12'}
                rounded-full p-0
              `}
            >
              {isListening ? (
                <MicOff className="w-6 h-6" />
              ) : (
                <Mic className="w-6 h-6" />
              )}
            </Button>

            <Button
              onClick={stopSpeaking}
              disabled={!isSpeaking}
              variant="outline"
              className={`
                border-zinc-700 text-umind-gray hover:bg-zinc-800
                ${isMobile ? 'h-14 w-14' : 'h-12 w-12'}
                rounded-full p-0
              `}
            >
              <VolumeX className="w-6 h-6" />
            </Button>
          </div>

          {/* Instructions */}
          <div className="text-center space-y-2">
            <p className="text-umind-gray/70 text-sm">
              {isConnected 
                ? 'Clique no microfone e comece a falar com MAGUS'
                : 'Conectando ao MAGUS...'
              }
            </p>
            {knowledgeContext && (
              <Badge variant="secondary" className="bg-umind-purple/20 text-umind-purple">
                Com contexto de conhecimento
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StreamInterface;
