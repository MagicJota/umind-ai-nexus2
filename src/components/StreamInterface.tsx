
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mic, MicOff, Volume2, VolumeX, MessageCircle, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";

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
  
  const wsRef = useRef<WebSocket | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  
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
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = 'pt-BR';

        recognitionRef.current.onresult = (event) => {
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

        recognitionRef.current.onerror = (event) => {
          console.error('Speech recognition error:', event.error);
          setIsListening(false);
        };
      }

      // Initialize Speech Synthesis
      synthRef.current = window.speechSynthesis;

      // Connect to WebSocket
      const wsUrl = `wss://citcshcehztpbumkvywz.functions.supabase.co/stream-google`;
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        setIsConnected(true);
        setConnectionStatus('connected');
        toast({
          title: "MAGUS Online",
          description: "Conexão estabelecida! Você pode começar a falar.",
        });
      };

      wsRef.current.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log('Received:', data);

        switch (data.type) {
          case 'stream_start':
            setIsSpeaking(true);
            break;
          case 'stream_chunk':
            setCurrentMessage(data.fullResponse || data.chunk);
            break;
          case 'stream_complete':
            setIsSpeaking(false);
            setCurrentMessage(data.fullResponse);
            speakText(data.fullResponse);
            break;
          case 'error':
            toast({
              title: "Erro",
              description: data.message,
              variant: "destructive",
            });
            break;
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnectionStatus('disconnected');
        toast({
          title: "Erro de Conexão",
          description: "Não foi possível conectar ao MAGUS",
          variant: "destructive",
        });
      };

      wsRef.current.onclose = () => {
        setIsConnected(false);
        setConnectionStatus('disconnected');
        setIsListening(false);
      };

    } catch (error) {
      console.error('Error initializing stream:', error);
      setConnectionStatus('disconnected');
    }
  };

  const sendMessage = (message: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'chat_message',
        message,
        knowledgeContext
      }));
    }
  };

  const toggleListening = () => {
    if (!recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const speakText = (text: string) => {
    if (synthRef.current) {
      synthRef.current.cancel(); // Stop any current speech
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'pt-BR';
      utterance.rate = 0.9;
      utterance.pitch = 1;
      synthRef.current.speak(utterance);
    }
  };

  const stopSpeaking = () => {
    if (synthRef.current) {
      synthRef.current.cancel();
    }
  };

  const cleanup = () => {
    if (wsRef.current) {
      wsRef.current.close();
    }
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    if (synthRef.current) {
      synthRef.current.cancel();
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
