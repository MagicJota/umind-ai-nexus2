import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': 'http://localhost:3000',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Max-Age': '86400',
};

serve(async (req) => {
  try {
    // Log da requisição
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
        message: 'Function is running',
        timestamp: new Date().toISOString()
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Verificar autenticação
    const authHeader = req.headers.get('Authorization');
    const apiKey = req.headers.get('apikey');
    const clientInfo = req.headers.get('x-client-info');

    console.log('Headers recebidos:', {
      auth: authHeader ? 'Bearer [TOKEN]' : 'ausente',
      apiKey: apiKey ? 'presente' : 'ausente',
      clientInfo
    });

    // Verificar token no header
    if (!authHeader) {
      console.error('Header Authorization ausente');
      return new Response(
        JSON.stringify({ 
          error: 'Não autorizado',
          details: 'Header Authorization ausente'
        }),
        { 
          status: 401,
          headers: corsHeaders
        }
      );
    }

    if (!authHeader.startsWith('Bearer ')) {
      console.error('Formato do token inválido');
      return new Response(
        JSON.stringify({ 
          error: 'Não autorizado',
          details: 'Formato do token inválido. Deve começar com "Bearer "'
        }),
        { 
          status: 401,
          headers: corsHeaders
        }
      );
    }

    const token = authHeader.split(' ')[1];
    console.log('Token extraído do header:', {
      length: token.length,
      type: typeof token
    });

    // Verificar token no corpo da requisição
    const body = await req.json();
    console.log('Corpo da requisição:', { 
      message: body.message ? 'presente' : 'ausente',
      token: body.token ? 'presente' : 'ausente'
    });

    if (!body.token) {
      console.error('Token não encontrado no corpo da requisição');
      return new Response(
        JSON.stringify({ 
          error: 'Não autorizado',
          details: 'Token não encontrado no corpo da requisição'
        }),
        { 
          status: 401,
          headers: corsHeaders
        }
      );
    }

    // Verificar se os tokens são iguais
    if (token !== body.token) {
      console.error('Tokens não correspondem');
      console.log('Token do header:', token);
      console.log('Token do corpo:', body.token);
      return new Response(
        JSON.stringify({ 
          error: 'Não autorizado',
          details: 'Tokens não correspondem'
        }),
        { 
          status: 401,
          headers: corsHeaders
        }
      );
    }

    // Criar cliente Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Variáveis de ambiente do Supabase não configuradas');
      return new Response(
        JSON.stringify({ 
          error: 'Erro interno',
          details: 'Configuração do servidor incompleta'
        }),
        { 
          status: 500,
          headers: corsHeaders
        }
      );
    }

    console.log('Criando cliente Supabase com:', {
      url: supabaseUrl,
      anonKey: supabaseAnonKey ? 'presente' : 'ausente'
    });

    const supabaseClient = createClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
            apikey: apiKey || ''
          }
        }
      }
    );

    // Verificar autenticação
    console.log('Verificando autenticação com Supabase...');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    
    if (authError) {
      console.error('Erro de autenticação:', authError);
      return new Response(
        JSON.stringify({ 
          error: 'Não autorizado',
          details: authError.message
        }),
        { 
          status: 401,
          headers: corsHeaders
        }
      );
    }

    if (!user) {
      console.error('Usuário não encontrado');
      return new Response(
        JSON.stringify({ 
          error: 'Não autorizado',
          details: 'Usuário não encontrado'
        }),
        { 
          status: 401,
          headers: corsHeaders
        }
      );
    }

    console.log('Usuário autenticado:', {
      id: user.id,
      email: user.email
    });

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

    try {
      const googleApiKey = Deno.env.get('GOOGLE_API_KEY');

      if (!googleApiKey) {
        console.error("Google API key not configured");
        return new Response(JSON.stringify({ 
          error: 'Configuração incompleta',
          details: 'Google API key não configurada'
        }), { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Ler o corpo da requisição
      const body = await req.json();
      console.log('Corpo da requisição:', body);

      const { message } = body;

      if (!message) {
        return new Response(JSON.stringify({ 
          error: 'Dados inválidos',
          details: 'A mensagem é obrigatória'
        }), { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Configurar a sessão Gemini Live
      const sessionConfig = {
        model: "gemini-2.5-flash-preview-native-audio-dialog",
        response_modalities: ["AUDIO"],
        speech_config: {
          voice_config: {
            prebuilt_voice_config: {
              voice_name: "Puck"
            }
          }
        },
        system_instruction: "Você é MAGUS, uma inteligência artificial avançada da UMIND SALES. Seja natural, direto e útil em todas as suas capacidades."
      };

      console.log('Iniciando sessão Gemini Live...');
      
      // Iniciar sessão Gemini Live
      const sessionResponse = await fetch(`https://generativelanguage.googleapis.com/v1/models/${sessionConfig.model}:liveConnect?key=${googleApiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sessionConfig)
      });

      if (!sessionResponse.ok) {
        const errorText = await sessionResponse.text();
        console.error('Erro na resposta do Gemini:', errorText);
        return new Response(JSON.stringify({ 
          error: 'Erro no Gemini Live',
          details: errorText
        }), { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const sessionData = await sessionResponse.json();
      const sessionId = sessionData.sessionId;

      console.log('Sessão Gemini Live criada:', sessionId);

      // Enviar mensagem para a sessão
      const messageResponse = await fetch(`https://generativelanguage.googleapis.com/v1/sessions/${sessionId}:sendRealtimeInput?key=${googleApiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: message
        })
      });

      if (!messageResponse.ok) {
        const errorText = await messageResponse.text();
        console.error('Erro ao enviar mensagem:', errorText);
        return new Response(JSON.stringify({ 
          error: 'Erro ao enviar mensagem',
          details: errorText
        }), { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Obter resposta da sessão
      const responseData = await messageResponse.json();
      console.log('Resposta do Gemini:', responseData);

      // Verificar se há áudio na resposta
      if (!responseData.audio) {
        console.error('Resposta do Gemini não contém áudio');
        return new Response(JSON.stringify({ 
          error: 'Resposta inválida',
          details: 'A resposta do Gemini não contém áudio'
        }), { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Converter o áudio para base64
      const audioBase64 = responseData.audio;

      return new Response(JSON.stringify({
        type: 'success',
        sessionId,
        response: {
          audio: audioBase64,
          text: responseData.text || ''
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('Error in stream processing:', error);
      return new Response(JSON.stringify({ 
        error: 'Erro interno',
        details: error.message
      }), { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
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
