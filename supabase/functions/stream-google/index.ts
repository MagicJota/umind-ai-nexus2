import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Max-Age': '86400',
};

// Enum para estados da sessão
enum SessionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting',
  ERROR = 'error'
}

// Interface para mensagens da API Live
interface LiveAPIMessage {
  setup?: {
    model: string;
    generation_config: {
      response_modalities: string[];
      speech_config: {
        voice_config: {
          prebuilt_voice_config: {
            voice_name: string;
          };
        };
      };
      candidate_count?: number;
      max_output_tokens?: number;
      temperature?: number;
      top_p?: number;
      top_k?: number;
    };
    system_instruction?: {
      parts: Array<{ text: string }>;
    };
    tools?: any[];
  };
  client_content?: {
    turns: Array<{
      role: string;
      parts: Array<{
        text?: string;
        inline_data?: {
          mime_type: string;
          data: string;
        };
      }>;
    }>;
    turn_complete: boolean;
  };
}

// Classe para gerenciar sessão WebSocket com Gemini Live
class LiveAPISession {
  private ws: WebSocket | null = null;
  private state: SessionState = SessionState.DISCONNECTED;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private messageQueue: LiveAPIMessage[] = [];
  private responseCallback: ((data: any) => void) | null = null;

  constructor(
    private apiKey: string,
    private onMessage: (data: any) => void,
    private onStateChange: (state: SessionState) => void
  ) {
    this.responseCallback = onMessage;
  }

  async connect(): Promise<void> {
    if (this.state === SessionState.CONNECTED || this.state === SessionState.CONNECTING) {
      return;
    }

    this.setState(SessionState.CONNECTING);

    try {
      const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${this.apiKey}`;
      
      console.log('Conectando ao WebSocket:', wsUrl);
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('WebSocket conectado com sucesso');
        this.setState(SessionState.CONNECTED);
        this.reconnectAttempts = 0;
        this.sendSetupMessage();
        this.processMessageQueue();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('Mensagem recebida da API Live:', data);
          
          if (this.responseCallback) {
            this.responseCallback(data);
          }
        } catch (error) {
          console.error('Erro ao processar mensagem:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('Erro no WebSocket:', error);
        this.setState(SessionState.ERROR);
      };

      this.ws.onclose = (event) => {
        console.log('WebSocket fechado:', event.code, event.reason);
        this.setState(SessionState.DISCONNECTED);
        this.handleReconnection();
      };

    } catch (error) {
      console.error('Erro ao conectar WebSocket:', error);
      this.setState(SessionState.ERROR);
      throw error;
    }
  }

  private setState(newState: SessionState): void {
    this.state = newState;
    this.onStateChange(newState);
  }

  private sendSetupMessage(): void {
    const setupMessage: LiveAPIMessage = {
      setup: {
        model: "models/gemini-2.5-flash-preview-native-audio-dialog",
        generation_config: {
          response_modalities: ["AUDIO"],
          speech_config: {
            voice_config: {
              prebuilt_voice_config: {
                voice_name: "Puck"
              }
            }
          },
          candidate_count: 1,
          max_output_tokens: 8192,
          temperature: 0.7,
          top_p: 0.95,
          top_k: 40
        },
        system_instruction: {
          parts: [{
            text: "Você é MAGUS, uma inteligência artificial avançada da UMIND SALES. Seja natural, direto e conversacional. Responda de forma concisa e útil."
          }]
        },
        tools: []
      }
    };

    this.sendMessage(setupMessage);
  }

  private async handleReconnection(): Promise<void> {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.setState(SessionState.RECONNECTING);
      this.reconnectAttempts++;

      console.log(`Tentativa de reconexão ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);

      setTimeout(() => {
        this.connect().catch(error => {
          console.error('Erro na reconexão:', error);
        });
      }, this.reconnectDelay * this.reconnectAttempts);
    } else {
      console.error('Máximo de tentativas de reconexão atingido');
      this.setState(SessionState.ERROR);
    }
  }

  sendMessage(message: LiveAPIMessage): boolean {
    if (this.state !== SessionState.CONNECTED || !this.ws) {
      console.warn('WebSocket não conectado, adicionando mensagem à fila');
      this.messageQueue.push(message);
      return false;
    }

    try {
      const messageStr = JSON.stringify(message);
      console.log('Enviando mensagem:', messageStr);
      this.ws.send(messageStr);
      return true;
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      return false;
    }
  }

  private processMessageQueue(): void {
    while (this.messageQueue.length > 0 && this.state === SessionState.CONNECTED) {
      const message = this.messageQueue.shift();
      if (message) {
        this.sendMessage(message);
      }
    }
  }

  sendTextMessage(text: string): boolean {
    const message: LiveAPIMessage = {
      client_content: {
        turns: [{
          role: "user",
          parts: [{
            text: text
          }]
        }],
        turn_complete: true
      }
    };

    return this.sendMessage(message);
  }

  sendAudioMessage(audioData: string): boolean {
    const message: LiveAPIMessage = {
      client_content: {
        turns: [{
          role: "user",
          parts: [{
            inline_data: {
              mime_type: "audio/pcm",
              data: audioData
            }
          }]
        }],
        turn_complete: true
      }
    };

    return this.sendMessage(message);
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.setState(SessionState.DISCONNECTED);
    this.messageQueue = [];
  }

  getState(): SessionState {
    return this.state;
  }
}

