import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../integrations/supabase/client';
import { Button } from './ui/button';
import { Mic, MicOff, Volume2, VolumeX, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';

interface StreamInterfaceProps {
  isOpen: boolean;
  onClose: () => void;
  knowledgeContext?: string;
}

// Enum para estados da sessão
enum SessionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting',
  ERROR = 'error'
}

// Classe para processamento de áudio
class AudioProcessor {
  private mediaRecorder: MediaRecorder | null = null;
  private audioContext: AudioContext | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private processorNode: ScriptProcessorNode | null = null;
  private isRecording = false;
  private stream: MediaStream | null = null;

  constructor(private onAudioData: (audioData: ArrayBuffer) => void) {}

  async startRecording(): Promise<void> {
    try {
      console.log('Iniciando captura de áudio...');
      
      this.stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });

      this.audioContext = new AudioContext({ sampleRate: 16000 });
      this.sourceNode = this.audioContext.createMediaStreamSource(this.stream);
      this.processorNode = this.audioContext.createScriptProcessor(4096, 1, 1);

      this.processorNode.onaudioprocess = (event) => {
        if (this.isRecording) {
          const inputBuffer = event.inputBuffer;
          const inputData = inputBuffer.getChannelData(0);
          
          // Converter para PCM 16 bits
          const pcmData = this.convertToPCM16(inputData);
          this.onAudioData(pcmData);
        }
      };

      this.sourceNode.connect(this.processorNode);
      this.processorNode.connect(this.audioContext.destination);

      this.isRecording = true;
      console.log('Captura de áudio iniciada com sucesso');

    } catch (error) {
      console.error('Erro ao iniciar gravação:', error);
      throw new Error(`Erro ao acessar microfone: ${error.message}`);
    }
  }

  stopRecording(): void {
    console.log('Parando captura de áudio...');
    this.isRecording = false;

    if (this.processorNode) {
      this.processorNode.disconnect();
      this.processorNode = null;
    }

    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }

    console.log('Captura de áudio parada');
  }

  private convertToPCM16(float32Array: Float32Array): ArrayBuffer {
    const buffer = new ArrayBuffer(float32Array.length * 2);
    const view = new DataView(buffer);

    for (let i = 0; i < float32Array.length; i++) {
      const sample = Math.max(-1, Math.min(1, float32Array[i]));
      view.setInt16(i * 2, sample * 0x7FFF, true);
    }

    return buffer;
  }

  async playAudio(audioData: ArrayBuffer): Promise<void> {
    try {
      console.log('Reproduzindo áudio recebido...');
      const audioContext = new AudioContext({ sampleRate: 24000 });
      
      // Converter PCM para AudioBuffer
      const audioBuffer = await this.pcmToAudioBuffer(audioData, audioContext);
      const source = audioContext.createBufferSource();

      source.buffer = audioBuffer;
      source.connect(audioContext.destination);
      source.start();

      console.log('Áudio reproduzido com sucesso');
    } catch (error) {
      console.error('Erro ao reproduzir áudio:', error);
      throw new Error(`Erro ao reproduzir áudio: ${error.message}`);
    }
  }

  private async pcmToAudioBuffer(pcmData: ArrayBuffer, audioContext: AudioContext): Promise<AudioBuffer> {
    const view = new DataView(pcmData);
    const samples = pcmData.byteLength / 2;
    const audioBuffer = audioContext.createBuffer(1, samples, 24000);
    const channelData = audioBuffer.getChannelData(0);

    for (let i = 0; i < samples; i++) {
      const sample = view.getInt16(i * 2, true);
      channelData[i] = sample / 0x7FFF;
    }

    return audioBuffer;
  }

  getIsRecording(): boolean {
    return this.isRecording;
  }
}

