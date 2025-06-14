
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, knowledgeContext } = await req.json();
    console.log('Claude Request:', { messagesCount: messages?.length, hasContext: !!knowledgeContext });
    
    const claudeApiKey = Deno.env.get('CLAUDE_API_KEY');
    
    if (!claudeApiKey) {
      console.error('Claude API key not configured');
      throw new Error('Claude API key not configured');
    }

    if (!messages || !Array.isArray(messages)) {
      throw new Error('Messages array is required');
    }

    // Convert messages format for Claude
    const systemPrompt = `Você é MAGUS, um assistente AI inteligente da UMIND SALES. Seja natural, direto e útil. ${knowledgeContext ? `Contexto adicional: ${knowledgeContext}` : ''}`;
    
    const claudeMessages = messages.map((msg: any) => ({
      role: msg.role === 'assistant' ? 'assistant' : 'user',
      content: msg.content
    }));

    console.log('Calling Claude API...');
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${claudeApiKey}`,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        system: systemPrompt,
        messages: claudeMessages,
        max_tokens: 1000,
      }),
    });

    const data = await response.json();
    console.log('Claude Response status:', response.status);
    
    if (!response.ok) {
      console.error('Claude API error:', data);
      throw new Error(data.error?.message || 'Claude API error');
    }

    const result = {
      message: data.content[0].text,
      model: 'claude-3-haiku',
      provider: 'claude'
    };

    console.log('Returning successful response');
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in chat-claude:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Internal server error',
      provider: 'claude'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