// Função principal do servidor
serve(async (req) => {
  try {
    console.log('Nova requisição recebida:', {
      method: req.method,
      url: req.url,
      headers: Object.fromEntries(req.headers.entries())
    });

    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
      console.log('Respondendo a requisição OPTIONS');
      return new Response(null, { 
        headers: corsHeaders,
        status: 204
      });
    }

    // Endpoint de teste
    if (req.method === 'GET' && new URL(req.url).pathname === '/test') {
      console.log('Respondendo a requisição de teste');
      return new Response(JSON.stringify({ 
        status: 'ok', 
        message: 'Gemini Live Function is running',
        timestamp: new Date().toISOString(),
        version: '2.0.0'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Verificar se é uma requisição POST
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ 
        error: 'Método não permitido',
        details: 'Apenas requisições POST são aceitas'
      }), { 
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Verificar autenticação
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('Header Authorization ausente ou inválido');
      return new Response(
        JSON.stringify({ 
          error: 'Não autorizado',
          details: 'Header Authorization ausente ou inválido'
        }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const token = authHeader.split(' ')[1];

    // Verificar variáveis de ambiente
    const googleApiKey = Deno.env.get('GOOGLE_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

    if (!googleApiKey) {
      console.error("Google API key não configurada");
      return new Response(JSON.stringify({ 
        error: 'Configuração incompleta',
        details: 'Google API key não configurada'
      }), { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Variáveis de ambiente do Supabase não configuradas');
      return new Response(
        JSON.stringify({ 
          error: 'Erro interno',
          details: 'Configuração do servidor incompleta'
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Criar cliente Supabase e verificar autenticação
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        }
      }
    });

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    
    if (authError || !user) {
      console.error('Erro de autenticação:', authError);
      return new Response(
        JSON.stringify({ 
          error: 'Não autorizado',
          details: authError?.message || 'Usuário não encontrado'
        }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('Usuário autenticado:', { id: user.id, email: user.email });

    // Ler o corpo da requisição
    const body = await req.json();
    console.log('Corpo da requisição:', body);

    const { message, audioData, action } = body;

    // Criar uma nova sessão Live API
    let responseData: any = null;
    let sessionState: SessionState = SessionState.DISCONNECTED;

    const liveSession = new LiveAPISession(
      googleApiKey,
      (data) => {
        responseData = data;
      },
      (state) => {
        sessionState = state;
      }
    );

    try {
      // Conectar à API Live
      await liveSession.connect();

      // Aguardar conexão
      let attempts = 0;
      while (sessionState !== SessionState.CONNECTED && attempts < 10) {
        await new Promise(resolve => setTimeout(resolve, 500));
        attempts++;
      }

      if (sessionState !== SessionState.CONNECTED) {
        throw new Error('Falha ao conectar com a API Live');
      }

      // Enviar mensagem
      if (audioData) {
        liveSession.sendAudioMessage(audioData);
      } else if (message) {
        liveSession.sendTextMessage(message);
      } else {
        throw new Error('Mensagem ou dados de áudio são obrigatórios');
      }

      // Aguardar resposta
      attempts = 0;
      while (!responseData && attempts < 20) {
        await new Promise(resolve => setTimeout(resolve, 500));
        attempts++;
      }

      if (!responseData) {
        throw new Error('Timeout aguardando resposta da API Live');
      }

      // Processar resposta
      let audioResponse = null;
      let textResponse = null;

      if (responseData.serverContent?.modelTurn?.parts) {
        const parts = responseData.serverContent.modelTurn.parts;
        
        for (const part of parts) {
          if (part.text) {
            textResponse = part.text;
          }
          if (part.inlineData?.mimeType === 'audio/pcm') {
            audioResponse = part.inlineData.data;
          }
        }
      }

      return new Response(JSON.stringify({
        type: 'success',
        sessionState: sessionState,
        response: {
          audio: audioResponse,
          text: textResponse || '',
          raw: responseData
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('Erro na sessão Live API:', error);
      return new Response(JSON.stringify({ 
        error: 'Erro na API Live',
        details: error.message,
        sessionState: sessionState
      }), { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } finally {
      // Limpar sessão
      liveSession.disconnect();
    }

  } catch (error) {
    console.error('Erro interno do servidor:', error);
    return new Response(JSON.stringify({ 
      error: 'Erro interno do servidor',
      details: error.message
    }), { 
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

