import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

interface StreamInterfaceProps {
  onStreamStart?: () => void;
  onStreamEnd?: () => void;
}

const StreamInterface: React.FC<StreamInterfaceProps> = ({ onStreamStart, onStreamEnd }) => {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioQueueRef = useRef<Uint8Array[]>([]);
  const isPlayingRef = useRef(false);

  useEffect(() => {
    // Inicializar o reconhecimento de fala
    if ('webkitSpeechRecognition' in window) {
      const recognition = new (window as any).webkitSpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'pt-BR';

      recognition.onstart = () => {
        console.log('Reconhecimento de fala iniciado');
        setIsListening(true);
        setConnectionStatus('connected');
      };

      recognition.onend = () => {
        console.log('Reconhecimento de fala finalizado');
        setIsListening(false);
      };

      recognition.onresult = async (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0].transcript)
          .join('');

        if (event.results[0].isFinal) {
          console.log('Texto reconhecido:', transcript);
          await sendMessage(transcript);
        }
      };

      recognition.onerror = (event: any) => {
        console.error('Erro no reconhecimento:', event.error);
        setError(`Erro no reconhecimento: ${event.error}`);
        setIsListening(false);
        setConnectionStatus('disconnected');
      };

      recognitionRef.current = recognition;
    } else {
      setError('Reconhecimento de fala não suportado neste navegador');
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const sendMessage = async (message: string) => {
    try {
      setConnectionStatus('connecting');
      console.log('Iniciando envio de mensagem:', message);

      // Obter sessão do Supabase
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('Erro ao obter sessão:', sessionError);
        throw new Error('Erro ao obter sessão: ' + sessionError.message);
      }

      if (!session) {
        console.error('Nenhuma sessão encontrada');
        throw new Error('Nenhuma sessão encontrada. Por favor, faça login novamente.');
      }

      console.log('Sessão obtida com sucesso');
      console.log('Token de acesso:', session.access_token);
      console.log('Tipo do token:', typeof session.access_token);
      console.log('Tamanho do token:', session.access_token.length);

      // Enviar mensagem para a função
      const functionUrl = `https://citcshcehztpbumkvywz.supabase.co/functions/v1/stream-google`;
      console.log('Enviando mensagem para:', functionUrl);

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || '',
        'x-client-info': 'umind-ai-nexus'
      };

      console.log('Headers da requisição:', {
        ...headers,
        'Authorization': headers.Authorization ? 'Bearer [TOKEN]' : 'ausente',
        'apikey': headers.apikey ? '[PRESENTE]' : 'ausente'
      });

      try {
        const response = await fetch(functionUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify({ 
            message,
            token: session.access_token
          })
        });

        console.log('Status da resposta:', response.status);
        console.log('Headers da resposta:', Object.fromEntries(response.headers.entries()));

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Resposta de erro:', errorText);
          throw new Error(`Erro na resposta (${response.status}): ${errorText}`);
        }

        const data = await response.json();
        console.log('Resposta recebida:', data);

        if (data.type === 'success' && data.response.audio) {
          // Processar áudio
          const audioData = new Uint8Array(atob(data.response.audio).split('').map(c => c.charCodeAt(0)));
          await playAudio(audioData);
        }

        setConnectionStatus('connected');
      } catch (error) {
        console.error('Erro detalhado:', error);
        if (error instanceof TypeError && error.message === 'Failed to fetch') {
          throw new Error('Não foi possível conectar ao servidor. Verifique sua conexão com a internet.');
        }
        throw error;
      }
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      setError(error instanceof Error ? error.message : 'Erro desconhecido');
      setConnectionStatus('disconnected');
      throw error;
    }
  };

  const playAudio = async (audioData: Uint8Array) => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
      }

      const audioBuffer = await audioContextRef.current.decodeAudioData(audioData.buffer);
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);
      source.start(0);
    } catch (error) {
      console.error('Erro ao reproduzir áudio:', error);
      setError('Erro ao reproduzir áudio');
    }
  };

  const toggleListening = () => {
    if (!recognitionRef.current) {
      setError('Reconhecimento de fala não inicializado');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setConnectionStatus('disconnected');
    } else {
      recognitionRef.current.start();
      setConnectionStatus('connected');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-4">
      <div className="relative">
        <button
          onClick={toggleListening}
          disabled={isProcessing}
          className={`
            w-16 h-16 rounded-full flex items-center justify-center
            transition-all duration-300 ease-in-out
            ${isListening 
              ? 'bg-red-500 hover:bg-red-600' 
              : 'bg-blue-500 hover:bg-blue-600'
            }
            ${isProcessing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            shadow-lg hover:shadow-xl
          `}
        >
          <div className={`
            w-8 h-8 rounded-full
            ${isListening ? 'bg-white animate-pulse' : 'bg-white'}
          `} />
        </button>
        
        {isProcessing && (
          <div className="absolute -top-2 -right-2 w-4 h-4">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent" />
          </div>
        )}
      </div>

      <div className="mt-4 text-center">
        <p className="text-sm text-gray-600">
          {isListening ? 'Ouvindo...' : 'Clique para falar'}
        </p>
        {error && (
          <p className="text-sm text-red-500 mt-2">
            {error}
          </p>
        )}
        <p className="text-xs text-gray-500 mt-1">
          Status: {connectionStatus === 'connected' ? 'Conectado' : 
                  connectionStatus === 'connecting' ? 'Conectando...' : 
                  'Desconectado'}
        </p>
      </div>
    </div>
  );
};

export default StreamInterface;