const StreamInterface: React.FC<StreamInterfaceProps> = ({ isOpen, onClose, knowledgeContext }) => {
  const [sessionState, setSessionState] = useState<SessionState>(SessionState.DISCONNECTED);
  const [isRecording, setIsRecording] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [lastResponse, setLastResponse] = useState<string>('');

  const audioProcessorRef = useRef<AudioProcessor | null>(null);
  const audioQueueRef = useRef<ArrayBuffer[]>([]);
  const isProcessingAudioRef = useRef(false);

  // Função para converter ArrayBuffer para base64
  const arrayBufferToBase64 = useCallback((buffer: ArrayBuffer): string => {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }, []);

  // Função para converter base64 para ArrayBuffer
  const base64ToArrayBuffer = useCallback((base64: string): ArrayBuffer => {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }, []);

  // Função para enviar dados de áudio para a API
  const sendAudioData = useCallback(async (audioData: ArrayBuffer) => {
    if (sessionState !== SessionState.CONNECTED) {
      console.warn('Sessão não conectada, adicionando áudio à fila');
      audioQueueRef.current.push(audioData);
      return;
    }

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        throw new Error('Sessão não encontrada. Faça login novamente.');
      }

      const base64Audio = arrayBufferToBase64(audioData);

      const response = await supabase.functions.invoke('stream-google', {
        body: {
          audioData: base64Audio,
          action: 'send_audio',
          knowledgeContext: knowledgeContext || ''
        }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (response.data?.response?.audio && !isMuted) {
        const responseAudioData = base64ToArrayBuffer(response.data.response.audio);
        await audioProcessorRef.current?.playAudio(responseAudioData);
      }

      if (response.data?.response?.text) {
        setLastResponse(response.data.response.text);
      }

    } catch (error) {
      console.error('Erro ao enviar áudio:', error);
      setError(error.message);
    }
  }, [sessionState, knowledgeContext, isMuted, arrayBufferToBase64, base64ToArrayBuffer]);

  // Função para processar fila de áudio
  const processAudioQueue = useCallback(async () => {
    if (isProcessingAudioRef.current || audioQueueRef.current.length === 0) {
      return;
    }

    isProcessingAudioRef.current = true;

    while (audioQueueRef.current.length > 0) {
      const audioData = audioQueueRef.current.shift();
      if (audioData) {
        await sendAudioData(audioData);
        // Pequeno delay para evitar sobrecarga
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    isProcessingAudioRef.current = false;
  }, [sendAudioData]);

  // Inicializar processador de áudio
  useEffect(() => {
    audioProcessorRef.current = new AudioProcessor((audioData) => {
      // Simular nível de áudio para feedback visual
      const samples = new Int16Array(audioData);
      const rms = Math.sqrt(samples.reduce((sum, sample) => sum + sample * sample, 0) / samples.length);
      const level = Math.min(100, (rms / 1000) * 100);
      setAudioLevel(level);

      // Enviar dados de áudio
      sendAudioData(audioData);
    });

    return () => {
      audioProcessorRef.current?.stopRecording();
    };
  }, [sendAudioData]);

  // Processar fila de áudio quando a sessão conectar
  useEffect(() => {
    if (sessionState === SessionState.CONNECTED) {
      processAudioQueue();
    }
  }, [sessionState, processAudioQueue]);

  // Função para iniciar conversa
  const startConversation = async () => {
    try {
      setError(null);
      setSessionState(SessionState.CONNECTING);

      // Verificar se há sessão ativa
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        throw new Error('Sessão não encontrada. Faça login novamente.');
      }

      // Iniciar captura de áudio
      await audioProcessorRef.current?.startRecording();
      setIsRecording(true);
      setSessionState(SessionState.CONNECTED);

      console.log('Conversa iniciada com sucesso');

    } catch (error) {
      console.error('Erro ao iniciar conversa:', error);
      setError(error.message);
      setSessionState(SessionState.ERROR);
    }
  };

  // Função para parar conversa
  const stopConversation = () => {
    audioProcessorRef.current?.stopRecording();
    setIsRecording(false);
    setSessionState(SessionState.DISCONNECTED);
    setAudioLevel(0);
    audioQueueRef.current = [];
    setLastResponse('');
    console.log('Conversa parada');
  };

  // Função para alternar mudo
  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  // Limpar ao fechar
  useEffect(() => {
    if (!isOpen) {
      stopConversation();
    }
  }, [isOpen]);

  const getStatusText = () => {
    switch (sessionState) {
      case SessionState.CONNECTING:
        return 'Conectando...';
      case SessionState.CONNECTED:
        return isRecording ? 'Ouvindo...' : 'Conectado';
      case SessionState.RECONNECTING:
        return 'Reconectando...';
      case SessionState.ERROR:
        return 'Erro na conexão';
      default:
        return 'Desconectado';
    }
  };

  const getStatusColor = () => {
    switch (sessionState) {
      case SessionState.CONNECTED:
        return 'text-green-500';
      case SessionState.CONNECTING:
      case SessionState.RECONNECTING:
        return 'text-yellow-500';
      case SessionState.ERROR:
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-zinc-900 border-zinc-700">
        <DialogHeader>
          <DialogTitle className="text-umind-gray flex items-center gap-2">
            <Volume2 className="w-5 h-5" />
            Gemini Live - Conversa por Voz
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center space-y-6 py-6">
          {/* Indicador de status */}
          <div className="text-center">
            <p className={`text-sm font-medium ${getStatusColor()}`}>
              {getStatusText()}
            </p>
            {error && (
              <p className="text-sm text-red-400 mt-1">
                {error}
              </p>
            )}
          </div>

          {/* Botão principal de gravação */}
          <div className="relative">
            <Button
              onClick={sessionState === SessionState.CONNECTED ? stopConversation : startConversation}
              disabled={sessionState === SessionState.CONNECTING || sessionState === SessionState.RECONNECTING}
              className={`
                w-20 h-20 rounded-full flex items-center justify-center
                transition-all duration-300 ease-in-out
                ${isRecording 
                  ? 'bg-red-500 hover:bg-red-600 animate-pulse' 
                  : 'bg-umind-gradient hover:opacity-90'
                }
                ${(sessionState === SessionState.CONNECTING || sessionState === SessionState.RECONNECTING) 
                  ? 'opacity-50 cursor-not-allowed' 
                  : 'cursor-pointer hover:scale-105'
                }
                shadow-lg hover:shadow-xl
              `}
            >
              {sessionState === SessionState.CONNECTING || sessionState === SessionState.RECONNECTING ? (
                <Loader2 className="w-8 h-8 text-white animate-spin" />
              ) : isRecording ? (
                <MicOff className="w-8 h-8 text-white" />
              ) : (
                <Mic className="w-8 h-8 text-white" />
              )}
            </Button>

            {/* Indicador de nível de áudio */}
            {isRecording && (
              <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
                <div className="w-16 h-1 bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-green-500 transition-all duration-100"
                    style={{ width: `${audioLevel}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Controles adicionais */}
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              size="sm"
              onClick={toggleMute}
              className="border-zinc-600 text-umind-gray hover:bg-zinc-800"
            >
              {isMuted ? (
                <VolumeX className="w-4 h-4" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
              {isMuted ? 'Ativar Som' : 'Silenciar'}
            </Button>
          </div>

          {/* Última resposta */}
          {lastResponse && (
            <div className="w-full p-3 bg-zinc-800 rounded-lg">
              <p className="text-xs text-umind-gray/60 mb-1">Última resposta:</p>
              <p className="text-sm text-umind-gray">{lastResponse}</p>
            </div>
          )}

          {/* Instruções */}
          <div className="text-center text-xs text-umind-gray/60 max-w-sm">
            <p>
              {isRecording 
                ? 'Fale naturalmente. A IA está ouvindo e responderá por voz.'
                : 'Clique no microfone para iniciar uma conversa por voz com a IA.'
              }
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default StreamInterface;

